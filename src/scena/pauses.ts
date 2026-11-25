// Vocea: din volumul înregistrat (RMS ~30 de cadre pe secundă) găsim unde vorbești și unde taci.
// Pauzele logice și psihologice din „Vorbirea pe scenă” devin măsurabile: câte, cât de lungi, unde.

export interface EnvPoint {
  t: number;
  rms: number;
}

export interface Segment {
  start: number;
  end: number;
  voiced: boolean;
}

export interface TakeStats {
  duration: number;
  /** timp cu voce, secunde */
  voiced: number;
  /** duratele pauzelor din interior (fără liniștea de la început și sfârșit) */
  pauses: number[];
  longest: number;
  /** nivelul mediu pe voce, dBFS */
  level: number;
  /** cel mai tare moment, dBFS */
  peak: number;
  segments: Segment[];
}

const db = (x: number): number => 20 * Math.log10(Math.max(x, 1e-6));

const pctile = (xs: number[], p: number): number => {
  if (!xs.length) return -120;
  const a = xs.slice().sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))];
};

/** Prag adaptiv: între zgomotul camerei și vocea ta, nu o valoare fixă (telefoanele diferă mult). */
export function segment(env: EnvPoint[], minPause = 0.2, minVoice = 0.08): Segment[] {
  if (env.length < 2) return [];
  const levels = env.map((p) => db(p.rms));
  const floor = pctile(levels, 0.15);
  const top = pctile(levels, 0.95);
  const thr = Math.max(-60, floor + Math.max(6, 0.3 * (top - floor)));
  const raw: Segment[] = [];
  for (let i = 0; i < env.length; i++) {
    const v = levels[i] > thr;
    const t0 = env[i].t;
    const t1 = i + 1 < env.length ? env[i + 1].t : env[i].t + (env[i].t - env[i - 1].t);
    const last = raw[raw.length - 1];
    if (last && last.voiced === v) last.end = t1;
    else raw.push({ start: t0, end: t1, voiced: v });
  }
  // pauze prea scurte = respirație între silabe; voce prea scurtă = zgomot
  const merged: Segment[] = [];
  for (const s of raw) {
    const short = s.end - s.start < (s.voiced ? minVoice : minPause);
    const inner = merged.length > 0;
    const seg = short && inner ? { ...s, voiced: merged[merged.length - 1].voiced } : s;
    const last = merged[merged.length - 1];
    if (last && last.voiced === seg.voiced) last.end = seg.end;
    else merged.push({ ...seg });
  }
  return merged;
}

export function takeStats(env: EnvPoint[]): TakeStats {
  const segments = segment(env);
  const duration = env.length ? env[env.length - 1].t - env[0].t : 0;
  const voicedSegs = segments.filter((s) => s.voiced);
  const firstV = segments.findIndex((s) => s.voiced);
  let lastV = -1;
  segments.forEach((s, i) => {
    if (s.voiced) lastV = i;
  });
  const pauses = firstV < 0 ? [] : segments.slice(firstV, lastV + 1).filter((s) => !s.voiced).map((s) => s.end - s.start);
  const inVoice = env.filter((p) => voicedSegs.some((s) => p.t >= s.start && p.t < s.end)).map((p) => p.rms);
  const meanSq = inVoice.length ? inVoice.reduce((a, x) => a + x * x, 0) / inVoice.length : 0;
  return {
    duration,
    voiced: voicedSegs.reduce((a, s) => a + s.end - s.start, 0),
    pauses,
    longest: pauses.length ? Math.max(...pauses) : 0,
    level: inVoice.length ? db(Math.sqrt(meanSq)) : -120,
    peak: env.length ? db(Math.max(...env.map((p) => p.rms))) : -120,
    segments,
  };
}

const sec = (x: number): string => `${x.toFixed(1).replace('.', ',')} s`;

export function describeTake(s: TakeStats): string {
  if (!s.segments.some((x) => x.voiced)) return 'Nu s-a auzit vocea: apropie telefonul sau vorbește mai tare.';
  const p = s.pauses.length;
  const pauses = p === 0 ? 'fără pauze' : p === 1 ? `o pauză de ${sec(s.pauses[0])}` : `${p} pauze, cea mai lungă ${sec(s.longest)}`;
  return `${sec(s.duration)} · ${pauses} · nivel ${Math.round(s.level)} dB`;
}
