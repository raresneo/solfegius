import { h, pct, progressBar } from './ui/dom.ts';
import { CHAPTERS, findLesson, solfegeLessons } from './data/curriculum.ts';
import type { Exercise, Lesson } from './data/curriculum.ts';
import { DECKS } from './data/cards.ts';
import { exKey, lessonDone, lessonProgress, load, markPracticed, PASS, recordBest, save, streak } from './ui/store.ts';
import type { ExCtx } from './ui/exercises/types.ts';
import { runNotes } from './ui/exercises/notes.ts';
import { runEar } from './ui/exercises/ear.ts';
import { runSing } from './ui/exercises/sing.ts';
import { runRhythm } from './ui/exercises/rhythm.ts';
import { runSolfegiu } from './ui/exercises/solfegiu.ts';
import { runQuiz } from './ui/exercises/quiz.ts';
import { runCards } from './ui/exercises/cards.ts';

const state = load();
const app = document.getElementById('app') as HTMLElement;
let cleanup: () => void = () => undefined;

const KIND_LABEL: Record<Exercise['kind'], string> = {
  notes: 'Citire',
  ear: 'Auz',
  sing: 'Intonație',
  rhythm: 'Ritm',
  solfegiu: 'Solfegiu',
  quiz: 'Test',
  cards: 'Fișe',
};

function runExercise(root: HTMLElement, ex: Exercise, ctx: ExCtx): () => void {
  switch (ex.kind) {
    case 'notes': return runNotes(root, ex, ctx);
    case 'ear': return runEar(root, ex, ctx);
    case 'sing': return runSing(root, ex, ctx);
    case 'rhythm': return runRhythm(root, ex, ctx);
    case 'solfegiu': return runSolfegiu(root, ex, ctx);
    case 'quiz': return runQuiz(root, ex, ctx);
    case 'cards': return runCards(root, ex, ctx);
  }
}

export function currentLesson(): Lesson {
  const ls = solfegeLessons().filter((l) => l.available);
  return ls.find((l) => !lessonDone(state, l)) ?? ls[ls.length - 1];
}

function badge(l: Lesson): HTMLElement {
  if (!l.available) return h('span', { class: 'badge locked' }, 'în curând');
  if (lessonDone(state, l)) return h('span', { class: 'badge done' }, '✓');
  const p = lessonProgress(state, l);
  return h('span', { class: 'badge' }, p > 0 ? pct(p) : 'nou');
}

