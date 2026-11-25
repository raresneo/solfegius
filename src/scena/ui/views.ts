// Ecranele Scenei: hub, capitol, exercițiu (cu autoevaluare), toaleta actorului, înainte de scenă, fișe, texte, jurnal, catalog.
import { h, pct, progressBar } from '../../ui/dom.ts';
import { icon } from '../../ui/icons.ts';
import type { IconName } from '../../ui/icons.ts';
import { markPracticed, recordBest } from '../../ui/store.ts';
import type { State } from '../../ui/store.ts';
import { cardSession } from '../../lib/session.ts';
import { isDue, review, weightFor } from '../../lib/srs.ts';
import {
  CONCEPT_DECKS, CONCEPTS, chapterByKey, conceptsOf, deckConcepts, EXERCISES, exById, exercisesOf,
  MODE_LABEL, NEEDS_LABEL, ST_CHAPTERS, TEXT_KIND_LABEL, TEXTS, textById,
} from '../catalog.ts';
import type { Mode, StChapter, StEx } from '../catalog.ts';
import { checksFor, chapterProgress, isDone, nextInChapter, planRoutine, preshowPlan, ROUTINE, scKey, selfScore, totalProgress } from '../plan.ts';
import { journalMarkdown } from '../export.ts';
import type { ScenaState } from '../store.ts';
import { MODE_RUNNERS, nn, seg } from './modes.ts';
import { cls, download } from './kit.ts';
import type { AutoScore, ModeCtx } from './kit.ts';

export interface ScenaCtx {
  app: HTMLElement;
  state: State;
  save(): void;
  st: ScenaState;
  saveSt(): void;
  resultPanel(score: number, summary: string, actions: HTMLElement[]): HTMLElement;
}

export const MODE_ICON: Record<Mode, IconName> = {
  timer: 'timer', movement: 'wave', circles: 'target', memory: 'eye', metronome: 'metronome', record: 'mic',
  marking: 'pencil', situations: 'question', journal: 'feather', action: 'play', role: 'mask', sheet: 'book',
};

const noop = (): void => undefined;
const partName = (p: 1 | 2): string => (p === 1 ? 'Partea I · Trăirea' : 'Partea a II-a · Întruchiparea');
const chName = (c: StChapter): string => (/^[IVX]+$/.test(c.roman) ? `${c.roman}. ${c.title}` : c.title);

function badgeFor(best: Record<string, number>, id: string): HTMLElement {
  const b = best[scKey(id)];
  return h('span', { class: cls('badge', isDone(best, id) && 'done') }, b === undefined ? '›' : pct(b));
}

function exRow(c: ScenaCtx, e: StEx, showChapter = false): HTMLElement {
  const ch = chapterByKey(e.ch);
  return h('li', {},
    h('a', { href: `#/scena/ex/${e.id}`, class: cls('ex-row', e.variantOf && 'variant') },
      h('span', { class: `kind m-${e.mode}` }, MODE_LABEL[e.mode]),
      h('span', { class: 'lt' }, `${e.variantOf ? '↳ ' : ''}${e.title}`,
        h('small', { class: 'muted' }, `${showChapter && ch ? `cap. ${ch.roman} · ` : ''}pag. ${e.page} · ~${e.min} min · ${NEEDS_LABEL[e.needs]}`)),
      badgeFor(c.state.best, e.id),
    ),
  );
}

function record(c: ScenaCtx, id: string, score: number): void {
  recordBest(c.state, scKey(id), score);
  markPracticed(c.state);
  c.save();
  c.st.seen[id] = Date.now();
  c.saveSt();
}

// ---------- Hub ----------

const TOOLS: { href: string; icon: IconName; title: string; sub: string }[] = [
  { href: '#/scena/inainte', icon: 'mask', title: 'Înainte de scenă', sub: 'cabina, 10–15 minute' },
  { href: '#/scena/rol', icon: 'list', title: 'Partitura rolului', sub: 'bucăți, sarcini, supratemă' },
  { href: '#/scena/fise', icon: 'cards', title: 'Fișe', sub: `${CONCEPTS.length} de concepte` },
  { href: '#/scena/texte', icon: 'book', title: 'Texte din carte', sub: `${TEXTS.length}: pauze, accente, monologuri` },
  { href: '#/scena/jurnal', icon: 'feather', title: 'Jurnal', sub: 'viziuni, amintiri, observații' },
  { href: '#/scena/catalog', icon: 'search', title: 'Toate exercițiile', sub: `${EXERCISES.length}, caută și filtrează` },
];

