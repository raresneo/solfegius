// Sesiune de fișe cu reînvățare: ce nu știai revine după câteva fișe, ca la Anki.

/** După câte fișe revine una pe care n-o știai. */
export const RELEARN_GAP = 3;
/** De câte ori o vezi cel mult într-o sesiune. */
export const MAX_TRIES = 3;

export interface SessionStats {
  total: number;
  /** știute din prima */
  first: number;
  /** știute la final (din prima sau după revenire) */
  known: number;
  score: number;
}

export interface CardSession {
  current(): string | undefined;
  /** Notează fișa curentă. `first` = prima încercare: doar ea intră în repetiția spațiată. */
  rate(good: boolean): { id: string; first: boolean } | null;
  done(): boolean;
  /** fișe terminate (știute sau epuizate), pentru bara de progres */
  finished(): number;
  stats(): SessionStats;
}

/**
 * Înainte, scorul era „câte știai din prima”: la un pachet nou nu treceai niciodată de 70%, iar repetiția
 * spațiată îți aducea exact fișele grele, deci nici a doua oară. Acum o fișă pe care n-o știai revine în
 * aceeași sesiune; scorul spune câte știi la final. Repetiția spațiată primește doar prima încercare.
 */
export function cardSession(ids: string[]): CardSession {
  const queue = ids.slice();
  const tries: Record<string, number> = {};
  const firstOk = new Set<string>();
  const known = new Set<string>();
  return {
    current: () => queue[0],
    rate(good) {
      const id = queue.shift();
      if (id === undefined) return null;
      const n = (tries[id] = (tries[id] ?? 0) + 1);
      const first = n === 1;
      if (first && good) firstOk.add(id);
      if (good) known.add(id);
      else if (n < MAX_TRIES) queue.splice(Math.min(RELEARN_GAP, queue.length), 0, id);
      return { id, first };
    },
    done: () => queue.length === 0,
    finished: () => ids.length - new Set(queue).size,
    stats() {
      const total = ids.length;
      return { total, first: firstOk.size, known: known.size, score: total ? known.size / total : 0 };
    },
  };
}
