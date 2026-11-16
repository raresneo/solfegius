import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, progressBar } from '../dom.ts';
import { shuffle } from '../../lib/random.ts';

export const runQuiz: Runner<Extract<Exercise, { kind: 'quiz' }>> = (root, ex, ctx) => {
  const qs = shuffle(ex.questions, Math.random);
  let i = 0;
  let ok = 0;
  let timer = 0;
  const box = h('div', { class: 'ex ex-quiz' });
  root.append(box);
  const next = () => {
    if (i >= qs.length) {
      ctx.finish(ok / qs.length, `${ok} din ${qs.length} răspunsuri corecte`);
      return;
    }
    const q = qs[i];
    const fb = h('p', { class: 'feedback' }, '\u00a0');
    let done = false;
    const btns = q.options.map((o, k) =>
      h('button', { class: 'choice wide', onclick: () => {
        if (done) return;
        done = true;
        const good = k === q.answer;
        if (good) ok++;
        btns[k].classList.add(good ? 'ok' : 'bad');
        if (!good) btns[q.answer].classList.add('ok');
        fb.textContent = good ? 'Corect!' : q.explain ?? `Răspuns: ${q.options[q.answer]}`;
        i++;
        timer = window.setTimeout(next, good ? 700 : 1800);
      } }, o),
    );
    box.replaceChildren(
      h('div', { class: 'ex-head' }, h('span', { class: 'muted' }, `${i + 1} / ${qs.length}`), progressBar(i / qs.length)),
      h('h3', { class: 'q' }, q.q),
      h('div', { class: 'choices column' }, btns),
      fb,
    );
  };
  next();
  return () => clearTimeout(timer);
};
