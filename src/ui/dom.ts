type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function progressBar(fraction: number): HTMLElement {
  const bar = h('div', { class: 'progress' }, h('div', { class: 'progress-fill' }));
  (bar.firstElementChild as HTMLElement).style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
  return bar;
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function staffBox(svg: string, cls = ''): HTMLElement {
  return h('div', { class: `staff-wrap ${cls}`.trim(), html: svg });
}

export function availableWidth(el: HTMLElement, fallback = 360): number {
  const w = el.clientWidth || document.getElementById('app')?.clientWidth || fallback;
  return Math.max(280, Math.min(760, w - 8));
}
