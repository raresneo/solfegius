import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeDictation, poolLabels } from '../src/lib/dictation.ts';
import { generateMelody, LEVELS, levelPool } from '../src/lib/melodyGen.ts';
import { parseMelody } from '../src/lib/notation.ts';

test('dicteu: notare exactă pe octavă; pauzele și nota dată nu se punctează', () => {
  const exp = ['C4', 'D4', null, 'E4', 'C5'];
  const g = gradeDictation(exp, ['C4', 'D4', null, 'F4', 'C4'], [0]);
  assert.equal(g.total, 3);
  assert.equal(g.ok, 1);
  assert.deepEqual(g.correct, [true, true, true, false, false]);
  assert.ok(Math.abs(g.score - 1 / 3) < 1e-9);
});

test('răspunsurile lipsă sunt greșite', () => {
  const g = gradeDictation(['C4', 'D4', 'E4'], ['C4', null, null], [0]);
  assert.equal(g.ok, 0);
  assert.equal(g.total, 2);
});

test('etichete de octavă pentru butoane', () => {
  const l = poolLabels(['B3', 'C4', 'D4', 'B4', 'C5']);
  assert.equal(l.B3, 'Si jos');
  assert.equal(l.B4, 'Si');
  assert.equal(l.C4, 'Do');
  assert.equal(l.C5, 'Do sus');
  assert.equal(l.D4, 'Re');
});

test('frazele de dicteu au toate notele în butoanele lecției', () => {
  for (const lesson of [1, 2, 3, 4, 5, 6]) {
    const pool = new Set(levelPool(LEVELS[lesson]));
    for (let seed = 1; seed <= 60; seed++) {
      const g = generateMelody({ lesson, measures: lesson >= 6 ? 2 : 3, seed });
      for (const n of parseMelody(g.source, g.time).notes) if (n.pitch) assert.ok(pool.has(n.pitch), `${lesson}/${seed}: ${n.pitch}`);
    }
  }
});
