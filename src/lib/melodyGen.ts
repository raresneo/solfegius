// Generator de melodii „în stilul lecției”: folosește doar treptele și ritmurile învățate până atunci.
import { parseNote, noteFromDiatonic } from './theory.ts';
import type { Rng } from './random.ts';
import { mulberry32, weightedPick, pick } from './random.ts';
import { generateRhythm, LESSON_CELLS, LESSON_TIME } from './rhythm.ts';

export interface Level {
  low: string;
  high: string;
  /** notele între care sunt permise salturi (arpegiul + treptele „fixate” în lecții) */
  leapSet: string[];
  stepWeight: number;
  leapWeight: number;
}

const ARP = ['C4', 'E4', 'G4', 'C5'];

export const LEVELS: Record<number, Level> = {
  1: { low: 'C4', high: 'C5', leapSet: [], stepWeight: 1, leapWeight: 0 },
  2: { low: 'C4', high: 'C5', leapSet: ARP, stepWeight: 3, leapWeight: 1.5 },
  3: { low: 'B3', high: 'C5', leapSet: [...ARP, 'B3', 'B4'], stepWeight: 3, leapWeight: 1.5 },
  4: { low: 'B3', high: 'D5', leapSet: [...ARP, 'B3', 'B4', 'D4', 'D5'], stepWeight: 3, leapWeight: 1.6 },
  5: { low: 'A3', high: 'D5', leapSet: [...ARP, 'B3', 'B4', 'D4', 'D5', 'A3', 'A4'], stepWeight: 3, leapWeight: 1.7 },
  6: { low: 'A3', high: 'E5', leapSet: [...ARP, 'B3', 'B4', 'D4', 'D5', 'A3', 'A4', 'F4', 'E5'], stepWeight: 3, leapWeight: 1.8 },
};

export interface GenOptions {
  lesson: number;
  measures?: number;
  seed?: number;
  /** doime finală și în lecția 1 (unde doimea nu e încă în celule) */
  finalHalf?: boolean;
}

export interface Generated {
  source: string;
  time: [number, number];
  seed: number;
}

function d(n: string): number {
  return parseNote(n).diatonic;
}

/** Notele permise (Do major, fără alterații) într-un nivel. */
export function levelPool(level: Level): string[] {
  const out: string[] = [];
  for (let x = d(level.low); x <= d(level.high); x++) out.push(noteFromDiatonic(x));
  return out;
}

function nextPitch(cur: string, level: Level, rng: Rng): string {
  const pool = levelPool(level);
  const cd = d(cur);
  const letter = cur[0];
  // tendințe: sensibila urcă la Do, treapta a IV-a coboară la Mi (cu probabilitate mare)
  if (letter === 'B' && rng() < 0.75 && pool.includes(noteFromDiatonic(cd + 1))) return noteFromDiatonic(cd + 1);
  if (letter === 'F' && rng() < 0.5 && pool.includes(noteFromDiatonic(cd - 1))) return noteFromDiatonic(cd - 1);
  const cands: string[] = [];
  const weights: number[] = [];
  for (const p of pool) {
    const dist = Math.abs(d(p) - cd);
    if (dist === 1) {
      cands.push(p);
      weights.push(level.stepWeight);
    } else if (dist >= 2 && dist <= 7 && level.leapWeight > 0 && level.leapSet.includes(cur) && level.leapSet.includes(p)) {
      cands.push(p);
      weights.push(level.leapWeight / (dist > 4 ? 2 : 1));
    }
  }
  return weightedPick(cands, weights, rng);
}

function closesOnTonic(prev: string, level: Level): string | null {
  const tonics = ['C4', 'C5'].filter((t) => levelPool(level).includes(t));
  // întâi pas (II→I sau VII→I), apoi salt mic din arpegiu (V→I, III→I)
  for (const t of tonics) if (Math.abs(d(t) - d(prev)) === 1) return t;
  if (level.leapWeight > 0 && level.leapSet.includes(prev)) {
    for (const t of tonics) {
      const dist = Math.abs(d(t) - d(prev));
      if (dist >= 2 && dist <= 4) return t;
    }
  }
  return null;
}

export function generateMelody(o: GenOptions): Generated {
  const lesson = Math.min(Math.max(o.lesson, 1), 6);
  const level = LEVELS[lesson];
  const time = LESSON_TIME[lesson];
  const seed = o.seed ?? Math.floor(Math.random() * 1e9);
  const rng = mulberry32(seed);
  const measures = o.measures ?? (time[0] === 4 ? 4 : 8);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rhythm = generateRhythm({ cells: LESSON_CELLS[lesson], measures, time, rng, endLong: lesson >= 2, finalHalf: o.finalHalf });
    const pitchedCount = rhythm.flat().filter((t) => !t.startsWith('r')).length;
    const pitches: string[] = [];
    let cur = lesson === 1 ? 'C4' : pick(['C4', 'E4', 'G4'], rng);
    pitches.push(cur);
    for (let i = 1; i < pitchedCount - 1; i++) {
      cur = nextPitch(cur, level, rng);
      pitches.push(cur);
    }
    const last = closesOnTonic(cur, level);
    if (!last) continue;
    pitches.push(last);
    let pi = 0;
    const source = rhythm
      .map((m) => m.map((t) => (t.startsWith('r') ? t : `${pitches[pi++]}${t}`)).join(' '))
      .join(' | ');
    return { source, time, seed };
  }
  throw new Error('generateMelody: nu am reușit să închid pe tonică');
}

/** „Joc pe gamă” (lecția 1): urcări/coborâri pe trepte alăturate, cu opriri pe Do. */
export function scaleGame(seed: number, length = 16): Generated {
  const rng = mulberry32(seed);
  const level: Level = { low: 'G3', high: 'G5', leapSet: [], stepWeight: 1, leapWeight: 0 };
  const pitches = ['C4'];
  let dir = 1;
  while (pitches.length < length - 1) {
    const cur = pitches[pitches.length - 1];
    if (rng() < 0.2) dir = -dir;
    let nd = d(cur) + dir;
    if (nd > d(level.high) || nd < d(level.low)) {
      dir = -dir;
      nd = d(cur) + dir;
    }
    pitches.push(noteFromDiatonic(nd));
  }
  // drum de întoarcere pe trepte până la cel mai apropiat Do
  let cur = pitches[pitches.length - 1];
  const target = Math.abs(d(cur) - d('C4')) <= Math.abs(d(cur) - d('C5')) ? 'C4' : 'C5';
  while (cur !== target) {
    cur = noteFromDiatonic(d(cur) + (d(target) > d(cur) ? 1 : -1));
    pitches.push(cur);
  }
  // pătrimi grupate în 2/4, ultima măsură completată cu doime pe Do
  if (pitches.length % 2 === 1) {
    const body = pitches.slice(0, -1);
    const measures: string[] = [];
    for (let i = 0; i < body.length; i += 2) measures.push(`${body[i]}q ${body[i + 1] ?? body[i]}q`);
    measures.push(`${pitches[pitches.length - 1]}h`);
    return { source: measures.join(' | '), time: [2, 4], seed };
  }
  const measures: string[] = [];
  for (let i = 0; i < pitches.length; i += 2) measures.push(`${pitches[i]}q ${pitches[i + 1]}q`);
  measures.push(`${target}h`);
  return { source: measures.join(' | '), time: [2, 4], seed };
}
