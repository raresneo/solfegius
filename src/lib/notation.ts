// Parser pentru melodii scrise compact, ex: "C4q D4q | E4h".
// Durate: w = întreagă (4), h = doime (2), q = pătrime (1), e = optime (1/2), s = șaisprezecime (1/4).
// „.” după durată = cu punct. „r” în loc de notă = pauză (ex. „rq”). „~” la final = legato spre nota următoare.

import { isNote } from './theory.ts';

export type DurType = 'w' | 'h' | 'q' | 'e' | 's';

export const DUR: Record<DurType, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };

export interface MNote {
  /** null = pauză */
  pitch: string | null;
  /** durată în pătrimi */
  dur: number;
  type: DurType;
  dotted: boolean;
  tie: boolean;
  measure: number;
  /** poziția în măsură, în pătrimi de la începutul măsurii */
  beat: number;
}

export interface Melody {
  time: [number, number];
  notes: MNote[];
  measures: number;
}

const TOKEN_RE = /^(r|[A-G](?:#{1,2}|b{1,2})?-?\d)([whqes])(\.?)(~?)$/;

export function measureLength(time: [number, number]): number {
  return time[0] * (4 / time[1]);
}

export function parseMelody(src: string, time: [number, number] = [2, 4], opts: { anacrusis?: boolean } = {}): Melody {
  const len = measureLength(time);
  const parts = src.split('|').map((s) => s.trim()).filter(Boolean);
  const notes: MNote[] = [];
  parts.forEach((part, mi) => {
    let sum = 0;
    for (const tok of part.split(/\s+/)) {
      const m = TOKEN_RE.exec(tok);
      if (!m) throw new Error(`Simbol invalid „${tok}” în măsura ${mi + 1}`);
      if (m[1] !== 'r' && !isNote(m[1])) throw new Error(`Notă invalidă „${m[1]}”`);
      const type = m[2] as DurType;
      const dotted = m[3] === '.';
      const dur = DUR[type] * (dotted ? 1.5 : 1);
      notes.push({ pitch: m[1] === 'r' ? null : m[1], dur, type, dotted, tie: m[4] === '~', measure: mi, beat: sum });
      sum += dur;
    }
    const isPickup = opts.anacrusis && mi === 0;
    if (Math.abs(sum - len) > 1e-9 && !(isPickup && sum < len)) {
      throw new Error(`Măsura ${mi + 1} are ${sum} pătrimi în loc de ${len}`);
    }
  });
  return { time, notes, measures: parts.length };
}

export interface Onset {
  index: number;
  start: number;
  dur: number;
  pitch: string | null;
}

/** Momentele de început (în secunde) pentru fiecare notă, la un tempo dat în pătrimi pe minut. Notele legate (tie) se contopesc. */
export function toOnsets(notes: MNote[], bpm: number): Onset[] {
  const beat = 60 / bpm;
  const out: Onset[] = [];
  let t = 0;
  let prevTied = false;
  notes.forEach((n, index) => {
    const dur = n.dur * beat;
    if (prevTied && out.length) {
      out[out.length - 1].dur += dur;
    } else {
      out.push({ index, start: t, dur, pitch: n.pitch });
    }
    prevTied = n.tie;
    t += dur;
  });
  return out;
}

export function totalBeats(notes: MNote[]): number {
  return notes.reduce((a, n) => a + n.dur, 0);
}

/** Silabe ritmice ca în carte: ta (pătrime), ta-a (doime), ti (optime). */
export function rhythmSyllable(n: MNote): string {
  if (n.pitch === null) return '–';
  if (n.type === 'w') return 'ta-a-a-a';
  if (n.type === 'h') return n.dotted ? 'ta-a-a' : 'ta-a';
  if (n.type === 'q') return n.dotted ? 'ta-a' : 'ta';
  return 'ti';
}
