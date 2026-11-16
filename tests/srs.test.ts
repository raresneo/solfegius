import { test } from 'node:test';
import assert from 'node:assert/strict';
import { review, isDue, DAY, weightFor } from '../src/lib/srs.ts';
import { streak } from '../src/ui/store.ts';

test('Leitner: corect urcă, greșit coboară în cutia 1', () => {
  const now = 1_000_000;
  let c = review(undefined, true, now);
  assert.equal(c.box, 1);
  c = review(c, true, now);
  assert.equal(c.box, 2);
  assert.equal(c.due, now + DAY);
  c = review(c, false, now);
  assert.equal(c.box, 1);
  assert.ok(isDue(c, now));
  assert.ok(weightFor(c, now) > weightFor({ box: 5, due: now + 10 * DAY, seen: 9, correct: 9 }, now));
});

test('streak de zile', () => {
  const now = new Date(2026, 10, 17, 12);
  assert.equal(streak(['2026-11-15', '2026-11-16', '2026-11-17'], now), 3);
  assert.equal(streak(['2026-11-15', '2026-11-16'], now), 2);
  assert.equal(streak(['2026-11-14'], now), 0);
});
