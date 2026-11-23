// Diagnostic offline (npm run diag): aceeași detecție YIN ca în aplicație, la 60 de cadre/s, pe voce sintetică realistă.
// Compară logica veche (din cod, copiată aici) cu cea nouă (src/lib).
import { detectPitch, median, MIN_CLARITY } from '../../src/lib/pitch.ts';
import { freqToMidi, midiToFreq, parseNote, pitchClassCents } from '../../src/lib/theory.ts';
import { parseMelody, toOnsets } from '../../src/lib/notation.ts';
import { detectOnsets, rhythmFromOnsets } from '../../src/lib/onsets.ts';
import type { Frame } from '../../src/lib/onsets.ts';
import { scoreTaps, scoreTapsCompensated } from '../../src/lib/rhythm.ts';
import { judgePerformance } from '../../src/lib/judge.ts';
import { holdDetector } from '../../src/lib/hold.ts';
import { cardSession } from '../../src/lib/session.ts';
import { mulberry32 } from '../../src/lib/random.ts';

const SR = 48000;
const FPS = 60;

/** Voce: fundamentala + 2 armonice + respirație. f(t) dă frecvența, a(t) amplitudinea. */
function voice(f: (t: number) => number, a: (t: number) => number, seconds: number, seed = 3): Float32Array {
  const n = Math.round(seconds * SR);
  const b = new Float32Array(n);
  const rng = mulberry32(seed);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * f(t)) / SR;
    const amp = a(t);
    b[i] = amp * (0.4 * Math.sin(ph) + 0.15 * Math.sin(2 * ph) + 0.05 * Math.sin(3 * ph)) + (rng() - 0.5) * 0.004;
  }
  return b;
}

/** Ca mic.ts: la fiecare cadru, ultimele 2048 de eșantioane → YIN. */
function frames(sig: Float32Array, t0 = 0): { t: number; freq: number | null; level: number }[] {
  const out: { t: number; freq: number | null; level: number }[] = [];
  for (let k = 0; ; k++) {
    const end = Math.round(((k + 1) / FPS) * SR);
    if (end > sig.length) break;
    if (end < 2048) continue;
    const buf = sig.subarray(end - 2048, end);
    const r = detectPitch(buf, SR, { rmsThreshold: 0.003 });
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    out.push({ t: t0 + end / SR, freq: r && r.clarity >= MIN_CLARITY ? r.freq : null, level: Math.sqrt(s / buf.length) });
  }
  return out;
}

const vib = (base: number, cents: number, rate = 5.5) => (t: number) => base * Math.pow(2, (cents * Math.sin(2 * Math.PI * rate * t)) / 1200);

// ---------- A. Intonație (ține nota) ----------
function oldSing(fr: ReturnType<typeof frames>, target: number, tol: number): number | null {
  // copie din sing.ts (înainte): mediana ultimelor 5 cadre, apoi cadru cu cadru în toleranță
  const recent: number[] = [];
  let hist: { t: number; dt: number; ok: boolean }[] = [];
  let lastT = 0;
  for (const f of fr) {
    const dt = lastT ? Math.min(0.1, f.t - lastT) : 0;
    lastT = f.t;
    let inTol = false;
    if (f.freq !== null) {
      recent.push(pitchClassCents(f.freq, target));
      if (recent.length > 5) recent.shift();
      inTol = Math.abs(median(recent)) <= tol;
    }
    hist.push({ t: f.t, dt, ok: inTol });
    hist = hist.filter((x) => x.t > f.t - 1);
    if (hist.reduce((a, x) => a + (x.ok ? x.dt : 0), 0) >= 0.45) return f.t;
  }
  return null;
}
function newSing(fr: ReturnType<typeof frames>, target: number, tol: number): number | null {
  const d = holdDetector();
  for (const f of fr) if (d.push(f.t, f.freq === null ? null : pitchClassCents(f.freq, target), tol).held) return f.t;
  return null;
}

console.log('A. INTONAȚIE: Do cântat de bărbat (Do3), 5 s, timp până la validare');
const C4 = parseNote('C4').midi;
for (const v of [0, 50, 80, 100]) {
  const fr = frames(voice(vib(130.81, v), () => 0.3, 5));
  const row = [50, 35, 20].map((tol) => {
    const o = oldSing(fr, C4, tol);
    const n = newSing(fr, C4, tol);
    return `±${tol}: vechi ${o === null ? 'NU trece' : o.toFixed(2) + ' s'} / nou ${n === null ? 'NU trece' : n.toFixed(2) + ' s'}`;
  });
  console.log(`  vibrato ±${v} cenți · ${row.join(' · ')}`);
}
{
  const fr = frames(voice(vib(130.81 * Math.pow(2, 70 / 1200), 60), () => 0.3, 5));
  console.log(`  control: Do cântat cu +70 cenți (fals) · ±50: vechi ${oldSing(fr, C4, 50) ?? 'NU trece'} / nou ${newSing(fr, C4, 50) ?? 'NU trece'}`);
}

