// Evaluarea unui solfegiu cântat, după ce s-a terminat: intonație notă cu notă + ritm, aliniate la decalajul real.
import { detectOnsets, rhythmFromOnsets, smoothTrack } from './onsets.ts';
import type { Frame } from './onsets.ts';
import type { TapScore } from './rhythm.ts';
import { median } from './pitch.ts';

/** O notă de cântat: când începe (s, de la prima notă), cât ține (s) și ce înălțime (MIDI; octava nu contează). */
export interface SungTarget {
  start: number;
  dur: number;
  midi: number;
}

export interface NoteVerdict {
  good: boolean;
  /** centrul intonației față de țintă, în cenți (null = nota nu s-a auzit destul) */
  cents: number | null;
  /** ce parte din notă a avut o înălțime clară */
  coverage: number;
}

export interface Performance {
  notes: NoteVerdict[];
  good: number;
  pitchScore: number;
  rhythm: TapScore;
  /** decalajul constant găsit și compensat (s); pozitiv = ai cântat constant după metronom */
  lag: number;
  score: number;
}

/** Ponderea intonației în scorul final (restul e ritmul). */
export const PITCH_WEIGHT = 0.7;
/** Cât de departe poate fi centrul intonației ca nota să fie bună (cenți). */
export const PITCH_TOLERANCE = 50;
/** Sub atâtea note corecte, scorul nu poate trece de intonație, oricât de bun e ritmul. */
export const PITCH_GATE = 0.7;
/** Cel puțin atât din notă trebuie să aibă înălțime clară. */
export const MIN_COVERAGE = 0.3;

/** Abaterea în cenți față de țintă, fără octavă, în [-600, 600). */
export function pcCents(midi: number, target: number): number {
  let d = (midi - target) * 100;
  d = ((d % 1200) + 1200) % 1200;
  return d >= 600 ? d - 1200 : d;
}

/**
 * Judecă o notă după centrul intonației (mediana cadrelor clare), nu cadru cu cadru: vibrato-ul simetric
 * se anulează, iar alunecarea de la început (portamento) nu strică nota.
 */
export function judgeFrames(cents: (number | null)[], tol = PITCH_TOLERANCE): NoteVerdict {
  const clear = cents.filter((c): c is number => c !== null);
  const coverage = cents.length ? clear.length / cents.length : 0;
  if (cents.length < 2 || coverage < MIN_COVERAGE) return { good: false, cents: null, coverage };
  const c = median(clear);
  return { good: Math.abs(c) <= tol, cents: c, coverage };
}

export interface JudgeOptions {
  /** toleranța ritmului, în secunde */
  rhythmTol: number;
  /** sub acest volum = liniște */
  silence?: number;
  pitchTol?: number;
}

/** Cel mai mare decalaj căutat (s): latența căștilor Bluetooth (150–250 ms) + reacția. */
export const MAX_LAG = 0.35;

/**
 * Decalajul constant al vocii față de metronom, găsit după înălțime: încercăm decalaje de la −0,1 s în sus
 * și îl alegem pe cel la care cele mai multe cadre cântă nota cerută (pe pista netezită, deci vibrato-ul nu
 * încurcă). La egalitate (±2%) câștigă decalajul cel mai mic. Plafonul e 3/4 din cea mai scurtă notă, ca o
 * întârziere reală de o optime întreagă să rămână greșeală de ritm, nu „latență”.
 */
export function alignLag(targets: SungTarget[], smooth: Frame[], silence = 0.003): number {
  if (!targets.length) return 0;
  const shortest = Math.min(...targets.map((t) => t.dur));
  const maxMs = Math.round(Math.min(MAX_LAG, 0.75 * shortest) * 100) * 10;
  const scores: [number, number][] = [];
  for (let ms = -100; ms <= maxMs; ms += 10) {
    const lag = ms / 1000;
    let ok = 0;
    let n = 0;
    for (const t of targets) {
      const from = t.start + lag + 0.07;
      const to = t.start + lag + t.dur - 0.04;
      for (const f of smooth) {
        if (f.t < from || f.t > to) continue;
        n++;
        if (f.midi !== null && f.level >= silence && Math.abs(pcCents(f.midi, t.midi)) <= PITCH_TOLERANCE) ok++;
      }
    }
    scores.push([lag, n ? ok / n : 0]);
  }
  const top = Math.max(...scores.map(([, sc]) => sc));
  if (top <= 0) return 0;
  let best = Infinity;
  for (const [lag, sc] of scores) if (sc >= top - 0.02 && Math.abs(lag) < Math.abs(best)) best = lag;
  return best;
}

/**
 * Înti găsim decalajul constant dintre metronom și voce (latența căștilor/difuzorului + reacția ta), apoi
 * judecăm fiecare notă în fereastra ei decalată. Fără asta, cu AirPods (~200 ms) fereastra unei optimi
 * cădea jumătate pe nota de dinainte și notele corecte ieșeau roșii.
 */
export function judgePerformance(targets: SungTarget[], track: Frame[], o: JudgeOptions): Performance {
  const silence = o.silence ?? 0.003;
  const smooth = smoothTrack(track, 0.16, silence);
  // pe pista netezită: 5 cadre stabile (~80 ms) și 120 ms de așezare după atac, ca rampa netezirii să nu dea atacuri duble
  const detected = detectOnsets(smooth, { silence, stableFrames: 5, settle: 0.12 });
  const expected = targets.map((n) => n.start);
  const lag = alignLag(targets, smooth, silence);
  const notes = targets.map((n) => {
    const from = n.start + lag + 0.07;
    const to = n.start + lag + n.dur - 0.04;
    const cents = track.filter((f) => f.t >= from && f.t <= to).map((f) => (f.midi === null || f.level < silence ? null : pcCents(f.midi, n.midi)));
    return judgeFrames(cents, o.pitchTol);
  });
  const good = notes.filter((v) => v.good).length;
  const pitchScore = targets.length ? good / targets.length : 0;
  // atacurile detectate vin cu ~50 ms după cadrele de înălțime: ONSET_LAG le aduce pe aceeași axă
  const rhythm = rhythmFromOnsets(expected, detected, o.rhythmTol, lag);
  const raw = PITCH_WEIGHT * pitchScore + (1 - PITCH_WEIGHT) * rhythm.score;
  // intonația e poarta: cu note greșite nu treci doar pe ritm (înainte, 9/15 note + ritm bun dădeau 72%)
  const score = pitchScore < PITCH_GATE ? Math.min(raw, pitchScore) : raw;
  return { notes, good, pitchScore, rhythm, lag, score };
}
