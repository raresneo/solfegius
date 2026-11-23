import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignLag, judgeFrames, judgePerformance, pcCents, PITCH_GATE } from '../src/lib/judge.ts';
import type { SungTarget } from '../src/lib/judge.ts';
import { smoothTrack } from '../src/lib/onsets.ts';
import type { Frame } from '../src/lib/onsets.ts';
import { parseMelody, toOnsets } from '../src/lib/notation.ts';
import { parseNote } from '../src/lib/theory.ts';

const FPS = 60;
const GAMA = 'C4q D4q | E4q F4q | G4q A4q | B4q C5q | B4q A4q | G4q F4q | E4q D4q | C4h';
const OPTIMI = 'C4e D4e E4e F4e | G4q G4q | A4e G4e F4e E4e | D4q C4q | E4e F4e G4e A4e | G4h';

function targets(src: string, bpm: number): SungTarget[] {
  return toOnsets(parseMelody(src, [2, 4]).notes, bpm)
    .filter((o) => o.pitch !== null)
    .map((o) => ({ start: o.start, dur: o.dur, midi: parseNote(o.pitch as string).midi }));
}

interface Voice {
  /** întârzierea constantă a vocii (căști Bluetooth + reacție), s */
  lag?: number;
  /** amplitudinea vibrato-ului, cenți (5,5 Hz) */
  vibrato?: number;
  /** -1 = bărbat, o octavă mai jos */
  octave?: number;
  /** abaterea notei k, în cenți */
  detune?: (k: number) => number;
}

/** Vocea simulată la nivel de cadre (60/s), legato, cu portamento de 40 ms între note. */
function sing(ts: SungTarget[], v: Voice = {}): Frame[] {
  const lag = v.lag ?? 0;
  const oct = 12 * (v.octave ?? -1);
  const pitch = (k: number) => ts[k].midi + oct + (v.detune?.(k) ?? 0) / 100;
  const end = ts[ts.length - 1].start + ts[ts.length - 1].dur;
  const out: Frame[] = [];
  for (let i = -18; i / FPS <= end + lag + 0.4; i++) {
    const t = i / FPS;
    const tt = t - lag;
    let k = -1;
    for (let j = ts.length - 1; j >= 0; j--) if (tt >= ts[j].start) { k = j; break; }
    if (k < 0 || tt > end) { out.push({ t, level: 0, midi: null }); continue; }
    const prev = k > 0 ? pitch(k - 1) : pitch(k);
    const p = Math.min(1, (tt - ts[k].start) / 0.04);
    const vib = ((v.vibrato ?? 0) / 100) * Math.sin(2 * Math.PI * 5.5 * t);
    out.push({ t, level: 0.05, midi: prev + (pitch(k) - prev) * p + vib });
  }
  return out;
}

const judge = (ts: SungTarget[], track: Frame[], bpm: number) => judgePerformance(ts, track, { rhythmTol: Math.min(0.25, (60 / bpm) * 0.35) });

test('cenți fără octavă', () => {
  assert.equal(pcCents(48, 60), 0);
  assert.ok(Math.abs(pcCents(61, 60) - 100) < 1e-9);
  assert.ok(Math.abs(pcCents(59.5, 60) + 50) < 1e-9);
  assert.ok(Math.abs(pcCents(71, 60) + 100) < 1e-9, 'Si sub Do = −100, nu +1100');
});

test('nota se judecă după centru: vibrato ±80 pe notă dreaptă e bun, +100 constant e greșit', () => {
  const vib = Array.from({ length: 50 }, (_, i) => 80 * Math.sin((2 * Math.PI * 5.5 * i) / FPS));
  assert.equal(judgeFrames(vib).good, true);
  assert.equal(judgeFrames(vib.map((c) => c + 100)).good, false);
  assert.equal(judgeFrames([null, null, null, null, 0]).good, false, 'abia s-a auzit');
});

test('solfegiu corect, cântat de bărbat, fără vibrato: trece', () => {
  const ts = targets(GAMA, 60);
  const p = judge(ts, sing(ts), 60);
  assert.equal(p.good, ts.length);
  assert.ok(p.score >= 0.9, `scor ${p.score}`);
  assert.ok(Math.abs(p.lag) <= 0.05, `decalaj ${p.lag}`);
});

test('solfegiu corect cu vibrato ±80 și AirPods (200 ms): toate notele bune, decalajul găsit', () => {
  for (const [src, bpm] of [[GAMA, 60], [OPTIMI, 66]] as [string, number][]) {
    const ts = targets(src, bpm);
    const p = judge(ts, sing(ts, { lag: 0.2, vibrato: 80 }), bpm);
    assert.equal(p.good, ts.length, `${src}: ${p.good}/${ts.length}`);
    assert.ok(p.score >= 0.9, `scor ${p.score}`);
    assert.ok(Math.abs(p.lag - 0.2) <= 0.04, `decalaj ${p.lag}`);
  }
});

test('note greșite nu trec pe ritm: Re, Fa, La cu un semiton prea sus', () => {
  const ts = targets(GAMA, 60);
  const wrong = new Set(['D', 'F', 'A']);
  const src = GAMA.split(/[\s|]+/).filter(Boolean);
  const p = judge(ts, sing(ts, { lag: 0.15, vibrato: 50, detune: (k) => (wrong.has(src[k][0]) ? 100 : 0) }), 60);
  assert.equal(p.good, ts.length - 6);
  assert.ok(p.pitchScore < PITCH_GATE);
  assert.ok(p.score < 0.7, `scor ${p.score} trece, deși 6 note sunt false`);
});

test('tot un semiton prea sus sau liniște: 0', () => {
  const ts = targets(GAMA, 60);
  assert.equal(judge(ts, sing(ts, { detune: () => 100 }), 60).good, 0);
  const silent = sing(ts).map((f) => ({ ...f, level: 0, midi: null }));
  const p = judge(ts, silent, 60);
  assert.equal(p.good, 0);
  assert.equal(p.score, 0);
});

test('alinierea nu iartă o optime întreagă de întârziere la tempo mare', () => {
  const ts = targets(OPTIMI, 120);
  const lag = alignLag(ts, smoothTrack(sing(ts, { lag: 0.25 })));
  assert.ok(lag <= 0.19, `decalaj acceptat ${lag}`);
});
