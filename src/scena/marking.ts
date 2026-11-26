// Marcarea textului: pauze logice (|), pauze psihologice (‖) și accente, comparate cu soluția lui Torțov.

export const tokenize = (text: string): string[] => text.split(/\s+/).map((w) => w.trim()).filter(Boolean);

/** Cuvântul fără punctuație și fără silabisire („Re-vi-no!” → „revino”), cu ș/ț uniformizate. */
export function norm(w: string): string {
  return w
    .toLowerCase()
    .replace(/ş/g, 'ș')
    .replace(/ţ/g, 'ț')
    .replace(/[„”"“'’`«»!?.,;:…()[\]{}–—-]/g, '');
}

export interface Marks {
  /** indicii cuvintelor după care vine o pauză */
  pauses: number[];
  accents: number[];
}

/** Caută în text, în ordine, fiecare cuvânt (sau grup de cuvinte) din soluție. */
export function findWords(tokens: string[], words: string[]): number[] {
  const nt = tokens.map(norm);
  const out: number[] = [];
  let from = 0;
  for (const w of words) {
    const parts = tokenize(w).map(norm).filter(Boolean);
    if (!parts.length) continue;
    let found = -1;
    for (const start of [from, 0]) {
      for (let i = start; i + parts.length <= nt.length; i++) {
        if (parts.every((p, k) => nt[i + k] === p)) {
          found = i + parts.length - 1;
          break;
        }
      }
      if (found >= 0) break;
    }
    if (found >= 0 && !out.includes(found)) {
      out.push(found);
      from = found + 1;
    }
  }
  return out.sort((a, b) => a - b);
}

export function referenceMarks(tokens: string[], ref: { p: string[]; a: string[] }): Marks {
  return { pauses: findWords(tokens, ref.p), accents: findWords(tokens, ref.a) };
}

export interface MarkGrade {
  score: number;
  pausesOk: number;
  pausesRef: number;
  pausesExtra: number;
  accentsOk: number;
  accentsRef: number;
  accentsExtra: number;
  /** soluția are măcar o pauză sau un accent de comparat */
  comparable: boolean;
}

const f1 = (ok: number, ref: number, mine: number): number => (ref + mine === 0 ? 1 : (2 * ok) / (ref + mine));

/** Pauzele și accentele cântăresc la fel; o pauză sau un accent pus pe lângă scade scorul. */
export function gradeMarks(mine: Marks, ref: Marks): MarkGrade {
  const pOk = mine.pauses.filter((i) => ref.pauses.includes(i)).length;
  const aOk = mine.accents.filter((i) => ref.accents.includes(i)).length;
  const parts: number[] = [];
  if (ref.pauses.length) parts.push(f1(pOk, ref.pauses.length, mine.pauses.length));
  if (ref.accents.length) parts.push(f1(aOk, ref.accents.length, mine.accents.length));
  return {
    score: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0,
    pausesOk: pOk,
    pausesRef: ref.pauses.length,
    pausesExtra: mine.pauses.length - pOk,
    accentsOk: aOk,
    accentsRef: ref.accents.length,
    accentsExtra: mine.accents.length - aOk,
    comparable: parts.length > 0,
  };
}
