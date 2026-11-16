// Intonație cu microfonul: cânți nota afișată, acul arată cât de sus/jos ești.
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, staffBox } from '../dom.ts';
import { renderStaff } from '../../lib/staff.ts';
import { nearestNoteName, parseNote, pitchClassCents, roName } from '../../lib/theory.ts';
import { median } from '../../lib/pitch.ts';
import { playNote } from '../../audio/audio.ts';
import { startMic } from '../../audio/mic.ts';
import type { MicHandle } from '../../audio/mic.ts';

export const HOLD_SECONDS = 0.7;
export const TOLERANCE_CENTS = 30;

export function tunerMeter(): { el: HTMLElement; set(cents: number | null, label: string): void } {
  const needle = h('div', { class: 'needle' });
  const text = h('div', { class: 'tuner-text' }, 'Cântă când ești gata');
  const el = h('div', { class: 'tuner' }, h('div', { class: 'scale' }, h('span', {}, '−50'), h('span', { class: 'zero' }, '0'), h('span', {}, '+50')), h('div', { class: 'track' }, h('div', { class: 'window' }), needle), text);
  return {
    el,
    set(cents, label) {
      if (cents === null) {
        needle.style.opacity = '0.25';
        text.textContent = label;
        el.classList.remove('good');
        return;
      }
      const c = Math.max(-50, Math.min(50, cents));
      needle.style.opacity = '1';
      needle.style.left = `${50 + c}%`;
      el.classList.toggle('good', Math.abs(cents) <= TOLERANCE_CENTS);
      text.textContent = label;
    },
  };
}

export const runSing: Runner<Extract<Exercise, { kind: 'sing' }>> = (root, ex, ctx) => {
  const notes = ex.targets.map((p, k) => ({ pitch: p, dur: 4, type: 'w' as const, dotted: false, tie: false, measure: k, beat: 0 }));
  const states: Record<number, 'current' | 'ok' | 'bad'> = {};
  let idx = 0;
  let ok = 0;
  let held = 0;
  let lastT = 0;
  let mic: MicHandle | null = null;
  const recent: number[] = [];
  const box = h('div', { class: 'ex ex-sing' });
  const staff = h('div');
  const meter = tunerMeter();
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
    held = 0;
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

  const onPitch = (r: { freq: number; clarity: number } | null, t: number) => {
    const dt = lastT ? Math.min(0.1, t - lastT) : 0;
    lastT = t;
    if (idx >= notes.length) return;
    const target = parseNote(notes[idx].pitch);
    if (!r || r.clarity < 0.75) {
      held = Math.max(0, held - dt);
      meter.set(null, 'Te ascult...');
      return;
    }
    recent.push(pitchClassCents(r.freq, target.midi));
    if (recent.length > 5) recent.shift();
    const c = median(recent);
    const heard = roName(nearestNoteName(r.freq));
    meter.set(c, `${heard} · ${c > 0 ? '+' : ''}${Math.round(c)} cenți${Math.abs(c) <= TOLERANCE_CENTS ? ' · ține-o!' : c > 0 ? ' · prea sus' : ' · prea jos'}`);
    if (Math.abs(c) <= TOLERANCE_CENTS) held += dt;
    else held = Math.max(0, held - dt * 0.5);
    if (held >= HOLD_SECONDS) advance(true);
  };

  const micBtn = h('button', { class: 'btn primary', onclick: async () => {
    if (mic) return;
    try {
      mic = await startMic(onPitch);
      micBtn.textContent = '● Microfon pornit';
      micBtn.setAttribute('disabled', '');
    } catch (e) {
      status.textContent = `Nu pot porni microfonul: ${(e as Error).message}. Verifică permisiunea din browser.`;
    }
  } }, '🎙 Pornește microfonul');

  box.append(
    h('p', { class: 'hint' }, 'Ascultă nota, apoi cânt-o pe „a” sau pe numele ei. Ține-o în fereastra verde cam o secundă. Orice octavă e bună.'),
    staff,
    meter.el,
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: () => playNote(notes[Math.min(idx, notes.length - 1)].pitch, 1.4) }, '▶ Ascultă nota'),
      micBtn,
      h('button', { class: 'btn ghost', onclick: () => advance(false) }, 'Sari peste'),
    ),
    status,
  );
  draw();
  return () => mic?.stop();
};
