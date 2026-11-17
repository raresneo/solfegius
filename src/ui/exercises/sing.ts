// Intonație cu microfonul: cânți nota afișată, acul arată cât de sus/jos ești.
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, staffBox } from '../dom.ts';
import { renderStaff } from '../../lib/staff.ts';
import { nearestNoteName, parseNote, pitchClassCents, roName } from '../../lib/theory.ts';
import { median, MIN_CLARITY } from '../../lib/pitch.ts';
import type { PitchResult } from '../../lib/pitch.ts';
import { playNote } from '../../audio/audio.ts';
import { MIC_RMS_THRESHOLD, startMic } from '../../audio/mic.ts';
import type { MicHandle } from '../../audio/mic.ts';

/** Cât timp din ultima secundă trebuie să fii în toleranță ca nota să fie validată. */
export const HOLD_SECONDS = 0.45;
export const WINDOW_SECONDS = 1;

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
  let lastT = 0;
  let mic: MicHandle | null = null;
  const recent: number[] = [];
  let hist: { t: number; dt: number; ok: boolean }[] = [];
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
    states[idx] = good ? 'ok' : 'bad';
    if (good) ok++;
    idx++;
    hist = [];
    recent.length = 0;
    if (idx >= notes.length) {
      mic?.stop();
      mic = null;
      ctx.finish(ok / notes.length, `${ok} din ${notes.length} sunete intonate`);
      return;
    }
    draw();
    status.textContent = good ? 'Bravo! Următoarea.' : 'Sărită.';
  };

  const onPitch = (r: PitchResult | null, t: number, level: number) => {
    const dt = lastT ? Math.min(0.1, t - lastT) : 0;
    lastT = t;
    levelBar.set(level);
    if (idx >= notes.length) return;
    const targetName = notes[idx].pitch;
    const target = parseNote(targetName);
    let inTol = false;
    if (!r || r.clarity < MIN_CLARITY) {
      meter.set(null, silenceHint(level));
    } else {
      recent.push(pitchClassCents(r.freq, target.midi));
      if (recent.length > 5) recent.shift();
      const c = median(recent);
      inTol = Math.abs(c) <= tol();
      const heard = roName(nearestNoteName(r.freq));
      const verdict = inTol ? 'ține-o!' : c > 0 ? 'prea sus' : 'prea jos';
      meter.set(c, `aud ${heard} · ${c > 0 ? '+' : ''}${Math.round(c)} cenți față de ${roName(targetName)} · ${verdict}`);
    }
    hist.push({ t, dt, ok: inTol });
    hist = hist.filter((x) => x.t > t - WINDOW_SECONDS);
    const okTime = hist.reduce((a, x) => a + (x.ok ? x.dt : 0), 0);
    if (okTime >= HOLD_SECONDS) advance(true);
  };

  const micBtn = h('button', { class: 'btn primary', onclick: async () => {
    mic?.stop();
    mic = null;
    try {
      mic = await startMic(onPitch);
      micBtn.textContent = '● Microfon pornit · repornește';
    } catch (e) {
      status.textContent = `Nu pot porni microfonul: ${(e as Error).message}. Verifică permisiunea din browser.`;
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

  box.append(
    h('p', { class: 'hint' }, 'Ascultă nota, apoi cânt-o pe „a” sau pe numele ei, ca un sunet lung. Orice octavă e bună.'),
    staff,
    meter.el,
    levelBar.el,
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: () => playNote(notes[Math.min(idx, notes.length - 1)].pitch, 1.4) }, '▶ Ascultă nota'),
      micBtn,
      h('button', { class: 'btn ghost', onclick: () => advance(false) }, 'Sari peste'),
    ),
    h('div', { class: 'row small' }, h('span', {}, 'Exigență:'), levelButtons),
    status,
  );
  draw();
  return () => mic?.stop();
};
