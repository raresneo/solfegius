import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRhythm, LESSON_CELLS, LESSON_TIME, scoreTaps, scoreTapsCompensated, tokenLength } from '../src/lib/rhythm.ts';
import { mulberry32 } from '../src/lib/random.ts';
import { measureLength } from '../src/lib/notation.ts';

test('ritmurile generate umplu exact fiecare măsură, pentru toate lecțiile', () => {
  for (const lesson of [1, 2, 3, 4, 5, 6]) {
    for (let seed = 1; seed <= 200; seed++) {
      const time = LESSON_TIME[lesson];
      const r = generateRhythm({ cells: LESSON_CELLS[lesson], measures: 4, time, rng: mulberry32(seed), endLong: lesson >= 2 });
      assert.equal(r.length, 4);
      for (const m of r) assert.equal(m.reduce((a, t) => a + tokenLength(t), 0), measureLength(time));
      assert.ok(!r[0][0].startsWith('r'), 'nu începe cu pauză');
      const flat = r.flat();
      for (let i = 1; i < flat.length; i++) assert.ok(!(flat[i].startsWith('r') && flat[i - 1].startsWith('r')), 'fără două pauze la rând');
    }
  }
});

test('lecția 1 are doar pătrimi', () => {
  const r = generateRhythm({ cells: LESSON_CELLS[1], measures: 8, time: [2, 4], rng: mulberry32(3) });
  assert.ok(r.flat().every((t) => t === 'q'));
});

test('scor tap: perfect, decalat, ratat, în plus', () => {
  const exp = [0, 1, 2, 3];
  assert.equal(scoreTaps(exp, [0.01, 1.02, 1.98, 3.0], 0.15).score, 1);
  const s = scoreTaps(exp, [0.01, 1.4, 2.0], 0.15);
  assert.equal(s.hits, 2);
  assert.equal(s.extras, 1);
  assert.ok(s.score < 0.5);
  assert.equal(scoreTaps(exp, [], 0.15).score, 0);
});

test('latență: un decalaj constant (căști Bluetooth) e compensat', () => {
  const exp = [0, 1, 2, 3, 4, 5];
  assert.equal(scoreTaps(exp, exp.map((x) => x + 0.22), 0.18).score, 0);
  const s = scoreTapsCompensated(exp, [0.2, 1.25, 2.17, 3.23, 4.19, 5.26], 0.18);
  assert.equal(s.score, 1);
  assert.ok(Math.abs(s.latency - 0.215) < 0.01);
});

test('latență: bătăile la timp nu se ating, cele împrăștiate nu se „repară”', () => {
  const exp = [0, 1, 2, 3, 4, 5];
  const exact = scoreTapsCompensated(exp, exp.map((x) => x + 0.01), 0.18);
  assert.deepEqual([exact.score, exact.latency], [1, 0]);
  const messy = scoreTapsCompensated(exp, [0.3, 0.7, 2.25, 2.9, 4.33, 5.1], 0.18);
  assert.equal(messy.latency, 0);
  assert.equal(messy.score, scoreTaps(exp, [0.3, 0.7, 2.25, 2.9, 4.33, 5.1], 0.18).score);
  assert.equal(scoreTapsCompensated(exp, exp.map((x) => x + 0.5), 0.18).score, 0);
  assert.equal(scoreTapsCompensated(exp, [], 0.18).score, 0);
});
