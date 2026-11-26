// Atenția și observația (cap. V): privești obiectele câteva secunde, apoi spui ce era și cum arăta.
import { mulberry32, shuffle } from '../lib/random.ts';

/** Obiecte de scenă și de recuzită, ca jocul să semene cu ce vezi la repetiție. */
export const OBJECTS = [
  'evantai', 'scrisoare', 'pahar', 'pumnal', 'lumânare', 'coroană', 'oglindă', 'cheie', 'ceas de buzunar', 'batistă',
  'trandafir', 'carte', 'inel', 'mănușă', 'pălărie', 'sfeșnic', 'mască', 'partitură', 'baghetă', 'diapazon',
  'vază', 'broșă', 'medalion', 'pană de scris', 'călimară', 'clopoțel', 'sabie', 'scut', 'eșarfă', 'cupă',
  'pernă', 'tavă', 'ramă', 'portofel', 'umbrelă', 'binoclu',
] as const;

/** Culorile se arată ca pete, nu ca nume: așa nu ghicești din gramatică. */
export const COLORS = [
  { css: '#d4af37', name: 'auriu' },
  { css: '#c0392b', name: 'roșu' },
  { css: '#2e86de', name: 'albastru' },
  { css: '#27ae60', name: 'verde' },
  { css: '#ecf0f1', name: 'alb' },
  { css: '#8e44ad', name: 'violet' },
] as const;

export interface MemItem {
  word: string;
  color: number;
}

export interface MemRound {
  items: MemItem[];
  /** cuvintele de recunoscut: cele văzute + tot atâtea noi, amestecate */
  options: string[];
  /** întrebări de detaliu: ce culoare avea obiectul */
  colorQs: { word: string; answer: number; options: number[] }[];
}

export function memoryRound(seed: number, n: number): MemRound {
  const rng = mulberry32(seed);
  const words = shuffle(OBJECTS, rng);
  const seen = words.slice(0, n);
  const fresh = words.slice(n, 2 * n);
  const items = seen.map((word) => ({ word, color: Math.floor(rng() * COLORS.length) }));
  const colorQs = shuffle(items, rng).slice(0, Math.min(3, n)).map((it) => {
    const others = shuffle(COLORS.map((_, i) => i).filter((i) => i !== it.color), rng).slice(0, 3);
    return { word: it.word, answer: it.color, options: shuffle([it.color, ...others], rng) };
  });
  return { items, options: shuffle([...seen, ...fresh], rng), colorQs };
}

export interface MemGrade {
  hits: number;
  falseAlarms: number;
  colorsOk: number;
  score: number;
}

/** Recunoașterea cântărește 70%, detaliul (culoarea) 30%. Un obiect „văzut” care nu era acolo anulează un obiect ghicit. */
export function gradeMemory(r: MemRound, picked: string[], colorAnswers: number[]): MemGrade {
  const seen = new Set(r.items.map((i) => i.word));
  const hits = picked.filter((w) => seen.has(w)).length;
  const falseAlarms = picked.length - hits;
  const colorsOk = r.colorQs.filter((q, i) => colorAnswers[i] === q.answer).length;
  const rec = Math.max(0, (hits - falseAlarms) / r.items.length);
  const col = r.colorQs.length ? colorsOk / r.colorQs.length : 1;
  return { hits, falseAlarms, colorsOk, score: 0.7 * rec + 0.3 * col };
}

/** Câte obiecte: cartea dă 20–30 de secunde de privit; cu cât ai mai mult timp, cu atât mai multe obiecte. */
export const itemsFor = (seconds: number): number => (seconds >= 30 ? 9 : seconds >= 20 ? 7 : 6);
