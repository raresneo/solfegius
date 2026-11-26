// Cele 12 feluri de exercițiu din carte, fiecare cu ecranul lui. Un exercițiu = un mod + parametrii lui din catalog.
import { h } from '../../ui/dom.ts';
import { audioCtx } from '../../audio/audio.ts';
import { audioNow, cls, fmt, keepAwake, phaseRunner, segBar, startMetronome, startRecording } from './kit.ts';
import type { Metro, ModeRunner, Recording, Take } from './kit.ts';
import { haptic, replay, toast } from './fx.ts';
import { describeTake } from '../pauses.ts';
import { gradeTaps, LAYERS, modernBpm, patternTimes, SUBDIVISIONS, TAP_PATTERNS } from '../taps.ts';
import { COLORS, gradeMemory, itemsFor, memoryRound } from '../memory.ts';
import { gradeMarks, referenceMarks, tokenize } from '../marking.ts';
import { magicIf, situation, SITUATION_LABELS } from '../situations.ts';
import type { Situation } from '../situations.ts';
import { newRole, uid } from '../store.ts';
import type { Mode } from '../catalog.ts';

/** Butoane-segment: unul singur ales. initial = -1: niciunul. */
export function seg(labels: string[], initial: number, on: (i: number) => void): HTMLElement {
  const bs = labels.map((l, i) => h('button', {
    class: cls('seg-b', i === initial && 'on'),
    onclick: () => {
      bs.forEach((b, k) => b.classList.toggle('on', k === i));
      on(i);
    },
  }, l));
  return h('div', { class: 'seg' }, bs);
}

const randomSeed = (): number => Math.floor(Math.random() * 1e9);

/** Bara de timp care se golește lin cât ai voie să privești. */
function shrink(bar: HTMLElement, sec: number): void {
  const fill = bar.firstElementChild as HTMLElement;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transitionDuration = `${sec}s`;
    fill.style.width = '0%';
  }));
}

/** Doar nodurile reale: putem scrie condiții direct în listă. */
export const nn = (...xs: (Node | null | false | undefined)[]): Node[] => xs.filter((x): x is Node => !!x);

// ---------- Cronometru, mișcare, cercuri ----------

const runTimer: ModeRunner = (root, mc) =>
  phaseRunner(root, mc.ex.params.ph?.length ? mc.ex.params.ph : [['Lucru', mc.ex.min * 60]], { onEnd: () => mc.complete() });

function circlesSvg(n: number, active: number): HTMLElement {
  const rings = Array.from({ length: n }, (_, k) => {
    const r = n > 1 ? 22 + (k * 84) / (n - 1) : 46;
    return `<circle class="${cls(k === active && 'on', k < active && 'in')}" cx="110" cy="110" r="${r.toFixed(1)}"/>`;
  }).join('');
  return h('div', { class: 'st-circles', html: `<svg viewBox="0 0 220 220">${rings}<circle class="dot" cx="110" cy="110" r="6"/></svg>` });
}

const runCircles: ModeRunner = (root, mc) => {
  const ci = mc.ex.params.ci?.length ? mc.ex.params.ci : ['cercul mic', 'cercul mijlociu', 'cercul mare'];
  const sec = Math.max(30, Math.round((mc.ex.min * 60) / ci.length / 10) * 10);
  return phaseRunner(root, ci.map((c) => [c, sec]), {
    visual: (i) => circlesSvg(ci.length, Math.min(i, ci.length - 1)),
    onEnd: () => mc.complete(),
  });
};

// ---------- Observație ----------

