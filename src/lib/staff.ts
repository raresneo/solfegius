// Randare SVG a unui portativ în cheia sol, fără biblioteci externe.
import type { MNote } from './notation.ts';
import { parseNote, roName } from './theory.ts';

export type NoteState = 'current' | 'ok' | 'bad' | 'hint';

export interface StaffOptions {
  notes: MNote[];
  time?: [number, number] | null;
  width?: number;
  showNames?: boolean;
  states?: Record<number, NoteState>;
  /** fără bară finală dublă (ex. o singură notă de citit) */
  noFinalBar?: boolean;
  /** text liber sub fiecare notă (ex. silabe ritmice); are prioritate față de nume */
  labels?: Record<number, string>;
  scale?: number;
}

export interface StaffLayout {
  svg: string;
  width: number;
  height: number;
  /** poziția x,y pe fiecare notă (pentru teste și animații) */
  positions: { x: number; y: number; system: number }[];
}

const GAP = 10;
const HALF = GAP / 2;
const E4 = 4 * 7 + 2; // indicele diatonic al liniei de jos
const B4 = 4 * 7 + 6; // linia din mijloc
const COLORS: Record<NoteState | 'default', string> = {
  default: 'var(--ink, #ece8df)',
  current: 'var(--gold, #D4AF37)',
  ok: 'var(--ok, #4ade80)',
  bad: 'var(--bad, #f87171)',
  hint: 'var(--muted, #9a958a)',
};

