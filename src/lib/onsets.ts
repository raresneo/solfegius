// Detectarea atacurilor (începutul notelor) din vocea cântată, ca să măsurăm ritmul separat de intonație.
import { scoreTaps } from './rhythm.ts';
import type { TapScore } from './rhythm.ts';

export interface Frame {
  /** secunde, relativ la începutul melodiei */
  t: number;
  /** volumul (RMS) cadrului */
  level: number;
  /** înălțimea detectată ca MIDI fracționar, null dacă nu e o notă clară */
  midi: number | null;
}

export interface OnsetOptions {
  /** sub acest volum = liniște */
  silence?: number;
  /** două atacuri nu pot fi mai apropiate de atât (secunde) */
  minGap?: number;
  /** salt de înălțime (semitonuri) care înseamnă notă nouă */
  pitchJump?: number;
  /** câte cadre trebuie să rămână stabilă noua înălțime */
  stableFrames?: number;
  /** scăderea de volum (fracție din vârf) care pregătește un re-atac pe aceeași notă */
  dipRatio?: number;
  /** câte cadre fără notă înseamnă că sunetul s-a oprit (ignorăm căderile de un cadru) */
  gapFrames?: number;
}

export function detectOnsets(frames: Frame[], o: OnsetOptions = {}): number[] {
  const silence = o.silence ?? 0.003;
  const minGap = o.minGap ?? 0.09;
  const jump = o.pitchJump ?? 0.7;
  const stable = o.stableFrames ?? 3;
  const dipRatio = o.dipRatio ?? 0.5;
  const gapFrames = o.gapFrames ?? 2;
  const out: number[] = [];
  const push = (t: number): void => {
    if (!out.length || t - out[out.length - 1] >= minGap) out.push(t);
  };
  let voiced = false;
  let unvoicedRun = 0;
  let ref: number | null = null;
  let peak = 0;
  let dipped = false;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.level < silence || f.midi === null) {
      unvoicedRun++;
      if (unvoicedRun >= gapFrames) {
        voiced = false;
        ref = null;
        peak = 0;
        dipped = false;
      }
      continue;
    }
    unvoicedRun = 0;
    const m = f.midi;
    if (!voiced) {
      voiced = true;
      push(f.t);
      ref = m;
      peak = f.level;
      dipped = false;
      continue;
    }
    if (f.level < peak * dipRatio) {
      dipped = true;
    } else if (dipped && f.level >= peak * 0.8) {
      push(f.t);
      ref = m;
      peak = f.level;
      dipped = false;
      continue;
    }
    peak = Math.max(peak * 0.995, f.level);
    if (ref !== null && Math.abs(m - ref) >= jump) {
      let ok = true;
      for (let k = 1; k < stable; k++) {
        const g = frames[i + k];
        if (!g || g.midi === null || Math.abs(g.midi - m) > 0.5) {
          ok = false;
          break;
        }
      }
      if (ok) {
        push(f.t);
        ref = m;
        peak = f.level;
        dipped = false;
      }
    }
  }
  return out;
}

/** Detecția înălțimii are nevoie de câteva zeci de ms de sunet stabil: compensăm întârzierea. */
export const ONSET_LAG = 0.05;

/** Scorul de ritm al unei interpretări cântate: câte note au început la timp. Atacurile în plus nu penalizează (vocea are respirații, consoane). */
export function rhythmFromOnsets(expected: number[], detected: number[], tol: number): TapScore {
  const s = scoreTaps(expected, detected.map((t) => t - ONSET_LAG), tol);
  return { ...s, score: expected.length ? s.hits / expected.length : 0 };
}
