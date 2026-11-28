// Feedback mic și clar: vibrație, mesaje scurte, animații care repornesc, numărătoarea 3-2-1. Respectă „reduce motion”.
import { h } from '../../ui/dom.ts';
import { newVoice } from '../../audio/audio.ts';

export const reduced = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Vibrație scurtă unde telefonul o permite (Android); pe iPhone nu face nimic. */
export function haptic(p: number | number[]): void {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* fără vibrație */
  }
}

/** Repornește o animație CSS: scoate clasa și o pune la loc. */
export function replay(el: Element, c: string): void {
  el.classList.remove(c);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(c);
}

let toastEl: HTMLElement | null = null;
let toastTimer = 0;

/** Un mesaj scurt jos pe ecran, care dispare singur. */
export function toast(text: string, kind: 'ok' | 'info' | 'warn' = 'ok'): void {
  toastEl?.remove();
  clearTimeout(toastTimer);
  const el = h('div', { class: `st-toast ${kind}`, role: 'status', 'aria-live': 'polite' }, text);
  document.body.append(el);
  toastEl = el;
  toastTimer = window.setTimeout(() => {
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 300);
    if (toastEl === el) toastEl = null;
  }, 2300);
}

/** Un „tic” scurt pentru numărătoare și ultimele secunde. */
export function blip(freq = 880, dur = 0.06, gain = 0.08): void {
  try {
    const v = newVoice(1);
    const c = v.out.context;
    const t = c.currentTime + 0.01;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(v.out);
    o.start(t);
    o.stop(t + dur + 0.02);
    window.setTimeout(() => v.stop(), (dur + 0.25) * 1000);
  } catch {
    /* fără audio */
  }
}

/** 3, 2, 1, Start! peste zona dată (nu blochează butoanele). Întoarce anularea. */
export function countIn(root: HTMLElement, done: () => void, from = 3): () => void {
  const num = h('b', {});
  const ov = h('div', { class: 'st-countin', 'aria-live': 'assertive' }, num);
  root.append(ov);
  let n = from;
  let t = 0;
  const show = () => {
    if (n === 0) {
      num.textContent = 'Start!';
      replay(num, 'go');
      blip(1320, 0.12, 0.1);
      haptic(40);
      t = window.setTimeout(() => {
        ov.remove();
        done();
      }, 450);
      return;
    }
    num.textContent = String(n);
    replay(num, 'go');
    blip(880);
    n--;
    t = window.setTimeout(show, 700);
  };
  show();
  return () => {
    clearTimeout(t);
    ov.remove();
  };
}

/** Scorul urcă de la 0 la valoarea finală; la final pune data-done (pentru teste și cititoare de ecran). */
export function countUp(el: HTMLElement, to: number, ms = 750): void {
  const final = `${Math.round(to * 100)}%`;
  if (reduced() || to <= 0) {
    el.textContent = final;
    el.dataset.done = '1';
    return;
  }
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = `${Math.round(to * 100 * (1 - Math.pow(1 - k, 3)))}%`;
    if (k < 1) requestAnimationFrame(step);
    else {
      el.textContent = final;
      el.dataset.done = '1';
    }
  };
  el.textContent = '0%';
  requestAnimationFrame(step);
}
