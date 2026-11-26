// Fișe cu repetiție spațiată (Armonie, Forme). Ce nu știai revine în aceeași sesiune, ca la Anki.
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, progressBar } from '../dom.ts';
import { DECKS } from '../../data/cards.ts';
import { review, weightFor, isDue } from '../../lib/srs.ts';
import { cardSession } from '../../lib/session.ts';

export const SESSION = 10;

export const runCards: Runner<Extract<Exercise, { kind: 'cards' }>> = (root, ex, ctx) => {
  const deck = DECKS[ex.deck];
  const now = Date.now();
  const ordered = deck.cards
    .map((c) => ({ c, w: weightFor(ctx.state.srs[`card:${c.id}`], now) + (isDue(ctx.state.srs[`card:${c.id}`], now) ? 10 : 0) + Math.random() }))
    .sort((a, b) => b.w - a.w)
    .slice(0, SESSION)
    .map((x) => x.c);
  const byId = new Map(ordered.map((c) => [c.id, c]));
  const session = cardSession(ordered.map((c) => c.id));
  const retry = new Set<string>();
  const box = h('div', { class: 'ex ex-cards' });
  root.append(box, h('p', { class: 'credit' }, `Sursa: ${deck.source}`));
  const next = () => {
    const id = session.current();
    const c = id === undefined ? undefined : byId.get(id);
    if (!c) {
      const st = session.stats();
      const learned = st.known - st.first;
      ctx.finish(st.score, `${st.known} din ${st.total} fișe știute la final${learned > 0 ? ` (${st.first} din prima, ${learned} învățate acum)` : ''}`);
      return;
    }
    const again = retry.has(c.id);
    const answer = h('div', { class: 'card-a', hidden: true }, c.a);
    const grade = h('div', { class: 'row', hidden: true },
      h('button', { class: 'btn bad', onclick: () => rate(false) }, 'Nu știam'),
      h('button', { class: 'btn ok', onclick: () => rate(true) }, 'Știam'),
    );
    const reveal = h('button', { class: 'btn primary', onclick: () => {
      answer.hidden = false;
      grade.hidden = false;
      reveal.hidden = true;
    } }, 'Arată răspunsul');
    const rate = (good: boolean) => {
      const r = session.rate(good);
      // repetiția spațiată primește doar prima încercare: ce ai învățat acum revine mâine, nu peste o săptămână
      if (r?.first) {
        ctx.state.srs[`card:${c.id}`] = review(ctx.state.srs[`card:${c.id}`], good, Date.now());
        ctx.save();
      }
      if (!good) retry.add(c.id);
      next();
    };
    const total = ordered.length;
    box.replaceChildren(
      h('div', { class: 'ex-head' }, h('span', { class: 'muted' }, `${session.finished()} / ${total} gata`), progressBar(session.finished() / total)),
      again ? h('p', { class: 'muted small' }, 'Revine: încă o dată, acum că ai văzut răspunsul.') : '',
      h('div', { class: 'flashcard' }, h('div', { class: 'card-q' }, c.q), answer),
      reveal,
      grade,
    );
  };
  next();
  return () => undefined;
};
