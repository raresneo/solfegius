// Intonație: „ține nota” până e validată. Logică pură, fără microfon, ca să o putem testa.

/** Cât timp din ultima secundă trebuie să fii în toleranță ca nota să fie validată. */
export const HOLD_SECONDS = 0.45;
export const WINDOW_SECONDS = 1;
/**
 * Pe cât timp facem media înălțimii (≈ 2 cicluri de vibrato la 5,5 Hz). Înainte comparam cadru cu cadru,
 * iar vibrato-ul de cântăreț (±50–100 de cenți) ieșea din toleranță la fiecare oscilație.
 */
export const CENTER_SECONDS = 0.35;

export interface HoldReading {
  /** centrul intonației față de țintă (cenți) sau null dacă acum nu se aude o notă clară */
  center: number | null;
  inTol: boolean;
  /** secunde în toleranță din ultima fereastră */
  okTime: number;
  held: boolean;
}

export interface HoldDetector {
  /** t = secunde; cents = abaterea cadrului față de țintă (fără octavă) sau null */
  push(t: number, cents: number | null, tolerance: number): HoldReading;
  /** la notă nouă: uităm tot ce s-a auzit pe nota veche */
  reset(): void;
}

export function holdDetector(): HoldDetector {
  let lastT = 0;
  let pts: { t: number; c: number }[] = [];
  let hist: { t: number; dt: number; ok: boolean }[] = [];
  return {
    push(t, cents, tolerance) {
      const dt = lastT ? Math.min(0.1, Math.max(0, t - lastT)) : 0;
      lastT = t;
      if (cents !== null) pts.push({ t, c: cents });
      pts = pts.filter((p) => p.t > t - CENTER_SECONDS);
      const center = cents === null || !pts.length ? null : pts.reduce((a, p) => a + p.c, 0) / pts.length;
      const inTol = center !== null && Math.abs(center) <= tolerance;
      hist.push({ t, dt, ok: inTol });
      hist = hist.filter((x) => x.t > t - WINDOW_SECONDS);
      const okTime = hist.reduce((a, x) => a + (x.ok ? x.dt : 0), 0);
      return { center, inTol, okTime, held: okTime >= HOLD_SECONDS };
    },
    reset() {
      pts = [];
      hist = [];
    },
  };
}