// ---------- B. Solfegiu cântat ----------
function sungTrack(src: string, time: [number, number], bpm: number, o: { lag: number; vibrato: number; octave: number; portamento: number; legato: boolean }) {
  const mel = parseMelody(src, time);
  const ons = toOnsets(mel.notes, bpm).filter((x) => x.pitch !== null);
  const pre = 0.3;
  const total = ons[ons.length - 1].start + ons[ons.length - 1].dur + 0.5;
  const midiAt = (t: number): number | null => {
    const tt = t - pre - o.lag;
    for (let k = ons.length - 1; k >= 0; k--) {
      const on = ons[k];
      if (tt >= on.start) {
        if (tt > on.start + on.dur - (o.legato ? 0 : 0.06)) return k === ons.length - 1 ? null : o.legato ? parseNote(on.pitch!).midi : null;
        const cur = parseNote(on.pitch!).midi + 12 * o.octave;
        const prev = k > 0 ? parseNote(ons[k - 1].pitch!).midi + 12 * o.octave : cur;
        const p = Math.min(1, (tt - on.start) / o.portamento);
        return prev + (cur - prev) * p;
      }
    }
    return null;
  };
  const f = (t: number) => {
    const m = midiAt(t);
    return m === null ? 200 : midiToFreq(m) * Math.pow(2, (o.vibrato * Math.sin(2 * Math.PI * 5.5 * t)) / 1200);
  };
  const a = (t: number) => (midiAt(t) === null ? 0 : 0.3);
  const fr = frames(voice(f, a, pre + total + o.lag), -pre);
  return { ons, fr };
}

function oldJudge(ons: ReturnType<typeof toOnsets>, fr: ReturnType<typeof frames>, bpm: number) {
  // copie din solfegiu.ts (înainte): ferestre la momentul așteptat, notă bună dacă ≥45% cadre la ±50 cenți
  const frames2: (number | null)[][] = ons.map(() => []);
  const track: Frame[] = [];
  for (const f of fr) {
    track.push({ t: f.t, level: f.level, midi: f.freq === null ? null : freqToMidi(f.freq) });
    if (f.t < 0) continue;
    const k = ons.findIndex((x) => f.t >= x.start + 0.07 && f.t <= x.start + x.dur - 0.04);
    if (k < 0) continue;
    frames2[k].push(f.freq === null ? null : pitchClassCents(f.freq, parseNote(ons[k].pitch!).midi));
  }
  const good = frames2.filter((c) => c.length >= 2 && c.filter((x) => x !== null && Math.abs(x) <= 50).length / c.length >= 0.45).length;
  const rh = rhythmFromOnsets(ons.map((x) => x.start), detectOnsets(track, { silence: 0.003 }), Math.min(0.25, (60 / bpm) * 0.35));
  return { good, score: 0.7 * (good / ons.length) + 0.3 * rh.score, rh: rh.hits };
}
function newJudge(ons: ReturnType<typeof toOnsets>, fr: ReturnType<typeof frames>, bpm: number) {
  const track: Frame[] = fr.map((f) => ({ t: f.t, level: f.level, midi: f.freq === null ? null : freqToMidi(f.freq) }));
  const p = judgePerformance(ons.map((x) => ({ start: x.start, dur: x.dur, midi: parseNote(x.pitch!).midi })), track, { rhythmTol: Math.min(0.25, (60 / bpm) * 0.35) });
  return { good: p.good, score: p.score, rh: p.rhythm.hits, lag: p.lag };
}

