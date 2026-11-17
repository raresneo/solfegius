// Dicteu melodic: fraza de dictat, notare și etichete pentru butoanele de note.
import { parseNote, roName } from './theory.ts';
import { generateMelody } from './melodyGen.ts';
import type { Generated } from './melodyGen.ts';

/**
 * Fraza de dicteu pe lecție: scurtă, cu doime la final ca să se audă concluzia pe Do.
 * Lecția 1 are 4 măsuri: în mers strict treptat, de la Do înapoi pe Do e nevoie de un număr par de pași.
 */
export function dictationPhrase(lesson: number, seed: number): Generated {
  const l = Math.min(Math.max(lesson, 1), 6);
  const measures = l >= 6 ? 2 : l === 1 ? 4 : 3;
  return generateMelody({ lesson: l, measures, seed, finalHalf: true });
}

export interface DictationGrade {
  /** pe fiecare poziție: e corectă? (pauzele sunt mereu corecte) */
  correct: boolean[];
  ok: number;
  total: number;
  score: number;
}

/** Compară înălțimile exact (inclusiv octava). Pozițiile din `given` (ex. prima notă, dată) nu se punctează. */
export function gradeDictation(expected: (string | null)[], answers: (string | null)[], given: number[] = []): DictationGrade {
  const skip = new Set(given);
  let ok = 0;
  let total = 0;
  const correct = expected.map((e, i) => {
    if (e === null) return true;
    const a = answers[i] ?? null;
    const good = a !== null && parseNote(a).midi === parseNote(e).midi;
    if (!skip.has(i)) {
      total++;
      if (good) ok++;
    }
    return good;
  });
  return { correct, ok, total, score: total ? ok / total : 0 };
}

/** Etichete distincte când aceeași notă apare în două octave: Do / Do sus, Si jos / Si. */
export function poolLabels(pool: string[]): Record<string, string> {
  const byName = new Map<string, string[]>();
  for (const p of pool) {
    const k = p.replace(/-?\d+$/, '');
    byName.set(k, [...(byName.get(k) ?? []), p]);
  }
  const out: Record<string, string> = {};
  for (const ps of byName.values()) {
    const sorted = ps.slice().sort((a, b) => parseNote(a).midi - parseNote(b).midi);
    sorted.forEach((p, i) => {
      const base = roName(p);
      const oct = parseNote(p).octave;
      if (sorted.length === 1) out[p] = base;
      else if (i === 0 && oct < 4) out[p] = `${base} jos`;
      else if (i === sorted.length - 1 && oct >= 5) out[p] = `${base} sus`;
      else out[p] = base;
    });
  }
  return out;
}
