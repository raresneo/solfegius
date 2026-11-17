// Citire de note: vezi nota pe portativ, alegi numele.
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, progressBar, staffBox } from '../dom.ts';
import { renderStaff } from '../../lib/staff.ts';
import { parseNote, roName, RO_NAMES } from '../../lib/theory.ts';
import type { MNote } from '../../lib/notation.ts';
import { weightedPick } from '../../lib/random.ts';
import { review, weightFor } from '../../lib/srs.ts';
import { playNote } from '../../audio/audio.ts';

export function wholeNote(pitch: string): MNote {
  return { pitch, dur: 4, type: 'w', dotted: false, tie: false, measure: 0, beat: 0 };
}

export const runNotes: Runner<Extract<Exercise, { kind: 'notes' }>> = (root, ex, ctx) => {
  const total = ex.count ?? 10;
  let i = 0;
  let ok = 0;
  let prev = '';
  let timer = 0;
  const box = h('div', { class: 'ex ex-notes' });
  root.append(box);

  const next = () => {
    if (i >= total) {
      ctx.finish(ok / total, `${ok} din ${total} note citite corect`);
      return;
    }
    const now = Date.now();
    const weights = ex.pool.map((p) => weightFor(ctx.state.srs[`note:${p}`], now) * (p === prev ? 0.1 : 1));
    const target = weightedPick(ex.pool, weights, Math.random);
    prev = target;
    const correctIdx = parseNote(target).letterIndex;
    const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '\u00a0');
    let answered = false;
    const buttons = RO_NAMES.map((name, li) =>
      h('button', { class: 'choice', 'data-note': name, onclick: () => answer(li) }, name),
    );
    const answer = (li: number) => {
      if (answered) return;
      answered = true;
      const good = li === correctIdx;
      if (good) ok++;
      buttons[li].classList.add(good ? 'ok' : 'bad');
      if (!good) buttons[correctIdx].classList.add('ok');
      fb.textContent = good ? 'Corect!' : `Era ${roName(target)}.`;
      try {
        playNote(target, 0.7);
      } catch {
        /* fără audio */
      }
      ctx.state.srs[`note:${target}`] = review(ctx.state.srs[`note:${target}`], good, Date.now());
      ctx.save();
      i++;
      timer = window.setTimeout(next, good ? 700 : 1500);
    };
    box.replaceChildren(
      h('div', { class: 'ex-head' }, h('span', { class: 'muted' }, `${i + 1} / ${total}`), progressBar(i / total)),
      staffBox(renderStaff({ notes: [wholeNote(target)], time: null, width: 150, noFinalBar: true, scale: 1.8 }).svg, 'big'),
      h('div', { class: 'choices seven' }, buttons),
      fb,
    );
  };
  next();
  return () => clearTimeout(timer);
};