const runMemory: ModeRunner = (root, mc) => {
  const sh = mc.ex.params.sh ?? 30;
  const box = h('div', { class: 'mem' });
  let timer = 0;
  let later = 0;
  const stop = () => {
    clearInterval(timer);
    clearTimeout(later);
  };
  const countdown = (sec: number, out: HTMLElement, done: () => void) => {
    const end = performance.now() + sec * 1000;
    out.textContent = fmt(sec);
    timer = window.setInterval(() => {
      const left = Math.ceil((end - performance.now()) / 1000);
      out.textContent = fmt(left);
      if (left <= 0) done();
    }, 250);
  };
  const game = () => {
    stop();
    const n = itemsFor(sh);
    const round = memoryRound(randomSeed(), n);
    const picked = new Set<string>();
    const answers: number[] = [];
    const finish = () => {
      const g = gradeMemory(round, [...picked], answers);
      const fa = g.falseAlarms ? `, ${g.falseAlarms} „văzute” care nu erau` : '';
      mc.setAuto({ score: g.score, summary: `${g.hits} din ${n} obiecte recunoscute${fa}, ${g.colorsOk} din ${round.colorQs.length} culori.` });
      mc.complete();
    };
    const ask = (q: number) => {
      if (q >= round.colorQs.length) return finish();
      const cq = round.colorQs[q];
      box.replaceChildren(
        h('p', { class: 'hint' }, 'Ce culoare avea:'),
        h('p', { class: 'mem-q' }, cq.word),
        h('div', { class: 'swatches' }, cq.options.map((ci) => h('button', {
          class: 'swatch-btn', style: `background:${COLORS[ci].css}`, 'aria-label': COLORS[ci].name, 'data-c': ci,
          onclick: (ev: Event) => {
            answers[q] = ci;
            const right = ci === cq.answer;
            box.querySelectorAll<HTMLButtonElement>('.swatch-btn').forEach((b) => {
              b.disabled = true;
              if (Number(b.dataset.c) === cq.answer) b.classList.add('ok');
            });
            if (!right) (ev.currentTarget as HTMLElement).classList.add('bad');
            haptic(right ? 20 : [30, 40, 30]);
            later = window.setTimeout(() => ask(q + 1), 650);
          },
        }))),
        h('p', { class: 'muted small' }, `${q + 1} / ${round.colorQs.length}`),
      );
    };
    const recall = () => {
      stop();
      const chips = round.options.map((w) => {
        const b = h('button', {
          class: 'chip-btn',
          onclick: () => {
            if (picked.has(w)) picked.delete(w);
            else picked.add(w);
            b.classList.toggle('on', picked.has(w));
          },
        }, w);
        return b;
      });
      const legend = h('p', { class: 'st-legend', hidden: true },
        h('b', { class: 'ok' }, '● văzut corect'), h('b', { class: 'bad' }, '● nu era acolo'), h('b', { class: 'miss' }, '● l-ai ratat'));
      const next = h('button', {
        class: 'btn primary',
        onclick: () => {
          next.disabled = true;
          const real = new Set(round.items.map((it) => it.word));
          let ok = 0;
          chips.forEach((b, k) => {
            const w = round.options[k];
            const p = picked.has(w);
            b.disabled = true;
            if (p && real.has(w)) ok++;
            b.classList.add(p && real.has(w) ? 'ok' : p ? 'bad' : real.has(w) ? 'miss' : 'off');
          });
          legend.hidden = false;
          toast(`${ok} din ${n} obiecte recunoscute${ok === n ? ' ✓' : ''}`, ok === n ? 'ok' : 'info');
          haptic(ok === n ? [40, 40, 40] : 30);
          later = window.setTimeout(() => ask(0), 1500);
        },
      }, 'Mai departe ›');
      box.replaceChildren(
        h('p', { class: 'hint' }, `Ce obiecte erau? Atinge-le pe cele ${n} pe care le-ai văzut.`),
        h('div', { class: 'chips' }, chips),
        legend,
        next,
      );
    };
    const left = h('b', {});
    const bar = h('div', { class: 'mem-bar' }, h('i', {}));
    box.replaceChildren(
      h('p', { class: 'hint' }, `Privește ${sh} de secunde: obiectele și culoarea fiecăruia. Apoi dispar.`),
      h('p', { class: 'mem-left' }, 'Mai ai ', left),
      bar,
      h('div', { class: 'mem-grid' }, round.items.map((it, k) => h('div', { class: 'mem-cell', style: `--i:${k}` },
        h('i', { class: 'swatch', style: `background:${COLORS[it.color].css}` }), h('span', {}, it.word)))),
      h('button', { class: 'btn primary', onclick: recall }, 'Am reținut ›'),
    );
    countdown(sh, left, recall);
    shrink(bar, sh);
  };
  const real = () => {
    stop();
    const left = h('b', {});
    const seen = h('textarea', { rows: 4, placeholder: 'Ce ai reținut: obiecte, forme, culori, detalii...' });
    const missed = h('textarea', { rows: 3, placeholder: 'Acum privește din nou: ce ai ratat sau ai inventat?' });
    const write = h('div', { hidden: true },
      h('label', { class: 'fld' }, h('span', {}, 'Ce ai reținut?'), seen),
      h('label', { class: 'fld' }, h('span', {}, 'Ce ai ratat?'), missed),
      h('button', {
        class: 'btn primary',
        onclick: () => {
          mc.st.journal.push({ id: uid(), exId: mc.ex.id, title: mc.ex.title, at: Date.now(), items: [{ q: 'Ce am reținut', a: seen.value }, { q: 'Ce am ratat', a: missed.value }] });
          mc.saveSt();
          mc.complete();
        },
      }, 'Salvează în jurnal ›'),
    );
    const go = h('button', {
      class: 'btn primary',
      onclick: () => {
        go.hidden = true;
        countdown(sh, left, () => {
          stop();
          write.hidden = false;
        });
      },
    }, `▶ Privește ${sh} s`);
    box.replaceChildren(
      h('p', { class: 'hint' }, mc.ex.params.hint ? `Ce să observi: ${mc.ex.params.hint}.` : 'Alege un obiect sau un colț al camerei.'),
      h('p', { class: 'mem-left' }, left),
      go,
      write,
    );
  };
  root.append(seg(['Joc pe ecran', 'În jurul tău'], 0, (i) => (i ? real() : game())), box);
  game();
  return stop;
};

