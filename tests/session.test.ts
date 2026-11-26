import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardSession, MAX_TRIES, RELEARN_GAP } from '../src/lib/session.ts';

const ids = ['a', 'b', 'c', 'd', 'e', 'f'];

test('toate știute din prima: ordinea rămâne, scor 100%', () => {
  const s = cardSession(ids);
  const seen: string[] = [];
  while (!s.done()) {
    seen.push(s.current() as string);
    assert.equal(s.rate(true)?.first, true);
  }
  assert.deepEqual(seen, ids);
  assert.deepEqual(s.stats(), { total: 6, first: 6, known: 6, score: 1 });
});

test('fișa neștiută revine după câteva fișe; știută a doua oară contează la final, nu și „din prima”', () => {
  const s = cardSession(ids);
  assert.equal(s.current(), 'a');
  assert.deepEqual(s.rate(false), { id: 'a', first: true });
  const next: string[] = [];
  for (let i = 0; i < RELEARN_GAP; i++) {
    next.push(s.current() as string);
    s.rate(true);
  }
  assert.ok(!next.includes('a'), 'a revine prea devreme');
  assert.equal(s.current(), 'a', `după ${RELEARN_GAP} fișe revine a`);
  assert.deepEqual(s.rate(true), { id: 'a', first: false });
  while (!s.done()) s.rate(true);
  const st = s.stats();
  assert.equal(st.first, 5);
  assert.equal(st.known, 6);
  assert.equal(st.score, 1);
});

test(`o fișă nu revine la nesfârșit: după ${MAX_TRIES} încercări sesiunea se termină`, () => {
  const s = cardSession(['x', 'y']);
  let steps = 0;
  while (!s.done() && steps < 20) {
    s.rate(s.current() === 'y');
    steps++;
  }
  assert.equal(s.done(), true);
  assert.equal(steps, MAX_TRIES + 1);
  assert.deepEqual(s.stats(), { total: 2, first: 1, known: 1, score: 0.5 });
  assert.equal(s.finished(), 2);
});
