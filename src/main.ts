import { h, pct, progressBar } from './ui/dom.ts';
import { allLessons, CHAPTERS, findLesson, solfegeLessons } from './data/curriculum.ts';
import type { Exercise, Lesson } from './data/curriculum.ts';
import { DECKS } from './data/cards.ts';
import { exKey, lessonDone, lessonProgress, load, markPracticed, PASS, recordBest, save, streak, today } from './ui/store.ts';
import { buildPath, findSkill, greeting, SKILLS, skillItems, skillProgress, weekDays } from './ui/model.ts';
import type { ExRef, PathNode, PathUnit, Skill } from './ui/model.ts';
import { icon, KIND_ICON } from './ui/icons.ts';
import type { IconName } from './ui/icons.ts';
import { audioCtx, newVoice, playCadence } from './audio/audio.ts';
import type { Voice } from './audio/audio.ts';
import type { ExCtx } from './ui/exercises/types.ts';
import { runNotes } from './ui/exercises/notes.ts';
import { runEar } from './ui/exercises/ear.ts';
import { runSing } from './ui/exercises/sing.ts';
import { runRhythm } from './ui/exercises/rhythm.ts';
import { runSolfegiu } from './ui/exercises/solfegiu.ts';
import { runQuiz } from './ui/exercises/quiz.ts';
import { runCards } from './ui/exercises/cards.ts';
import { runDictation } from './ui/exercises/dictation.ts';

const state = load();
const app = document.getElementById('app') as HTMLElement;
let cleanup: () => void = () => undefined;
let tuning: Voice | null = null;

const KIND_LABEL: Record<Exercise['kind'], string> = {
  notes: 'Citire',
  ear: 'Auz',
  sing: 'Intonație',
  rhythm: 'Ritm',
  solfegiu: 'Solfegiu',
  quiz: 'Test',
  cards: 'Fișe',
  dictation: 'Dicteu',
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
    case 'dictation': return runDictation(root, ex, ctx);
  }
}

export function currentLesson(): Lesson {
  const ls = solfegeLessons().filter((l) => l.available);
  return ls.find((l) => !lessonDone(state, l)) ?? ls[ls.length - 1];
}

const cls = (...c: (string | false | null | undefined)[]): string => c.filter(Boolean).join(' ');
const exHref = (r: ExRef): string => `#/ex/${r.lesson.id}/${r.ex.id}`;
const shortTitle = (l: Lesson): string => l.title.split(' · ')[0];

function badge(l: Lesson): HTMLElement {
  if (!l.available) return h('span', { class: 'badge locked' }, 'în curând');
  if (lessonDone(state, l)) return h('span', { class: 'badge done' }, '✓');
  const p = lessonProgress(state, l);
  return h('span', { class: 'badge' }, p > 0 ? pct(p) : 'nou');
}

/** Filtrează null/false ca să putem scrie condiții direct în listă. */
function nodes(...items: (Node | null | false)[]): Node[] {
  return items.filter((x): x is Node => !!x);
}

/** Cadența de acordaj, de pe butonul de sunet din bannerul lecției. */
function playTuning(): void {
  try {
    tuning?.stop();
    const v = newVoice();
    tuning = v;
    playCadence(v, audioCtx().currentTime + 0.05);
  } catch {
    /* fără audio */
  }
}

// ---------- Azi ----------

function skillCard(sk: Skill, i: number): HTMLElement {
  const p = skillProgress(state, sk, allLessons());
  return h('a', { class: `skill s-${sk.id}`, href: `#/abilitate/${sk.id}`, style: `--i:${i}` },
    h('span', { class: 'tile' }, icon(sk.icon)),
    h('strong', {}, sk.title),
    h('small', { class: 'muted' }, sk.sub),
    progressBar(p.total ? p.done / p.total : 0),
    h('small', { class: 'muted count' }, `${p.done} din ${p.total} exerciții`),
  );
}

