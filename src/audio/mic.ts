// Microfon + detecție de înălțime în timp real.
import { audioCtx } from './audio.ts';
import { detectPitch } from '../lib/pitch.ts';
import type { PitchResult } from '../lib/pitch.ts';

export interface MicHandle {
  stop(): void;
}

export type PitchListener = (r: PitchResult | null, perfTime: number) => void;

export async function startMic(onPitch: PitchListener): Promise<MicHandle> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microfonul nu e disponibil în acest browser');
  const c = audioCtx();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const src = c.createMediaStreamSource(stream);
  const analyser = c.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  let running = true;
  let raf = 0;
  const loop = () => {
    if (!running) return;
    analyser.getFloatTimeDomainData(buf);
    onPitch(detectPitch(buf, c.sampleRate, { rmsThreshold: 0.012 }), performance.now() / 1000);
    raf = requestAnimationFrame(loop);
  };
  loop();
  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      src.disconnect();
    },
  };
}
