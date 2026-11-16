import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dictationPhrase, gradeDictation, poolLabels } from '../src/lib/dictation.ts';
import { LEVELS, levelPool } from '../src/lib/melodyGen.ts';
import { parseMelody } from '../src/lib/notation.ts';
import { parseNote } from '../src/lib/theory.ts';

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

test('frazele de dicteu: note doar din butoanele lecției, final lung pe Do, lecția 1 treptat', () => {
  for (const lesson of [1, 2, 3, 4, 5, 6]) {
    const pool = new Set(levelPool(LEVELS[lesson]));
    for (let seed = 1; seed <= 80; seed++) {
      const g = dictationPhrase(lesson, seed);
      const notes = parseMelody(g.source, g.time).notes;
      const ps = notes.filter((n) => n.pitch).map((n) => n.pitch as string);
      for (const p of ps) assert.ok(pool.has(p), `${lesson}/${seed}: ${p}`);
      assert.equal(ps[ps.length - 1][0], 'C', `${lesson}/${seed}: nu se termină pe Do`);
      assert.equal(notes[notes.length - 1].type, 'h', `${lesson}/${seed}: final fără doime`);
      assert.ok(ps.length >= 3 && ps.length <= 12, `${lesson}/${seed}: ${ps.length} note`);
      if (lesson === 1) {
        for (let i = 1; i < ps.length; i++) assert.ok(Math.abs(parseNote(ps[i]).diatonic - parseNote(ps[i - 1]).diatonic) <= 1, `salt la seed ${seed}`);
      }
    }
  }
});
