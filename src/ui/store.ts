// Progresul se salvează local, pe dispozitiv (localStorage). Fără cont, fără server.
import type { Deck } from '../lib/srs.ts';
import type { Lesson } from '../data/curriculum.ts';

export interface Settings {
  showNames: boolean;
  /** redă melodia în surdină cât cânți (poate deranja microfonul pe difuzor) */
  guide: boolean;
  /** toleranța la intonație, în cenți (50 = începător, 35 = mediu, 20 = conservator) */
  tolerance: number;
}

export interface State {
  version: 1;
  best: Record<string, number>;
  srs: Deck;
  settings: Settings;
  days: string[];
}

const KEY = 'solfegius.v1';

function fresh(): State {
  return { version: 1, best: {}, srs: {}, settings: { showNames: true, guide: false, tolerance: 50 }, days: [] };
}

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as Partial<State>;
    const f = fresh();
    return { ...f, ...s, settings: { ...f.settings, ...(s.settings ?? {}) }, version: 1 };
  } catch {
    return fresh();
  }
}

export function save(s: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* stocare plină sau mod privat: continuăm fără salvare */
  }
}

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function markPracticed(s: State): void {
  const t = today();
  if (!s.days.includes(t)) s.days.push(t);
}

/** Zile consecutive de exercițiu, până azi (sau ieri, dacă azi încă nu ai exersat). */
export function streak(days: string[], now = new Date()): number {
  const set = new Set(days);
  const d = new Date(now);
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export const PASS = 0.7;

export function exKey(lessonId: string, exId: string): string {
  return `${lessonId}/${exId}`;
}

export function recordBest(s: State, key: string, score: number): boolean {
  const prev = s.best[key] ?? 0;
  if (score > prev) {
    s.best[key] = score;
    return true;
  }
  return false;
}

export function lessonProgress(s: State, l: Lesson): number {
  if (!l.exercises.length) return 0;
  const done = l.exercises.filter((e) => (s.best[exKey(l.id, e.id)] ?? 0) >= PASS).length;
  return done / l.exercises.length;
}

export function lessonDone(s: State, l: Lesson): boolean {
  return l.available && l.exercises.length > 0 && lessonProgress(s, l) >= 1;
}
