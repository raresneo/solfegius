import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch } from '../src/lib/pitch.ts';

const SR = 44100;

function voice(freq: number, n = 2048, noise = 0): Float32Array {
  // ton cu armonice, ca o voce: fundamentala + 2 armonice + zgomot
  const b = new Float32Array(n);
  let seed = 7;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    seed = (seed * 16807) % 2147483647;
    const r = (seed / 2147483647 - 0.5) * noise;
    b[i] = 0.5 * Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t) + 0.12 * Math.sin(6 * Math.PI * freq * t) + r;
  }
  return b;
}

test('detectează corect notele din registrul vocal (±10 cenți)', () => {
  for (const f of [98, 130.81, 196, 261.63, 329.63, 440, 523.25, 783.99]) {
    const r = detectPitch(voice(f), SR);
    assert.ok(r, `nimic la ${f} Hz`);
    const cents = 1200 * Math.log2(r.freq / f);
    assert.ok(Math.abs(cents) < 10, `${f} Hz → ${r.freq.toFixed(2)} (${cents.toFixed(1)} cenți)`);
  }
});

test('rezistă la zgomot moderat', () => {
  const r = detectPitch(voice(220, 2048, 0.3), SR);
  assert.ok(r);
  assert.ok(Math.abs(1200 * Math.log2(r.freq / 220)) < 15);
});

test('liniștea nu produce o notă', () => {
  assert.equal(detectPitch(new Float32Array(2048), SR), null);
});
