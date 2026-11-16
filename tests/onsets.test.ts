import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectOnsets, rhythmFromOnsets, ONSET_LAG } from '../src/lib/onsets.ts';
import type { Frame } from '../src/lib/onsets.ts';

interface Seg {
  dur: number;
  midi: number | null;
  level?: number;
  vib?: number;
}

function frames(segs: Seg[], fps = 60): Frame[] {
  const out: Frame[] = [];
  let i = 0;
  for (const s of segs) {
    const n = Math.round(s.dur * fps);
    for (let k = 0; k < n; k++) {
      const t = i / fps;
      const midi = s.midi === null ? null : s.midi + (s.vib ?? 0) * Math.sin(2 * Math.PI * 5 * t);
      out.push({ t, level: s.midi === null ? 0 : s.level ?? 0.05, midi });
      i++;
    }
  }
  return out;
}

function near(actual: number[], expected: number[], tol = 0.04): void {
  assert.equal(actual.length, expected.length, `atacuri: ${actual.map((x) => x.toFixed(3)).join(', ')}`);
  actual.forEach((a, k) => assert.ok(Math.abs(a - expected[k]) <= tol, `atacul ${k}: ${a.toFixed(3)} vs ${expected[k]}`));
}

test('atac din liniște, schimbare legato de notă, atac după pauză', () => {
  const f = frames([
    { dur: 0.3, midi: null },
    { dur: 0.5, midi: 60 },
    { dur: 0.5, midi: 62 },
    { dur: 0.2, midi: null },
    { dur: 0.4, midi: 62 },
  ]);
  near(detectOnsets(f), [0.3, 0.8, 1.5]);
});

test('aceeași notă repetată (scădere de volum, fără liniște) dă două atacuri', () => {
  const f = frames([
    { dur: 0.4, midi: 60, level: 0.05 },
    { dur: 0.06, midi: 60, level: 0.01 },
    { dur: 0.4, midi: 60, level: 0.05 },
  ]);
  near(detectOnsets(f), [0, 0.46]);
});

test('o cădere de un cadru în mijlocul notei nu e atac nou', () => {
  const f = frames([{ dur: 0.5, midi: 60 }]);
  f[15] = { ...f[15], midi: null };
  near(detectOnsets(f), [0]);
});

test('vibrato ±0,3 semitonuri nu produce atacuri false', () => {
  near(detectOnsets(frames([{ dur: 1.5, midi: 67, vib: 0.3 }])), [0]);
});

test('scorul de ritm: câte note încep la timp (cu compensarea întârzierii de detecție)', () => {
  const s = rhythmFromOnsets([0, 1, 2], [ONSET_LAG + 0.01, 1 + ONSET_LAG + 0.05, 2.4], 0.2);
  assert.equal(s.hits, 2);
  assert.ok(Math.abs(s.score - 2 / 3) < 1e-9);
  assert.ok(s.results[0].hit && Math.abs((s.results[0].error ?? 1) - 0.01) < 1e-9);
});