function viewHome(): void {
  const cur = currentLesson();
  const st = streak(state.days);
  const doneToday = state.days.includes(today());
  const isNew = state.days.length === 0;
  const plan = trainingPlan();
  const minutes = Math.max(5, Math.round(plan.length * 2.5));
  app.replaceChildren(
    h('section', { class: 'greet' },
      h('div', {},
        h('p', { class: 'muted hello' }, greeting(new Date().getHours())),
        h('h1', { class: 'display' }, doneToday ? 'Bravo, ai exersat azi.' : 'Gata de antrenament?'),
      ),
      h('a', { class: cls('streak-pill', doneToday && 'lit'), href: '#/progres', 'aria-label': `${st} zile la rând` }, icon('flame'), h('b', {}, String(st))),
    ),
    h('ol', { class: 'week', 'aria-label': 'Săptămâna asta' },
      weekDays(state.days).map((d, i) =>
        h('li', { class: cls('day', d.practiced && 'done', d.isToday && 'today', d.future && 'future'), style: `--i:${i}` },
          h('span', { class: 'dot' }, d.practiced ? icon('check') : d.label),
          h('small', {}, String(d.date)),
        ),
      ),
    ),
    h('section', { class: 'hero-card' },
      h('div', { class: 'hero-top' },
        h('span', { class: 'eyebrow' }, isNew ? 'Primii pași' : `Lecția ${cur.num}`),
        h('span', { class: 'chip' }, `~${minutes} min`),
      ),
      h('h2', {}, isNew ? 'Hai să începem de la zero' : 'Antrenamentul de azi'),
      h('p', {}, isNew
        ? 'Portativul, cheia sol și primele note. Câteva minute pe zi, cu feedback la fiecare răspuns.'
        : `${shortTitle(cur)} + recapitulare: ${plan.length} exerciții, pe rând.`),
      h('a', { class: 'btn pop big block', href: '#/antrenament' }, icon('play'), isNew ? 'Începe' : doneToday ? 'Încă o rundă' : 'Începe antrenamentul'),
    ),
    h('div', { class: 'sec-head' }, h('h2', {}, 'Antrenează o abilitate'), h('a', { href: '#/parcurs', class: 'link' }, 'Parcursul ›')),
    h('div', { class: 'skills' }, SKILLS.map((sk, i) => skillCard(sk, i))),
  );
}

// ---------- Parcurs ----------

function nodeView(n: PathNode, i: number): HTMLElement {
  const current = n.state === 'current';
  return h('li', { class: cls('trail-item', current && 'has-bubble'), style: `--x:${n.offset};--i:${i}` },
    current ? h('span', { class: 'bubble' }, 'Începe') : null,
    h('a', {
      href: exHref(n),
      class: `node ${n.state} k-${n.ex.kind}`,
      'aria-label': `${KIND_LABEL[n.ex.kind]}: ${n.ex.title}`,
      title: n.ex.title,
    }, icon(n.state === 'done' ? 'check' : KIND_ICON[n.ex.kind])),
  );
}

function unitView(u: PathUnit): HTMLElement {
  return h('section', { class: `unit ${u.state}` },
    h('div', { class: 'banner' },
      h('a', { href: `#/lectie/${u.lesson.id}`, class: 'banner-main' },
        h('span', { class: 'eyebrow' }, u.eyebrow),
        h('strong', {}, u.lesson.title),
      ),
      h('button', { class: 'banner-sound', 'aria-label': 'Ascultă acordajul (cadența în Do)', onclick: () => playTuning() }, icon('speaker')),
    ),
    h('ol', { class: 'trail' },
      u.nodes.map((n, i) => nodeView(n, i)),
      h('li', { class: 'trail-item', style: `--x:${u.trophy.offset};--i:${u.nodes.length}` },
        h('a', {
          href: `#/lectie/${u.lesson.id}`,
          class: cls('node', 'trophy', u.trophy.done && 'done'),
          'aria-label': `Lecția ${u.lesson.num}: teorie și rezultate`,
        }, icon('star')),
      ),
    ),
  );
}