function chapterRows(c: ScenaCtx, part: 1 | 2): HTMLElement {
  return h('ul', { class: 'lessons' }, ST_CHAPTERS.filter((ch) => ch.part === part).map((ch) => {
    const p = chapterProgress(c.state.best, ch.key);
    const nc = conceptsOf(ch.key).length;
    const b = !p.total ? h('span', { class: 'badge' }, 'teorie') : p.done === p.total ? h('span', { class: 'badge done' }, '✓') : h('span', { class: 'badge' }, p.done ? `${p.done}/${p.total}` : 'nou');
    return h('li', {}, h('a', { href: `#/scena/cap/${ch.key}`, class: 'lesson-row' },
      h('span', { class: 'num' }, /^[IVX]+$/.test(ch.roman) ? ch.roman : '·'),
      h('span', { class: 'lt' }, h('strong', {}, ch.title), h('small', { class: 'muted' }, `${p.total} exerciții${nc ? ` · ${nc} concepte` : ''}`)),
      b,
    ));
  }));
}

export function viewHub(c: ScenaCtx): void {
  const tp = totalProgress(c.state.best);
  const plan = planRoutine(c.state.best, c.st.seen);
  c.app.replaceChildren(
    h('h1', { class: 'display' }, 'Scena'),
    h('p', { class: 'muted' }, 'Artistul liric după Stanislavski, „Munca actorului cu sine însuși”: toate exercițiile din carte, pe capitole, cu pagina de unde vin.'),
    h('section', { class: 'hero-card' },
      h('div', { class: 'hero-top' }, h('span', { class: 'eyebrow' }, 'Antrenament și disciplină'), h('span', { class: 'chip' }, '~15 min')),
      h('h2', {}, 'Toaleta actorului'),
      h('p', {}, plan.map((e) => e.title).join(' · ')),
      h('a', { class: 'btn pop big block', href: '#/scena/toaleta' }, icon('play'), 'Începe'),
    ),
    h('div', { class: 'st-tools' }, TOOLS.map((t, i) => h('a', { class: 'st-tool', href: t.href, style: `--i:${i}` },
      h('span', { class: 'tile' }, icon(t.icon)), h('strong', {}, t.title), h('small', { class: 'muted' }, t.sub)))),
    h('div', { class: 'st-total' }, progressBar(tp.total ? tp.done / tp.total : 0), h('small', { class: 'muted' }, `${tp.done} din ${tp.total} exerciții făcute`)),
    h('div', { class: 'sec-head' }, h('h2', {}, partName(1))),
    chapterRows(c, 1),
    h('div', { class: 'sec-head' }, h('h2', {}, partName(2))),
    chapterRows(c, 2),
  );
}

// ---------- Capitol ----------

export function viewChapter(c: ScenaCtx, key: string): void {
  const ch = chapterByKey(key);
  if (!ch) return viewHub(c);
  const list = exercisesOf(key);
  const cs = conceptsOf(key);
  const p = chapterProgress(c.state.best, key);
  const next = list.find((e) => !isDone(c.state.best, e.id));
  c.app.replaceChildren(...nn(
    h('a', { href: '#/scena', class: 'back' }, '← Scena'),
    h('h1', {}, chName(ch)),
    h('p', { class: 'muted' }, partName(ch.part)),
    list.length ? progressBar(p.done / p.total) : null,
    list.length ? h('p', { class: 'muted small' }, `${p.done} din ${p.total} exerciții făcute`) : null,
    next
      ? h('a', { class: 'btn primary big block', href: `#/scena/ex/${next.id}` }, icon('play'), `Următorul: ${next.title}`)
      : list.length ? h('p', { class: 'streak' }, 'Capitol terminat. Reia oricare: în artă, repetiția e antrenament, nu pedeapsă.') : h('p', { class: 'muted' }, 'Capitolul ăsta e teorie: citește conceptele și repetă-le la Fișe.'),
    cs.length ? h('section', { class: 'theory' }, h('h2', {}, `Concepte (${cs.length})`),
      ...cs.map((k) => h('details', {}, h('summary', {}, k.term), h('p', {}, k.def), h('p', { class: 'muted small' }, `pag. ${k.page}`)))) : null,
    list.length ? h('section', {}, h('h2', {}, `Exerciții (${list.length})`), h('ol', { class: 'exercises' }, list.map((e) => exRow(c, e)))) : null,
  ));
}

