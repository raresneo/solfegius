// Export în Markdown (pentru Obsidian sau pentru profesor): partitura rolului și jurnalul.
import { GIVEN_FIELDS } from './store.ts';
import type { JournalEntry, Role } from './store.ts';

const block = (title: string, body: string): string => (body.trim() ? `## ${title}\n\n${body.trim()}\n\n` : '');

export function roleMarkdown(r: Role): string {
  const head = `# ${r.title || 'Rol fără nume'}${r.work ? ` · ${r.work}` : ''}\n\n` +
    [r.composer && `Compozitor / autor: ${r.composer}`, r.aria && `Aria / scena: ${r.aria}`].filter(Boolean).join('  \n');
  const given = GIVEN_FIELDS.filter(([k]) => r.given[k]?.trim()).map(([k, q]) => `- **${q}** ${r.given[k].trim()}`).join('\n');
  const bits = r.bits
    .filter((b) => b.text || b.task || b.visions || b.subtext)
    .map((b, i) => [
      `### ${i + 1}. ${b.name}`,
      b.text && `> ${b.text.replace(/\n/g, '\n> ')}`,
      b.task && `- **Sarcina:** ${b.task}`,
      b.obstacle && `- **Obstacol:** ${b.obstacle}`,
      b.object && `- **Obiectul comunicării:** ${b.object}`,
      b.visions && `- **Viziuni interioare:** ${b.visions}`,
      b.subtext && `- **Subtext:** ${b.subtext}`,
      `- **Tempo-ritm interior:** ${b.tempo}/10`,
    ].filter(Boolean).join('\n'))
    .join('\n\n');
  const notes = Object.entries(r.exNotes)
    .flatMap(([ex, fields]) => Object.entries(fields).filter(([, v]) => v.trim()).map(([f, v]) => `- ${ex} · **${f}:** ${v.trim()}`))
    .join('\n');
  return `${head}\n\n` +
    block('Situațiile propuse', given) +
    block('„Dacă” magic', r.magicIf) +
    block('Supratema', r.supertask) +
    block('Acțiunea principală (transversală)', r.through) +
    block('Contra-acțiunea', r.counter) +
    block('Bucăți și sarcini', bits) +
    block('Perspectiva rolului', r.perspective) +
    block('Caracterizare (corp, mers, voce)', r.character) +
    block('Memoria emoțională', r.memory) +
    block('Înainte de scenă', r.preshow) +
    block('Din exerciții', notes);
}

export function journalMarkdown(entries: JournalEntry[]): string {
  const sorted = entries.slice().sort((a, b) => a.at - b.at);
  return '# Jurnal de scenă\n\n' + sorted.map((e) => {
    const d = new Date(e.at);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `## ${date} · ${e.title} (${e.exId})\n\n` + e.items.filter((i) => i.a.trim()).map((i) => `**${i.q}**\n\n${i.a.trim()}`).join('\n\n');
  }).join('\n\n') + '\n';
}
