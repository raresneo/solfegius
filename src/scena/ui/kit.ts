// Piesele comune ale ecranelor de scenă: cronometrul pe faze, metronomul cu straturi, înregistrarea vocii.
import { h } from '../../ui/dom.ts';
import { audioCtx, invalidateAudioCtx, newVoice, outputLatency, setRecording } from '../../audio/audio.ts';
import type { Voice } from '../../audio/audio.ts';
import { rms } from '../../lib/pitch.ts';
import { takeStats } from '../pauses.ts';
import type { EnvPoint, TakeStats } from '../pauses.ts';
import type { StEx } from '../catalog.ts';
import type { ScenaState } from '../store.ts';

export interface AutoScore {
  score: number;
  summary: string;
}

export interface ModeCtx {
  ex: StEx;
  st: ScenaState;
  saveSt(): void;
  /** scor măsurat de aplicație (bătăi, observație, marcare): la „Gata” sărim autoevaluarea */
  setAuto(a: AutoScore | null): void;
  /** activitatea s-a încheiat: trecem la autoevaluare (sau direct la rezultat, dacă e scor automat) */
  complete(): void;
}

export type ModeRunner = (root: HTMLElement, mc: ModeCtx) => () => void;

export const cls = (...c: (string | false | null | undefined)[]): string => c.filter(Boolean).join(' ');

export function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Ecranul rămâne aprins cât lucrezi cu ochii închiși sau departe de telefon. */
export function keepAwake(): () => void {
  let lock: { release(): Promise<void> } | null = null;
  let alive = true;
  const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
  nav.wakeLock?.request('screen').then((l) => {
    if (alive) lock = l;
    else void l.release();
  }).catch(() => undefined);
  return () => {
    alive = false;
    void lock?.release().catch(() => undefined);
  };
}

/** Semnalul de schimbare a fazei: un sunet jos și scurt (nu un „ding”), plus vibrație unde se poate. */
export function softBell(): void {
  try {
    const v = newVoice(1);
    const c = v.out.context;
    const t = c.currentTime + 0.02;
    for (const [f, a] of [[196, 0.16], [392, 0.05]] as const) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(v.out);
      o.start(t);
      o.stop(t + 1.5);
    }
    setTimeout(() => v.stop(), 1600);
  } catch {
    /* fără audio */
  }
  navigator.vibrate?.(80);
}

export function download(name: string, text: string, type = 'text/markdown'): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function ring(): { el: HTMLElement; set(frac: number, label: string): void } {
  const C = 2 * Math.PI * 52;
  const el = h('div', {
    class: 'st-ring',
    html: `<svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"/></svg><b></b>`,
  });
  const fg = el.querySelector('.fg') as SVGCircleElement;
  const b = el.querySelector('b') as HTMLElement;
  return {
    el,
    set(frac, label) {
      fg.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1));
      b.textContent = label;
    },
  };
}

export interface PhaseOpts {
  /** ce se arată deasupra cronometrului pentru faza i (ex. cercurile atenției) */
  visual?: (i: number) => HTMLElement | null;
  onEnd?: () => void;
  startLabel?: string;
}

/** Cronometru pe faze: pornești, iar fiecare fază trece singură, cu semnal. Poți opri sau sări oricând. */
export function phaseRunner(root: HTMLElement, phases: [string, number][], o: PhaseOpts = {}): () => void {
  const list = phases.length ? phases : [['Lucru', 120] as [string, number]];
  let i = 0;
  let left = list[0][1];
  let endAt = 0;
  let timer = 0;
  let release: () => void = () => undefined;
  const r = ring();
  const label = h('p', { class: 'st-phase' });
  const visual = h('div', { class: 'st-visual' });
  const items = list.map(([l, s]) => h('li', {}, h('span', {}, l), h('small', { class: 'muted' }, fmt(s))));
  const play = h('button', { class: 'btn primary big', onclick: () => (timer ? pause() : start()) }, o.startLabel ?? '▶ Pornește');
  const skip = h('button', { class: 'btn ghost', onclick: () => advance(true) }, 'Faza următoare ›');
  const render = () => {
    const [l, total] = list[Math.min(i, list.length - 1)];
    r.set(left / total, fmt(left));
    label.textContent = i < list.length ? `${i + 1}/${list.length} · ${l}` : 'Gata';
    items.forEach((li, k) => li.className = cls(k === i && 'on', k < i && 'done'));
    const v = o.visual?.(i);
    visual.replaceChildren(...(v ? [v] : []));
  };
  const loop = () => {
    left = Math.max(0, Math.ceil((endAt - performance.now()) / 1000));
    if (left <= 0) advance(false);
    else render();
  };
  const start = () => {
    endAt = performance.now() + left * 1000;
    timer = window.setInterval(loop, 250);
    release = keepAwake();
    play.textContent = '❚❚ Pauză';
    render();
  };
  const pause = () => {
    clearInterval(timer);
    timer = 0;
    release();
    play.textContent = '▶ Continuă';
  };
  const advance = (manual: boolean) => {
    if (!manual) softBell();
    i++;
    if (i >= list.length) {
      clearInterval(timer);
      timer = 0;
      release();
      play.disabled = true;
      skip.disabled = true;
      render();
      o.onEnd?.();
      return;
    }
    left = list[i][1];
    endAt = performance.now() + left * 1000;
    render();
  };
  root.append(h('div', { class: 'st-timer' }, visual, r.el, label, h('div', { class: 'row center' }, play, skip), h('ol', { class: 'st-phases' }, items)));
  render();
  return () => {
    clearInterval(timer);
    release();
  };
}