// ---------- Tempo-ritm ----------

const runMetronome: ModeRunner = (root, mc) => {
  const p = mc.ex.params;
  const id = mc.ex.id;
  const pat = TAP_PATTERNS[id];
  const meter = /(\d+)\s*\/\s*(\d+)/.exec(p.me ?? '');
  let beats = pat?.meter ?? (meter ? Math.min(12, Number(meter[1])) : 4);
  let sub = SUBDIVISIONS[id] ?? 1;
  let bpm = modernBpm(p.bpm);
  let metro: Metro | null = null;
  let release: () => void = () => undefined;
  let testTimer = 0;
  const fb = h('p', { class: 'feedback' });
  const dots = h('div', { class: 'beats' });
  const drawDots = () => dots.replaceChildren(...Array.from({ length: beats }, (_, i) => h('i', { class: i === 0 ? 'one' : '' })));
  const onBeat = (layer: number, beat: number, s: number) => {
    if (layer || s) return;
    dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === beat));
  };
  const stopAll = () => {
    metro?.stop();
    metro = null;
    release();
    clearTimeout(testTimer);
    play.textContent = '▶ Pornește metronomul';
    dots.querySelectorAll('i').forEach((d) => d.classList.remove('on'));
  };
  const startMain = () => {
    stopAll();
    metro = startMetronome([{ bpm, beats, sub }], onBeat);
    release = keepAwake();
    play.textContent = '■ Oprește';
  };
  const play = h('button', { class: 'btn primary', onclick: () => (metro ? stopAll() : startMain()) }, '▶ Pornește metronomul');
  const bpmOut = h('b', {}, String(bpm));
  const slider = h('input', { type: 'range', min: 20, max: 220, step: 1, value: bpm, 'aria-label': 'Tempo' });
  slider.addEventListener('input', () => {
    bpm = Number(slider.value);
    bpmOut.textContent = String(bpm);
    if (metro && !testTimer) startMain();
  });
  const select = (label: string, values: number[], cur: number, on: (v: number) => void) => {
    const s = h('select', { 'aria-label': label }, values.map((v) => h('option', { value: v, selected: v === cur }, String(v))));
    s.addEventListener('change', () => {
      on(Number(s.value));
      if (metro && !testTimer) startMain();
    });
    return h('label', { class: 'tempo' }, label, s);
  };
  drawDots();
  const book = typeof p.bpm === 'number' && p.bpm < 30
    ? `În carte: metronomul pe nr. ${p.bpm}, cel mai rar tempo. Metronomul de azi pornește de la ${bpm}; coboară dacă vrei mai rar.`
    : p.tl ? `În carte: ${p.tl}.` : '';
  const parts: (HTMLElement | null)[] = [
    p.pa ? h('p', { class: 'st-pattern' }, h('small', { class: 'eyebrow' }, 'Tiparul'), h('span', {}, p.pa)) : null,
    p.hit ? h('p', { class: 'muted small' }, `Ce bați sau ce faci: ${p.hit}.`) : null,
    book ? h('p', { class: 'muted small' }, book) : null,
    dots,
    h('div', { class: 'row' }, h('span', { class: 'tempo' }, '♩ =', bpmOut), slider),
    h('div', { class: 'row' },
      select('Timpi', [2, 3, 4, 5, 6], beats, (v) => {
        beats = v;
        drawDots();
      }),
      select('Subdiviziuni', [1, 2, 3, 4, 6, 8, 12, 16, 24], sub, (v) => (sub = v))),
    h('div', { class: 'row' }, play),
  ];
  const layers = LAYERS[id];
  let layerMetro: Metro | null = null;
  if (layers) {
    const vals = layers.slice();
    const on = layers.map(() => true);
    const rows = vals.map((v, i) => {
      const out = h('b', {}, String(v));
      const r = h('input', { type: 'range', min: 10, max: 220, value: v, 'aria-label': `Metronomul ${i + 1}` });
      r.addEventListener('input', () => {
        vals[i] = Number(r.value);
        out.textContent = r.value;
      });
      const cb = h('input', { type: 'checkbox', checked: true, 'aria-label': `Pornește metronomul ${i + 1}` });
      cb.addEventListener('change', () => (on[i] = cb.checked));
      return h('div', { class: 'layer' }, cb, h('span', { class: `lay l${i}` }, `${i + 1}`), out, r);
    });
    const go = h('button', {
      class: 'btn',
      onclick: () => {
        if (layerMetro) {
          layerMetro.stop();
          layerMetro = null;
          go.textContent = '▶ Toate deodată';
          return;
        }
        stopAll();
        const ls = vals.map((b) => ({ bpm: b, beats: 1, sub: 1 })).filter((_, i) => on[i]);
        if (ls.length) layerMetro = startMetronome(ls);
        go.textContent = '■ Oprește toate';
      },
    }, '▶ Toate deodată');
    parts.push(h('section', { class: 'st-layers' },
      h('h2', {}, 'Mai multe metronoame deodată'),
      h('p', { class: 'muted small' }, 'Ca la Torțov: fiecare acțiune pe alt metronom. Învață întâi două, apoi adaug-o pe a treia.'),
      ...rows, go));
  }
  if (pat) {
    let taps: number[] = [];
    let targets: number[] = [];
    let live = false;
    let liveHits = 0;
    let beatN = 0;
    const lastEl = h('span', { class: 'last' });
    const hitsEl = h('span', {});
    const pad = h('button', { class: 'tap-pad', 'aria-label': 'Bate aici' }, 'BATE AICI');
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!live) return;
      const t = audioNow();
      taps.push(t);
      let d = Infinity;
      for (const x of targets) if (Math.abs(t - x) < Math.abs(d)) d = t - x;
      const kind = Math.abs(d) <= 0.07 ? 'ok' : d < 0 ? 'early' : 'late';
      if (kind === 'ok') liveHits++;
      hitsEl.textContent = `${liveHits} la timp din ${taps.length}`;
      lastEl.textContent = kind === 'ok' ? 'la timp ✓' : `${kind === 'early' ? 'devreme' : 'târziu'} ${Math.round(Math.abs(d) * 1000)} ms`;
      lastEl.className = `last ${kind}`;
      pad.classList.remove('flash', 'ok', 'early', 'late');
      void pad.offsetWidth;
      pad.classList.add('flash', kind);
      haptic(kind === 'ok' ? 12 : 30);
    });
    const test = h('button', {
      class: 'btn primary',
      onclick: () => {
        stopAll();
        layerMetro?.stop();
        layerMetro = null;
        taps = [];
        liveHits = 0;
        beatN = 0;
        hitsEl.textContent = '';
        lastEl.textContent = '';
        const m = startMetronome([{ bpm, beats, sub: 1 }], (layer, b, s) => {
          onBeat(layer, b, s);
          if (layer || s || !live) return;
          beatN++;
          if (beatN <= beats) pad.textContent = `numără ${beatN}`;
          else if (beatN === beats + 1) {
            pad.textContent = 'BATE ACUM';
            replay(pad, 'go');
          }
        });
        metro = m;
        release = keepAwake();
        const beat = 60 / bpm;
        const start = m.t0 + beats * beat;
        targets = patternTimes(pat.beats, beats, 4, bpm, start);
        live = true;
        pad.classList.add('live');
        fb.textContent = 'O măsură numeri în gând, apoi bați tiparul 4 măsuri.';
        const ms = (start + 4 * beats * beat + 0.6 - audioCtx().currentTime) * 1000;
        testTimer = window.setTimeout(() => {
          live = false;
          testTimer = 0;
          pad.classList.remove('live', 'ok', 'early', 'late');
          pad.textContent = 'BATE AICI';
          stopAll();
          const g = gradeTaps(targets, taps, Math.min(0.12, beat * 0.25));
          const lag = Math.abs(g.offset) > 0.03 ? ` (am scăzut o întârziere constantă de ${Math.round(g.offset * 1000)} ms)` : '';
          const summary = `${g.hits} din ${g.total} bătăi la timp${g.extra ? `, ${g.extra} în plus` : ''}${lag}.`;
          fb.textContent = summary;
          toast(summary, g.score >= 0.7 ? 'ok' : 'info');
          mc.setAuto({ score: g.score, summary });
          mc.complete();
        }, ms);
      },
    }, '● Bate tu');
    parts.push(h('section', { class: 'st-tap' },
      h('h2', {}, 'Verifică-te'),
      h('p', { class: 'muted small' }, `Tiparul: ${pat.label}, în ${pat.meter}/4. Aplicația ascultă bătăile tale și le compară cu metronomul.`),
      h('div', { class: 'tap-live' }, hitsEl, lastEl), pad, test));
  }
  root.append(...parts.filter((x): x is HTMLElement => !!x), fb);
  return () => {
    stopAll();
    layerMetro?.stop();
  };
};

