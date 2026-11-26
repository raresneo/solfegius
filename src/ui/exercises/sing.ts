// Intonație cu microfonul: cânți nota afișată, acul arată cât de sus/jos ești.
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, staffBox } from '../dom.ts';
import { renderStaff } from '../../lib/staff.ts';
import { nearestNoteName, parseNote, pitchClassCents, roName } from '../../lib/theory.ts';
import { MIN_CLARITY } from '../../lib/pitch.ts';
import type { PitchResult } from '../../lib/pitch.ts';
import { holdDetector } from '../../lib/hold.ts';
import { playNote } from '../../audio/audio.ts';
import { MIC_RMS_THRESHOLD, startMic } from '../../audio/mic.ts';
import type { MicHandle } from '../../audio/mic.ts';

export { HOLD_SECONDS, WINDOW_SECONDS } from '../../lib/hold.ts';

/** Cât ține nota de referință; cât timp după ea microfonul n-o mai ia drept vocea ta. */
const REF_SECONDS = 1.4;
const REF_ECHO = 0.35;

export const LEVELS: { label: string; cents: number }[] = [
  { label: 'Începător ±50', cents: 50 },
  { label: 'Mediu ±35', cents: 35 },
  { label: 'Conservator ±20', cents: 20 },
];

/** Bară de volum: arată imediat dacă microfonul primește sunet. */
export function micLevelBar(): { el: HTMLElement; set(level: number): void } {
  const fill = h('div', { class: 'mic-level-fill' });
  fill.style.cssText = 'height:100%;width:0;background:var(--ok);transition:width .08s linear';
  const el = h('div', { class: 'mic-level', title: 'volumul microfonului' }, fill);
  el.style.cssText = 'height:6px;background:var(--panel2);border-radius:999px;overflow:hidden;margin:-4px 0 10px';
  return {
    el,
    set(level) {
      fill.style.width = `${Math.min(100, Math.round((level / 0.05) * 100))}%`;
      fill.style.background = level < MIC_RMS_THRESHOLD ? 'var(--muted)' : 'var(--ok)';
    },
  };
}

/** Mesaj pentru cadrele fără notă: nu te aude deloc vs. te aude, dar sunetul nu e stabil. */
export function silenceHint(level: number): string {
  return level < MIC_RMS_THRESHOLD
    ? 'Nu te aud: apropie telefonul sau cântă mai tare'
    : 'Te aud, dar nu prind nota: ține un sunet stabil, pe „a”';
}

export function tunerMeter(): { el: HTMLElement; setTolerance(cents: number): void; set(cents: number | null, label: string): void } {
  let tol = 50;
  const needle = h('div', { class: 'needle' });
  const win = h('div', { class: 'window' });
  const text = h('div', { class: 'tuner-text' }, 'Cântă când ești gata');
  const el = h('div', { class: 'tuner' }, h('div', { class: 'scale' }, h('span', {}, '−100'), h('span', { class: 'zero' }, '0'), h('span', {}, '+100')), h('div', { class: 'track' }, win, needle), text);
  const placeWindow = () => {
    win.style.left = `${50 - tol / 2}%`;
    win.style.right = `${50 - tol / 2}%`;
  };
  placeWindow();
  return {
    el,
    setTolerance(cents) {
      tol = cents;
      placeWindow();
    },
    set(cents, label) {
      if (cents === null) {
        needle.style.opacity = '0.25';
        text.textContent = label;
        el.classList.remove('good');
        return;
      }
      // scala e ±100 de cenți (un semiton în fiecare parte)
      const c = Math.max(-100, Math.min(100, cents));
      needle.style.opacity = '1';
      needle.style.left = `${50 + c / 2}%`;
      el.classList.toggle('good', Math.abs(cents) <= tol);
      text.textContent = label;
    },
  };
}