function noteSpace(n: MNote): number {
  const acc = n.pitch && parseNote(n.pitch).acc !== 0 ? 10 : 0;
  return 20 + 14 * Math.sqrt(n.dur) + acc;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export function renderStaff(o: StaffOptions): StaffLayout {
  const width = o.width ?? 360;
  const states = o.states ?? {};
  const showLabels = !!o.showNames || !!o.labels;
  const sysH = showLabels ? 128 : 112;
  const topPad = 34;

  // grupare pe măsuri
  const measures: number[][] = [];
  o.notes.forEach((n, i) => {
    (measures[n.measure] ??= []).push(i);
  });
  const clefW = 34;
  const timeW = o.time ? 24 : 0;

  // împărțire pe rânduri (sisteme)
  const systems: { measures: number[][]; natural: number[] }[] = [];
  let cur: { measures: number[][]; natural: number[] } = { measures: [], natural: [] };
  let x = clefW + timeW + 8;
  for (const m of measures) {
    if (!m) continue;
    const mw = m.reduce((a, i) => a + noteSpace(o.notes[i]), 0) + 10;
    if (cur.measures.length && x + mw > width - 4) {
      systems.push(cur);
      cur = { measures: [], natural: [] };
      x = clefW + 8;
    }
    cur.measures.push(m);
    cur.natural.push(mw);
    x += mw;
  }
  if (cur.measures.length) systems.push(cur);

  const positions: StaffLayout['positions'] = [];
  const parts: string[] = [];
  const height = systems.length * sysH + 6;

  systems.forEach((sys, si) => {
    const top = topPad + si * sysH;
    const bottom = top + 4 * GAP;
    const mid = top + 2 * GAP;
    const yFor = (dIdx: number) => bottom - (dIdx - E4) * HALF;
    const start = clefW + (si === 0 ? timeW : 0) + 8;
    const naturalTotal = sys.natural.reduce((a, b) => a + b, 0);
    const isLastSys = si === systems.length - 1;
    const avail = width - 4 - start;
    // justificăm rândurile pline; ultimul rând doar dacă e aproape plin
    const stretch = !isLastSys || naturalTotal > avail * 0.7 ? avail / naturalTotal : 1;
    const lineEnd = isLastSys && stretch === 1 ? start + naturalTotal : width - 4;

    for (let l = 0; l < 5; l++) {
      const y = top + l * GAP;
      parts.push(`<line x1="2" y1="${y}" x2="${lineEnd}" y2="${y}" class="st-line"/>`);
    }
    parts.push(clef(4, top));
    if (si === 0 && o.time) {
      parts.push(`<text x="${clefW + 2}" y="${top + 18}" class="st-time">${o.time[0]}</text>`);
      parts.push(`<text x="${clefW + 2}" y="${top + 38}" class="st-time">${o.time[1]}</text>`);
    }

    let mx = start;
    sys.measures.forEach((m, mi) => {
      const mw = sys.natural[mi] * stretch;
      const inner = mw - 10;
      const naturalInner = m.reduce((a, i) => a + noteSpace(o.notes[i]), 0);
      let nx = mx + 8;
      // poziții
      const local: { i: number; x: number; y: number; d: number }[] = [];
      for (const i of m) {
        const n = o.notes[i];
        const w = (noteSpace(n) * inner) / naturalInner;
        const cx = nx + (n.pitch && parseNote(n.pitch).acc !== 0 ? 10 : 0) + 4;
        const dIdx = n.pitch ? parseNote(n.pitch).diatonic : B4;
        const y = yFor(dIdx);
        local.push({ i, x: cx, y, d: dIdx });
        positions[i] = { x: cx, y, system: si };
        nx += w;
      }
      // grupuri de optimi pe același timp (pentru bare de legătură)
      const beamOf = new Map<number, number[]>();
      for (let k = 0; k < local.length; k++) {
        const n = o.notes[local[k].i];
        if (n.type !== 'e' || !n.pitch) continue;
        const beatIdx = Math.floor(n.beat + 1e-9);
        const group = [k];
        while (k + 1 < local.length) {
          const nn = o.notes[local[k + 1].i];
          if (nn.type === 'e' && nn.pitch && Math.floor(nn.beat + 1e-9) === beatIdx) {
            group.push(++k);
          } else break;
        }
        if (group.length > 1) for (const g of group) beamOf.set(g, group);
      }
      const drawnBeams = new Set<number[]>();

      local.forEach((p, k) => {
        const n = o.notes[p.i];
        const color = COLORS[states[p.i] ?? 'default'];
        if (!n.pitch) {
          parts.push(restGlyph(n.type, p.x, mid, color));
        } else {
          const pn = parseNote(n.pitch);
          // linii suplimentare
          for (let ld = E4 - 2; ld >= p.d; ld -= 2) parts.push(ledger(p.x, yFor(ld)));
          for (let ld = E4 + 10; ld <= p.d; ld += 2) parts.push(ledger(p.x, yFor(ld)));
          if (pn.acc !== 0) {
            const sym = pn.acc > 0 ? '♯' : '♭';
            parts.push(`<text x="${p.x - 17}" y="${p.y + 5}" class="st-acc" fill="${color}">${sym}</text>`);
          }
          const hollow = n.type === 'w' || n.type === 'h';
          parts.push(
            `<ellipse cx="${p.x}" cy="${p.y}" rx="6.2" ry="4.4" transform="rotate(-20 ${p.x} ${p.y})" ` +
              (hollow
                ? `fill="none" stroke="${color}" stroke-width="1.8"`
                : `fill="${color}"`) +
              ` data-i="${p.i}"/>`,
          );
          if (n.dotted) {
            const onLine = (p.d - E4) % 2 === 0;
            parts.push(`<circle cx="${p.x + 11}" cy="${onLine ? p.y - 3 : p.y}" r="1.8" fill="${color}"/>`);
          }
          if (n.type !== 'w') {
            const group = beamOf.get(k);
            if (group) {
              if (!drawnBeams.has(group)) {
                drawnBeams.add(group);
                const pts = group.map((g) => local[g]);
                const avg = pts.reduce((a, q) => a + q.d, 0) / pts.length;
                const up = avg < B4;
                const tip = up ? Math.min(...pts.map((q) => q.y)) - 30 : Math.max(...pts.map((q) => q.y)) + 30;
                const gColor = COLORS[states[pts[0].i] ?? 'default'];
                pts.forEach((q) => {
                  const sx = up ? q.x + 5.6 : q.x - 5.6;
                  const c = COLORS[states[q.i] ?? 'default'];
                  parts.push(`<line x1="${sx}" y1="${q.y}" x2="${sx}" y2="${tip}" stroke="${c}" stroke-width="1.4"/>`);
                });
                const x1 = (up ? pts[0].x + 5.6 : pts[0].x - 5.6) - 0.7;
                const x2 = (up ? pts[pts.length - 1].x + 5.6 : pts[pts.length - 1].x - 5.6) + 0.7;
                const t = up ? 0 : -4.5;
                parts.push(`<rect x="${x1}" y="${tip + t}" width="${x2 - x1}" height="4.5" fill="${gColor}"/>`);
              }
            } else {
              const up = p.d < B4;
              const sx = up ? p.x + 5.6 : p.x - 5.6;
              const tip = up ? p.y - 33 : p.y + 33;
              parts.push(`<line x1="${sx}" y1="${p.y}" x2="${sx}" y2="${tip}" stroke="${color}" stroke-width="1.4"/>`);
              if (n.type === 'e' || n.type === 's') {
                const dir = up ? 1 : -1;
                parts.push(
                  `<path d="M${sx} ${tip} c 1 ${7 * dir}, 11 ${9 * dir}, 7 ${21 * dir}" fill="none" stroke="${color}" stroke-width="1.8"/>`,
                );
              }
            }
          }
        }
        const label = o.labels?.[p.i] ?? (o.showNames && n.pitch ? roName(n.pitch) : null);
        if (label) {
          parts.push(`<text x="${p.x}" y="${bottom + 36}" class="st-name" fill="${color}">${esc(label)}</text>`);
        }
      });

      mx += mw;
      const isFinal = isLastSys && mi === sys.measures.length - 1 && !o.noFinalBar;
      const bx = Math.min(mx, width - 4);
      if (isFinal) {
        parts.push(`<line x1="${bx - 5}" y1="${top}" x2="${bx - 5}" y2="${bottom}" class="st-bar"/>`);
        parts.push(`<rect x="${bx - 3}" y="${top}" width="3.5" height="${4 * GAP}" class="st-final"/>`);
      } else if (!o.noFinalBar || mi < sys.measures.length - 1) {
        parts.push(`<line x1="${bx}" y1="${top}" x2="${bx}" y2="${bottom}" class="st-bar"/>`);
      }
    });
  });

  const scale = o.scale ?? 1;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" class="staff" viewBox="0 0 ${width} ${height}" ` +
    `width="${width * scale}" height="${height * scale}" role="img" aria-label="portativ">` +
    parts.join('') +
    `</svg>`;
  return { svg, width, height, positions };
}

/** Cheia sol desenată ca traseu propriu (nu depinde de fonturi cu simboluri muzicale). */
export const CLEF_PATH =
  'M14 33 C9 33 8 26 13 24 C19 22 23 28 20 34 C17 40 6 40 4 32 C2 24 10 17 15 11 ' +
  'C20 5 21 -4 17 -8 C13 -11 10 -3 12 6 L16 44 C17 50 12 53 9 50';

function clef(x: number, top: number): string {
  return (
    `<g transform="translate(${x} ${top})" class="st-clef">` +
    `<path d="${CLEF_PATH}" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="10.5" cy="47.5" r="2.6" fill="currentColor"/></g>`
  );
}

function ledger(x: number, y: number): string {
  return `<line x1="${x - 10}" y1="${y}" x2="${x + 10}" y2="${y}" class="st-line"/>`;
}

function restGlyph(type: string, x: number, mid: number, color: string): string {
  switch (type) {
    case 'w':
      return `<rect x="${x - 6}" y="${mid - GAP}" width="12" height="5" fill="${color}"/>`;
    case 'h':
      return `<rect x="${x - 6}" y="${mid - 5}" width="12" height="5" fill="${color}"/>`;
    case 'e':
      return (
        `<circle cx="${x - 2}" cy="${mid - 5}" r="2.4" fill="${color}"/>` +
        `<path d="M${x - 2} ${mid - 3} Q ${x + 2} ${mid - 2} ${x + 4} ${mid - 7} L ${x} ${mid + 9}" fill="none" stroke="${color}" stroke-width="1.6"/>`
      );
    default:
      // pauza de pătrime
      return `<path d="M${x - 2} ${mid - 15} l6 7 l-5 6 l6 7 q-7 -3 -5 5" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/>`;
  }
}