// ---------- Metronom ----------

export interface Layer {
  bpm: number;
  beats: number;
  sub: number;
}

const LAYER_PITCH = [0, 660, 990, 1320];

function tick(when: number, out: GainNode, layer: number, level: 0 | 1 | 2): void {
  const c = out.context;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = layer ? 'triangle' : 'square';
  o.frequency.value = layer ? LAYER_PITCH[layer] : level === 2 ? 1760 : level === 1 ? 1180 : 880;
  const gain = layer ? 0.09 : level === 2 ? 0.16 : level === 1 ? 0.09 : 0.04;
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + (layer ? 0.07 : 0.04));
  o.connect(g).connect(out);
  o.start(when);
  o.stop(when + 0.09);
}

export interface Metro {
  /** timpul audio al primei bătăi */
  t0: number;
  stop(): void;
}

/** Programare cu anticipație pe ceasul audio: bătăile rămân exacte chiar dacă ecranul e ocupat. */
export function startMetronome(layers: Layer[], onBeat?: (layer: number, beat: number, sub: number) => void): Metro {
  const v: Voice = newVoice();
  const c = v.out.context;
  const t0 = c.currentTime + 0.15;
  const next = layers.map(() => t0);
  const count = layers.map(() => 0);
  const timers: number[] = [];
  const sched = () => {
    const horizon = c.currentTime + 0.12;
    layers.forEach((L, li) => {
      const step = 60 / L.bpm / L.sub;
      while (next[li] < horizon) {
        const n = count[li];
        const sub = n % L.sub;
        const beat = Math.floor(n / L.sub) % L.beats;
        const level: 0 | 1 | 2 = sub ? 0 : beat === 0 ? 2 : 1;
        tick(next[li], v.out, li, li ? 1 : level);
        if (onBeat) {
          const delay = Math.max(0, (next[li] - c.currentTime) * 1000);
          timers.push(window.setTimeout(() => onBeat(li, beat, sub), delay));
        }
        count[li]++;
        next[li] += step;
      }
    });
    if (timers.length > 200) timers.splice(0, 100);
  };
  sched();
  const iv = window.setInterval(sched, 25);
  return {
    t0,
    stop() {
      clearInterval(iv);
      timers.forEach((t) => clearTimeout(t));
      v.stop();
    },
  };
}

export const audioNow = (): number => {
  const c = audioCtx();
  return c.currentTime - outputLatency(c);
};

// ---------- Înregistrare ----------

export interface Take {
  label: string;
  url: string | null;
  stats: TakeStats;
}

export interface Recording {
  stop(): Promise<Take>;
  cancel(): void;
}

const MIMES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];

/**
 * Înregistrezi și te asculți. Volumul se măsoară în paralel (~30 de cadre pe secundă), ca să vezi pauzele și nivelul.
 * Fără reducere de zgomot și fără control automat al volumului: piano și forte trebuie să rămână diferite.
 */
export async function startRecording(label: string, onLevel: (rms: number, t: number) => void): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microfonul nu e disponibil în acest browser (cere HTTPS)');
  setRecording(true);
  audioCtx();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) {
    setRecording(false);
    throw e;
  }
  invalidateAudioCtx();
  const c = audioCtx();
  if (c.state !== 'running') await c.resume().catch(() => undefined);
  const src = c.createMediaStreamSource(stream);
  const an = c.createAnalyser();
  an.fftSize = 1024;
  const mute = c.createGain();
  mute.gain.value = 0;
  src.connect(an);
  an.connect(mute);
  mute.connect(c.destination);
  const buf = new Float32Array(an.fftSize);
  const env: EnvPoint[] = [];
  const t0 = performance.now();
  const iv = window.setInterval(() => {
    an.getFloatTimeDomainData(buf);
    const level = rms(buf);
    const t = (performance.now() - t0) / 1000;
    env.push({ t, rms: level });
    onLevel(level, t);
  }, 33);
  const MR = (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  const mime = MR ? MIMES.find((m) => MR.isTypeSupported?.(m)) : undefined;
  const mr = MR ? new MR(stream, mime ? { mimeType: mime } : undefined) : null;
  const chunks: Blob[] = [];
  if (mr) {
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    mr.start(250);
  }
  const teardown = () => {
    clearInterval(iv);
    stream.getTracks().forEach((t) => t.stop());
    src.disconnect();
    an.disconnect();
    mute.disconnect();
    setRecording(false);
    invalidateAudioCtx();
  };
  return {
    stop: () => new Promise<Take>((resolve) => {
      const done = () => {
        teardown();
        const url = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: mr?.mimeType || mime || 'audio/webm' })) : null;
        resolve({ label, url, stats: takeStats(env) });
      };
      if (mr && mr.state !== 'inactive') {
        mr.onstop = done;
        mr.stop();
      } else done();
    }),
    cancel() {
      if (mr && mr.state !== 'inactive') mr.stop();
      teardown();
    },
  };
}

/** Bara cu vocea (auriu) și pauzele (gol), proporțional cu timpul. */
export function segBar(s: TakeStats): HTMLElement {
  const total = s.duration || 1;
  return h('div', { class: 'segbar', 'aria-hidden': 'true' },
    s.segments.map((g) => h('i', { class: g.voiced ? 'v' : '', style: `flex-grow:${Math.max(0.001, (g.end - g.start) / total).toFixed(4)}` })));
}
