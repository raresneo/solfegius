// Scena: jurnalul, partiturile rolurilor și ziua când ai făcut fiecare exercițiu. Doar pe dispozitiv (localStorage).
// Scorurile stau în progresul comun (state.best, cheia „scena/<id>”), ca seria de zile să le numere.

export interface JournalEntry {
  id: string;
  exId: string;
  title: string;
  at: number;
  items: { q: string; a: string }[];
}

export interface Bit {
  name: string;
  /** textul sau măsurile bucății */
  text: string;
  /** sarcina: „vreau să” + verb */
  task: string;
  obstacle: string;
  visions: string;
  subtext: string;
  /** obiectul comunicării */
  object: string;
  /** tempo-ritmul interior, 1 (calm) – 10 (maxim) */
  tempo: number;
}

export interface Role {
  id: string;
  title: string;
  work: string;
  composer: string;
  aria: string;
  given: Record<string, string>;
  magicIf: string;
  supertask: string;
  through: string;
  counter: string;
  bits: Bit[];
  perspective: string;
  character: string;
  memory: string;
  preshow: string;
  /** notițe din exercițiile de tip „Rol”, pe exercițiu și câmp */
  exNotes: Record<string, Record<string, string>>;
  updated: number;
}

export interface ScenaState {
  v: 1;
  journal: JournalEntry[];
  roles: Role[];
  activeRole: string | null;
  /** când ai făcut ultima oară fiecare exercițiu (ms) */
  seen: Record<string, number>;
  /** ciorne nesalvate din jurnal */
  drafts: Record<string, string>;
}

export const SCENA_KEY = 'solfegius.scena.v1';

export function freshScena(): ScenaState {
  return { v: 1, journal: [], roles: [], activeRole: null, seen: {}, drafts: {} };
}

export function loadScena(): ScenaState {
  try {
    const raw = localStorage.getItem(SCENA_KEY);
    if (!raw) return freshScena();
    return { ...freshScena(), ...(JSON.parse(raw) as Partial<ScenaState>), v: 1 };
  } catch {
    return freshScena();
  }
}

export function saveScena(s: ScenaState): void {
  try {
    localStorage.setItem(SCENA_KEY, JSON.stringify(s));
  } catch {
    /* stocare plină: continuăm fără salvare */
  }
}

export const GIVEN_FIELDS: [string, string][] = [
  ['cine', 'Cine sunt?'],
  ['unde', 'Unde sunt?'],
  ['cand', 'Când se petrece?'],
  ['inainte', 'De unde vin, ce s-a întâmplat înainte?'],
  ['vreau', 'Ce vreau?'],
  ['dece', 'De ce?'],
  ['pentruce', 'Pentru ce?'],
  ['cum', 'Cum?'],
];

export const newBit = (n: number): Bit => ({ name: `Bucata ${n}`, text: '', task: '', obstacle: '', visions: '', subtext: '', object: '', tempo: 5 });

export function newRole(id: string, now = Date.now()): Role {
  return {
    id, title: '', work: '', composer: '', aria: '', given: {}, magicIf: '', supertask: '', through: '', counter: '',
    bits: [newBit(1)], perspective: '', character: '', memory: '', preshow: '', exNotes: {}, updated: now,
  };
}

export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
