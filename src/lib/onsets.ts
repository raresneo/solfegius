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
  /**
   * după un atac, atâtea secunde nu căutăm salturi de înălțime și urmărim nota până se așază
   * (pe pista netezită, rampa unei schimbări de notă altfel dădea două atacuri). 0 = ca înainte.
   */
  settle?: number;
}

export function detectOnsets(frames: Frame[], o: OnsetOptions = {}): number[] {
  const silence = o.silence ?? 0.003;
  const minGap = o.minGap ?? 0.09;
  const jump = o.pitchJump ?? 0.7;
  const stable = o.stableFrames ?? 3;
  const dipRatio = o.dipRatio ?? 0.5;
  const gapFrames = o.gapFrames ?? 2;
  const settle = o.settle ?? 0;
  const out: number[] = [];
  const push = (t: number): void => {
    if (!out.length || t - out[out.length - 1] >= minGap) out.push(t);
  };
  let voiced = false;
  let unvoicedRun = 0;
  let ref: number | null = null;
  let peak = 0;
  let dipped = false;
  let settleUntil = -Infinity;
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
      settleUntil = f.t + settle;
      continue;
    }
    if (f.level < peak * dipRatio) {
      dipped = true;
    } else if (dipped && f.level >= peak * 0.8) {
      push(f.t);
      ref = m;
      peak = f.level;
      dipped = false;
      settleUntil = f.t + settle;
      continue;
    }
    peak = Math.max(peak * 0.995, f.level);
    if (f.t < settleUntil) {
      ref = m;
      continue;
    }
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
        settleUntil = f.t + settle;
      }
    }
  }
  return out;
}

/**
 * Netezire centrată a înălțimii, pe segmente cântate continuu (fereastră ≈ un ciclu de vibrato).
 * Vibrato-ul de cântăreț (±50–100 de cenți, 5–7 Hz) nu mai arată ca note noi, iar o schimbare reală
 * de notă (cel puțin un semiton) rămâne la locul ei. Liniștea și căderile de un cadru nu se ating.
 */
export function smoothTrack(frames: Frame[], win = 0.16, silence = 0.003): Frame[] {
  const voicedAt = (k: number): boolean => k < frames.length && frames[k].midi !== null && frames[k].level >= silence;
  const out = frames.slice();
  const half = win / 2;
  let i = 0;
  while (i < frames.length) {
    if (!voicedAt(i)) {
      i++;
      continue;
    }
    // segmentul continuu: o cădere de un singur cadru nu îl taie
    let j = i;
    while (voicedAt(j + 1) || (!voicedAt(j + 1) && voicedAt(j + 2))) j++;
    let lo = i;
    let hi = i;
    let sum = 0;
    let n = 0;
    for (let k = i; k <= j; k++) {
      if (!voicedAt(k)) continue;
      const t = frames[k].t;
      while (hi <= j && frames[hi].t <= t + half) {
        if (voicedAt(hi)) {
          sum += frames[hi].midi as number;
          n++;
        }
        hi++;
      }
      while (lo < hi && frames[lo].t < t - half) {
        if (voicedAt(lo)) {
          sum -= frames[lo].midi as number;
          n--;
        }
        lo++;
      }
      if (n > 0) out[k] = { ...frames[k], midi: sum / n };
    }
    i = j + 1;
  }
  return out;
}

/** Detecția înălțimii are nevoie de câteva zeci de ms de sunet stabil: compensăm întârzierea. */
export const ONSET_LAG = 0.05;

/**
 * Scorul de ritm al unei interpretări cântate: câte note au început la timp. Atacurile în plus nu penalizează
 * (vocea are respirații, consoane). `lag` = decalajul constant estimat (căști, microfon), scăzut înainte de notare.
 */
export function rhythmFromOnsets(expected: number[], detected: number[], tol: number, lag = 0): TapScore {
  const s = scoreTaps(expected, detected.map((t) => t - ONSET_LAG - lag), tol);
  return { ...s, score: expected.length ? s.hits / expected.length : 0 };
}