// ---------- Exercițiu ----------

function classNote(e: StEx): string {
  if (e.needs !== 'solo') return `${NEEDS_LABEL[e.needs]}: fă-l la repetiție sau la clasă, apoi revino pentru autoevaluare. Ce poți pregăti singur e mai jos.`;
  return 'Cere profesor sau scenă: aplicația îți dă fișa și partea pe care o poți pregăti singur.';
}

function info(e: StEx): HTMLElement {
  const ch = chapterByKey(e.ch);
  const base = e.variantOf ? exById(e.variantOf) : undefined;
  return h('div', { class: 'st-info' },
    h('p', { class: 'muted small' }, `${e.part === 1 ? 'Partea I' : 'Partea a II-a'} · ${ch ? `cap. ${ch.roman}` : ''} · pag. ${e.page} · ~${e.min} min · ${NEEDS_LABEL[e.needs]}`),
    base ? h('p', { class: 'small' }, 'Variantă a exercițiului ', h('a', { class: 'link', href: `#/scena/ex/${base.id}` }, base.title)) : null,
    h('p', { class: 'st-sum' }, e.summary),
    e.steps.length ? h('ol', { class: 'st-steps' }, e.steps.map((s) => h('li', {}, s))) : null,
    e.feas === 'class' || e.needs !== 'solo' ? h('p', { class: 'st-class' }, classNote(e)) : null,
    e.opera ? h('div', { class: 'st-opera' }, h('strong', {}, 'La operă'), h('p', {}, e.opera)) : null,
  );
}