// ---------- Voce ----------

const dbOf = (x: number): number => 20 * Math.log10(Math.max(x, 1e-6));

function compareTakes(a: Take, b: Take): string {
  const dp = b.stats.pauses.length - a.stats.pauses.length;
  const dl = Math.round(b.stats.level - a.stats.level);
  const dd = b.stats.duration - a.stats.duration;
  const bits = [
    dp ? `${dp > 0 ? '+' : ''}${dp} ${Math.abs(dp) === 1 ? 'pauză' : 'pauze'}` : 'același număr de pauze',
    Math.abs(dl) >= 2 ? `cu ${Math.abs(dl)} dB mai ${dl > 0 ? 'tare' : 'încet'}` : 'cam la fel de tare',
    Math.abs(dd) >= 0.3 ? `cu ${Math.abs(dd).toFixed(1).replace('.', ',')} s mai ${dd > 0 ? 'lungă' : 'scurtă'}` : 'aceeași durată',
  ];
  return `Față de dubla dinainte: ${bits.join(', ')}.`;
}

/** Înregistrezi „duble”, fiecare cu varianta cerută de carte, și le compari: pauze, nivel, durată. */
export function recorderPanel(o: { text: string; variants: string[]; textEl?: HTMLElement }): { el: HTMLElement; dispose(): void } {
  const takes: Take[] = [];
  let rec: Recording | null = null;
  let variant = 0;
  const labels = ['Liber', ...o.variants];
  const meter = h('div', { class: 'level' }, h('i', {}));
  const time = h('span', { class: 'muted small' }, '0:00');
  const msg = h('p', { class: 'muted small' });
  const list = h('div', { class: 'takes' });
  const recDot = h('span', { class: 'rec-dot', hidden: true }, 'REC');
  const state = h('span', { class: 'rec-state', hidden: true });
  const pzOut = h('span', { class: 'muted small', hidden: true });
  const liveRow = h('div', { class: 'rec-live' }, recDot, state, pzOut);
  const showLive = (on: boolean) => [recDot, state, pzOut].forEach((x) => (x.hidden = !on));
  const btn = h('button', { class: 'btn primary big', onclick: () => void toggle() }, '● Înregistrează');
  const fill = meter.firstElementChild as HTMLElement;
  const toggle = async () => {
    if (rec) {
      const r = rec;
      rec = null;
      btn.disabled = true;
      const take = await r.stop();
      btn.disabled = false;
      btn.textContent = '● Înregistrează';
      meter.classList.remove('live');
      showLive(false);
      takes.push(take);
      const prev = takes[takes.length - 2];
      const np = take.stats.pauses.length;
      toast(`Dubla ${takes.length} salvată ✓ ${np} ${np === 1 ? 'pauză' : 'pauze'}`, 'ok');
      haptic(25);
      list.prepend(h('div', { class: 'take new' },
        h('strong', {}, `Dubla ${takes.length} · ${take.label}`),
        take.url ? h('audio', { controls: true, src: take.url, preload: 'metadata' }) : h('p', { class: 'muted small' }, 'Pe acest browser nu se poate reda, dar măsurătorile sunt mai jos.'),
        segBar(take.stats),
        h('p', { class: 'small' }, describeTake(take.stats)),
        prev ? h('p', { class: 'muted small' }, compareTakes(prev, take)) : null,
      ));
      return;
    }
    try {
      msg.textContent = '';
      btn.disabled = true;
      let maxDb = -90;
      let silentMs = 0;
      let voiced = false;
      let livePauses = 0;
      rec = await startRecording(labels[variant] ?? 'Liber', (lv, t) => {
        const db = dbOf(lv);
        fill.style.width = `${Math.round(Math.max(0, Math.min(1, (db + 60) / 60)) * 100)}%`;
        time.textContent = fmt(t);
        maxDb = Math.max(maxDb, db);
        if (db < Math.max(-52, maxDb - 24)) silentMs += 33;
        else {
          if (voiced && silentMs >= 300) livePauses++;
          silentMs = 0;
          voiced = true;
        }
        const inPause = voiced && silentMs >= 300;
        state.textContent = !voiced ? 'aștept vocea' : inPause ? 'pauză' : 'vorbești';
        state.className = cls('rec-state', voiced && !inPause && 'voice', inPause && 'pause');
        pzOut.textContent = `${livePauses} ${livePauses === 1 ? 'pauză' : 'pauze'} până acum`;
      });
      btn.disabled = false;
      btn.textContent = '■ Stop';
      meter.classList.add('live');
      showLive(true);
      haptic(20);
    } catch (e) {
      btn.disabled = false;
      msg.textContent = `Microfonul nu pornește: ${(e as Error).message}. Pe iPhone, deschide aplicația prin HTTPS și permite microfonul.`;
    }
  };
  const el = h('div', { class: 'st-rec' },
    o.textEl ?? (o.text ? h('div', { class: 'st-text' }, o.text) : null),
    o.variants.length ? h('div', {}, h('p', { class: 'muted small' }, 'Varianta pentru dubla următoare:'), seg(labels, 0, (i) => (variant = i))) : null,
    h('div', { class: 'row' }, btn, time),
    liveRow,
    meter,
    msg,
    list,
  );
  return {
    el,
    dispose() {
      rec?.cancel();
      rec = null;
      takes.forEach((t) => t.url && URL.revokeObjectURL(t.url));
    },
  };
}

