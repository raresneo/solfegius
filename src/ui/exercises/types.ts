import type { Exercise } from '../../data/curriculum.ts';
import type { State } from '../store.ts';

export interface ExCtx {
  lessonId: string;
  state: State;
  save(): void;
  finish(score: number, summary: string): void;
}

export type Runner<E extends Exercise = Exercise> = (root: HTMLElement, ex: E, ctx: ExCtx) => () => void;
