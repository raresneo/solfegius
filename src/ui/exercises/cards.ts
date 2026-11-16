// Fișe cu repetiție spațiată (Armonie, Forme).
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, progressBar } from '../dom.ts';
import { DECKS } from '../../data/cards.ts';
import { review, weightFor, isDue } from '../../lib/srs.ts';

export const SESSION = 10;

export const runCards: Runner<Extract<Exercise, { kind: 'cards' }>> = (root, ex, ctx) => {
  const deck = DECKS[ex.deck];
  const now = Date.now();
  const ordered = deck.cards
    .map((c) => ({ c, w: weightFor(ctx.state.srs[`card:${c.id}`], now) + (isDue(ctx.state.srs[`card:${c.id}`], now) ? 10 : 0) + Math.random() }))
    .sort((a, b) => b.w - a.w)
    .slice(0, SESSION)
    .map((x) => x.c);
  let i = 0;
  let knew = 0;
  const box = h('div', { class: 'ex ex-cards' });
  root.append(box, h('p', { class: 'credit' }, `Sursa: ${deck.source}`));
  const next = () => {
    if (i >= ordered.length) {
      ctx.finish(knew / ordered.length, `${knew} din ${ordered.length} fișe știute`);
      return;
    }
    const c = ordered[i];
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
      if (good) knew++;
      ctx.state.srs[`card:${c.id}`] = review(ctx.state.srs[`card:${c.id}`], good, Date.now());
      ctx.save();
      i++;
      next();
    };
    box.replaceChildren(
      h('div', { class: 'ex-head' }, h('span', { class: 'muted' }, `${i + 1} / ${ordered.length}`), progressBar(i / ordered.length)),
      h('div', { class: 'flashcard' }, h('div', { class: 'card-q' }, c.q), answer),
      reveal,
      grade,
    );
  };
  next();
  return () => undefined;
};
