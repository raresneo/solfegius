// Ritm: vezi formula, o asculți, apoi o bați tu pe ecran (sau cu Space) peste metronom.
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, pct, staffBox, availableWidth } from '../dom.ts';
import { renderStaff } from '../../lib/staff.ts';
import type { NoteState } from '../../lib/staff.ts';
import { parseMelody, rhythmSyllable, toOnsets } from '../../lib/notation.ts';
import type { Melody } from '../../lib/notation.ts';
import { generateRhythm, LESSON_CELLS, LESSON_TIME, scoreTapsCompensated } from '../../lib/rhythm.ts';
import { mulberry32 } from '../../lib/random.ts';
import { playMelody } from '../../audio/audio.ts';
import type { Playback } from '../../audio/audio.ts';

export function rhythmMelody(lesson: number, measures: number, seed: number): Melody {
  const time = LESSON_TIME[lesson] ?? [2, 4];
  const r = generateRhythm({ cells: LESSON_CELLS[lesson] ?? LESSON_CELLS[1], measures, time, rng: mulberry32(seed), endLong: lesson >= 2 });
  const src = r.map((m) => m.map((t) => (t.startsWith('r') ? t : `B4${t}`)).join(' ')).join(' | ');
  return parseMelody(src, time);
}

/**
 * Momentul bătăii, în secunde pe ceasul performance.now(): timeStamp-ul evenimentului (când ai atins ecranul),
 * nu când a ajuns JavaScript-ul să-l proceseze. Dacă browserul dă altă bază de timp, cădem pe acum.
 */
export function eventSeconds(e: Event, now = performance.now()): number {
  const ts = e.timeStamp;
  return (ts > 0 && Math.abs(now - ts) < 1000 ? ts : now) / 1000;
}

export const runRhythm: Runner<Extract<Exercise, { kind: 'rhythm' }>> = (root, ex, ctx) => {
  const measures = ex.measures ?? 4;
  let seed = Math.floor(Math.random() * 1e9);
  let mel = rhythmMelody(ex.lesson, measures, seed);
  let bpm = 60;
  let best = 0;
  let pb: Playback | null = null;
  let taps: number[] = [];
  let capturing = false;
  let timer = 0;
  let states: Record<number, NoteState> = {};
  const box = h('div', { class: 'ex ex-rhythm' });
  const staff = h('div');
  const result = h('p', { class: 'feedback', 'aria-live': 'polite' }, '\u00a0');
  root.append(box);

  const draw = () => {
    const labels: Record<number, string> = {};
    mel.notes.forEach((n, i) => (labels[i] = rhythmSyllable(n)));
    staff.replaceChildren(staffBox(renderStaff({ notes: mel.notes, time: mel.time, width: availableWidth(box), states, labels }).svg));
  };

  const stop = () => {
    clearTimeout(timer);
    pb?.stop();
    pb = null;
    capturing = false;
    pad.classList.remove('live');
  };

  const listen = () => {
    stop();
    states = {};
    pb = playMelody(mel.notes, { bpm, beatsPerMeasure: mel.time[0], countIn: 1, metronome: true, onNote: (i) => { states = { [i]: 'current' }; draw(); }, onEnd: () => { states = {}; draw(); } });
  };

  const attempt = () => {
    stop();
    states = {};
    taps = [];
    draw();
    result.textContent = 'Ascultă numărătoarea (o măsură), apoi bate pe fiecare notă.';
    const onsets = toOnsets(mel.notes, bpm).filter((o) => o.pitch !== null);
    pb = playMelody(mel.notes, { bpm, beatsPerMeasure: mel.time[0], countIn: 1, metronome: true, melody: false, onEnd: () => { timer = window.setTimeout(evaluate, 350); } });
    const startPerf = pb.startPerf;
    capturing = true;
    pad.classList.add('live');
    const evaluate = () => {
      capturing = false;
      pad.classList.remove('live');
      const beat = 60 / bpm;
      const expected = onsets.map((o) => startPerf + o.start);
      // decalajul constant (căști Bluetooth, ecran) nu e greșeală de ritm, iar bătăile date din reflex pe
      // numărătoare nu se mai socotesc „în plus”
      const s = scoreTapsCompensated(expected, taps, Math.min(0.2, beat * 0.3), { ignoreBefore: Math.min(0.4, beat * 0.5), ignoreAfter: 0.6 });
      states = {};
      onsets.forEach((o, k) => (states[o.index] = s.results[k].hit ? 'ok' : 'bad'));
      draw();
      best = Math.max(best, s.score);
      const ms = s.meanError === null ? '' : ` · abatere medie ${Math.round(s.meanError * 1000)} ms`;
      const lat = s.latency ? ` · decalaj constant de ${Math.round(Math.abs(s.latency) * 1000)} ms (căști/ecran), compensat` : '';
      const ign = s.ignored ? ` · ${s.ignored} în afara melodiei (numărătoare), ignorate` : '';
      result.textContent = `${s.hits}/${onsets.length} bătăi la timp${s.extras ? ` · ${s.extras} în plus` : ''}${ms}${lat}${ign} · scor ${pct(s.score)}`;
    };
  };

  const tap = (e: Event) => {
    e.preventDefault();
    if (!capturing) return;
    taps.push(eventSeconds(e));
    pad.classList.remove('flash');
    void pad.offsetWidth;
    pad.classList.add('flash');
  };
  const pad = h('button', { class: 'tap-pad', onpointerdown: tap }, 'BATE AICI');
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat) tap(e);
  };
  window.addEventListener('keydown', onKey);

  const tempo = h('input', { type: 'range', min: 40, max: 100, value: bpm, step: 2, 'aria-label': 'tempo' }) as HTMLInputElement;
  const tempoLabel = h('span', { class: 'muted' }, `${bpm} pătrimi/min`);
  tempo.addEventListener('input', () => {
    bpm = Number(tempo.value);
    tempoLabel.textContent = `${bpm} pătrimi/min`;
  });

  box.append(
    h('p', { class: 'hint' }, 'Rostește silabele în gând (ta, ta-a, ti-ti) și bate pe începutul fiecărei note. Pe pauze nu bați. Poți bate și pe numărătoare, nu se socotește.'),
    staff,
    h('div', { class: 'row' }, h('label', { class: 'tempo' }, 'Tempo ', tempo), tempoLabel),
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: listen }, '▶ Ascultă'),
      h('button', { class: 'btn primary', onclick: attempt }, '● Bate tu'),
      h('button', { class: 'btn ghost', onclick: () => { stop(); seed = Math.floor(Math.random() * 1e9); mel = rhythmMelody(ex.lesson, measures, seed); states = {}; result.textContent = '\u00a0'; draw(); } }, '↻ Alt ritm'),
    ),
    pad,
    result,
    h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: () => { stop(); ctx.finish(best, `cel mai bun scor: ${pct(best)}`); } }, 'Gata')),
  );
  draw();
  return () => {
    stop();
    window.removeEventListener('keydown', onKey);
  };
};
