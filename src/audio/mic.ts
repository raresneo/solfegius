// Microfon + detecție de înălțime în timp real.
import { audioCtx, invalidateAudioCtx } from './audio.ts';
import { detectPitch, rms } from '../lib/pitch.ts';
import type { PitchResult } from '../lib/pitch.ts';

export interface MicHandle {
  stop(): void;
}

/** r = nota detectată (sau null), level = volumul brut al microfonului (RMS), ca să știm dacă ne aude deloc. */
export type PitchListener = (r: PitchResult | null, perfTime: number, level: number) => void;

/** Sub acest volum considerăm liniște. Fără control automat al câștigului, telefoanele dau niveluri mici. */
export const MIC_RMS_THRESHOLD = 0.003;

export async function startMic(onPitch: PitchListener): Promise<MicHandle> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microfonul nu e disponibil în acest browser (cere HTTPS)');
  // context pornit în gestul utilizatorului (iOS cere asta), înainte de dialogul de permisiune
  audioCtx();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  // Microfonul a schimbat rata de eșantionare a sistemului (iOS): lucrăm pe un context nou,
  // altfel frecvența măsurată iese decalată și notele corecte par greșite.
  invalidateAudioCtx();
  const c = audioCtx();
  if (c.state !== 'running') {
    try {
      await c.resume();
    } catch {
      /* continuăm; bucla de mai jos mai încearcă */
    }
  }
  const src = c.createMediaStreamSource(stream);
  const analyser = c.createAnalyser();
  analyser.fftSize = 2048;
  // Safari procesează doar nodurile legate de ieșire: legăm analizorul la difuzor prin volum zero.
  const mute = c.createGain();
  mute.gain.value = 0;
  src.connect(analyser);
  analyser.connect(mute);
  mute.connect(c.destination);
  const buf = new Float32Array(analyser.fftSize);
  let running = true;
  let raf = 0;
  let frame = 0;
  const loop = () => {
    if (!running) return;
    if (c.state !== 'running' && frame++ % 30 === 0) void c.resume();
    analyser.getFloatTimeDomainData(buf);
    const level = rms(buf);
    onPitch(detectPitch(buf, c.sampleRate, { rmsThreshold: MIC_RMS_THRESHOLD }), performance.now() / 1000, level);
    raf = requestAnimationFrame(loop);
  };
  loop();
  return {
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      src.disconnect();
      analyser.disconnect();
      mute.disconnect();
      // la oprire iOS revine la rata de redare: următorul sunet pornește pe un context proaspăt
      invalidateAudioCtx();
    },
  };
}