function lockedView(ls: Lesson[]): HTMLElement {
  const range = ls.length === 1 ? `Lecția ${ls[0].num}` : `Lecțiile ${ls[0].num}–${ls[ls.length - 1].num}`;
  return h('details', { class: 'locked-group' },
    h('summary', {}, icon('lock'), h('span', {}, `${range} · în curând`)),
    h('ul', { class: 'lessons' },
      ls.map((l) =>
        h('li', { class: 'locked' },
          h('div', { class: 'lesson-row' },
            h('span', { class: 'num' }, l.num),
            h('span', { class: 'lt' }, h('strong', {}, l.title), h('small', { class: 'muted' }, l.topics.join(' · '))),
          ),
        ),
      ),
    ),
  );
}

function viewPath(): void {
  const root = h('div', { class: 'path' });
  for (const pc of buildPath(state, CHAPTERS)) {
    root.append(h('header', { class: 'chapter-head' },
      h('h2', {}, pc.chapter.title),
      pc.chapter.note ? h('p', { class: 'muted small' }, pc.chapter.note) : null,
    ));
    for (const u of pc.units) root.append(unitView(u));
    if (pc.locked.length) root.append(lockedView(pc.locked));
  }
  app.replaceChildren(root);
  const cur = root.querySelector<HTMLElement>('.node.current');
  if (cur) requestAnimationFrame(() => cur.scrollIntoView({ block: 'center' }));
}

// ---------- Abilitate ----------

function viewSkill(id: string): void {
  const sk = findSkill(id);
  if (!sk) return viewHome();
  const items = skillItems(sk, allLessons());
  const p = skillProgress(state, sk, allLessons());
  app.replaceChildren(...nodes(
    h('a', { href: '#/', class: 'back' }, '← Azi'),
    h('div', { class: `skill-head s-${sk.id}` },
      h('span', { class: 'tile big' }, icon(sk.icon)),
      h('div', {}, h('h1', {}, sk.title), h('p', { class: 'muted' }, sk.sub)),
    ),
    progressBar(p.total ? p.done / p.total : 0),
    h('p', { class: 'muted small' }, `${p.done} din ${p.total} exerciții trecute`),
    p.next
      ? h('a', { class: 'btn primary big block', href: exHref(p.next) }, icon('play'), `Următorul: ${p.next.ex.title}`)
      : h('p', { class: 'streak' }, 'Le-ai trecut pe toate. Reia oricare: se lipesc prin repetiție.'),
    h('ol', { class: 'exercises' },
      items.map((it) => {
        const b = state.best[exKey(it.lesson.id, it.ex.id)];
        return h('li', {},
          h('a', { href: exHref(it), class: 'ex-row' },
            h('span', { class: 'num' }, it.lesson.num),
            h('span', { class: 'lt' }, it.ex.title, h('small', { class: 'muted' }, shortTitle(it.lesson))),
            h('span', { class: `badge ${b !== undefined && b >= PASS ? 'done' : ''}` }, b === undefined ? '›' : pct(b)),
          ),
        );
      }),
    ),
  ));
}

// ---------- Lecție și exerciții ----------