const runRecord: ModeRunner = (root, mc) => {
  const p = recorderPanel({ text: mc.ex.params.tx ?? '', variants: mc.ex.params.rw ?? [] });
  root.append(h('p', { class: 'hint' }, 'Înregistrează o dublă, ascult-o, apoi încă una cu varianta cerută. Compară pauzele și nivelul.'), p.el);
  return p.dispose;
};

// ---------- Text: pauze și accente ----------

const runMarking: ModeRunner = (root, mc) => {
  const p = mc.ex.params;
  const tokens = tokenize(p.tx ?? '');
  const ref = referenceMarks(tokens, p.ref ?? { p: [], a: [] });
  const pauses = new Map<number, 1 | 2>();
  const accents = new Set<number>();
  let tool = 0;
  let rec: { el: HTMLElement; dispose(): void } | null = null;
  const textEl = h('div', { class: 'st-text marking' });
  const render = (into: HTMLElement, pz: Map<number, 1 | 2>, acc: Set<number>, editable: boolean, rv?: { p: Set<number>; a: Set<number> }) =>
    into.replaceChildren(...tokens.map((w, i) => {
      const ac = acc.has(i) ? cls('acc', rv && (rv.a.has(i) ? 'ok-acc' : 'bad-acc')) : rv?.a.has(i) ? 'miss-acc' : '';
      const mark = pz.has(i)
        ? h('span', { class: cls('pz', rv && (rv.p.has(i) ? 'ok' : 'bad')) }, pz.get(i) === 2 ? '‖' : '|')
        : rv?.p.has(i) ? h('span', { class: 'pz miss', title: 'pauză din carte' }, '|') : null;
      return h('span', { class: 'tokw' },
        editable ? h('button', { class: cls('tok', ac), onclick: () => toggle(i) }, w) : h('span', { class: cls('tok', ac) }, w),
        mark);
    }));
  const toggle = (i: number) => {
    if (tool === 1) {
      if (accents.has(i)) accents.delete(i);
      else accents.add(i);
    } else {
      const v = pauses.get(i);
      if (!v) pauses.set(i, 1);
      else if (v === 1) pauses.set(i, 2);
      else pauses.delete(i);
    }
    render(textEl, pauses, accents, true);
  };
  const fb = h('p', { class: 'feedback' });
  const refBox = h('div', { hidden: true });
  const legend = h('p', { class: 'st-legend', hidden: true },
    h('b', { class: 'ok' }, '● ca în carte'), h('b', { class: 'bad' }, '● în plus'), h('b', { class: 'miss' }, '● lipsește'));
  const check = h('button', {
    class: 'btn primary',
    onclick: () => {
      const g = gradeMarks({ pauses: [...pauses.keys()], accents: [...accents] }, ref);
      if (g.comparable) {
        const pz = ref.pauses.length ? `Pauze: ${g.pausesOk} din ${g.pausesRef}${g.pausesExtra ? `, ${g.pausesExtra} în plus` : ''}` : '';
        const ac = ref.accents.length ? `Accente: ${g.accentsOk} din ${g.accentsRef}${g.accentsExtra ? `, ${g.accentsExtra} în plus` : ''}` : '';
        const summary = [pz, ac].filter(Boolean).join(' · ');
        fb.textContent = summary;
        mc.setAuto({ score: g.score, summary });
        render(textEl, pauses, accents, true, { p: new Set(ref.pauses), a: new Set(ref.accents) });
        legend.hidden = false;
        toast(g.score >= 0.7 ? `Bravo ✓ ${summary}` : summary, g.score >= 0.7 ? 'ok' : 'info');
        haptic(g.score >= 0.7 ? [30, 40, 30] : 30);
      } else {
        fb.textContent = 'Cartea nu fixează aici o soluție unică: compară cu sensul și autoevaluează-te.';
      }
      const solved = h('div', { class: 'st-text ref' });
      render(solved, new Map(ref.pauses.map((i) => [i, 1])), new Set(ref.accents), false);
      refBox.replaceChildren(...nn(
        h('p', { class: 'eyebrow' }, 'Soluția din carte'),
        g.comparable ? solved : null,
        p.ref?.s ? h('p', { class: 'muted' }, `Subtextul: ${p.ref.s}`) : null,
      ));
      refBox.hidden = false;
      say.hidden = false;
    },
  }, '✓ Verifică');
  const sayBox = h('div', {});
  const say = h('button', {
    class: 'btn',
    hidden: true,
    onclick: () => {
      rec?.dispose();
      const marked = h('div', { class: 'st-text' });
      render(marked, pauses, accents, false);
      rec = recorderPanel({ text: '', variants: [], textEl: marked });
      sayBox.replaceChildren(rec.el);
      say.hidden = true;
    },
  }, '● Rostește cu marcajele tale');
  render(textEl, pauses, accents, true);
  root.append(
    h('p', { class: 'hint' }, 'Alege unealta, apoi atinge cuvintele. Pauza vine după cuvânt: o atingere = pauză logică |, două = pauză psihologică ‖.'),
    seg(['Pauză', 'Accent'], 0, (i) => (tool = i)),
    textEl,
    legend,
    h('div', { class: 'row' }, check, say),
    fb,
    refBox,
    sayBox,
  );
  return () => rec?.dispose();
};

