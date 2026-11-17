import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, roName, interval, midiToFreq, freqToMidi, pitchClassCents, nearestNoteName, noteFromDiatonic } from '../src/lib/theory.ts';

test('parseNote: Do central = MIDI 60, La4 = 69', () => {
  assert.equal(parseNote('C4').midi, 60);
  assert.equal(parseNote('A4').midi, 69);
  assert.equal(parseNote('F#4').midi, 66);
  assert.equal(parseNote('Bb3').midi, 58);
  assert.throws(() => parseNote('H4'));
});

test('nume românești', () => {
  assert.equal(roName('C4'), 'Do');
  assert.equal(roName('G#4'), 'Sol#');
  assert.equal(roName('Bb4'), 'Sib');
});

test('diatonic dus-întors', () => {
  for (const n of ['A3', 'B3', 'C4', 'E4', 'B4', 'C5', 'G5']) assert.equal(noteFromDiatonic(parseNote(n).diatonic), n);
});

test('intervale: denumiri corecte', () => {
  assert.equal(interval('C4', 'E4').name, 'terță mare');
  assert.equal(interval('E4', 'G4').name, 'terță mică');
  assert.equal(interval('C4', 'G4').name, 'cvintă perfectă');
  assert.equal(interval('B3', 'F4').name, 'cvintă micșorată');
  assert.equal(interval('F4', 'B4').name, 'cvartă mărită');
  assert.equal(interval('E4', 'F4').name, 'secundă mică');
  assert.equal(interval('F4', 'G#4').name, 'secundă mărită');
  assert.equal(interval('C4', 'C5').name, 'octavă perfectă');
  assert.equal(interval('G4', 'F5').name, 'septimă mică');
  assert.equal(interval('C4', 'B4').name, 'septimă mare');
  // ordinea nu contează
  assert.equal(interval('E4', 'C4').name, 'terță mare');
});

test('frecvențe', () => {
  assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-9);
  assert.ok(Math.abs(midiToFreq(60) - 261.6256) < 1e-3);
  assert.ok(Math.abs(freqToMidi(523.2511) - 72) < 1e-4);
});

test('cenți independent de octavă (voce bărbătească pe Do3 = corect pentru Do4)', () => {
  assert.ok(Math.abs(pitchClassCents(130.8128, 60)) < 0.1);
  assert.ok(Math.abs(pitchClassCents(523.2511, 60)) < 0.1);
  const sharp = pitchClassCents(midiToFreq(60.2), 60);
  assert.ok(Math.abs(sharp - 20) < 0.1);
  assert.equal(nearestNoteName(440), 'A4');
  assert.equal(nearestNoteName(130.81), 'C3');
});
