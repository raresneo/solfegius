// Partitura rolului (cap. III–VII, XV): situațiile propuse, „dacă”, supratema, acțiunea principală, bucăți și sarcini.
import { h } from '../../ui/dom.ts';
import { GIVEN_FIELDS, newBit, newRole, uid } from '../store.ts';
import type { Bit, Role } from '../store.ts';
import { exById } from '../catalog.ts';
import { roleMarkdown } from '../export.ts';
import { download } from './kit.ts';
import { nn } from './modes.ts';
import type { ScenaCtx } from './views.ts';

export function viewRoles(c: ScenaCtx): void {
  const roles = c.st.roles.slice().sort((a, b) => b.updated - a.updated);
  c.app.replaceChildren(
    h('a', { href: '#/scena', class: 'back' }, '← Scena'),
    h('h1', {}, 'Partitura rolului'),
    h('p', { class: 'muted' }, 'Rolul pe care îl pregătești acum: situațiile propuse, supratema, bucățile cu sarcinile lor, viziunile și subtextul. Rolul activ apare la „Înainte de scenă”.'),
    h('button', {
      class: 'btn primary big block',
      onclick: () => {
        const r = newRole(uid());
        c.st.roles.push(r);
        c.st.activeRole = r.id;
        c.saveSt();
        location.hash = `#/scena/rol/${r.id}`;
      },
    }, '+ Rol nou'),
    h('ul', { class: 'lessons' }, roles.map((r) => h('li', {}, h('a', { class: 'lesson-row', href: `#/scena/rol/${r.id}` },
      h('span', { class: 'lt' }, h('strong', {}, r.title || 'Rol fără nume'), h('small', { class: 'muted' }, [r.work, r.aria].filter(Boolean).join(' · ') || 'de completat')),
      h('span', { class: 'badge' }, r.id === c.st.activeRole ? 'activ' : '›'))))),
  );
}

type Str<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];

