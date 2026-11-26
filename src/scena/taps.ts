// Tempo-ritm: compară bătăile tale cu tiparul cerut. Logică pură, testată în tests/scena.test.ts.

export interface TapGrade {
  hits: number;
  total: number;
  /** bătăi care nu corespund niciunui timp cerut */
  extra: number;
  /** întârzierea constantă scăzută (căști Bluetooth, reflex), în secunde */
  offset: number;
  score: number;
}

/** Momentele (secunde de la start) pentru un tipar dat în timpi pe măsură, repetat pe `measures` măsuri. */
export function patternTimes(beatsInMeasure: number[], meter: number, measures: number, bpm: number, start = 0): number[] {
  const beat = 60 / bpm;
  const out: number[] = [];
  for (let m = 0; m < measures; m++) for (const b of beatsInMeasure) out.push(start + (m * meter + b) * beat);
  return out;
}

const median = (xs: number[]): number => {
  const a = xs.slice().sort((x, y) => x - y);
  const k = Math.floor(a.length / 2);
  return a.length % 2 ? a[k] : (a[k - 1] + a[k]) / 2;
};

/**
 * Potrivește fiecare timp cerut cu cea mai apropiată bătaie liberă, în toleranță.
 * Dacă toate bătăile vin cu aceeași întârziere (ex. AirPods, ~200 ms), o scădem: contează să bați egal, nu reflexul căștilor.
 */
export function gradeTaps(targets: number[], taps: number[], tol = 0.1): TapGrade {
  const total = targets.length;
  if (!total) return { hits: 0, total: 0, extra: taps.length, offset: 0, score: 0 };
  const near = taps
    .map((t) => targets.reduce((best, x) => (Math.abs(t - x) < Math.abs(best) ? t - x : best), Infinity))
    .filter((d) => Math.abs(d) <= 0.3);
  let offset = 0;
  if (near.length >= 3) {
    const m = median(near);
    const spread = median(near.map((d) => Math.abs(d - m)));
    if (Math.abs(m) > tol * 0.5 && spread < tol) offset = m;
  }
  const used = new Set<number>();
  let hits = 0;
  for (const x of targets) {
    let bi = -1;
    let bd = Infinity;
    taps.forEach((t, i) => {
      if (used.has(i)) return;
      const d = Math.abs(t - offset - x);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    if (bi >= 0 && bd <= tol) {
      used.add(bi);
      hits++;
    }
  }
  const first = targets[0] - 0.4;
  const last = targets[targets.length - 1] + 0.4;
  const extra = taps.filter((t, i) => !used.has(i) && t - offset >= first && t - offset <= last).length;
  const score = Math.max(0, Math.min(1, (hits - 0.5 * extra) / total));
  return { hits, total, extra, offset, score };
}

/** Tiparele exacte din capitolul „Tempo-ritm” (timpi în măsură, 0 = timpul întâi). */
export const TAP_PATTERNS: Record<string, { beats: number[]; meter: number; label: string }> = {
  'P2-VIII-02': { beats: [0], meter: 4, label: 'palme doar pe „unu”' },
  'P2-VIII-03': { beats: [0, 2], meter: 4, label: 'accent pe „unu” și pe „trei”' },
  'P2-VIII-04': { beats: [0, 1, 2, 3], meter: 4, label: 'pe toți timpii' },
  'P2-VIII-05': { beats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], meter: 4, label: 'câte două optimi pe timp' },
  'P2-VIII-06': { beats: [0, 3], meter: 4, label: 'doime, pauză de pătrime, pătrime' },
  'P2-VIII-07': { beats: [0, 3.5], meter: 4, label: 'doime, pauză de pătrime, pauză de optime, optime' },
  'P2-VIII-08': { beats: [0, 0.5, 1.5, 2, 2.5, 3.5], meter: 4, label: 'sincope: optime, pătrime, optime' },
  'P2-VIII-17': { beats: [0], meter: 4, label: 'o notă întreagă pe măsură' },
  'P2-VIII-18': { beats: [0, 2], meter: 4, label: 'două mișcări pe măsură (doimi)' },
  'P2-VIII-20': { beats: [0, 1, 2, 3], meter: 4, label: 'patru pătrimi pe măsură' },
  'P2-VIII-22': { beats: [0, 1, 1.5, 2, 3, 3.5], meter: 4, label: 'timpii 2 și 4 în optimi' },
};

/** Subdiviziunile bătute de braț în „Plastica” (mercurul care curge pe pătrimi împărțite). */
export const SUBDIVISIONS: Record<string, number> = {
  'P2-IV-07': 1, 'P2-IV-08': 2, 'P2-IV-09': 3, 'P2-IV-10': 4, 'P2-IV-11': 6, 'P2-IV-12': 12, 'P2-IV-13': 16, 'P2-IV-14': 24,
  'P2-VIII-05': 2,
};

/** Mai multe metronoame deodată, ca în lecțiile lui Torțov: [bpm pe strat]. */
export const LAYERS: Record<string, number[]> = {
  'P2-VIII-01': [15, 30, 60, 120],
  'P2-VIII-24': [30, 60, 120],
  'P2-VIII-25': [40, 160],
  'P2-VIII-26': [40, 76, 152],
  'P2-VIII-27': [24, 60, 72, 144],
  'P2-VIII-30': [20, 200],
};

/**
 * Cifra din carte e a metronomului vechi („nr. 10”, cel mai rar). Un metronom de azi coboară rar sub 40,
 * așa că o urcăm până acolo și o arătăm pe cea din carte.
 */
export function modernBpm(book: number | null | undefined): number {
  if (typeof book !== 'number' || !isFinite(book)) return 60;
  return book < 30 ? 40 : Math.min(220, Math.round(book));
}
