// Logica ecranelor Azi, Parcurs și Abilități: pură, fără DOM, testată în tests/model.test.ts.
import type { Chapter, Exercise, Lesson } from '../data/curriculum.ts';
import { exKey, PASS, today } from './store.ts';
import type { State } from './store.ts';
import type { IconName } from './icons.ts';

export type SkillId = 'citire' | 'auz' | 'intonatie' | 'ritm' | 'solfegiu' | 'dicteu' | 'teorie';

export interface Skill {
  id: SkillId;
  title: string;
  sub: string;
  icon: IconName;
  kinds: readonly Exercise['kind'][];
}

/** Fiecare tip de exercițiu aparține exact unei abilități. */
export const SKILLS: readonly Skill[] = [
  { id: 'citire', title: 'Citire', sub: 'Numește nota', icon: 'note', kinds: ['notes'] },
  { id: 'auz', title: 'Auz', sub: 'Treapta după cadență', icon: 'wave', kinds: ['ear'] },
  { id: 'intonatie', title: 'Intonație', sub: 'Cântă nota', icon: 'mic', kinds: ['sing'] },
  { id: 'ritm', title: 'Ritm', sub: 'Bate ritmul', icon: 'metronome', kinds: ['rhythm'] },
  { id: 'solfegiu', title: 'Solfegiu', sub: 'Citește și cântă', icon: 'notes2', kinds: ['solfegiu'] },
  { id: 'dicteu', title: 'Dicteu', sub: 'Scrie ce auzi', icon: 'pencil', kinds: ['dictation'] },
  { id: 'teorie', title: 'Teorie', sub: 'Teste și fișe Armonie', icon: 'cards', kinds: ['quiz', 'cards'] },
];

export function findSkill(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export interface ExRef {
  lesson: Lesson;
  ex: Exercise;
}

export function isPassed(s: State, lessonId: string, exId: string): boolean {
  return (s.best[exKey(lessonId, exId)] ?? 0) >= PASS;
}

/** Exercițiile unei abilități, în ordinea parcursului (doar lecțiile disponibile). */
export function skillItems(skill: Skill, lessons: Lesson[]): ExRef[] {
  return lessons
    .filter((l) => l.available)
    .flatMap((lesson) => lesson.exercises.filter((ex) => skill.kinds.includes(ex.kind)).map((ex) => ({ lesson, ex })));
}

export interface SkillStat {
  done: number;
  total: number;
  /** primul exercițiu netrecut, în ordinea parcursului */
  next?: ExRef;
}

export function skillProgress(s: State, skill: Skill, lessons: Lesson[]): SkillStat {
  const items = skillItems(skill, lessons);
  const open = items.filter((it) => !isPassed(s, it.lesson.id, it.ex.id));
  return { done: items.length - open.length, total: items.length, next: open[0] };
}

export const WEEK_LABELS = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'] as const;

export interface WeekDay {
  label: string;
  date: number;
  key: string;
  practiced: boolean;
  isToday: boolean;
  future: boolean;
}

/** Săptămâna curentă, de luni până duminică, cu zilele în care ai exersat. */
export function weekDays(days: string[], now = new Date()): WeekDay[] {
  const set = new Set(days);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const t = today(now);
  return WEEK_LABELS.map((label, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = today(d);
    return { label, date: d.getDate(), key, practiced: set.has(key), isToday: key === t, future: key > t };
  });
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bună dimineața';
  if (hour >= 12 && hour < 18) return 'Bună ziua';
  return 'Bună seara';
}

/** Deplasarea orizontală a nodului i pe traseu, în trepte de la -2 la 2 (șerpuit, ca un drum). */
export function zigzag(i: number): number {
  return Math.round(Math.sin((i * Math.PI) / 4) * 2) || 0;
}

export type NodeState = 'done' | 'current' | 'open';

export interface PathNode extends ExRef {
  state: NodeState;
  offset: number;
}

export interface PathUnit {
  lesson: Lesson;
  eyebrow: string;
  nodes: PathNode[];
  trophy: { done: boolean; offset: number };
  state: NodeState;
}

export interface PathChapter {
  chapter: Chapter;
  units: PathUnit[];
  /** lecțiile încă nedeblocate din capitol */
  locked: Lesson[];
}

export function eyebrow(c: Chapter, l: Lesson): string {
  const short = c.title.split(' · ')[0];
  return c.id === 'fac' ? `${short} · ${l.num}` : `${short} · Lecția ${l.num}`;
}

/**
 * Parcursul: fiecare lecție disponibilă e o unitate cu câte un nod pe exercițiu și un trofeu la final.
 * Nodul „current” e primul exercițiu netrecut din solfegiu (Modulul 0 + cartea); fișele de facultate nu îl iau.
 */
export function buildPath(s: State, chapters: Chapter[]): PathChapter[] {
  let found = false;
  return chapters.map((chapter) => {
    const units: PathUnit[] = [];
    const locked: Lesson[] = [];
    for (const lesson of chapter.lessons) {
      if (!lesson.available) {
        locked.push(lesson);
        continue;
      }
      const nodes: PathNode[] = lesson.exercises.map((ex, i) => {
        const done = isPassed(s, lesson.id, ex.id);
        let state: NodeState = done ? 'done' : 'open';
        if (!done && !found && chapter.id !== 'fac') {
          state = 'current';
          found = true;
        }
        return { lesson, ex, state, offset: zigzag(i) };
      });
      const allDone = nodes.length > 0 && nodes.every((n) => n.state === 'done');
      const unitState: NodeState = allDone ? 'done' : nodes.some((n) => n.state === 'current') ? 'current' : 'open';
      units.push({ lesson, eyebrow: eyebrow(chapter, lesson), nodes, trophy: { done: allDone, offset: zigzag(nodes.length) }, state: unitState });
    }
    return { chapter, units, locked };
  });
}
