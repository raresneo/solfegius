// Repetiție spațiată tip Leitner: ce greșești revine mai des, ce știi se rărește.

export interface CardState {
  box: number;
  due: number;
  seen: number;
  correct: number;
}

export type Deck = Record<string, CardState>;

export const DAY = 24 * 60 * 60 * 1000;
/** zile până la următoarea apariție, pe cutie */
export const BOX_DAYS = [0, 0, 1, 3, 7, 16];

export function review(card: CardState | undefined, correct: boolean, now: number): CardState {
  const prev = card ?? { box: 0, due: 0, seen: 0, correct: 0 };
  const box = correct ? Math.min(prev.box + 1, BOX_DAYS.length - 1) : 1;
  return {
    box,
    due: now + BOX_DAYS[box] * DAY,
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
  };
}

export function isDue(card: CardState | undefined, now: number): boolean {
  return !card || card.due <= now;
}

/** Ponderi pentru alegere: cutie mică (greșit des / nou) = mai probabil. */
export function weightFor(card: CardState | undefined, now: number): number {
  if (!card) return 3;
  const base = [3, 4, 2.5, 1.2, 0.6, 0.3][card.box] ?? 0.3;
  return isDue(card, now) ? base * 1.5 : base;
}

export function dueIds(deck: Deck, ids: string[], now: number): string[] {
  return ids.filter((id) => isDue(deck[id], now)).sort((a, b) => (deck[a]?.due ?? 0) - (deck[b]?.due ?? 0));
}
