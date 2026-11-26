// Catalogul complet: toate exercițiile, conceptele și textele din „Munca actorului cu sine însuși”, pe capitole.
import type { ModeCode, RawEx, RawParams } from '../data/scena/types.ts';
import { P1A } from '../data/scena/p1a.ts';
import { P1B } from '../data/scena/p1b.ts';
import { P1C } from '../data/scena/p1c.ts';
import { P1D } from '../data/scena/p1d.ts';
import { P1E } from '../data/scena/p1e.ts';
import { P2A } from '../data/scena/p2a.ts';
import { P2B } from '../data/scena/p2b.ts';
import { P2C } from '../data/scena/p2c.ts';
import { P2D } from '../data/scena/p2d.ts';
import { CONCEPTS as RAW_CONCEPTS } from '../data/scena/concepts.ts';
import { TEXTS as RAW_TEXTS } from '../data/scena/texts.ts';

export type Mode = 'timer' | 'memory' | 'circles' | 'metronome' | 'record' | 'marking' | 'situations' | 'journal' | 'action' | 'movement' | 'role' | 'sheet';
export type Needs = 'solo' | 'partener' | 'grup' | 'scenă';
export type Feas = 'full' | 'partial' | 'class';
export type GroupId = 'corp' | 'atentie' | 'voce' | 'ritm' | 'imaginatie' | 'rol';

const MODES: Record<ModeCode, Mode> = {
  tg: 'timer', om: 'memory', ca: 'circles', rm: 'metronome', iv: 'record', mt: 'marking',
  gs: 'situations', js: 'journal', af: 'action', mg: 'movement', pr: 'role', fs: 'sheet',
};

export const MODE_LABEL: Record<Mode, string> = {
  timer: 'Cronometru', memory: 'Observație', circles: 'Atenție', metronome: 'Tempo-ritm', record: 'Voce', marking: 'Text',
  situations: '„Dacă”', journal: 'Jurnal', action: 'Acțiune', movement: 'Mișcare', role: 'Rol', sheet: 'Fișă',
};

export const NEEDS_LABEL: Record<Needs, string> = { solo: 'Singur', partener: 'Cu partener', grup: 'În grup', scenă: 'Pe scenă' };

export interface StEx {
  id: string;
  part: 1 | 2;
  /** cheia capitolului, ex. „1-III” */
  ch: string;
  title: string;
  page: number;
  element: string;
  group: GroupId;
  summary: string;
  steps: string[];
  min: number;
  needs: Needs;
  mode: Mode;
  params: RawParams;
  feas: Feas;
  opera: string;
  checks: string[];
  variantOf: string | null;
}

export interface StChapter {
  key: string;
  part: 1 | 2;
  roman: string;
  title: string;
}

const chapters = (part: 1 | 2, list: [string, string][]): StChapter[] =>
  list.map(([roman, title]) => ({ key: `${part}-${roman}`, part, roman, title }));

/** Cuprinsul cărții (ediția românească), în ordine. */
export const ST_CHAPTERS: StChapter[] = [
  ...chapters(1, [
    ['I', 'Diletantism'], ['II', 'Arta scenică și meșteșugul scenic'], ['III', 'Acțiunea. „Dacă”. „Situații propuse”'],
    ['IV', 'Imaginația'], ['V', 'Atenția scenică'], ['VI', 'Destinderea mușchilor'], ['VII', 'Fragmente și teme'],
    ['VIII', 'Sentimentul adevărului și credința'], ['IX', 'Memoria emoțională'], ['X', 'Comunicarea'],
    ['XI', 'Adaptarea și alte elemente'], ['XII', 'Motoarele vieții psihice'], ['XIII', 'Linia tendințelor motoarelor psihice'],
    ['XIV', 'Starea de spirit scenică'], ['XV', 'Supratema. Acțiunea principală'], ['XVI', 'Subconștientul în starea de spirit scenică'],
  ]),
  ...chapters(2, [
    ['0', 'Din partea redactorilor'], ['I', 'Trecerea la întruchipare'], ['II', 'Caracteristicul'],
    ['III', 'Dezvoltarea expresivității trupului'], ['IV', 'Plastica'], ['V', 'Dicțiunea și canto'], ['VI', 'Vorbirea pe scenă'],
    ['VII', 'Perspectiva artistului și a rolului'], ['VIII', 'Tempo-ritm'], ['IX', 'Schemă a ceea ce s-a studiat'],
    ['X', 'Discuții de încheiere'], ['A', 'Anexa'], ['N', 'Observații'],
  ]),
];

/** Elementul „sistemului” → grupa din antrenamentul zilnic. */
const EL_GROUP: Record<string, GroupId> = {
  destindere: 'corp', 'expresivitate-corporală': 'corp', plastică: 'corp', caracterizare: 'corp',
  atenție: 'atentie',
  dicție: 'voce', canto: 'voce', vorbire: 'voce', pauze: 'voce', accent: 'voce', intonație: 'voce', subtext: 'voce',
  'tempo-ritm': 'ritm',
  imaginație: 'imaginatie', 'dacă-magic': 'imaginatie', 'situații-propuse': 'imaginatie', 'viziuni-interioare': 'imaginatie',
  'memorie-emoțională': 'imaginatie', 'adevăr-și-credință': 'imaginatie', acțiune: 'imaginatie', subconștient: 'imaginatie',
};

