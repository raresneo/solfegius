import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMelody, scaleGame, LEVELS, levelPool } from '../src/lib/melodyGen.ts';
import { parseMelody } from '../src/lib/notation.ts';
import { parseNote } from '../src/lib/theory.ts';

test('melodiile generate sunt valide, în ambitus, și se încheie pe Do', () => {
  for (const lesson of [1, 2, 3, 4, 5, 6]) {
    const pool = new Set(levelPool(LEVELS[lesson]));
    for (let seed = 1; seed <= 150; seed++) {
      const g = generateMelody({ lesson, seed });
      const m = parseMelody(g.source, g.time);
      const pitched = m.notes.filter((n) => n.pitch);
      for (const n of pitched) assert.ok(pool.has(n.pitch as string), `lecția ${lesson}: ${n.pitch} în afara ambitusului`);
      assert.equal(pitched[pitched.length - 1].pitch?.[0], 'C', `lecția ${lesson} seed ${seed}: nu se termină pe Do`);
    }
  }
});

test('lecția 1: doar mers treptat (fără salturi)', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const ps = parseMelody(generateMelody({ lesson: 1, seed }).source).notes.map((n) => parseNote(n.pitch as string).diatonic);
    for (let i = 1; i < ps.length; i++) assert.ok(Math.abs(ps[i] - ps[i - 1]) <= 1, `salt la seed ${seed}`);
  }
});

test('lecția 2: salturile sunt doar între sunetele arpegiului', () => {
  const arp = new Set(['C4', 'E4', 'G4', 'C5']);
  for (let seed = 1; seed <= 100; seed++) {
    const ns = parseMelody(generateMelody({ lesson: 2, seed }).source).notes.filter((n) => n.pitch).map((n) => n.pitch as string);
    for (let i = 1; i < ns.length; i++) {
      const dist = Math.abs(parseNote(ns[i]).diatonic - parseNote(ns[i - 1]).diatonic);
      if (dist > 1) assert.ok(arp.has(ns[i]) && arp.has(ns[i - 1]), `${ns[i - 1]}→${ns[i]}`);
    }
  }
});

test('determinist pe seed', () => {
  assert.equal(generateMelody({ lesson: 3, seed: 42 }).source, generateMelody({ lesson: 3, seed: 42 }).source);
});

test('jocul pe gamă: valid, treptat, se oprește pe Do', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const g = scaleGame(seed);
    const ns = parseMelody(g.source, g.time).notes.map((n) => parseNote(n.pitch as string).diatonic);
    for (let i = 1; i < ns.length; i++) assert.ok(Math.abs(ns[i] - ns[i - 1]) <= 1);
    assert.equal(ns[ns.length - 1] % 7, 0);
  }
});
