// Solfegiu: acordaj, ascultare cu urmărire, apoi cânți tu cu metronomul și primești notă cu notă.
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, pct, staffBox, availableWidth } from '../dom.ts';
import { renderStaff } from '../../lib/staff.ts';
import type { NoteState } from '../../lib/staff.ts';
import { parseMelody, toOnsets } from '../../lib/notation.ts';
import type { Melody, Onset } from '../../lib/notation.ts';
import { generateMelody, scaleGame } from '../../lib/melodyGen.ts';
import { bookMelody } from '../../data/melodies.ts';
import { parseNote, pitchClassCents, roName, nearestNoteName } from '../../lib/theory.ts';
import { MIN_CLARITY } from '../../lib/pitch.ts';
import { audioCtx, newVoice, playCadence, playMelody, tone } from '../../audio/audio.ts';
import type { Playback, Voice } from '../../audio/audio.ts';
import { MIC_RMS_THRESHOLD, startMic } from '../../audio/mic.ts';
import type { MicHandle } from '../../audio/mic.ts';

type SolEx = Extract<Exercise, { kind: 'solfegiu' }>;

export interface Resolved {
  melody: Melody;
  bpm: number;
  credit: string;
}

export function resolveMelody(ex: SolEx, seed: number): Resolved {
  if (ex.melodyId) {
    const m = bookMelody(ex.melodyId);
    return { melody: parseMelody(m.source, m.time), bpm: ex.bpm ?? m.bpm, credit: `${m.author} · „Solfegiu pentru toți”, p. ${m.page}` };
  }
  if (ex.source) return { melody: parseMelody(ex.source, ex.time ?? [2, 4]), bpm: ex.bpm ?? 60, credit: '' };
  const g = ex.generate?.scaleGame ? scaleGame(seed) : generateMelody({ lesson: ex.generate?.lesson ?? 1, seed });
  return { melody: parseMelody(g.source, g.time), bpm: ex.bpm ?? 66, credit: `Generat pe lecția ${ex.generate?.lesson ?? 1} · #${g.seed % 10000}` };
}

/** O notă e „bine” dacă măcar 45% din cadrele ei cântate sunt la ±50 de cenți (orice octavă). */
export function judgeNote(cents: (number | null)[]): boolean {
  if (cents.length < 2) return false;
  const good = cents.filter((c) => c !== null && Math.abs(c) <= 50).length;
  return good / cents.length >= 0.45;
}

