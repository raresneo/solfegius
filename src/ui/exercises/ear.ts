// Auz funcțional: după cadența de acordaj auzi o notă și spui ce treaptă e (idee preluată din birdears / GNU Solfege).
import type { Exercise } from '../../data/curriculum.ts';
import type { Runner } from './types.ts';
import { h, progressBar } from '../dom.ts';
import { degreeInC, parseNote, roName, romanDegree } from '../../lib/theory.ts';
import { weightedPick } from '../../lib/random.ts';
import { review, weightFor } from '../../lib/srs.ts';
import { audioCtx, newVoice, playCadence, tone } from '../../audio/audio.ts';
import type { Voice } from '../../audio/audio.ts';

export function degreeLabel(p: string): string {
  const deg = degreeInC(p);
  const high = p === 'C5';
  return `${roName(p)}${high ? ' sus' : ''} · ${high ? 'VIII' : romanDegree(deg)}`;
}

export const runEar: Runner<Extract<Exercise, { kind: 'ear' }>> = (root, ex, ctx) => {
  const total = ex.count ?? 10;
  let i = 0;
  let ok = 0;
  let target = '';
  let prev = '';
  let voice: Voice | null = null;
  let timer = 0;
  let answered = false;
  const box = h('div', { class: 'ex ex-ear' });
  root.append(box);

  const play = (withCadence: boolean) => {
    voice?.stop();
    const v = newVoice();
    voice = v;
    const t = audioCtx().currentTime + 0.05;
    const off = withCadence ? playCadence(v, t) : 0;
    tone(parseNote(target).midi, t + off, 1.1, v.out, 0.25);
  };

  const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '\u00a0');
  const head = h('div', { class: 'ex-head' });
  const choices = h('div', { class: 'choices' });
  const controls = h(
    'div',
    { class: 'row' },
    h('button', { class: 'btn ghost', onclick: () => play(true) }, 'Cadența + nota'),
    h('button', { class: 'btn ghost', onclick: () => play(false) }, 'Repetă nota'),
  );

  const question = () => {
    if (i >= total) {
      ctx.finish(ok / total, `${ok} din ${total} trepte recunoscute`);
      return;
    }
    const now = Date.now();
    target = weightedPick(ex.pool, ex.pool.map((p) => weightFor(ctx.state.srs[`ear:${p}`], now) * (p === prev ? 0.3 : 1)), Math.random);
    prev = target;
    answered = false;
    fb.textContent = '\u00a0';
    head.replaceChildren(h('span', { class: 'muted' }, `${i + 1} / ${total}`), progressBar(i / total));
    choices.replaceChildren(
      ...ex.pool.map((p) =>
        h('button', { class: 'choice wide', 'data-pitch': p, onclick: (e: Event) => answer(p, e.currentTarget as HTMLElement) }, degreeLabel(p)),
      ),
    );
    play(i === 0);
  };

  const answer = (p: string, btn: HTMLElement) => {
    if (answered) return;
    answered = true;
    const good = p === target;
    if (good) ok++;
    btn.classList.add(good ? 'ok' : 'bad');
    if (!good) choices.querySelector(`[data-pitch="${target}"]`)?.classList.add('ok');
    fb.textContent = good ? 'Exact!' : `Era ${degreeLabel(target)}. Ascult-o încă o dată.`;
    if (!good) play(false);
    ctx.state.srs[`ear:${target}`] = review(ctx.state.srs[`ear:${target}`], good, Date.now());
    ctx.save();
    i++;
    timer = window.setTimeout(question, good ? 900 : 2200);
  };

  const start = h('button', { class: 'btn primary big', onclick: () => {
    box.replaceChildren(head, h('p', { class: 'hint' }, 'Cadența îți fixează Do-ul în ureche, apoi auzi o singură notă. Raportează-o la Do.'), controls, choices, fb);
    question();
  } }, '▶ Ascultă acordajul');
  box.append(
    h('p', { class: 'hint' }, 'Pune căștile sau dă volumul. Primul sunet după cadență e cel pe care trebuie să-l recunoști.'),
    start,
  );
  return () => {
    clearTimeout(timer);
    voice?.stop();
  };
};
