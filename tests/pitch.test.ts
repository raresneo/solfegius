import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, rms } from '../src/lib/pitch.ts';

const SR = 44100;

function voice(freq: number, o: { n?: number; noise?: number; amp?: number; vibratoCents?: number } = {}): Float32Array {
  // ton cu armonice, ca o voce: fundamentala + 2 armonice + zgomot, opțional vibrato (5 Hz)
  const n = o.n ?? 2048;
  const amp = o.amp ?? 1;
  const b = new Float32Array(n);
  let seed = 7;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = freq * Math.pow(2, ((o.vibratoCents ?? 0) * Math.sin(2 * Math.PI * 5 * t)) / 1200);
    phase += (2 * Math.PI * f) / SR;
    seed = (seed * 16807) % 2147483647;
    const r = (seed / 2147483647 - 0.5) * (o.noise ?? 0);
    b[i] = amp * (0.5 * Math.sin(phase) + 0.25 * Math.sin(2 * phase) + 0.12 * Math.sin(3 * phase)) + r;
  }
  return b;
}

const cents = (f: number, ref: number) => 1200 * Math.log2(f / ref);

test('detectează corect notele din registrul vocal (±10 cenți)', () => {
  for (const f of [98, 130.81, 196, 261.63, 329.63, 440, 523.25, 783.99]) {
    const r = detectPitch(voice(f), SR);
    assert.ok(r, `nimic la ${f} Hz`);
    assert.ok(Math.abs(cents(r.freq, f)) < 10, `${f} Hz → ${r.freq.toFixed(2)} (${cents(r.freq, f).toFixed(1)} cenți)`);
  }
});

test('rezistă la zgomot moderat', () => {
  const r = detectPitch(voice(220, { noise: 0.3 }), SR);
  assert.ok(r);
  assert.ok(Math.abs(cents(r.freq, 220)) < 15);
});

test('voce încetă la telefon (RMS ~0.006) e detectată', () => {
  const b = voice(261.63, { amp: 0.015 });
  assert.ok(rms(b) < 0.012, 'semnalul de test trebuie să fie sub vechiul prag');
  const r = detectPitch(b, 48000 === 0 ? SR : SR);
  assert.ok(r, 'nu a detectat vocea încetă');
  assert.ok(Math.abs(cents(r.freq, 261.63)) < 10);
});

test('voce cu vibrato ±30 cenți și respirație e detectată aproape de notă', () => {
  const r = detectPitch(voice(196, { vibratoCents: 30, noise: 0.15 }), SR);
  assert.ok(r, 'nu a detectat vocea cu vibrato');
  assert.ok(Math.abs(cents(r.freq, 196)) < 35);
});

test('liniștea nu produce o notă', () => {
  assert.equal(detectPitch(new Float32Array(2048), SR), null);
});