export const runSolfegiu: Runner<SolEx> = (root, ex, ctx) => {
  let seed = Math.floor(Math.random() * 1e9);
  let r = resolveMelody(ex, seed);
  let bpm = r.bpm;
  let best = 0;
  let sung = false;
  let states: Record<number, NoteState> = {};
  let pb: Playback | null = null;
  let mic: MicHandle | null = null;
  let tune: Voice | null = null;
  const box = h('div', { class: 'ex ex-sol' });
  const credit = h('p', { class: 'credit' }, r.credit);
  const staff = h('div');
  const live = h('div', { class: 'live-pitch muted' }, '\u00a0');
  const result = h('p', { class: 'feedback', 'aria-live': 'polite' }, '\u00a0');
  root.append(box);

  const draw = () => {
    staff.replaceChildren(staffBox(renderStaff({ notes: r.melody.notes, time: r.melody.time, width: availableWidth(box), showNames: ctx.state.settings.showNames, states }).svg));
  };

  const stopAll = () => {
    pb?.stop();
    pb = null;
    mic?.stop();
    mic = null;
    tune?.stop();
    tune = null;
    live.textContent = '\u00a0';
  };

  const tuneUp = () => {
    stopAll();
    const v = newVoice();
    tune = v;
    const t = audioCtx().currentTime + 0.05;
    let off = playCadence(v, t);
    for (const p of ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4']) {
      tone(parseNote(p).midi, t + off, 0.4, v.out, 0.2);
      off += 0.42;
    }
  };

  const listen = () => {
    stopAll();
    states = {};
    draw();
    pb = playMelody(r.melody.notes, {
      bpm,
      beatsPerMeasure: r.melody.time[0],
      countIn: 1,
      metronome: false,
      onNote: (i) => { states = { [i]: 'current' }; draw(); },
      onEnd: () => { states = {}; draw(); },
    });
  };

  const sing = async () => {
    stopAll();
    states = {};
    draw();
    const onsets: Onset[] = toOnsets(r.melody.notes, bpm).filter((o) => o.pitch !== null);
    const frames: (number | null)[][] = onsets.map(() => []);
    let startPerf = Infinity;
    try {
      mic = await startMic((res, t, level) => {
        if (res && res.clarity >= MIN_CLARITY) live.textContent = `aud: ${roName(nearestNoteName(res.freq))}`;
        else live.textContent = level < MIC_RMS_THRESHOLD ? 'nu te aud: apropie telefonul' : 'te aud, caut nota...';
        const rel = t - startPerf;
        if (rel < 0) return;
        const k = onsets.findIndex((o) => rel >= o.start + 0.07 && rel <= o.start + o.dur - 0.04);
        if (k < 0) return;
        const target = parseNote(onsets[k].pitch ?? 'C4').midi;
        frames[k].push(res && res.clarity >= MIN_CLARITY ? pitchClassCents(res.freq, target) : null);
      });
    } catch (e) {
      result.textContent = `Nu pot porni microfonul: ${(e as Error).message}. Poți cânta și fără: ascultă, cântă, apoi autoevaluează-te mai jos.`;
      return;
    }
    result.textContent = 'O măsură de numărătoare, apoi cântă. Metronomul te ține în tempo.';
    pb = playMelody(r.melody.notes, {
      bpm,
      beatsPerMeasure: r.melody.time[0],
      countIn: 1,
      metronome: true,
      melody: ctx.state.settings.guide,
      melodyGain: 0.07,
      onNote: (i) => { states = { ...states, [i]: 'current' }; draw(); },
      onEnd: () => {
        mic?.stop();
        mic = null;
        let good = 0;
        states = {};
        onsets.forEach((o, k) => {
          const okNote = judgeNote(frames[k]);
          if (okNote) good++;
          states[o.index] = okNote ? 'ok' : 'bad';
        });
        draw();
        const score = onsets.length ? good / onsets.length : 0;
        best = Math.max(best, score);
        sung = true;
        live.textContent = '\u00a0';
        result.textContent = `${good}/${onsets.length} note intonate corect · ${pct(score)}. ${score >= 0.7 ? 'Foarte bine!' : 'Reia notele roșii: ascultă-le, apoi cântă iar.'}`;
      },
    });
    startPerf = pb.startPerf;
  };

  const tempo = h('input', { type: 'range', min: 40, max: 120, value: bpm, step: 2, 'aria-label': 'tempo' }) as HTMLInputElement;
  const tempoLabel = h('span', { class: 'muted' }, `${bpm} pătrimi/min`);
  tempo.addEventListener('input', () => {
    bpm = Number(tempo.value);
    tempoLabel.textContent = `${bpm} pătrimi/min`;
  });
  const names = h('input', { type: 'checkbox' }) as HTMLInputElement;
  names.checked = ctx.state.settings.showNames;
  names.addEventListener('change', () => {
    ctx.state.settings.showNames = names.checked;
    ctx.save();
    draw();
  });
  const guide = h('input', { type: 'checkbox' }) as HTMLInputElement;
  guide.checked = ctx.state.settings.guide;
  guide.addEventListener('change', () => {
    ctx.state.settings.guide = guide.checked;
    ctx.save();
  });

  const finishSelf = (score: number, label: string) => {
    stopAll();
    ctx.finish(Math.max(best, score), sung ? `cel mai bun scor cu microfonul: ${pct(best)}` : `autoevaluare: ${label}`);
  };

  box.append(
    credit,
    staff,
    live,
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: tuneUp }, '♪ Acordaj'),
      h('button', { class: 'btn ghost', onclick: listen }, '▶ Ascultă'),
      h('button', { class: 'btn primary', onclick: () => void sing() }, '🎙 Cântă'),
      h('button', { class: 'btn ghost', onclick: stopAll }, '■ Stop'),
    ),
    h('div', { class: 'row' },
      h('label', { class: 'tempo' }, 'Tempo ', tempo),
      tempoLabel,
    ),
    h('div', { class: 'row small' },
      h('label', {}, names, ' Numele notelor'),
      h('label', {}, guide, ' Pian în surdină cât cânt'),
      ex.generate ? h('button', { class: 'btn ghost', onclick: () => { stopAll(); seed = Math.floor(Math.random() * 1e9); r = resolveMelody(ex, seed); credit.textContent = r.credit; states = {}; result.textContent = '\u00a0'; draw(); } }, '↻ Alt solfegiu') : null,
    ),
    result,
    h('details', { class: 'self' },
      h('summary', {}, 'Fără microfon? Autoevaluează-te'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => finishSelf(1, 'mi-a ieșit') }, 'Mi-a ieșit'),
        h('button', { class: 'btn', onclick: () => finishSelf(0.5, 'pe jumătate') }, 'Pe jumătate'),
        h('button', { class: 'btn', onclick: () => finishSelf(0.2, 'nu încă') }, 'Nu încă'),
      ),
    ),
    h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: () => { stopAll(); ctx.finish(best, sung ? `cel mai bun scor: ${pct(best)}` : 'nu ai cântat încă cu microfonul'); } }, 'Gata')),
  );
  draw();
  return stopAll;
};
