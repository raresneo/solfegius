// Sunet: sinteză simplă tip pian (Web Audio), metronom, cadență de acordaj. Fără fișiere audio.
import { midiToFreq, parseNote, CADENCE_C } from '../lib/theory.ts';
import type { MNote } from '../lib/notation.ts';
import { toOnsets } from '../lib/notation.ts';

type AC = AudioContext;
let ctx: AC | null = null;
let stale = false;

/**
 * Pe iOS rata de eșantionare a sistemului se schimbă când pornește sau se oprește microfonul,
 * iar un context audio creat înainte raportează rata veche: măsoară și redă notele decalat.
 * După apel, următoarea folosire creează un context nou, cu rata corectă.
 */
export function invalidateAudioCtx(): void {
  stale = true;
}

export function audioCtx(): AC {
  if (ctx && stale) {
    const old = ctx;
    ctx = null;
    void old.close().catch(() => undefined);
  }
  stale = false;
  if (!ctx) {
    const W = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? W.webkitAudioContext;
    if (!Ctor) throw new Error('Browserul nu suportă Web Audio');
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export interface Voice {
  out: GainNode;
  stop(): void;
}

/** Un „canal” de redare care poate fi oprit oricând (ex. butonul Stop). */
export function newVoice(volume = 1): Voice {
  const c = audioCtx();
  const out = c.createGain();
  out.gain.value = volume;
  out.connect(c.destination);
  let stopped = false;
  return {
    out,
    stop() {
      if (stopped) return;
      stopped = true;
      if (c.state === 'closed') return;
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.05);
      setTimeout(() => out.disconnect(), 120);
    },
  };
}

export function tone(midi: number, start: number, dur: number, dest: AudioNode, gain = 0.22): void {
  const c = dest.context as AC;
  const f = midiToFreq(midi);
  const g = c.createGain();
  g.connect(dest);
  const partials: [OscillatorType, number, number][] = [
    ['triangle', 1, 1],
    ['sine', 2, 0.28],
    ['sine', 3, 0.08],
  ];
  const end = start + Math.max(dur, 0.12);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(gain * 0.45, start + 0.3);
  g.gain.setValueAtTime(gain * 0.45, Math.max(start + 0.31, end - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, end + 0.18);
  for (const [type, mult, amp] of partials) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f * mult;
    const og = c.createGain();
    og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(start);
    o.stop(end + 0.25);
  }
}

export function click(start: number, dest: AudioNode, accent = false): void {
  const c = dest.context as AC;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = accent ? 1760 : 1180;
  g.gain.setValueAtTime(accent ? 0.16 : 0.09, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
  o.connect(g).connect(dest);
  o.start(start);
  o.stop(start + 0.05);
}

export function playNote(pitch: string, dur = 0.9): Voice {
  const v = newVoice();
  tone(parseNote(pitch).midi, v.out.context.currentTime + 0.02, dur, v.out);
  return v;
}

export function playChord(pitches: string[], dur = 0.9): Voice {
  const v = newVoice();
  const t = v.out.context.currentTime + 0.02;
  for (const p of pitches) tone(parseNote(p).midi, t, dur, v.out, 0.14);
  return v;
}

/** Cadența I–IV–V–I în Do (acordajul). Returnează durata în secunde. */
export function playCadence(v: Voice, start: number, chordDur = 0.55): number {
  CADENCE_C.forEach((ch, i) => {
    for (const p of ch) tone(parseNote(p).midi, start + i * chordDur, chordDur * (i === 3 ? 1.6 : 0.95), v.out, 0.12);
  });
  return CADENCE_C.length * chordDur + chordDur * 0.6;
}

export interface PlayOptions {
  bpm: number;
  /** măsuri de numărătoare înainte (metronom) */
  countIn?: number;
  beatsPerMeasure: number;
  metronome?: boolean;
  /** redă și melodia (pian); false = doar metronom, pentru cântat */
  melody?: boolean;
  melodyGain?: number;
  onNote?: (index: number) => void;
  onEnd?: () => void;
}

export interface Playback {
  /** momentul (în timpul audio) când începe prima notă */
  startAt: number;
  /** același moment exprimat în performance.now() / 1000 */
  startPerf: number;
  stop(): void;
}

export function playMelody(notes: MNote[], o: PlayOptions): Playback {
  const v = newVoice();
  const c = v.out.context as AC;
  const beat = 60 / o.bpm;
  const countBeats = (o.countIn ?? 0) * o.beatsPerMeasure;
  const t0 = c.currentTime + 0.1;
  const startAt = t0 + countBeats * beat;
  const onsets = toOnsets(notes, o.bpm);
  const total = notes.reduce((a, n) => a + n.dur, 0);
  if (o.metronome || countBeats > 0) {
    const lastBeat = o.metronome ? countBeats + Math.ceil(total) : countBeats;
    for (let b = 0; b < lastBeat; b++) click(t0 + b * beat, v.out, b % o.beatsPerMeasure === 0);
  }
  if (o.melody !== false) {
    for (const on of onsets) {
      if (on.pitch) tone(parseNote(on.pitch).midi, startAt + on.start, on.dur * 0.95, v.out, o.melodyGain ?? 0.22);
    }
  }
  const timers: number[] = [];
  const perfNow = performance.now() / 1000;
  const startPerf = perfNow + (startAt - c.currentTime) + outputLatency(c);
  for (const on of onsets) {
    timers.push(window.setTimeout(() => o.onNote?.(on.index), (startAt - c.currentTime + on.start) * 1000));
  }
  timers.push(window.setTimeout(() => o.onEnd?.(), (startAt - c.currentTime + total * beat + 0.15) * 1000));
  return {
    startAt,
    startPerf,
    stop() {
      timers.forEach((t) => clearTimeout(t));
      v.stop();
    },
  };
}

export function outputLatency(ac: AC = audioCtx()): number {
  const c = ac as AC & { outputLatency?: number };
  return (c.outputLatency ?? 0) || c.baseLatency || 0;
}