export const GROUPS: { id: GroupId; title: string; sub: string }[] = [
  { id: 'corp', title: 'Corp', sub: 'destindere, plastică, mers' },
  { id: 'atentie', title: 'Atenție', sub: 'cercuri, obiect, observație' },
  { id: 'voce', title: 'Voce', sub: 'dicție, canto, vorbire' },
  { id: 'ritm', title: 'Tempo-ritm', sub: 'metronom, bătăi, poliritmie' },
  { id: 'imaginatie', title: 'Imaginație', sub: '„dacă”, situații, adevăr' },
  { id: 'rol', title: 'Rol', sub: 'bucăți, supratemă, comunicare' },
];

const NEEDS: Record<RawEx[7], Needs> = { s: 'solo', p: 'partener', g: 'grup', c: 'scenă' };
const FEAS: Record<RawEx[10], Feas> = { f: 'full', p: 'partial', c: 'class' };

export function fromRaw(r: RawEx): StEx {
  const [id, title, page, element, summary, steps, min, needs, mode, params, feas, opera, checks, variantOf] = r;
  const m = /^P(\d)-([^-]+)-/.exec(id);
  const part = m && m[1] === '2' ? 2 : 1;
  return {
    id, part, ch: `${part}-${m ? m[2] : 'I'}`, title, page, element, group: EL_GROUP[element] ?? 'rol', summary, steps,
    min: Math.max(1, Math.min(30, min)), needs: NEEDS[needs], mode: MODES[mode], params, feas: FEAS[feas], opera, checks, variantOf,
  };
}

export const EXERCISES: StEx[] = [...P1A, ...P1B, ...P1C, ...P1D, ...P1E, ...P2A, ...P2B, ...P2C, ...P2D].map(fromRaw);

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
export const exById = (id: string): StEx | undefined => BY_ID.get(id);
export const chapterByKey = (key: string): StChapter | undefined => ST_CHAPTERS.find((c) => c.key === key);
export const exercisesOf = (key: string): StEx[] => EXERCISES.filter((e) => e.ch === key);

export interface Concept {
  id: string;
  term: string;
  ch: string;
  page: number;
  def: string;
}

export const CONCEPTS: Concept[] = RAW_CONCEPTS.map(([term, ch, page, def], i) => ({ id: `st-${ch}-${i}`, term, ch, page, def }));
export const conceptsOf = (key: string): Concept[] => CONCEPTS.filter((c) => c.ch === key);

export interface BookText {
  id: string;
  ch: string;
  page: number;
  kind: string;
  text: string;
  reference: string;
}

export const TEXTS: BookText[] = RAW_TEXTS.map(([id, ch, page, kind, text, reference]) => ({ id, ch, page, kind, text, reference }));
export const textById = (id: string): BookText | undefined => TEXTS.find((t) => t.id === id);

export const TEXT_KIND_LABEL: Record<string, string> = {
  pauze: 'Pauze', accent: 'Accent', intonatie: 'Intonație', dictie: 'Dicție', monolog: 'Monolog', vers: 'Vers',
  situatie: 'Situații', lista: 'Liste de acțiuni',
};

/** Pachetele de fișe: câte unul pe grup de capitole, ca o sesiune să nu amestece toată cartea. */
export const CONCEPT_DECKS: { id: string; title: string; chapters: string[] }[] = [
  { id: 'p1a', title: 'Partea I · I–V: acțiune, „dacă”, imaginație, atenție', chapters: ['1-I', '1-II', '1-III', '1-IV', '1-V'] },
  { id: 'p1b', title: 'Partea I · VI–IX: destindere, bucăți, adevăr, memorie', chapters: ['1-VI', '1-VII', '1-VIII', '1-IX'] },
  { id: 'p1c', title: 'Partea I · X–XVI: comunicare, motoare, supratemă', chapters: ['1-X', '1-XI', '1-XII', '1-XIII', '1-XIV', '1-XV', '1-XVI'] },
  { id: 'p2a', title: 'Partea a II-a · I–V: caracteristic, plastică, dicție și canto', chapters: ['2-0', '2-I', '2-II', '2-III', '2-IV', '2-V'] },
  { id: 'p2b', title: 'Partea a II-a · VI–X: vorbire, perspectivă, tempo-ritm', chapters: ['2-VI', '2-VII', '2-VIII', '2-IX', '2-X', '2-A', '2-N'] },
];

export const deckConcepts = (deckId: string): Concept[] => {
  const d = CONCEPT_DECKS.find((x) => x.id === deckId);
  return d ? CONCEPTS.filter((c) => d.chapters.includes(c.ch)) : [];
};
