import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdDetector } from '../src/lib/hold.ts';

const FPS = 60;

/** Secunda la care nota e validată (sau null în `seconds`), pentru o voce cu abatere + vibrato date în cenți. */
function heldAt(o: { offset?: number; vibrato?: number; tolerance: number; seconds?: number; gaps?: (t: number) => boolean }): number | null {
  const d = holdDetector();
  for (let i = 1; i <= (o.seconds ?? 5) * FPS; i++) {
    const t = i / FPS;
    const c = o.gaps?.(t) ? null : (o.offset ?? 0) + (o.vibrato ?? 0) * Math.sin(2 * Math.PI * 5.5 * t);
    if (d.push(t, c, o.tolerance).held) return t;
  }
  return null;
}

test('ton drept, acordat: validat în ~0,5 s la orice exigență', () => {
  for (const tol of [50, 35, 20]) {
    const t = heldAt({ tolerance: tol });
    assert.ok(t !== null && t < 0.6, `±${tol}: ${t}`);
  }
});

test('vibrato de cântăreț (±80 și ±100 de cenți) pe notă dreaptă: validat, inclusiv la „Conservator ±20”', () => {
  for (const vibrato of [80, 100]) {
    for (const tol of [50, 35, 20]) {
      const t = heldAt({ vibrato, tolerance: tol });
      assert.ok(t !== null && t < 0.9, `vibrato ±${vibrato}, ±${tol}: ${t}`);
    }
  }
});

test('fals constant (+70 de cenți) nu trece, nici cu vibrato', () => {
  assert.equal(heldAt({ offset: 70, tolerance: 50 }), null);
  assert.equal(heldAt({ offset: 70, vibrato: 60, tolerance: 50 }), null);
  assert.equal(heldAt({ offset: 30, tolerance: 20 }), null);
});

test('liniștea și sunetul întrerupt des nu validează', () => {
  assert.equal(heldAt({ tolerance: 50, gaps: () => true }), null);
  // 1 cadru din 3 cu notă: prea puțin timp ținut
  assert.equal(heldAt({ tolerance: 50, gaps: (t) => Math.round(t * FPS) % 3 !== 0 }), null);
});

test('reset: după notă nouă nu moștenim ce s-a auzit înainte', () => {
  const d = holdDetector();
  let t = 0;
  for (let i = 0; i < 20; i++) d.push((t += 1 / FPS), 0, 50);
  d.reset();
  const r = d.push((t += 1 / FPS), 400, 50);
  assert.equal(r.inTol, false);
  assert.equal(r.okTime, 0);
  assert.ok(r.center !== null && Math.abs(r.center - 400) < 1e-9);
});
