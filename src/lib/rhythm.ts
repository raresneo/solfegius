// Ritm: celule ritmice pe lecții (după „Solfegiu pentru toți”, vol. I) și evaluarea bătăilor (tap).
import type { Rng } from './random.ts';
import { pick } from './random.ts';
import { measureLength } from './notation.ts';

/** O celulă = una sau mai multe durate care umplu împreună un timp sau mai mulți. „r” în față = pauză. */
export type Cell = string[];

const TOKEN_LEN: Record<string, number> = { w: 4, h: 2, 'h.': 3, q: 1, 'q.': 1.5, e: 0.5, s: 0.25, rq: 1, rh: 2, re: 0.5 };

export function tokenLength(tok: string): number {
  const v = TOKEN_LEN[tok];
  if (v === undefined) throw new Error(`Durată necunoscută: ${tok}`);
  return v;
}

export function cellLength(cell: Cell): number {
  return cell.reduce((a, t) => a + tokenLength(t), 0);
}

/** Ce celule ritmice sunt permise la fiecare lecție (cumulativ). */
export const LESSON_CELLS: Record<number, Cell[]> = {
  1: [['q']],
  2: [['q'], ['h']],
  3: [['q'], ['h'], ['e', 'e']],
  4: [['q'], ['h'], ['e', 'e'], ['rq']],
  5: [['q'], ['h'], ['e', 'e'], ['rq'], ['q.', 'e']],
  6: [['q'], ['h'], ['e', 'e'], ['rq'], ['q.', 'e']],
};

export const LESSON_TIME: Record<number, [number, number]> = {
  1: [2, 4], 2: [2, 4], 3: [2, 4], 4: [2, 4], 5: [2, 4], 6: [4, 4],
};

export interface RhythmOptions {
  cells: Cell[];
  measures: number;
  time: [number, number];
  rng: Rng;
  /** ultima măsură se încheie cu o durată lungă (dacă există doimea în celule) */
  endLong?: boolean;
  /** doime finală chiar dacă nu e încă în celule (ca gama din lecția 1, care se încheie pe Do lung) */
  finalHalf?: boolean;
}

/** Generează măsuri de durate, ex. [['q','q'], ['h']]. Fără pauză pe primul timp al piesei și fără două pauze la rând. */
export function generateRhythm(o: RhythmOptions): string[][] {
  const len = measureLength(o.time);
  const hasHalf = o.cells.some((c) => c.length === 1 && c[0] === 'h');
  const out: string[][] = [];
  let lastWasRest = false;
  for (let m = 0; m < o.measures; m++) {
    const isLast = m === o.measures - 1;
    const measure: string[] = [];
    let pos = 0;
    if (isLast && ((o.endLong && hasHalf) || o.finalHalf)) {
      // final: umplem până la ultimii 2 timpi, apoi o doime
      while (len - pos > 2) {
        measure.push('q');
        pos += 1;
      }
      measure.push('h');
      out.push(measure);
      break;
    }
    let guard = 0;
    while (pos < len - 1e-9) {
      if (guard++ > 100) throw new Error('generateRhythm: buclă');
      const remaining = len - pos;
      const options = o.cells.filter((c) => {
        const l = cellLength(c);
        if (l > remaining + 1e-9) return false;
        if (c[0].startsWith('r') && (lastWasRest || (m === 0 && pos === 0) || isLast)) return false;
        if (c[0] === 'q.' && Math.abs(pos - Math.round(pos)) > 1e-9) return false;
        return true;
      });
      const cell = pick(options, o.rng);
      measure.push(...cell);
      pos += cellLength(cell);
      lastWasRest = cell[cell.length - 1].startsWith('r');
    }
    out.push(measure);
  }
  return out;
}

export interface TapResult {
  hit: boolean;
  /** secunde; pozitiv = prea târziu */
  error: number | null;
}

export interface TapScore {
  results: TapResult[];
  hits: number;
  extras: number;
  score: number;
  meanError: number | null;
}

/** Potrivește bătăile utilizatorului cu momentele așteptate (toleranța în secunde). */
export function scoreTaps(expected: number[], taps: number[], tol: number): TapScore {
  const used = new Set<number>();
  const results: TapResult[] = expected.map((t) => {
    let best = -1;
    let bestErr = Infinity;
    taps.forEach((x, i) => {
      if (used.has(i)) return;
      const e = Math.abs(x - t);
      if (e < bestErr) {
        bestErr = e;
        best = i;
      }
    });
    if (best >= 0 && bestErr <= tol) {
      used.add(best);
      return { hit: true, error: taps[best] - t };
    }
    return { hit: false, error: null };
  });
  const hits = results.filter((r) => r.hit).length;
  const extras = taps.length - used.size;
  const errs = results.filter((r) => r.hit).map((r) => Math.abs(r.error ?? 0));
  return {
    results,
    hits,
    extras,
    score: expected.length ? Math.max(0, (hits - 0.5 * extras) / expected.length) : 0,
    meanError: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null,
  };
}

export interface CompensatedScore extends TapScore {
  /** decalajul constant scăzut din bătăi, în secunde (pozitiv = bați constant după metronom) */
  latency: number;
}

/**
 * Ca scoreTaps, dar scade întâi un decalaj constant: latența ecranului, a difuzorului, a căștilor Bluetooth
 * (pe iPhone cu AirPods ajunge la 150–250 ms și făcea orice bătaie „ratată”). Contează să bați egal cu
 * metronomul; un decalaj fix de până la maxShift nu e o greșeală de ritm. Se păstrează varianta cu scor mai mare.
 */
export function scoreTapsCompensated(expected: number[], taps: number[], tol: number, maxShift = 0.35): CompensatedScore {
  const raw = scoreTaps(expected, taps, tol);
  const diffs: number[] = [];
  for (const t of expected) {
    let d = Infinity;
    for (const x of taps) if (Math.abs(x - t) < Math.abs(d)) d = x - t;
    if (Math.abs(d) <= maxShift) diffs.push(d);
  }
  if (diffs.length < Math.max(2, Math.ceil(expected.length / 2))) return { ...raw, latency: 0 };
  const sorted = [...diffs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lat = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  if (Math.abs(lat) < 0.03) return { ...raw, latency: 0 };
  // decalajul trebuie să fie constant: dacă bătăile sunt împrăștiate, nu e latență, e ritm inegal
  const spread = diffs.map((d) => Math.abs(d - lat)).sort((a, b) => a - b)[Math.floor(diffs.length / 2)];
  if (spread > 0.08) return { ...raw, latency: 0 };
  const shifted = scoreTaps(expected, taps.map((x) => x - lat), tol);
  return shifted.score > raw.score ? { ...shifted, latency: lat } : { ...raw, latency: 0 };
}
