// Detecție de înălțime pentru voce, algoritm YIN (de Cheveigné & Kawahara, 2002), fără dependențe.

export interface PitchResult {
  freq: number;
  /** 0..1, cât de „curat” e sunetul periodic */
  clarity: number;
  rms: number;
}

export interface PitchOptions {
  minFreq?: number;
  maxFreq?: number;
  /** sub acest prag = liniște */
  rmsThreshold?: number;
  /** pragul YIN pentru funcția diferență normalizată */
  threshold?: number;
}

/** Claritatea minimă de la care considerăm că e o notă cântată (vocea reală are respirație și vibrato). */
export const MIN_CLARITY = 0.6;

export function rms(buf: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

export function detectPitch(buf: ArrayLike<number>, sampleRate: number, o: PitchOptions = {}): PitchResult | null {
  const minFreq = o.minFreq ?? 70;
  const maxFreq = o.maxFreq ?? 1100;
  const threshold = o.threshold ?? 0.15;
  const level = rms(buf);
  if (level < (o.rmsThreshold ?? 0.003)) return null;
  const n = buf.length;
  const maxLag = Math.min(Math.floor(sampleRate / minFreq), Math.floor(n / 2));
  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
  const win = n - maxLag;
  const diff = new Float64Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i < win; i++) {
      const x = buf[i] - buf[i + lag];
      s += x * x;
    }
    diff[lag] = s;
  }
  // funcția diferență normalizată cumulativ (CMNDF)
  const cm = new Float64Array(maxLag + 1);
  cm[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    running += diff[lag];
    cm[lag] = running === 0 ? 1 : (diff[lag] * lag) / running;
  }
  let tau = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (cm[lag] < threshold) {
      while (lag + 1 <= maxLag && cm[lag + 1] < cm[lag]) lag++;
      tau = lag;
      break;
    }
  }
  if (tau < 0) {
    let best = minLag;
    for (let lag = minLag; lag <= maxLag; lag++) if (cm[lag] < cm[best]) best = lag;
    if (cm[best] > 0.35) return null;
    tau = best;
  }
  let refined = tau;
  if (tau > 1 && tau < maxLag) {
    const s0 = cm[tau - 1];
    const s1 = cm[tau];
    const s2 = cm[tau + 1];
    const denom = s0 - 2 * s1 + s2;
    if (denom !== 0) refined = tau + (s0 - s2) / (2 * denom);
  }
  return { freq: sampleRate / refined, clarity: Math.max(0, 1 - cm[tau]), rms: level };
}

/** Netezire: mediana ultimelor valori, ca acul acordorului să nu sară. */
export function median(values: number[]): number {
  const a = values.slice().sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