/** Corpul unui exercițiu: fișa, modul interactiv, apoi autoevaluarea (sau scorul măsurat). */
function exerciseBody(c: ScenaCtx, e: StEx, onFinish: (score: number, summary: string) => void, extra?: HTMLElement): { el: HTMLElement; dispose(): void } {
  const body = h('div', { class: 'ex-body' });
  const footer = h('div', { class: 'st-footer' });
  let auto: AutoScore | null = null;
  let dispose: () => void = noop;
  let finished = false;
  const toCheck = () => {
    if (finished) return;
    dispose();
    dispose = noop;
    if (auto) {
      finished = true;
      onFinish(auto.score, auto.summary);
      return;
    }
    const qs = checksFor(e);
    const ans: (number | null)[] = qs.map(() => null);
    const done = h('button', {
      class: 'btn primary big block',
      disabled: true,
      onclick: () => {
        finished = true;
        const n = (v: number) => ans.filter((a) => a === v).length;
        onFinish(selfScore(ans), `Autoevaluare: ${n(1)} da, ${n(0.5)} parțial, ${n(0)} nu.`);
      },
    }, 'Vezi rezultatul');
    footer.replaceChildren();
    body.replaceChildren(h('div', { class: 'st-check' },
      h('h2', {}, 'Autoevaluare'),
      h('p', { class: 'muted small' }, 'Răspunde sincer: scorul e pentru tine, nu pentru profesor.'),
      ...qs.map((q, i) => h('div', { class: 'chk' }, h('p', {}, q), seg(['Da', 'Parțial', 'Nu'], -1, (k) => {
        ans[i] = [1, 0.5, 0][k];
        done.disabled = ans.some((a) => a === null);
      }))),
      done,
    ));
    body.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const mc: ModeCtx = { ex: e, st: c.st, saveSt: c.saveSt, setAuto: (a) => (auto = a), complete: toCheck };
  dispose = MODE_RUNNERS[e.mode](body, mc);
  footer.append(h('button', { class: 'btn primary big block', onclick: toCheck }, 'Gata › Autoevaluare'));
  return { el: h('div', { class: 'st-ex' }, info(e), extra ?? null, body, footer), dispose: () => dispose() };
}

function exerciseScreen(c: ScenaCtx, e: StEx, back: { href: string; label: string }, extra?: () => HTMLElement): () => void {
  const wrap = h('div', {});
  let cur = { dispose: noop };
  const mount = () => {
    cur.dispose();
    const b = exerciseBody(c, e, (score, summary) => {
      b.dispose();
      record(c, e.id, score);
      const nx = exById(e.id) ? nextInChapter(e) : undefined;
      wrap.replaceChildren(c.resultPanel(score, summary, [
        h('button', { class: 'btn', onclick: () => mount() }, '↻ Încă o dată'),
        nx ? h('a', { class: 'btn primary', href: `#/scena/ex/${nx.id}` }, 'Următorul ›') : h('a', { class: 'btn primary', href: back.href }, 'Înapoi'),
      ]));
    }, extra?.());
    cur = b;
    wrap.replaceChildren(b.el);
  };
  c.app.replaceChildren(
    h('a', { href: back.href, class: 'back' }, `← ${back.label}`),
    h('h1', { class: 'ex-title' }, h('span', { class: `kind m-${e.mode}` }, MODE_LABEL[e.mode]), ' ', e.title),
    wrap,
  );
  mount();
  return () => cur.dispose();
}

export function viewExercise(c: ScenaCtx, id: string): () => void {
  const e = exById(id);
  if (!e) {
    viewHub(c);
    return noop;
  }
  const ch = chapterByKey(e.ch);
  return exerciseScreen(c, e, { href: `#/scena/cap/${e.ch}`, label: ch ? `Cap. ${ch.roman}. ${ch.title}` : 'Scena' });
}

// ---------- Toaleta actorului, înainte de scenă ----------

function viewSequence(c: ScenaCtx, title: string, plan: StEx[], labels: string[], intro?: HTMLElement): () => void {
  let cur = { dispose: noop };
  const scores: number[] = [];
  const step = (i: number) => {
    cur.dispose();
    cur = { dispose: noop };
    window.scrollTo(0, 0);
    if (i >= plan.length) {
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      c.app.replaceChildren(
        h('h1', {}, 'Gata pe azi'),
        c.resultPanel(avg, `${scores.length} din ${plan.length} exerciții făcute. Mâine continui cu următoarele din carte.`, [
          h('a', { class: 'btn', href: '#/scena' }, 'Scena'),
          h('a', { class: 'btn primary', href: '#/' }, 'Acasă'),
        ]),
      );
      return;
    }
    const e = plan[i];
    const holder = h('div', {});
    const b = exerciseBody(c, e, (score, summary) => {
      b.dispose();
      record(c, e.id, score);
      scores.push(score);
      holder.replaceChildren(c.resultPanel(score, summary, [h('button', { class: 'btn primary', onclick: () => step(i + 1) }, 'Continuă ›')]));
    });
    cur = b;
    holder.append(b.el);
    c.app.replaceChildren(...nn(
      h('a', { href: '#/scena', class: 'back' }, '← Scena'),
      h('div', { class: 'ex-head' },
        h('span', { class: 'muted' }, `${title} · ${i + 1} / ${plan.length}`),
        progressBar(i / plan.length),
        h('button', { class: 'btn ghost', onclick: () => step(i + 1), 'aria-label': 'Sari peste exercițiul ăsta' }, 'Sari ›')),
      h('p', { class: 'eyebrow st-eyebrow' }, labels[i] ?? ''),
      h('h1', { class: 'ex-title' }, h('span', { class: `kind m-${e.mode}` }, MODE_LABEL[e.mode]), ' ', e.title),
      i === 0 ? intro ?? null : null,
      holder,
    ));
  };
  step(0);
  return () => cur.dispose();
}

export const viewRoutine = (c: ScenaCtx): (() => void) =>
  viewSequence(c, 'Toaleta actorului', planRoutine(c.state.best, c.st.seen), ROUTINE.map((r) => r.label),
    h('p', { class: 'muted small' }, 'Ordinea din „ritualul de cincisprezece minute” al cărții: corpul, atenția, glasul și dicția, tempo-ritmul, apoi imaginația care le unește. Fiecare zi ia următoarele exerciții din carte.'));

export function viewPreshow(c: ScenaCtx): () => void {
  const role = c.st.roles.find((r) => r.id === c.st.activeRole) ?? c.st.roles[0];
  const bit = role?.bits.find((b) => b.task || b.visions);
  const intro = role
    ? h('div', { class: 'st-rolecard' },
      h('p', { class: 'eyebrow' }, `Rolul: ${role.title || 'fără nume'}${role.work ? ` · ${role.work}` : ''}`),
      role.supertask ? h('p', {}, h('strong', {}, 'Supratema: '), role.supertask) : h('p', { class: 'muted small' }, 'Supratema încă lipsește din partitură.'),
      bit?.task ? h('p', {}, h('strong', {}, `Prima sarcină (${bit.name}): `), bit.task) : null,
      bit ? h('p', { class: 'muted small' }, `Tempo-ritmul interior al intrării: ${bit.tempo}/10`) : null,
      role.preshow ? h('p', { class: 'small' }, role.preshow) : null,
      h('a', { class: 'link', href: `#/scena/rol/${role.id}` }, 'Partitura rolului ›'))
    : h('p', { class: 'st-rolecard muted small' }, 'Fă-ți partitura rolului (supratema, bucățile, sarcinile) și o vei vedea aici înainte să intri. ', h('a', { class: 'link', href: '#/scena/rol' }, 'Partitura rolului ›'));
  return viewSequence(c, 'Înainte de scenă', preshowPlan(), ['Controlorul mușchilor', 'Cercul mic', 'Toaleta sufletului', 'Tempo-ritmul din cabină'], intro);
}

// ---------- Fișe ----------

const SESSION = 10;
const cardKey = (id: string): string => `card:${id}`;

export function viewDecks(c: ScenaCtx): void {
  const now = Date.now();
  c.app.replaceChildren(
    h('a', { href: '#/scena', class: 'back' }, '← Scena'),
    h('h1', {}, 'Fișe Stanislavski'),
    h('p', { class: 'muted' }, 'Termenii „sistemului”, cu definiția din carte. Repetiție spațiată: ce nu știi revine mai des.'),
    h('ul', { class: 'lessons' }, CONCEPT_DECKS.map((d) => {
      const cs = deckConcepts(d.id);
      const known = cs.filter((k) => (c.state.srs[cardKey(k.id)]?.box ?? 0) >= 3).length;
      const due = cs.filter((k) => c.state.srs[cardKey(k.id)] && isDue(c.state.srs[cardKey(k.id)], now)).length;
      return h('li', {}, h('a', { class: 'lesson-row', href: `#/scena/fise/${d.id}` },
        h('span', { class: 'lt' }, h('strong', {}, d.title), h('small', { class: 'muted' }, `${cs.length} fișe · ${known} știute${due ? ` · ${due} de repetat` : ''}`)),
        h('span', { class: 'badge' }, '›')));
    })),
  );
}

export function viewDeck(c: ScenaCtx, id: string): () => void {
  const d = CONCEPT_DECKS.find((x) => x.id === id);
  if (!d) {
    viewDecks(c);
    return noop;
  }
  const now = Date.now();
  const ordered = deckConcepts(id)
    .map((k) => ({ k, w: weightFor(c.state.srs[cardKey(k.id)], now) + (isDue(c.state.srs[cardKey(k.id)], now) ? 10 : 0) + Math.random() }))
    .sort((a, b) => b.w - a.w)
    .slice(0, SESSION)
    .map((x) => x.k);
  const byId = new Map(ordered.map((k) => [k.id, k]));
  const session = cardSession(ordered.map((k) => k.id));
  const retry = new Set<string>();
  const box = h('div', { class: 'ex ex-cards' });
  const next = () => {
    const cid = session.current();
    const k = cid === undefined ? undefined : byId.get(cid);
    if (!k) {
      const s = session.stats();
      markPracticed(c.state);
      c.save();
      box.replaceChildren(c.resultPanel(s.score, `${s.known} din ${s.total} fișe știute la final.`, [
        h('a', { class: 'btn', href: '#/scena/fise' }, 'Fișe'),
        h('button', { class: 'btn primary', onclick: () => viewDeck(c, id) }, '↻ Încă o rundă'),
      ]));
      return;
    }
    const ch = chapterByKey(k.ch);
    const answer = h('div', { class: 'card-a', hidden: true }, k.def, h('p', { class: 'muted small' }, `${ch ? `cap. ${ch.roman} · ` : ''}pag. ${k.page}`));
    const rate = (good: boolean) => {
      const r = session.rate(good);
      if (r?.first) {
        c.state.srs[cardKey(k.id)] = review(c.state.srs[cardKey(k.id)], good, Date.now());
        c.save();
      }
      if (!good) retry.add(k.id);
      next();
    };
    const grade = h('div', { class: 'row', hidden: true },
      h('button', { class: 'btn bad', onclick: () => rate(false) }, 'Nu știam'),
      h('button', { class: 'btn ok', onclick: () => rate(true) }, 'Știam'));
    const reveal = h('button', {
      class: 'btn primary',
      onclick: () => {
        answer.hidden = false;
        grade.hidden = false;
        reveal.hidden = true;
      },
    }, 'Arată răspunsul');
    box.replaceChildren(
      h('div', { class: 'ex-head' }, h('span', { class: 'muted' }, `${session.finished()} / ${ordered.length} gata`), progressBar(session.finished() / ordered.length)),
      retry.has(k.id) ? h('p', { class: 'muted small' }, 'Revine: încă o dată, acum că ai văzut răspunsul.') : '',
      h('div', { class: 'flashcard' }, h('div', { class: 'card-q' }, k.term), h('p', { class: 'muted small' }, 'Ce înseamnă, după Stanislavski?'), answer),
      reveal,
      grade,
    );
  };
  c.app.replaceChildren(h('a', { href: '#/scena/fise', class: 'back' }, '← Fișe'), h('h1', { class: 'ex-title' }, d.title), box);
  next();
  return noop;
}

// ---------- Texte din carte ----------

const TEXT_ORDER = ['pauze', 'accent', 'intonatie', 'dictie', 'vers', 'monolog', 'situatie', 'lista'];

export function viewTexts(c: ScenaCtx): void {
  const kinds = TEXT_ORDER.filter((k) => TEXTS.some((t) => t.kind === k)).concat([...new Set(TEXTS.map((t) => t.kind))].filter((k) => !TEXT_ORDER.includes(k)));
  c.app.replaceChildren(
    h('a', { href: '#/scena', class: 'back' }, '← Scena'),
    h('h1', {}, 'Texte din carte'),
    h('p', { class: 'muted' }, 'Frazele, versurile și situațiile pe care lucrează Torțov, cu soluția lui. Rostește-le, înregistrează-te, compară.'),
    ...kinds.flatMap((k) => [
      h('h2', {}, TEXT_KIND_LABEL[k] ?? k),
      h('ul', { class: 'lessons' }, TEXTS.filter((t) => t.kind === k).map((t) => {
        const ch = chapterByKey(t.ch);
        return h('li', {}, h('a', { class: 'lesson-row', href: `#/scena/text/${t.id}` },
          h('span', { class: 'lt' }, h('span', {}, t.text.length > 90 ? `${t.text.slice(0, 88)}…` : t.text),
            h('small', { class: 'muted' }, `${ch ? `cap. ${ch.roman} · ` : ''}pag. ${t.page}`)),
          badgeFor(c.state.best, `T-${t.id}`)));
      })),
    ]),
  );
}

export function viewText(c: ScenaCtx, id: string): () => void {
  const t = textById(id);
  if (!t) {
    viewTexts(c);
    return noop;
  }
  const story = t.kind === 'situatie' || t.kind === 'lista';
  const e: StEx = {
    id: `T-${t.id}`, part: t.ch.startsWith('2') ? 2 : 1, ch: t.ch, title: `${TEXT_KIND_LABEL[t.kind] ?? 'Text'} din carte`, page: t.page,
    element: 'vorbire', group: 'voce',
    summary: story
      ? 'Citește, imaginează-ți concret (cine, unde, ce s-a întâmplat), apoi povestește sau improvizează cu cuvintele tale. Înregistrează-te și ascultă.'
      : 'Citește pentru sens, hotărăște unde respiri, unde e pauza și ce cuvânt duce fraza. Rostește, ascultă-te, apoi compară cu soluția din carte.',
    steps: [], min: 5, needs: 'solo', mode: 'record',
    params: { tx: t.text, rw: story ? ['povestit, cu viziuni', 'trăit, la persoana întâi'] : ['simplu, pentru sens', 'cu pauzele și accentul lui Torțov'] },
    feas: 'partial', opera: '', checks: [], variantOf: null,
  };
  const solution = () => h('details', { class: 'st-sol' }, h('summary', {}, 'Soluția din carte'), h('p', {}, t.reference));
  return exerciseScreen(c, e, { href: '#/scena/texte', label: 'Texte din carte' }, solution);
}

// ---------- Jurnal ----------

export function viewJournal(c: ScenaCtx): void {
  const entries = c.st.journal.slice().sort((a, b) => b.at - a.at);
  c.app.replaceChildren(...nn(
    h('a', { href: '#/scena', class: 'back' }, '← Scena'),
    h('h1', {}, 'Jurnal de scenă'),
    h('p', { class: 'muted' }, `${entries.length} ${entries.length === 1 ? 'intrare' : 'intrări'}. Rămân doar pe acest telefon; exportă-le în Obsidian când vrei.`),
    entries.length ? h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => download('jurnal-scena.md', journalMarkdown(c.st.journal)) }, '⬇ Exportă .md'),
      h('button', {
        class: 'btn ghost',
        onclick: () => {
          if (confirm('Ștergi tot jurnalul de pe acest dispozitiv?')) {
            c.st.journal = [];
            c.saveSt();
            viewJournal(c);
          }
        },
      }, 'Șterge jurnalul')) : h('p', { class: 'muted small' }, 'Îl umpli din exercițiile de imaginație, memorie și observație.'),
    ...entries.map((en) => {
      const d = new Date(en.at);
      return h('div', { class: 'flashcard' },
        h('p', { class: 'muted small' }, `${d.toLocaleDateString('ro-RO')} · `, h('a', { class: 'link', href: `#/scena/ex/${en.exId}` }, en.title)),
        ...en.items.filter((i) => i.a.trim()).map((i) => h('div', { class: 'j-item' }, h('strong', {}, i.q), h('p', {}, i.a))));
    }),
  ));
}

