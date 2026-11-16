// Teoria de bază: note, alterații, intervale, game, trepte.
// Notație internă: litere englezești + octavă științifică (C4 = Do central).
// Afișare: solmizație fixă românească (Do, Re, Mi, Fa, Sol, La, Si).

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export const RO_NAMES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'] as const;
const SEMITONES = [0, 2, 4, 5, 7, 9, 11];

export interface ParsedNote {
  letter: string;
  letterIndex: number;
  /** +1 diez, -1 bemol, 0 natural */
  acc: number;
  octave: number;
  midi: number;
  /** indice diatonic absolut: octave * 7 + letterIndex */
  diatonic: number;
}

const NOTE_RE = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/;

export function isNote(str: string): boolean {
  return NOTE_RE.test(str);
}

export function parseNote(str: string): ParsedNote {
  const m = NOTE_RE.exec(str);
  if (!m) throw new Error(`Notă invalidă: ${str}`);
  const letterIndex = LETTERS.indexOf(m[1] as (typeof LETTERS)[number]);
  const accStr = m[2] ?? '';
  const acc = accStr.startsWith('#') ? accStr.length : -accStr.length;
  const octave = Number(m[3]);
  return {
    letter: m[1],
    letterIndex,
    acc,
    octave,
    midi: 12 * (octave + 1) + SEMITONES[letterIndex] + acc,
    diatonic: octave * 7 + letterIndex,
  };
}

export function noteFromDiatonic(d: number, acc = 0): string {
  const octave = Math.floor(d / 7);
  const letter = LETTERS[d - octave * 7];
  const accStr = acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc);
  return `${letter}${accStr}${octave}`;
}

/** „Do”, „Fa#”, „Sib”. */
export function roName(str: string): string {
  const n = parseNote(str);
  const accStr = n.acc > 0 ? '#'.repeat(n.acc) : n.acc < 0 ? 'b'.repeat(-n.acc) : '';
  return RO_NAMES[n.letterIndex] + accStr;
}

/** „Do⁴” stil scurt cu octava, util când contează registrul. */
export function roNameOct(str: string): string {
  const sup = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸'];
  const n = parseNote(str);
  return roName(str) + (sup[n.octave] ?? String(n.octave));
}

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
export const freqToMidi = (f: number): number => 69 + 12 * Math.log2(f / 440);

/** Abaterea în cenți față de nota țintă, ignorând octava (bărbații cântă de obicei cu o octavă mai jos). Rezultat în [-600, 600). */
export function pitchClassCents(freq: number, targetMidi: number): number {
  let d = (freqToMidi(freq) - targetMidi) * 100;
  d = ((d % 1200) + 1200) % 1200;
  if (d >= 600) d -= 1200;
  return d;
}

/** Cea mai apropiată notă (nume intern, cu diezi) pentru o frecvență. */
export function nearestNoteName(freq: number): string {
  const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const m = Math.round(freqToMidi(freq));
  return sharpNames[((m % 12) + 12) % 12] + String(Math.floor(m / 12) - 1);
}

const INTERVAL_NUMBERS = [
  'primă', 'secundă', 'terță', 'cvartă', 'cvintă', 'sextă', 'septimă', 'octavă',
  'nonă', 'decimă', 'undecimă', 'duodecimă', 'terțdecimă', 'cvartdecimă', 'cvintdecimă',
];

export interface IntervalInfo {
  steps: number;
  semitones: number;
  /** ex. „terță mare” */
  name: string;
  quality: string;
  numberName: string;
}

export function interval(a: string, b: string): IntervalInfo {
  const A = parseNote(a);
  const B = parseNote(b);
  let lo = A;
  let hi = B;
  if (B.diatonic < A.diatonic || (B.diatonic === A.diatonic && B.midi < A.midi)) {
    lo = B;
    hi = A;
  }
  const steps = hi.diatonic - lo.diatonic;
  const semitones = hi.midi - lo.midi;
  const simple = steps % 7;
  const ref = SEMITONES[simple] + 12 * Math.floor(steps / 7);
  const diff = semitones - ref;
  const perfectType = simple === 0 || simple === 3 || simple === 4;
  let quality: string;
  if (perfectType) {
    quality = diff === 0 ? 'perfectă' : diff === 1 ? 'mărită' : diff === -1 ? 'micșorată' : diff > 1 ? 'supramărită' : 'supramicșorată';
  } else {
    quality = diff === 0 ? 'mare' : diff === -1 ? 'mică' : diff === 1 ? 'mărită' : diff === -2 ? 'micșorată' : diff > 1 ? 'supramărită' : 'supramicșorată';
  }
  const numberName = INTERVAL_NUMBERS[steps] ?? `${steps + 1}`;
  return { steps, semitones, quality, numberName, name: `${numberName} ${quality}` };
}

/** Denumirile treptelor, ca în „Solfegiu pentru toți”. */
export const DEGREE_NAMES = [
  'tonica', 'supratonica', 'medianta', 'subdominanta', 'dominanta', 'supradominanta', 'sensibila',
] as const;

export const SCALES: Record<string, string[]> = {
  'Do major': ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
  'la minor natural': ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'],
  'la minor armonic': ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G#4', 'A4'],
  'la minor melodic': ['A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G#4', 'A4'],
};

/** Treapta (0 = I) unei note în Do major, după literă. */
export function degreeInC(str: string): number {
  return parseNote(str).letterIndex;
}

export function romanDegree(i: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][((i % 7) + 7) % 7];
}

/** Cadența de acordaj I–IV–V–I în Do major, poziție strânsă. */
export const CADENCE_C: string[][] = [
  ['C3', 'E4', 'G4', 'C5'],
  ['F3', 'F4', 'A4', 'C5'],
  ['G3', 'D4', 'G4', 'B4'],
  ['C3', 'E4', 'G4', 'C5'],
];
