import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMelody, toOnsets, rhythmSyllable } from '../src/lib/notation.ts';

test('parsare melodie simplă', () => {
  const m = parseMelody('C4q D4q | E4h');
  assert.equal(m.notes.length, 3);
  assert.equal(m.measures, 2);
  assert.equal(m.notes[2].dur, 2);
  assert.equal(m.notes[1].beat, 1);
});

test('pauze, punct, optimi', () => {
  const m = parseMelody('C4q. D4e | rq E4e F4e');
  assert.equal(m.notes[0].dur, 1.5);
  assert.equal(m.notes[2].pitch, null);
  assert.equal(m.notes[4].beat, 1.5);
});

test('măsură incompletă = eroare clară', () => {
  assert.throws(() => parseMelody('C4q | D4q E4q'), /Măsura 1/);
  assert.throws(() => parseMelody('C4x'), /invalid/);
});

test('4/4', () => {
  assert.doesNotThrow(() => parseMelody('C4q D4q E4h', [4, 4]));
  assert.throws(() => parseMelody('C4q D4q', [4, 4]));
});

test('onsets la 60 bpm = câte o secundă pe pătrime; legato contopește', () => {
  const o = toOnsets(parseMelody('C4q D4q | E4h').notes, 60);
  assert.deepEqual(o.map((x) => x.start), [0, 1, 2]);
  const t = toOnsets(parseMelody('C4q D4q~ | D4q E4q').notes, 60);
  assert.equal(t.length, 3);
  assert.equal(t[1].dur, 2);
});

test('silabe ritmice', () => {
  const m = parseMelody('C4q C4e C4e | C4h');
  assert.deepEqual(m.notes.map(rhythmSyllable), ['ta', 'ti', 'ti', 'ta-a']);
});
