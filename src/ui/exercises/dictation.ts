// Dicteu melodic: auzi cadența și o frază scurtă din lecție, ritmul e deja scris, tu completezi înălțimile.
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, pct, staffBox, availableWidth } from '../dom.ts';
import { renderStaff } from '../../lib/staff.ts';
import type { NoteState } from '../../lib/staff.ts';
import { parseMelody } from '../../lib/notation.ts';
import type { Melody, MNote } from '../../lib/notation.ts';
import { generateMelody, LEVELS, levelPool } from '../../lib/melodyGen.ts';
import { gradeDictation, poolLabels } from '../../lib/dictation.ts';
import type { DictationGrade } from '../../lib/dictation.ts';
import { roName } from '../../lib/theory.ts';
import { audioCtx, newVoice, playCadence, playMelody, playNote } from '../../audio/audio.ts';
import type { Playback, Voice } from '../../audio/audio.ts';

type DictEx = Extract<Exercise, { kind: 'dictation' }>;

export const DICTATION_BPM = 72;

export const runDictation: Runner<DictEx> = (root, ex, ctx) => {
  const lesson = Math.min(Math.max(ex.lesson, 1), 6);
  const pool = levelPool(LEVELS[lesson]);
  const labelsFor = poolLabels(pool);
  let mel: Melody = parseMelody('C4h');
  let answers: (string | null)[] = [];
  let given: number[] = [];
  let cursor = -1;
  let checked = false;
  let grade: DictationGrade = { correct: [], ok: 0, total: 0, score: 0 };
  let best = 0;
  let rounds = 0;
  let firstPlay = true;
  let pb: Playback | null = null;
  let cad: Voice | null = null;
  let timer = 0;
  const box = h('div', { class: 'ex ex-dict' });
  const staff = h('div');
  const result = h('p', { class: 'feedback', 'aria-live': 'polite' }, '\u00a0');
  root.append(box);

  const nextEmpty = (from: number): number => {
    for (let i = from + 1; i < mel.notes.length; i++) if (mel.notes[i].pitch && answers[i] === null) return i;
    return -1;
  };

  const fresh = () => {
    const g = generateMelody({ lesson, measures: lesson >= 6 ? 2 : 3, seed: Math.floor(Math.random() * 1e9) });
    mel = parseMelody(g.source, g.time);
    answers = mel.notes.map(() => null);
    const first = mel.notes.findIndex((n) => n.pitch !== null);
    // prima notă e dată, ca la dicteul clasic
    answers[first] = mel.notes[first].pitch;
    given = [first];
    cursor = nextEmpty(first);
    checked = false;
    firstPlay = true;
    result.textContent = '\u00a0';
  };

  const draw = () => {
    const notes: MNote[] = mel.notes.map((n, i) => ({ ...n, pitch: n.pitch === null ? null : answers[i] ?? 'B4' }));
    const states: Record<number, NoteState> = {};
    const labels: Record<number, string> = {};
    mel.notes.forEach((n, i) => {
      if (!n.pitch) return;
      const a = answers[i];
      if (checked) {
        const good = grade.correct[i];
        states[i] = good ? 'ok' : 'bad';
        labels[i] = good ? roName(n.pitch) : `→${roName(n.pitch)}`;
      } else if (a === null) {
        states[i] = i === cursor ? 'current' : 'hint';
        labels[i] = i === cursor ? '?' : '·';
      } else {
        labels[i] = roName(a);
      }
    });
    staff.replaceChildren(staffBox(renderStaff({ notes, time: mel.time, width: availableWidth(box), states, labels }).svg));
  };

  const stop = () => {
    clearTimeout(timer);
    pb?.stop();
    pb = null;
    cad?.stop();
    cad = null;
  };

  const playPhrase = () => {
    pb = playMelody(mel.notes, { bpm: DICTATION_BPM, beatsPerMeasure: mel.time[0], countIn: 1, metronome: false });
  };

  const play = (withCadence: boolean) => {
    stop();
    if (!withCadence) return playPhrase();
    const v = newVoice();
    cad = v;
    const dur = playCadence(v, audioCtx().currentTime + 0.05);
    timer = window.setTimeout(playPhrase, (dur + 0.15) * 1000);
  };

  const choose = (p: string) => {
    if (checked || cursor < 0) return;
    answers[cursor] = p;
    try {
      playNote(p, 0.5);
    } catch {
      /* fără audio */
    }
    cursor = nextEmpty(cursor);
    draw();
  };

  const back = () => {
    if (checked) return;
    const end = cursor < 0 ? mel.notes.length : cursor;
    for (let i = end - 1; i >= 0; i--) {
      if (given.includes(i)) break;
      if (mel.notes[i].pitch && answers[i] !== null) {
        answers[i] = null;
        cursor = i;
        break;
      }
    }
    draw();
  };

  const check = () => {
    if (checked) return;
    grade = gradeDictation(mel.notes.map((n) => n.pitch), answers, given);
    checked = true;
    rounds++;
    best = Math.max(best, grade.score);
    result.textContent = `${grade.ok}/${grade.total} note corecte · ${pct(grade.score)}. ${grade.score === 1 ? 'Perfect!' : 'Ascultă din nou și compară: sub notele roșii e varianta corectă.'}`;
    draw();
  };

  box.append(
    h('p', { class: 'hint' }, 'Ascultă cadența și fraza, apoi scrie notele în ordine. Ritmul e deja scris, prima notă e dată: tu alegi doar înălțimile.'),
    staff,
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => { play(firstPlay); firstPlay = false; } }, '▶ Ascultă'),
      h('button', { class: 'btn ghost', onclick: () => play(true) }, 'Cadența + fraza'),
      h('button', { class: 'btn ghost', onclick: back }, '⌫ Șterge'),
    ),
    h('div', { class: 'choices' }, pool.map((p) => h('button', { class: 'choice wide', 'data-pitch': p, onclick: () => choose(p) }, labelsFor[p]))),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: check }, '✓ Verifică'),
      h('button', { class: 'btn ghost', onclick: () => { stop(); fresh(); draw(); } }, '↻ Altul'),
    ),
    result,
    h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: () => { stop(); ctx.finish(best, rounds ? `cel mai bun dicteu: ${pct(best)}` : 'nu ai verificat niciun dicteu'); } }, 'Gata')),
  );
  fresh();
  draw();
  return stop;
};
