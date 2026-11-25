// Scena: modulul de pregătire actoricească pentru artistul liric, legat de restul aplicației (progres, serie de zile).
import { h, progressBar } from '../ui/dom.ts';
import { icon } from '../ui/icons.ts';
import type { State } from '../ui/store.ts';
import { loadScena, saveScena, SCENA_KEY } from './store.ts';
import { planRoutine, totalProgress } from './plan.ts';
import { MODE_LABEL } from './catalog.ts';
import {
  viewCatalog, viewChapter, viewDeck, viewDecks, viewExercise, viewHub, viewJournal, viewPreshow, viewRoutine, viewText, viewTexts,
} from './ui/views.ts';
import type { ScenaCtx } from './ui/views.ts';
import { viewRole, viewRoles } from './ui/roles.ts';

export interface ScenaHost {
  app: HTMLElement;
  state: State;
  save(): void;
  resultPanel(score: number, summary: string, actions: HTMLElement[]): HTMLElement;
}

const st = loadScena();
const noop = (): void => undefined;

/** Randează ecranul pentru #/scena/...; întoarce funcția de oprire (metronom, microfon, cronometru). */
export function renderScena(host: ScenaHost, parts: string[]): () => void {
  const c: ScenaCtx = { ...host, st, saveSt: () => saveScena(st) };
  const [a, b] = parts;
  switch (a) {
    case 'cap':
      if (b) {
        viewChapter(c, b);
        return noop;
      }
      break;
    case 'ex':
      if (b) return viewExercise(c, b);
      break;
    case 'toaleta':
      return viewRoutine(c);
    case 'inainte':
      return viewPreshow(c);
    case 'fise':
      if (b) return viewDeck(c, b);
      viewDecks(c);
      return noop;
    case 'texte':
      viewTexts(c);
      return noop;
    case 'text':
      if (b) return viewText(c, b);
      break;
    case 'jurnal':
      viewJournal(c);
      return noop;
    case 'catalog':
      viewCatalog(c);
      return noop;
    case 'rol':
      if (b) viewRole(c, b);
      else viewRoles(c);
      return noop;
  }
  viewHub(c);
  return noop;
}

/** Ecranele în care lucrezi (exercițiu, toaletă, fișe): bara de jos dispare, ca la solfegiu. */
export function scenaFocus(parts: string[]): boolean {
  const [a, b] = parts;
  return a === 'ex' || a === 'toaleta' || a === 'inainte' || a === 'text' || (a === 'fise' && !!b);
}

/** Cardul de pe „Azi”: toaleta actorului de azi și cât din carte ai făcut. */
export function scenaHomeCard(state: State): HTMLElement {
  const tp = totalProgress(state.best);
  const plan = planRoutine(state.best, st.seen);
  return h('a', { class: 'st-home', href: '#/scena/toaleta' },
    h('div', { class: 'hero-top' }, h('span', { class: 'eyebrow' }, 'Toaleta actorului'), h('span', { class: 'chip dark' }, '~15 min')),
    h('strong', {}, 'Corp, atenție, voce, tempo-ritm, imaginație'),
    h('ul', {}, plan.map((e) => h('li', {}, h('span', { class: `kind m-${e.mode}` }, MODE_LABEL[e.mode]), ' ', e.title))),
    progressBar(tp.total ? tp.done / tp.total : 0),
    h('small', { class: 'muted' }, `${tp.done} din ${tp.total} exerciții Stanislavski`),
    h('span', { class: 'btn primary block' }, icon('play'), 'Începe toaleta'),
  );
}

export function scenaStats(state: State): { done: number; total: number; journal: number; roles: number } {
  const tp = totalProgress(state.best);
  return { ...tp, journal: st.journal.length, roles: st.roles.length };
}

export function clearScena(): void {
  localStorage.removeItem(SCENA_KEY);
}
