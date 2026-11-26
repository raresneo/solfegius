import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, allLessons } from '../src/data/curriculum.ts';
import { buildPath, eyebrow, greeting, SKILLS, findSkill, skillItems, skillProgress, weekDays, zigzag } from '../src/ui/model.ts';
import type { State } from '../src/ui/store.ts';

const fresh = (): State => ({ version: 1, best: {}, srs: {}, settings: { showNames: true, guide: false, tolerance: 50 }, days: [] });
const nodesOf = (s: State) => buildPath(s, CHAPTERS).flatMap((c) => c.units.flatMap((u) => u.nodes));

test('parcurs: la început, nodul curent e primul exercițiu din Modulul 0', () => {
  const all = nodesOf(fresh());
  const cur = all.filter((n) => n.state === 'current');
  assert.equal(cur.length, 1);
  assert.equal(`${cur[0].lesson.id}/${cur[0].ex.id}`, 'm0-1/lines');
  assert.ok(all.filter((n) => n !== cur[0]).every((n) => n.state === 'open'));
});

test('parcurs: nodul curent avansează după un exercițiu trecut, nu și după unul picat', () => {
  const s = fresh();
  s.best['m0-1/lines'] = 0.5;
  assert.equal(nodesOf(s).find((n) => n.state === 'current')?.ex.id, 'lines');
  s.best['m0-1/lines'] = 0.8;
  const all = nodesOf(s);
  assert.equal(all.find((n) => n.ex.id === 'lines' && n.lesson.id === 'm0-1')?.state, 'done');
  assert.equal(all.find((n) => n.state === 'current')?.ex.id, 'spaces');
});

test('parcurs: lecție terminată = unitate „done” cu trofeu aprins; următoarea devine curentă', () => {
  const s = fresh();
  for (const ex of CHAPTERS[0].lessons[0].exercises) s.best[`m0-1/${ex.id}`] = 1;
  const units = buildPath(s, CHAPTERS)[0].units;
  assert.equal(units[0].state, 'done');
  assert.equal(units[0].trophy.done, true);
  assert.equal(units[1].state, 'current');
  assert.equal(units[1].nodes[0].state, 'current');
});

test('parcurs: fișele de facultate nu iau niciodată nodul curent', () => {
  const s = fresh();
  for (const l of allLessons()) if (l.available && !l.id.startsWith('arm') && l.id !== 'forme') for (const ex of l.exercises) s.best[`${l.id}/${ex.id}`] = 1;
  assert.equal(nodesOf(s).filter((n) => n.state === 'current').length, 0);
});

test('parcurs: lecțiile 7–35 apar ca blocate, câte 6 unități în capitolul A', () => {
  const p = buildPath(fresh(), CHAPTERS);
  assert.equal(p.reduce((a, c) => a + c.locked.length, 0), 29);
  assert.equal(p.find((c) => c.chapter.id === 'a1')?.units.length, 6);
  assert.ok(p.every((c) => c.locked.every((l) => !l.available)));
});

test('parcurs: eticheta bannerului', () => {
  const [m0, a1, , , fac] = CHAPTERS;
  assert.equal(eyebrow(m0, m0.lessons[0]), 'Modulul 0 · Lecția 0.1');
  assert.equal(eyebrow(a1, a1.lessons[0]), 'Capitolul A · Lecția 1');
  assert.equal(eyebrow(fac, fac.lessons[0]), 'Teorie pentru facultate · A1');
});

test('zigzag: drum șerpuit, simetric, între -2 și 2', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(zigzag), [0, 1, 2, 1, 0, -1, -2, -1, 0]);
});

test('abilități: fiecare exercițiu disponibil aparține exact uneia', () => {
  for (const l of allLessons().filter((x) => x.available)) {
    for (const ex of l.exercises) {
      const owners = SKILLS.filter((s) => s.kinds.includes(ex.kind));
      assert.equal(owners.length, 1, `${l.id}/${ex.id}`);
    }
  }
  const total = SKILLS.reduce((a, s) => a + skillItems(s, allLessons()).length, 0);
  assert.equal(total, allLessons().reduce((a, l) => a + (l.available ? l.exercises.length : 0), 0));
});

test('abilități: progres și următorul exercițiu, în ordinea parcursului', () => {
  const s = fresh();
  const citire = findSkill('citire');
  assert.ok(citire);
  let p = skillProgress(s, citire, allLessons());
  assert.deepEqual([p.done, p.total], [0, 6]);
  assert.equal(`${p.next?.lesson.id}/${p.next?.ex.id}`, 'm0-1/lines');
  s.best['m0-1/lines'] = 0.9;
  s.best['m0-1/spaces'] = 0.7;
  p = skillProgress(s, citire, allLessons());
  assert.deepEqual([p.done, p.total], [2, 6]);
  assert.equal(p.next?.ex.id, 'all');
  assert.equal(findSkill('nu-exista'), undefined);
});

test('săptămâna: luni–duminică, azi marcat, zilele viitoare separate', () => {
  const w = weekDays(['2026-11-23', '2026-11-22'], new Date(2026, 10, 23, 0, 27));
  assert.deepEqual(w.map((d) => d.label), ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D']);
  assert.deepEqual(w.map((d) => d.date), [23, 24, 25, 26, 27, 28, 29]);
  assert.deepEqual(w.map((d) => d.practiced), [true, false, false, false, false, false, false]);
  assert.equal(w[0].isToday, true);
  assert.ok(w.slice(1).every((d) => d.future));
  const sun = weekDays([], new Date(2026, 10, 29, 22, 0));
  assert.equal(sun[0].key, '2026-11-23');
  assert.equal(sun[6].isToday, true);
  const monthEdge = weekDays([], new Date(2026, 11, 2));
  assert.deepEqual(monthEdge.map((d) => d.date), [30, 1, 2, 3, 4, 5, 6]);
});

test('salut după oră', () => {
  assert.equal(greeting(8), 'Bună dimineața');
  assert.equal(greeting(14), 'Bună ziua');
  assert.equal(greeting(21), 'Bună seara');
  assert.equal(greeting(0), 'Bună seara');
});