export const runSing: Runner<Extract<Exercise, { kind: 'sing' }>> = (root, ex, ctx) => {
  const notes = ex.targets.map((p, k) => ({ pitch: p, dur: 4, type: 'w' as const, dotted: false, tie: false, measure: k, beat: 0 }));
  const states: Record<number, 'current' | 'ok' | 'bad'> = {};
  let idx = 0;
  let ok = 0;
  let mic: MicHandle | null = null;
  let quietUntil = 0;
  let lastClear = 0;
  // centrul intonației pe ~0,35 s, nu cadru cu cadru: vibrato-ul de cântăreț nu mai scoate nota din toleranță
  const hold = holdDetector();
  const tol = () => ctx.state.settings.tolerance || 50;
  const box = h('div', { class: 'ex ex-sing' });
  const staff = h('div');
  const meter = tunerMeter();
  meter.setTolerance(tol());
  const levelBar = micLevelBar();
  const status = h('p', { class: 'feedback', 'aria-live': 'polite' }, '\u00a0');
  root.append(box);

  const draw = () => {
    states[idx] = 'current';
    staff.replaceChildren(staffBox(renderStaff({ notes, time: null, width: Math.max(220, 70 * notes.length + 60), showNames: true, states, noFinalBar: true, scale: 1.3 }).svg));
  };

  const advance = (good: boolean) => {
    if (idx >= notes.length) return;
    states[idx] = good ? 'ok' : 'bad';
    if (good) ok++;
    idx++;
    hold.reset();
    if (idx >= notes.length) {
      mic?.stop();
      mic = null;
      ctx.finish(ok / notes.length, `${ok} din ${notes.length} sunete intonate`);
      return;
    }
    draw();
    status.textContent = good ? 'Bravo! Următoarea.' : 'Sărită.';
  };

  /** Când microfonul nu te prinde (telefon, zgomot), lecția nu rămâne blocată: te autoevaluezi, ca la solfegiu. */
  const selfFinish = (score: number, label: string) => {
    if (idx >= notes.length) return;
    idx = notes.length;
    mic?.stop();
    mic = null;
    ctx.finish(Math.max(score, ok / notes.length), `autoevaluare: ${label}`);
  };

  const onPitch = (r: PitchResult | null, t: number, level: number) => {
    levelBar.set(level);
    if (idx >= notes.length) return;
    if (t < quietUntil) {
      // nota de referință iese din difuzor: n-o luăm drept vocea ta
      meter.set(null, `Ascultă ${roName(notes[idx].pitch)}, apoi cânt-o`);
      hold.reset();
      return;
    }
    const targetName = notes[idx].pitch;
    const target = parseNote(targetName);
    const clear = r !== null && r.clarity >= MIN_CLARITY;
    const reading = hold.push(t, clear && r ? pitchClassCents(r.freq, target.midi) : null, tol());
    if (!clear || !r || reading.center === null) {
      // o respirație sau o consoană scurtă nu mai face acul să dispară
      if (t - lastClear > 0.25) meter.set(null, silenceHint(level));
    } else {
      lastClear = t;
      const c = reading.center;
      const heard = roName(nearestNoteName(r.freq));
      const verdict = reading.inTol ? 'ține-o!' : c > 0 ? 'prea sus' : 'prea jos';
      meter.set(c, `aud ${heard} · ${c > 0 ? '+' : ''}${Math.round(c)} cenți față de ${roName(targetName)} · ${verdict}`);
    }
    if (reading.held) advance(true);
  };

  const micBtn = h('button', { class: 'btn primary', onclick: async () => {
    mic?.stop();
    mic = null;
    try {
      mic = await startMic(onPitch);
      micBtn.textContent = '● Microfon pornit · repornește';
    } catch (e) {
      status.textContent = `Nu pot porni microfonul: ${(e as Error).message}. Verifică permisiunea din browser sau autoevaluează-te mai jos.`;
    }
  } }, '🎙 Pornește microfonul');

  const levelButtons = LEVELS.map((l) =>
    h('button', { class: `btn ${tol() === l.cents ? 'primary' : 'ghost'}`, onclick: () => {
      ctx.state.settings.tolerance = l.cents;
      ctx.save();
      meter.setTolerance(l.cents);
      levelButtons.forEach((b, i) => (b.className = `btn ${LEVELS[i].cents === l.cents ? 'primary' : 'ghost'}`));
    } }, l.label),
  );

  const listen = () => {
    quietUntil = performance.now() / 1000 + REF_SECONDS + REF_ECHO;
    hold.reset();
    playNote(notes[Math.min(idx, notes.length - 1)].pitch, REF_SECONDS);
  };

  box.append(
    h('p', { class: 'hint' }, 'Ascultă nota, apoi cânt-o pe „a” sau pe numele ei, ca un sunet lung. Orice octavă e bună, vibrato-ul e în regulă.'),
    staff,
    meter.el,
    levelBar.el,
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: listen }, '▶ Ascultă nota'),
      micBtn,
      h('button', { class: 'btn ghost', onclick: () => advance(false) }, 'Sari peste'),
    ),
    h('div', { class: 'row small' }, h('span', {}, 'Exigență:'), levelButtons),
    status,
    h('details', { class: 'self' },
      h('summary', {}, 'Microfonul nu te prinde? Autoevaluează-te'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => selfFinish(1, 'mi-a ieșit') }, 'Mi-a ieșit'),
        h('button', { class: 'btn', onclick: () => selfFinish(0.5, 'pe jumătate') }, 'Pe jumătate'),
        h('button', { class: 'btn', onclick: () => selfFinish(0.2, 'nu încă') }, 'Nu încă'),
      ),
    ),
  );
  draw();
  return () => mic?.stop();
};