console.log('\nB. SOLFEGIU: interpretare CORECTĂ (note și ritm exacte), bărbat (o octavă jos), portamento 40 ms');
const MEL: [string, string, [number, number], number][] = [
  ['gama L1 (pătrimi, 60)', 'C4q D4q | E4q F4q | G4q A4q | B4q C5q | B4q A4q | G4q F4q | E4q D4q | C4h', [2, 4], 60],
  ['optimi L3 (66)', 'C4e D4e E4e F4e | G4q G4q | A4e G4e F4e E4e | D4q C4q | E4e F4e G4e A4e | G4h', [2, 4], 66],
];
for (const [name, src, time, bpm] of MEL) {
  for (const sc of [
    { label: 'fără vibrato, fără latență', lag: 0, vibrato: 0 },
    { label: 'vibrato ±80', lag: 0, vibrato: 80 },
    { label: 'AirPods 200 ms', lag: 0.2, vibrato: 0 },
    { label: 'AirPods 200 ms + vibrato ±80', lag: 0.2, vibrato: 80 },
  ]) {
    const { ons, fr } = sungTrack(src, time, bpm, { ...sc, octave: -1, portamento: 0.04, legato: true });
    const o = oldJudge(ons, fr, bpm);
    const n = newJudge(ons, fr, bpm);
    const v = (x: number) => `${Math.round(x * 100)}% ${x >= 0.7 ? 'TRECE' : 'PICĂ'}`;
    console.log(`  ${name} · ${sc.label}: vechi ${o.good}/${ons.length} note, ritm ${o.rh}/${ons.length}, ${v(o.score)} | nou ${n.good}/${ons.length}, ritm ${n.rh}/${ons.length}, ${v(n.score)}, decalaj ${Math.round(n.lag * 1000)} ms`);
  }
}
{
  // control: cântă fals (un semiton sus pe Re, Fa, La)
  const [, src, time, bpm] = MEL[0];
  const mel = src.replace(/D4q/g, 'D#4q').replace(/F4q/g, 'F#4q').replace(/A4q/g, 'A#4q');
  const { fr } = sungTrack(mel, time, bpm, { lag: 0.2, vibrato: 60, octave: -1, portamento: 0.04, legato: true });
  const ons = toOnsets(parseMelody(src, time).notes, bpm).filter((x) => x.pitch !== null);
  const n = newJudge(ons, fr, bpm);
  console.log(`  control gama cu Re/Fa/La cântate un semiton prea sus: nou ${n.good}/${ons.length} note, ${Math.round(n.score * 100)}% ${n.score >= 0.7 ? 'TRECE (GREȘIT!)' : 'PICĂ (corect)'}`);
}

// ---------- C. Ritm (tap) ----------
console.log('\nC. RITM: bați corect, dar și pe numărătoare (din reflex), cu AirPods +220 ms și ±25 ms imprecizie');
for (const [label, bpm, beatsPerMeasure, notesBeats] of [
  ['L1 2/4, 8 pătrimi, 60', 60, 2, [0, 1, 2, 3, 4, 5, 6, 7]],
  ['L6 4/4, 2 măsuri, 72', 72, 4, [0, 1, 2, 3, 4, 4.5, 5, 6]],
] as [string, number, number, number[]][]) {
  const beat = 60 / bpm;
  const rng = mulberry32(11);
  const expected = notesBeats.map((b) => b * beat);
  const count = Array.from({ length: beatsPerMeasure }, (_, i) => (i - beatsPerMeasure) * beat);
  const jit = () => (rng() - 0.5) * 0.05;
  const taps = [...count, ...expected].map((x) => x + 0.22 + jit());
  const tol = Math.min(0.2, beat * 0.3);
  const a = scoreTaps(expected, taps, tol).score;
  const b = scoreTapsCompensated(expected, taps, tol).score;
  const c = scoreTapsCompensated(expected, taps, tol, { ignoreBefore: Math.min(0.4, beat * 0.5), ignoreAfter: 0.6 }).score;
  const v = (x: number) => `${Math.round(x * 100)}% ${x >= 0.7 ? 'TRECE' : 'PICĂ'}`;
  console.log(`  ${label}: v0.1 ${v(a)} · fix anterior ${v(b)} · acum ${v(c)}`);
}

// ---------- D. Fișe ----------
console.log('\nD. FIȘE: pachet nou, știi 40% din prima, după ce vezi răspunsul îl reții în 80% din cazuri');
{
  const rng = mulberry32(5);
  const ids = Array.from({ length: 10 }, (_, i) => `c${i}`);
  const knowFirst = new Set(ids.filter(() => rng() < 0.4));
  const s = cardSession(ids);
  const seen = new Set<string>();
  while (!s.done()) {
    const id = s.current()!;
    const good = seen.has(id) ? rng() < 0.8 : knowFirst.has(id);
    seen.add(id);
    s.rate(good);
  }
  const st = s.stats();
  console.log(`  vechi: scor = din prima = ${Math.round((knowFirst.size / 10) * 100)}% ${knowFirst.size / 10 >= 0.7 ? 'TRECE' : 'PICĂ'} · nou: ${st.first} din prima, ${st.known} știute la final = ${Math.round(st.score * 100)}% ${st.score >= 0.7 ? 'TRECE' : 'PICĂ'}`);
}