// ---------- Catalog ----------

export function viewCatalog(c: ScenaCtx): void {
  let q = '';
  let mode: Mode | null = null;
  let solo = false;
  const list = h('ol', { class: 'exercises' });
  const count = h('p', { class: 'muted small' });
  const draw = () => {
    const nq = q.trim().toLowerCase();
    const xs = EXERCISES.filter((e) => (!mode || e.mode === mode) && (!solo || (e.needs === 'solo' && e.feas !== 'class')) &&
      (!nq || `${e.title} ${e.summary} ${e.element}`.toLowerCase().includes(nq)));
    count.textContent = `${xs.length} exerciții`;
    list.replaceChildren(...xs.map((e) => exRow(c, e, true)));
  };
  const search = h('input', { type: 'search', class: 'st-search', placeholder: 'Caută: broșa, cerc, metronom, vocală...' });
  search.addEventListener('input', () => {
    q = search.value;
    draw();
  });
  const modes = Object.keys(MODE_LABEL) as Mode[];
  const soloBox = h('input', { type: 'checkbox' });
  soloBox.addEventListener('change', () => {
    solo = soloBox.checked;
    draw();
  });
  c.app.replaceChildren(
    h('a', { href: '#/scena', class: 'back' }, '← Scena'),
    h('h1', {}, 'Toate exercițiile'),
    search,
    h('div', { class: 'seg wrap' }, seg(['Toate', ...modes.map((m) => MODE_LABEL[m])], 0, (i) => {
      mode = i ? modes[i - 1] : null;
      draw();
    })),
    h('label', { class: 'cp' }, soloBox, h('span', {}, 'Doar ce pot face singur')),
    count,
    list,
  );
  draw();
}