function viewHome(): void {
  const cur = currentLesson();
  const st = streak(state.days);
  app.replaceChildren(
    h('section', { class: 'hero' },
      h('h1', {}, 'Solfegiu de la zero'),
      h('p', { class: 'muted' }, 'După „Solfegiu pentru toți” (Rîpă, Nedelcuț). Puțin, zilnic: 15–20 de minute.'),
      h('div', { class: 'row' },
        h('a', { class: 'btn primary big', href: '#/antrenament' }, '▶ Antrenamentul de azi'),
        h('a', { class: 'btn big', href: `#/lectie/${cur.id}` }, `Continuă: ${cur.num}. ${cur.title.split(' · ')[0]}`),
      ),
      st ? h('p', { class: 'streak' }, `🔥 ${st} ${st === 1 ? 'zi' : 'zile'} la rând`) : null,
    ),
    ...CHAPTERS.map((c) =>
      h('section', { class: 'chapter' },
        h('h2', {}, c.title),
        c.note ? h('p', { class: 'muted small' }, c.note) : null,
        h('ul', { class: 'lessons' },
          c.lessons.map((l) =>
            h('li', { class: l.available ? '' : 'locked' },
              h(l.available ? 'a' : 'div', l.available ? { href: `#/lectie/${l.id}`, class: 'lesson-row' } : { class: 'lesson-row' },
                h('span', { class: 'num' }, l.num),
                h('span', { class: 'lt' }, h('strong', {}, l.title), h('small', { class: 'muted' }, l.topics.join(' · '))),
                badge(l),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/** Filtrează null/false ca să putem scrie condiții direct în listă. */
function nodes(...items: (Node | null | false)[]): Node[] {
  return items.filter((x): x is Node => !!x);
}

function viewLesson(id: string): void {
  const l = findLesson(id);
  if (!l || !l.available) return viewHome();
  app.replaceChildren(...nodes(
    h('a', { href: '#/', class: 'back' }, '← Toate lecțiile'),
    h('h1', {}, `${l.num}. ${l.title}`),
    h('p', { class: 'muted' }, l.topics.join(' · ')),
    progressBar(lessonProgress(state, l)),
    l.theory.length ? h('section', { class: 'theory' },
      h('h2', {}, 'Teorie'),
      ...l.theory.map((t, i) => h('details', { open: i === 0 || !lessonProgress(state, l) }, h('summary', {}, t.title), h('p', {}, t.body))),
    ) : null,
    h('section', {},
      h('h2', {}, 'Exerciții'),
      h('ol', { class: 'exercises' },
        l.exercises.map((ex) => {
          const b = state.best[exKey(l.id, ex.id)];
          return h('li', {},
            h('a', { href: `#/ex/${l.id}/${ex.id}`, class: 'ex-row' },
              h('span', { class: `kind k-${ex.kind}` }, KIND_LABEL[ex.kind]),
              h('span', { class: 'lt' }, ex.title),
              h('span', { class: `badge ${b !== undefined && b >= PASS ? 'done' : ''}` }, b === undefined ? '›' : pct(b)),
            ),
          );
        }),
      ),
    ),
    lessonDone(state, l) ? h('p', { class: 'streak' }, 'Lecție terminată. Poți trece mai departe, dar revino la solfegii: se lipesc prin repetiție.') : null,
  ));
}

function resultPanel(score: number, summary: string, actions: HTMLElement[]): HTMLElement {
  const stars = score >= 0.9 ? '★★★' : score >= PASS ? '★★☆' : score >= 0.4 ? '★☆☆' : '☆☆☆';
  return h('div', { class: `result ${score >= PASS ? 'pass' : ''}` },
    h('div', { class: 'stars' }, stars),
    h('div', { class: 'score' }, pct(score)),
    h('p', {}, summary),
    h('p', { class: 'muted small' }, score >= PASS ? 'Trecut.' : `Ai nevoie de ${pct(PASS)} ca să bifezi exercițiul.`),
    h('div', { class: 'row' }, actions),
  );
}

function makeCtx(lessonId: string, onFinish: (score: number, summary: string) => void): ExCtx {
  return {
    lessonId,
    state,
    save: () => save(state),
    finish: onFinish,
  };
}

function viewExercise(lessonId: string, exId: string): void {
  const l = findLesson(lessonId);
  const ex = l?.exercises.find((e) => e.id === exId);
  if (!l || !ex) return viewHome();
  const idx = l.exercises.indexOf(ex);
  const nextEx = l.exercises[idx + 1];
  const body = h('div', { class: 'ex-body' });
  app.replaceChildren(
    h('a', { href: `#/lectie/${l.id}`, class: 'back' }, `← Lecția ${l.num}`),
    h('h1', { class: 'ex-title' }, h('span', { class: `kind k-${ex.kind}` }, KIND_LABEL[ex.kind]), ' ', ex.title),
    body,
  );
  cleanup = runExercise(body, ex, makeCtx(l.id, (score, summary) => {
    cleanup();
    cleanup = () => undefined;
    recordBest(state, exKey(l.id, ex.id), score);
    markPracticed(state);
    save(state);
    body.replaceChildren(resultPanel(score, summary, [
      h('button', { class: 'btn', onclick: () => viewExercise(lessonId, exId) }, '↻ Încă o dată'),
      nextEx ? h('a', { class: 'btn primary', href: `#/ex/${l.id}/${nextEx.id}` }, 'Următorul ›') : h('a', { class: 'btn primary', href: `#/lectie/${l.id}` }, 'Înapoi la lecție'),
    ]));
  }));
}

/** Antrenamentul zilnic: exercițiile lecției curente + un solfegiu din lecția anterioară + fișele scadente. */
export function trainingPlan(): { lesson: Lesson; ex: Exercise }[] {
  const cur = currentLesson();
  const ls = solfegeLessons().filter((l) => l.available);
  const prev = ls[ls.indexOf(cur) - 1];
  const plan: { lesson: Lesson; ex: Exercise }[] = cur.exercises.map((ex) => ({ lesson: cur, ex }));
  const review = prev?.exercises.filter((e) => e.kind === 'solfegiu').pop();
  if (prev && review) plan.push({ lesson: prev, ex: review });
  const now = Date.now();
  const fac = CHAPTERS.find((c) => c.id === 'fac');
  for (const l of fac?.lessons ?? []) {
    const ex = l.exercises[0];
    if (ex?.kind !== 'cards') continue;
    const seen = DECKS[ex.deck].cards.some((c) => state.srs[`card:${c.id}`]);
    const due = DECKS[ex.deck].cards.some((c) => (state.srs[`card:${c.id}`]?.due ?? Infinity) <= now);
    if (seen && due) plan.push({ lesson: l, ex });
  }
  return plan;
}

function viewTraining(step = 0, scores: number[] = []): void {
  const plan = trainingPlan();
  if (step >= plan.length) {
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    app.replaceChildren(
      h('h1', {}, 'Gata pe azi'),
      resultPanel(avg, `${plan.length} exerciții. Revino mâine: ziua de mâine contează mai mult decât încă o oră azi.`, [
        h('a', { class: 'btn primary', href: '#/' }, 'Acasă'),
      ]),
    );
    return;
  }
  const { lesson, ex } = plan[step];
  const body = h('div', { class: 'ex-body' });
  app.replaceChildren(
    h('a', { href: '#/', class: 'back' }, '← Acasă'),
    h('div', { class: 'ex-head' }, h('span', { class: 'muted' }, `Antrenament · ${step + 1} / ${plan.length}`), progressBar(step / plan.length)),
    h('h1', { class: 'ex-title' }, h('span', { class: `kind k-${ex.kind}` }, KIND_LABEL[ex.kind]), ' ', ex.title),
    h('p', { class: 'muted small' }, `Lecția ${lesson.num}`),
    body,
  );
  cleanup = runExercise(body, ex, makeCtx(lesson.id, (score, summary) => {
    cleanup();
    cleanup = () => undefined;
    recordBest(state, exKey(lesson.id, ex.id), score);
    markPracticed(state);
    save(state);
    body.replaceChildren(resultPanel(score, summary, [
      h('button', { class: 'btn primary', onclick: () => viewTraining(step + 1, [...scores, score]) }, 'Continuă ›'),
    ]));
  }));
}

function viewProgress(): void {
  const ls = solfegeLessons().filter((l) => l.available);
  const done = ls.filter((l) => lessonDone(state, l)).length;
  const notes = Object.entries(state.srs).filter(([k]) => k.startsWith('note:'));
  const mastered = notes.filter(([, c]) => c.box >= 3).length;
  const cards = Object.entries(state.srs).filter(([k]) => k.startsWith('card:'));
  const cardsKnown = cards.filter(([, c]) => c.box >= 3).length;
  app.replaceChildren(
    h('a', { href: '#/', class: 'back' }, '← Acasă'),
    h('h1', {}, 'Progres'),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, String(streak(state.days))), h('span', {}, 'zile la rând')),
      h('div', { class: 'stat' }, h('b', {}, String(state.days.length)), h('span', {}, 'zile de exercițiu')),
      h('div', { class: 'stat' }, h('b', {}, `${done}/${ls.length}`), h('span', {}, 'lecții terminate')),
      h('div', { class: 'stat' }, h('b', {}, `${mastered}/${notes.length}`), h('span', {}, 'note stăpânite')),
      h('div', { class: 'stat' }, h('b', {}, `${cardsKnown}/${cards.length}`), h('span', {}, 'fișe știute')),
    ),
    h('ul', { class: 'lessons' }, ls.map((l) => h('li', {}, h('a', { href: `#/lectie/${l.id}`, class: 'lesson-row' }, h('span', { class: 'num' }, l.num), h('span', { class: 'lt' }, l.title), badge(l))))),
    h('p', { class: 'muted small' }, 'Progresul stă doar pe acest dispozitiv.'),
    h('button', { class: 'btn ghost', onclick: () => {
      if (confirm('Ștergi tot progresul de pe acest dispozitiv?')) {
        localStorage.removeItem('solfegius.v1');
        location.reload();
      }
    } }, 'Resetează progresul'),
  );
}

function route(): void {
  cleanup();
  cleanup = () => undefined;
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (parts[0] === 'lectie' && parts[1]) return viewLesson(parts[1]);
  if (parts[0] === 'ex' && parts[1] && parts[2]) return viewExercise(parts[1], parts[2]);
  if (parts[0] === 'antrenament') return viewTraining();
  if (parts[0] === 'progres') return viewProgress();
  viewHome();
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => undefined);
}