// ---------- „Dacă” și situațiile propuse ----------

const runSituations: ModeRunner = (root, mc) => {
  let s: Situation = situation(randomSeed());
  const card = h('div', { class: 'st-sit' });
  const render = () => card.replaceChildren(
    ...(Object.keys(SITUATION_LABELS) as (keyof Situation)[]).map((k) => h('div', { class: 'sit-row' }, h('small', { class: 'muted' }, SITUATION_LABELS[k]), h('span', {}, s[k]))),
    h('p', { class: 'magic' }, magicIf(s)),
  );
  const pool = mc.ex.params.pool ?? [];
  const timerBox = h('div', {});
  let dispose: () => void = () => undefined;
  const go = h('button', {
    class: 'btn primary',
    onclick: () => {
      go.hidden = true;
      dispose = phaseRunner(timerBox, [['Improvizează: acționează, nu juca sentimentul', Math.max(60, Math.min(600, mc.ex.min * 60))]], { onEnd: () => mc.complete() });
    },
  }, '▶ Improvizează');
  const again = h('button', {
    class: 'btn',
    onclick: () => {
      s = situation(randomSeed());
      render();
      replay(card, 'flip');
      haptic(12);
    },
  }, '↻ Altă situație');
  root.append(...nn(
    pool.length ? h('div', { class: 'st-pool' }, h('p', { class: 'eyebrow' }, 'Din carte'), h('ul', {}, pool.map((x) => h('li', {}, x)))) : null,
    h('p', { class: 'eyebrow' }, 'Situația ta'),
    card,
    h('div', { class: 'row' }, again, go),
    timerBox,
  ));
  render();
  return () => dispose();
};