function viewLesson(id: string): void {
  const l = findLesson(id);
  if (!l || !l.available) return viewPath();
  app.replaceChildren(...nodes(
    h('a', { href: '#/parcurs', class: 'back' }, '← Parcurs'),
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
  const n = score >= 0.9 ? 3 : score >= PASS ? 2 : score >= 0.4 ? 1 : 0;
  const pass = score >= PASS;
  return h('div', { class: cls('result', pass && 'pass') },
    pass
      ? h('div', { class: 'burst', 'aria-hidden': 'true' },
        Array.from({ length: 12 }, (_, i) => h('i', { style: `--a:${i * 30}deg;--d:${(i % 3) * 60}ms` })))
      : null,
    h('div', { class: 'stars', role: 'img', 'aria-label': `${n} din 3 stele` },
      [0, 1, 2].map((i) => h('span', { class: i < n ? 'on' : '', style: `--i:${i}` }, '★'))),
    h('div', { class: 'score' }, pct(score)),
    h('p', {}, summary),
    h('p', { class: 'muted small' }, pass ? 'Trecut.' : `Ai nevoie de ${pct(PASS)} ca să bifezi exercițiul.`),
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
      nextEx ? h('a', { class: 'btn primary', href: `#/ex/${l.id}/${nextEx.id}` }, 'Următorul ›') : h('a', { class: 'btn primary', href: '#/parcurs' }, 'Înapoi la parcurs'),
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

/**
 * Planul se fixează la pornire: dacă lecția se termină la jumătatea antrenamentului,
 * nu sărim peste exerciții și nu schimbăm lista sub tine.
 */
function viewTraining(step = 0, scores: number[] = [], plan = trainingPlan()): void {
  window.scrollTo(0, 0);
  if (step >= plan.length) {
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    app.replaceChildren(
      h('h1', {}, 'Gata pe azi'),
      resultPanel(avg, `${scores.length} din ${plan.length} exerciții făcute. Revino mâine: ziua de mâine contează mai mult decât încă o oră azi.`, [
        h('a', { class: 'btn', href: '#/parcurs' }, 'Parcurs'),
        h('a', { class: 'btn primary', href: '#/' }, 'Acasă'),
      ]),
    );
    return;
  }
  const { lesson, ex } = plan[step];
  const body = h('div', { class: 'ex-body' });
  const skip = () => {
    cleanup();
    cleanup = () => undefined;
    viewTraining(step + 1, scores, plan);
  };
  app.replaceChildren(
    h('a', { href: '#/', class: 'back' }, '← Acasă'),
    h('div', { class: 'ex-head' },
      h('span', { class: 'muted' }, `Antrenament · ${step + 1} / ${plan.length}`),
      progressBar(step / plan.length),
      h('button', { class: 'btn ghost', onclick: skip, 'aria-label': 'Sari peste exercițiul ăsta' }, 'Sari ›'),
    ),
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
      h('button', { class: 'btn primary', onclick: () => viewTraining(step + 1, [...scores, score], plan) }, 'Continuă ›'),
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

// ---------- Navigare ----------

const TABS: { id: string; href: string; label: string; icon: IconName }[] = [
  { id: 'azi', href: '#/', label: 'Azi', icon: 'play' },
  { id: 'parcurs', href: '#/parcurs', label: 'Parcurs', icon: 'route' },
  { id: 'progres', href: '#/progres', label: 'Progres', icon: 'bars' },
];

const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Navigare' },
  TABS.map((t) => h('a', { href: t.href, 'data-tab': t.id }, icon(t.icon), h('span', {}, t.label))),
);
document.body.append(tabbar);

/** Tab-ul activ; '' = mod concentrat (exercițiu, antrenament): bara de jos dispare. */
function tabFor(section: string | undefined): string {
  if (section === 'parcurs' || section === 'lectie') return 'parcurs';
  if (section === 'progres') return 'progres';
  if (section === 'ex' || section === 'antrenament') return '';
  return 'azi';
}

function render(parts: string[]): void {
  if (parts[0] === 'lectie' && parts[1]) return viewLesson(parts[1]);
  if (parts[0] === 'ex' && parts[1] && parts[2]) return viewExercise(parts[1], parts[2]);
  if (parts[0] === 'antrenament') return viewTraining();
  if (parts[0] === 'progres') return viewProgress();
  if (parts[0] === 'parcurs') return viewPath();
  if (parts[0] === 'abilitate' && parts[1]) return viewSkill(parts[1]);
  viewHome();
}

function route(): void {
  cleanup();
  cleanup = () => undefined;
  tuning?.stop();
  tuning = null;
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const tab = tabFor(parts[0]);
  document.body.dataset.focus = tab ? '' : '1';
  for (const a of tabbar.querySelectorAll('a')) a.classList.toggle('active', a.dataset.tab === tab);
  window.scrollTo(0, 0);
  app.classList.remove('enter');
  render(parts);
  void app.offsetWidth; // repornește animația de intrare
  app.classList.add('enter');
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => undefined);
}
