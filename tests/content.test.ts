import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, allLessons } from '../src/data/curriculum.ts';
import { BOOK_MELODIES, bookMelody } from '../src/data/melodies.ts';
import { DECKS } from '../src/data/cards.ts';
import { parseMelody } from '../src/lib/notation.ts';
import { renderStaff } from '../src/lib/staff.ts';

test('toate solfegiile transcrise au măsuri complete', () => {
  for (const m of BOOK_MELODIES) assert.doesNotThrow(() => parseMelody(m.source, m.time), m.id);
});

test('lecțiile: id-uri unice, exerciții valide, referințe existente', () => {
  const ids = new Set<string>();
  for (const l of allLessons()) {
    assert.ok(!ids.has(l.id), `id dublu ${l.id}`);
    ids.add(l.id);
    const exIds = new Set<string>();
    for (const ex of l.exercises) {
      assert.ok(!exIds.has(ex.id), `${l.id}/${ex.id} dublu`);
      exIds.add(ex.id);
      if (ex.kind === 'solfegiu' && ex.source) parseMelody(ex.source, ex.time ?? [2, 4]);
      if (ex.kind === 'solfegiu' && ex.melodyId) bookMelody(ex.melodyId);
      if (ex.kind === 'cards') assert.ok(DECKS[ex.deck], ex.deck);
      if (ex.kind === 'quiz') for (const q of ex.questions) assert.ok(q.answer < q.options.length, q.q);
    }
    if (l.available) assert.ok(l.exercises.length > 0, `${l.id} fără exerciții`);
  }
});

test('cuprinsul cărții e complet: lecțiile 1–35', () => {
  const nums = CHAPTERS.filter((c) => c.id.startsWith('a')).flatMap((c) => c.lessons.map((l) => Number(l.num)));
  assert.deepEqual(nums, Array.from({ length: 35 }, (_, i) => i + 1));
});

test('portativul randează câte un cap de notă pentru fiecare notă', () => {
  const m = parseMelody(bookMelody('l3-s3').source);
  const out = renderStaff({ notes: m.notes, time: m.time, width: 360 });
  const heads = (out.svg.match(/<ellipse/g) ?? []).length;
  assert.equal(heads, m.notes.filter((n) => n.pitch).length);
  assert.ok(out.positions.every((p) => p.x > 30 && p.x < 360));
});

test('fișele au id-uri unice', () => {
  const ids = Object.values(DECKS).flatMap((d) => d.cards.map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length);
});