// ---------- Jurnal, acțiune, rol, fișă ----------

const runJournal: ModeRunner = (root, mc) => {
  const prompts = mc.ex.params.pr?.length ? mc.ex.params.pr : ['Ce ai văzut, auzit, simțit concret?', 'Ce ai făcut?', 'Ce încerci data viitoare?'];
  const msg = h('p', { class: 'muted small' });
  const areas = prompts.map((q, i) => {
    const key = `${mc.ex.id}:${i}`;
    const ta = h('textarea', { rows: 3, placeholder: 'Scrie aici...' });
    ta.value = mc.st.drafts[key] ?? '';
    ta.addEventListener('input', () => {
      mc.st.drafts[key] = ta.value;
      mc.saveSt();
    });
    return { q, ta, key };
  });
  root.append(
    ...areas.map((a) => h('label', { class: 'fld' }, h('span', {}, a.q), a.ta)),
    msg,
    h('button', {
      class: 'btn primary',
      onclick: () => {
        const items = areas.map((a) => ({ q: a.q, a: a.ta.value }));
        if (!items.some((i) => i.a.trim())) {
          msg.textContent = 'Scrie măcar un răspuns.';
          return;
        }
        mc.st.journal.push({ id: uid(), exId: mc.ex.id, title: mc.ex.title, at: Date.now(), items });
        areas.forEach((a) => delete mc.st.drafts[a.key]);
        mc.saveSt();
        toast('Salvat în jurnal ✓', 'ok');
        mc.complete();
      },
    }, 'Salvează în jurnal ›'),
  );
  return () => undefined;
};

