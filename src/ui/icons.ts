// Iconițe SVG desenate de mână (24×24, culoarea textului). Fără fonturi de iconițe, fără emoji.
import { h } from './dom.ts';
import type { Exercise } from '../data/curriculum.ts';

export type IconName =
  | 'note'
  | 'wave'
  | 'mic'
  | 'metronome'
  | 'notes2'
  | 'pencil'
  | 'question'
  | 'cards'
  | 'check'
  | 'star'
  | 'lock'
  | 'speaker'
  | 'flame'
  | 'play'
  | 'route'
  | 'bars';

const FILL = 'fill="currentColor" stroke="none"';

const PATHS: Record<IconName, string> = {
  note: `<circle cx="9" cy="17" r="3.2" ${FILL}/><path d="M12 17V4.5l6 2"/>`,
  wave: '<path d="M5 10v4M9.5 6v12M14.5 8v8M19 10.5v3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  metronome: '<path d="M7 20.5h10L14 3.5h-4z"/><path d="M12 15.5l5-7.5"/>',
  notes2: `<circle cx="7" cy="17.5" r="2.6" ${FILL}/><circle cx="17" cy="15.5" r="2.6" ${FILL}/><path d="M9.6 17.5V6.5l10-2v11"/>`,
  pencil: '<path d="M4.5 19.5l1-4.5L16 4.5l3.5 3.5L9 18.5z"/><path d="M13.5 7l3.5 3.5"/>',
  question: `<path d="M9 9.2a3 3 0 1 1 4.4 2.6c-.9.5-1.4 1.1-1.4 2.2"/><circle cx="12" cy="18" r="1.3" ${FILL}/>`,
  cards: '<rect x="4" y="7.5" width="12.5" height="13" rx="2.2"/><path d="M8 4h9.8A2.2 2.2 0 0 1 20 6.2V16"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  star: `<path ${FILL} d="M12 3.2l2.7 5.5 6 .9-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.3 9.6l6-.9z"/>`,
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  speaker: `<path ${FILL} d="M4 9.2h3.6L12.5 5v14l-4.9-4.2H4z"/><path d="M15.8 9a4.5 4.5 0 0 1 0 6M18.6 6.4a8.3 8.3 0 0 1 0 11.2"/>`,
  flame: `<path ${FILL} d="M12.6 2.8c.6 3.4 4.9 5.6 4.9 10.4a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.2 2.6-5.4.2 1.7 1 2.8 2.1 3.3-.2-3.2.1-5.8 1.4-8.3z"/>`,
  play: `<path ${FILL} d="M8 4.8v14.4a1 1 0 0 0 1.5.9l11-7.2a1 1 0 0 0 0-1.8l-11-7.2A1 1 0 0 0 8 4.8z"/>`,
  route: `<circle cx="6" cy="18" r="2.2" ${FILL}/><circle cx="18" cy="6" r="2.2" ${FILL}/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>`,
  bars: '<path d="M5.5 20v-7M12 20V5M18.5 20v-10"/>',
};

export function icon(name: IconName): HTMLElement {
  return h('span', {
    class: `ico i-${name}`,
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`,
  });
}

export const KIND_ICON: Record<Exercise['kind'], IconName> = {
  notes: 'note',
  ear: 'wave',
  sing: 'mic',
  rhythm: 'metronome',
  solfegiu: 'notes2',
  quiz: 'question',
  cards: 'cards',
  dictation: 'pencil',
};