export function viewRole(c: ScenaCtx, id: string): void {
  const r = c.st.roles.find((x) => x.id === id);
  if (!r) return viewRoles(c);
  const touch = () => {
    r.updated = Date.now();
    c.saveSt();
  };
  const area = (label: string, value: string, set: (v: string) => void, placeholder = '', rows = 2) => {
    const ta = h('textarea', { rows, placeholder });
    ta.value = value;
    ta.addEventListener('input', () => {
      set(ta.value);
      touch();
    });
    return h('label', { class: 'fld' }, h('span', {}, label), ta);
  };
  const line = (label: string, key: Str<Role>, placeholder = '') => {
    const inp = h('input', { type: 'text', placeholder });
    inp.value = r[key];
    inp.addEventListener('input', () => {
      r[key] = inp.value;
      touch();
    });
    return h('label', { class: 'fld' }, h('span', {}, label), inp);
  };
  const text = (label: string, key: Str<Role>, placeholder: string, rows = 2) => area(label, r[key], (v) => (r[key] = v), placeholder, rows);
  const bitCard = (b: Bit, i: number): HTMLElement => {
    const bf = (label: string, key: Str<Bit>, placeholder: string, rows = 2) => area(label, b[key], (v) => (b[key] = v), placeholder, rows);
    const name = h('input', { type: 'text', 'aria-label': 'Numele bucății' });
    name.value = b.name;
    name.addEventListener('input', () => {
      b.name = name.value;
      touch();
    });
    const tempoOut = h('b', {}, String(b.tempo));
    const tempo = h('input', { type: 'range', min: 1, max: 10, value: b.tempo, 'aria-label': 'Tempo-ritmul interior' });
    tempo.addEventListener('input', () => {
      b.tempo = Number(tempo.value);
      tempoOut.textContent = tempo.value;
      touch();
    });
    const move = (d: number) => {
      const j = i + d;
      if (j < 0 || j >= r.bits.length) return;
      [r.bits[i], r.bits[j]] = [r.bits[j], r.bits[i]];
      touch();
      viewRole(c, id);
    };
    return h('div', { class: 'bit' },
      h('div', { class: 'bit-head' }, h('span', { class: 'num' }, String(i + 1)), name,
        h('button', { class: 'btn ghost', 'aria-label': 'Mută mai sus', onclick: () => move(-1) }, '↑'),
        h('button', { class: 'btn ghost', 'aria-label': 'Mută mai jos', onclick: () => move(1) }, '↓')),
      bf('Textul sau măsurile', 'text', 'versurile bucății, ori „m. 1–16”', 3),
      bf('Sarcina', 'task', 'Vreau să... (verb activ, nu o stare)'),
      bf('Obstacolul', 'obstacle', 'ce mă împiedică'),
      bf('Obiectul comunicării', 'object', 'cui cânt: partener, eu însumi, un obiect imaginar, sala'),
      bf('Viziunile interioare', 'visions', 'ce văd în timp ce cânt (filmul interior)'),
      bf('Subtextul', 'subtext', 'ce gândesc de fapt, sub cuvinte'),
      h('label', { class: 'tempo' }, 'Tempo-ritmul interior', tempo, tempoOut, h('small', { class: 'muted' }, '/10')),
      h('button', {
        class: 'btn ghost small',
        onclick: () => {
          if (r.bits.length > 1 && !confirm(`Ștergi „${b.name}”?`)) return;
          r.bits.splice(i, 1);
          if (!r.bits.length) r.bits.push(newBit(1));
          touch();
          viewRole(c, id);
        },
      }, 'Șterge bucata'),
    );
  };
  const notes = Object.entries(r.exNotes).flatMap(([ex, fields]) =>
    Object.entries(fields).filter(([, v]) => v.trim()).map(([f, v]) => h('li', {}, h('a', { class: 'link', href: `#/scena/ex/${ex}` }, exById(ex)?.title ?? ex), ` · ${f}: ${v}`)));
  c.app.replaceChildren(...nn(
    h('a', { href: '#/scena/rol', class: 'back' }, '← Roluri'),
    h('h1', {}, r.title || 'Rol nou'),
    r.id === c.st.activeRole ? h('p', { class: 'badge done' }, 'Rolul activ') : h('button', {
      class: 'btn',
      onclick: () => {
        c.st.activeRole = r.id;
        c.saveSt();
        viewRole(c, id);
      },
    }, 'Fă-l rolul activ'),
    h('section', { class: 'role-form' },
      line('Rolul', 'title', 'ex. Figaro'),
      line('Opera / lucrarea', 'work', 'ex. Le nozze di Figaro'),
      line('Compozitor, libretist', 'composer', 'ex. Mozart, Da Ponte'),
      line('Aria sau scena', 'aria', 'ex. „Non più andrai”'),
      h('h2', {}, 'Situațiile propuse'),
      ...GIVEN_FIELDS.map(([k, q]) => area(q, r.given[k] ?? '', (v) => (r.given[k] = v))),
      h('h2', {}, '„Dacă” magic'),
      text('Ce aș face eu, dacă...', 'magicIf', 'Dacă eu aș fi în situația lui, acum, ce aș face?'),
      h('h2', {}, 'Supratema și acțiunea principală'),
      text('Supratema', 'supertask', 'Vreau să... (pentru tot rolul, verb activ)'),
      text('Acțiunea principală (transversală)', 'through', 'linia care leagă toate bucățile de supratemă'),
      text('Contra-acțiunea', 'counter', 'ce i se opune, cine și cum'),
      h('h2', {}, `Bucăți și sarcini (${r.bits.length})`),
      ...r.bits.map((b, i) => bitCard(b, i)),
      h('button', {
        class: 'btn',
        onclick: () => {
          r.bits.push(newBit(r.bits.length + 1));
          touch();
          viewRole(c, id);
        },
      }, '+ Bucată nouă'),
      h('h2', {}, 'Perspectiva, caracterizarea, memoria'),
      text('Perspectiva rolului', 'perspective', 'unde e culmea, ce păstrez pentru final, cum dozez forța', 3),
      text('Caracterizare', 'character', 'corp, mers, gest, voce, costum'),
      text('Memoria emoțională', 'memory', 'amintiri analoge din viața ta (rămân doar pe acest telefon)'),
      text('Înainte de scenă', 'preshow', 'ce îmi verific în cabină înainte de intrare'),
    ),
    notes.length ? h('section', {}, h('h2', {}, 'Din exerciții'), h('ul', { class: 'st-steps' }, notes)) : null,
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => download(`${(r.title || 'rol').replace(/[^\p{L}\p{N}]+/gu, '-')}.md`, roleMarkdown(r)) }, '⬇ Exportă .md'),
      h('button', {
        class: 'btn ghost',
        onclick: () => {
          if (!confirm(`Ștergi partitura „${r.title || 'Rol fără nume'}”?`)) return;
          c.st.roles = c.st.roles.filter((x) => x.id !== r.id);
          if (c.st.activeRole === r.id) c.st.activeRole = c.st.roles[0]?.id ?? null;
          c.saveSt();
          location.hash = '#/scena/rol';
        },
      }, 'Șterge rolul')),
    h('p', { class: 'muted small' }, 'Se salvează singur, pe acest telefon.'),
  ));
}