const runAction: ModeRunner = (root, mc) => {
  const p = mc.ex.params;
  let t0 = 0;
  let timer = 0;
  let release: () => void = () => undefined;
  const clock = h('b', { class: 'st-clock' }, '0:00');
  const sw = h('button', {
    class: 'btn primary',
    onclick: () => {
      if (timer) {
        clearInterval(timer);
        timer = 0;
        release();
        sw.textContent = '▶ Din nou';
        toast(`Acțiune făcută în ${clock.textContent} ✓`, 'ok');
        return;
      }
      t0 = performance.now();
      timer = window.setInterval(() => (clock.textContent = fmt((performance.now() - t0) / 1000)), 250);
      release = keepAwake();
      sw.textContent = '■ Gata acțiunea';
    },
  }, '▶ Începe acțiunea');
  root.append(...nn(
    p.ac ? h('div', { class: 'st-text small-text' }, p.ac) : null,
    h('p', { class: 'hint' }, 'Fă acțiunea până la capăt, fără grabă. Dacă obiectul lipsește, imaginează-l: greutatea, forma, unde îl pui.'),
    h('div', { class: 'row' }, sw, clock),
    p.cp?.length ? h('div', { class: 'st-cp' }, h('p', { class: 'eyebrow' }, 'Puncte de control'),
      ...p.cp.map((c) => {
        const cb = h('input', { type: 'checkbox' });
        const lab = h('label', { class: 'cp' }, cb, h('span', {}, c));
        cb.addEventListener('change', () => {
          lab.classList.toggle('done', cb.checked);
          if (!cb.checked) return;
          haptic(15);
          if ([...root.querySelectorAll<HTMLInputElement>('.st-cp input')].every((x) => x.checked)) toast('Toate punctele de control bifate ✓', 'ok');
        });
        return lab;
      })) : null,
  ));
  return () => {
    clearInterval(timer);
    release();
  };
};

const runRole: ModeRunner = (root, mc) => {
  const fields = mc.ex.params.fi?.length ? mc.ex.params.fi : ['Notițe'];
  const box = h('div', {});
  const draw = () => {
    const role = mc.st.roles.find((r) => r.id === mc.st.activeRole) ?? mc.st.roles[0];
    if (!role) {
      const name = h('input', { type: 'text', placeholder: 'ex. Figaro, Tevye, Don Giovanni' });
      box.replaceChildren(
        h('p', { class: 'hint' }, 'Exercițiul se face pe rolul tău. Pentru ce rol lucrezi?'),
        name,
        h('button', {
          class: 'btn primary',
          onclick: () => {
            const r = newRole(uid());
            r.title = name.value.trim() || 'Rolul meu';
            mc.st.roles.push(r);
            mc.st.activeRole = r.id;
            mc.saveSt();
            draw();
          },
        }, 'Creează rolul'),
      );
      return;
    }
    const notes = (role.exNotes[mc.ex.id] ??= {});
    const pickRole = mc.st.roles.length > 1
      ? (() => {
        const s = h('select', { 'aria-label': 'Rolul' }, mc.st.roles.map((r) => h('option', { value: r.id, selected: r.id === role.id }, r.title || 'Rol fără nume')));
        s.addEventListener('change', () => {
          mc.st.activeRole = s.value;
          mc.saveSt();
          draw();
        });
        return h('label', { class: 'tempo' }, 'Rolul:', s);
      })()
      : h('p', { class: 'muted small' }, `Rolul: ${role.title || 'Rol fără nume'}`);
    box.replaceChildren(
      pickRole,
      ...fields.map((f) => {
        const ta = h('textarea', { rows: 2 });
        ta.value = notes[f] ?? '';
        ta.addEventListener('input', () => {
          notes[f] = ta.value;
          role.updated = Date.now();
          mc.saveSt();
        });
        return h('label', { class: 'fld' }, h('span', {}, f), ta);
      }),
      h('a', { class: 'link', href: `#/scena/rol/${role.id}` }, 'Deschide partitura completă a rolului ›'),
    );
  };
  root.append(box);
  draw();
  return () => undefined;
};

const runSheet: ModeRunner = (root, mc) => {
  const fields = mc.ex.params.fi ?? [];
  const key = `${mc.ex.id}:fisa`;
  const ta = h('textarea', { rows: 3, placeholder: 'Ce ai înțeles, ce încerci la repetiție...' });
  ta.value = mc.st.drafts[key] ?? '';
  ta.addEventListener('input', () => {
    mc.st.drafts[key] = ta.value;
    mc.saveSt();
  });
  root.append(...nn(
    fields.length ? h('ul', { class: 'st-steps' }, fields.map((f) => h('li', {}, f))) : null,
    h('label', { class: 'fld' }, h('span', {}, 'Notițele tale'), ta),
    h('button', {
      class: 'btn',
      onclick: () => {
        if (ta.value.trim()) {
          mc.st.journal.push({ id: uid(), exId: mc.ex.id, title: mc.ex.title, at: Date.now(), items: [{ q: 'Notițe', a: ta.value }] });
          delete mc.st.drafts[key];
          mc.saveSt();
        }
        mc.complete();
      },
    }, 'Salvează notițele ›'),
  ));
  return () => undefined;
};

export const MODE_RUNNERS: Record<Mode, ModeRunner> = {
  timer: runTimer,
  movement: runTimer,
  circles: runCircles,
  memory: runMemory,
  metronome: runMetronome,
  record: runRecord,
  marking: runMarking,
  situations: runSituations,
  journal: runJournal,
  action: runAction,
  role: runRole,
  sheet: runSheet,
};
