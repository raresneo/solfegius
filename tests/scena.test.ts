import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS, CONCEPT_DECKS, EXERCISES, ST_CHAPTERS, TEXTS, deckConcepts, exById, exercisesOf } from '../src/scena/catalog.ts';
import { checksFor, chapterProgress, nextInChapter, planRoutine, preshowPlan, ROUTINE, scKey, selfScore, soloFriendly } from '../src/scena/plan.ts';
import { gradeTaps, LAYERS, modernBpm, patternTimes, SUBDIVISIONS, TAP_PATTERNS } from '../src/scena/taps.ts';
import { describeTake, segment, takeStats } from '../src/scena/pauses.ts';
import type { EnvPoint } from '../src/scena/pauses.ts';
import { findWords, gradeMarks, norm, referenceMarks, tokenize } from '../src/scena/marking.ts';
import { gradeMemory, itemsFor, memoryRound } from '../src/scena/memory.ts';
import { magicIf, situation } from '../src/scena/situations.ts';
import { journalMarkdown, roleMarkdown } from '../src/scena/export.ts';
import { newRole } from '../src/scena/store.ts';

test('catalog: toate cele 346 de exerciții, cu id-uri unice și capitole existente', () => {
  assert.equal(EXERCISES.length, 346);
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
  const keys = new Set(ST_CHAPTERS.map((c) => c.key));
  for (const e of EXERCISES) {
    assert.ok(keys.has(e.ch), `${e.id}: capitol ${e.ch}`);
    assert.ok(e.page >= 1 && e.page <= 451, `${e.id}: pagina ${e.page}`);
    assert.ok(e.title && e.summary, e.id);
    if (e.variantOf) assert.ok(exById(e.variantOf), `${e.id} e variantă a lui ${e.variantOf}, care lipsește`);
  }
  assert.equal(ST_CHAPTERS.reduce((a, c) => a + exercisesOf(c.key).length, 0), 346);
});

test('catalog: parametrii fiecărui tip de exercițiu sunt utilizabili', () => {
  for (const e of EXERCISES) {
    const p = e.params;
    if (e.mode === 'timer' || e.mode === 'movement') assert.ok(p.ph?.length && p.ph.every(([l, s]) => l && s > 0), e.id);
    if (e.mode === 'record') assert.ok(p.tx, e.id);
    if (e.mode === 'marking') assert.ok(p.tx && p.ref, e.id);
    if (e.mode === 'circles') assert.ok(p.ci?.length, e.id);
    if (e.mode === 'memory') assert.ok((p.sh ?? 0) > 0, e.id);
    assert.ok(checksFor(e).length >= 2, `${e.id}: autoevaluare`);
  }
});

test('catalog: concepte și texte, cu fișe pe fiecare pachet', () => {
  assert.equal(CONCEPTS.length, 199);
  assert.equal(new Set(CONCEPTS.map((c) => c.id)).size, CONCEPTS.length);
  assert.equal(TEXTS.length, 112);
  const inDecks = CONCEPT_DECKS.reduce((a, d) => a + deckConcepts(d.id).length, 0);
  assert.equal(inDecks, CONCEPTS.length);
  for (const d of CONCEPT_DECKS) assert.ok(deckConcepts(d.id).length >= 10, d.id);
});

test('antrenament zilnic: câte unul pe grupă, în ordinea cărții, doar ce poți face singur', () => {
  const plan = planRoutine({}, {});
  assert.equal(plan.length, ROUTINE.length);
  assert.deepEqual(plan.map((e) => e.group), ROUTINE.map((r) => r.group));
  assert.ok(plan.every((e) => soloFriendly(e)));
  const best: Record<string, number> = { [scKey(plan[0].id)]: 1 };
  const next = planRoutine(best, {});
  assert.notEqual(next[0].id, plan[0].id);
  assert.equal(next[1].id, plan[1].id);
});

const plan0 = () => planRoutine({}, {});

test('antrenament zilnic: după ce le treci pe toate, revine cel făcut cel mai demult', () => {
  const best: Record<string, number> = {};
  const seen: Record<string, number> = {};
  const corp = EXERCISES.filter((e) => e.group === 'corp' && soloFriendly(e));
  assert.ok(!plan0().some((e) => e.ch === '1-I' || e.ch === '1-II'), 'diletantismul nu intră în antrenament');
  assert.equal(plan0()[2].ch, '2-V', 'vocea pornește de la „Dicțiunea și canto”');
  corp.forEach((e, i) => {
    best[scKey(e.id)] = 1;
    seen[e.id] = 1000 + i;
  });
  seen[corp[3].id] = 1;
  assert.equal(planRoutine(best, seen)[0].id, corp[3].id);
});

test('înainte de scenă, progres pe capitol, următorul exercițiu, autoevaluare', () => {
  assert.equal(preshowPlan().length, 4);
  const first = exercisesOf('1-III')[0];
  assert.deepEqual(chapterProgress({ [scKey(first.id)]: 0.8 }, '1-III'), { done: 1, total: 18 });
  assert.equal(nextInChapter(first)?.id, exercisesOf('1-III')[1].id);
  assert.equal(selfScore([1, 0.5, 0, null]), 0.5);
  assert.equal(selfScore([]), 0);
});

test('bătăi: perfect, cu întârziere constantă de căști, greșit și cu bătăi în plus', () => {
  const targets = patternTimes([0, 2], 4, 4, 60, 2);
  assert.deepEqual(targets.slice(0, 3), [2, 4, 6]);
  assert.equal(gradeTaps(targets, targets).score, 1);
  const late = gradeTaps(targets, targets.map((t) => t + 0.2));
  assert.equal(late.hits, targets.length);
  assert.ok(Math.abs(late.offset - 0.2) < 1e-9);
  const random = gradeTaps(targets, targets.map((t, i) => t + (i % 2 ? 0.45 : -0.35)));
  assert.ok(random.score < 0.5, `scor ${random.score}`);
  const extra = gradeTaps(targets, [...targets, ...targets.map((t) => t + 1)]);
  assert.equal(extra.hits, targets.length);
  // ultima bătaie în plus cade după final, nu se mai numără
  assert.equal(extra.extra, targets.length - 1);
  assert.ok(extra.score < 0.6, String(extra.score));
  assert.equal(gradeTaps([], [1]).score, 0);
});

test('tempo-ritm: tiparele din carte trimit la exerciții reale și încap în măsură', () => {
  for (const [id, p] of Object.entries(TAP_PATTERNS)) {
    assert.equal(exById(id)?.mode, 'metronome', id);
    assert.ok(p.beats.every((b) => b >= 0 && b < p.meter), id);
  }
  for (const id of [...Object.keys(SUBDIVISIONS), ...Object.keys(LAYERS)]) assert.ok(exById(id), id);
  assert.equal(modernBpm(10), 40);
  assert.equal(modernBpm(null), 60);
  assert.equal(modernBpm(200), 200);
});

const env = (pattern: [number, number][]): EnvPoint[] => {
  // [durată, rms] pe bucăți, la 30 de cadre pe secundă
  const out: EnvPoint[] = [];
  let t = 0;
  for (const [dur, rms] of pattern) for (let i = 0; i < Math.round(dur * 30); i++, t += 1 / 30) out.push({ t, rms });
  return out;
};

test('voce: găsește pauzele din interior, nu și liniștea de la capete', () => {
  const s = takeStats(env([[0.5, 0.001], [1, 0.1], [0.6, 0.002], [1, 0.12], [1.2, 0.001], [0.8, 0.09], [0.4, 0.001]]));
  assert.equal(s.pauses.length, 2);
  assert.ok(Math.abs(s.pauses[0] - 0.6) < 0.08, String(s.pauses[0]));
  assert.ok(Math.abs(s.longest - 1.2) < 0.08, String(s.longest));
  assert.ok(s.level > -25 && s.level < -15, String(s.level));
  assert.match(describeTake(s), /2 pauze/);
});

test('voce: respirațiile scurte dintre silabe nu sunt pauze; liniștea totală e semnalată', () => {
  const s = takeStats(env([[1, 0.1], [0.1, 0.001], [1, 0.1]]));
  assert.equal(s.pauses.length, 0);
  assert.equal(segment(env([[0.5, 0.1]])).length, 1);
  assert.match(describeTake(takeStats(env([[2, 0.0001]]))), /Nu s-a auzit/);
});

test('marcare: soluția lui Torțov pe „Revino! Nu pot trăi fără tine!”', () => {
  const tokens = tokenize('Re-vi-no! Nu pot trăi fără tine!');
  assert.equal(norm('Re-vi-no!'), 'revino');
  const ref = referenceMarks(tokens, { p: ['Re-vi-no!', 'pot'], a: ['trăi'] });
  assert.deepEqual(ref, { pauses: [0, 2], accents: [3] });
  assert.equal(gradeMarks(ref, ref).score, 1);
  const half = gradeMarks({ pauses: [0], accents: [4] }, ref);
  assert.ok(half.score > 0.3 && half.score < 0.4, String(half.score));
  assert.deepEqual(findWords(tokenize('omul bun, omul rău'), ['omul rău']), [3]);
  assert.equal(gradeMarks({ pauses: [], accents: [] }, { pauses: [], accents: [] }).comparable, false);
});

test('observație: aceeași rundă pentru același seed, scor pe recunoaștere și culori', () => {
  const r = memoryRound(7, itemsFor(30));
  assert.equal(r.items.length, 9);
  assert.equal(r.options.length, 18);
  assert.deepEqual(memoryRound(7, 9), r);
  const all = gradeMemory(r, r.items.map((i) => i.word), r.colorQs.map((q) => q.answer));
  assert.equal(all.score, 1);
  const wrong = gradeMemory(r, r.options, []);
  assert.equal(wrong.hits, 9);
  assert.equal(wrong.falseAlarms, 9);
  assert.ok(wrong.score < 0.01);
});

test('„dacă”: situații complete și reproductibile', () => {
  const s = situation(3);
  assert.deepEqual(situation(3), s);
  assert.ok(Object.values(s).every((v) => v.length > 2));
  assert.match(magicIf(s), /^Dacă ai fi .+ Ce faci\?$/);
});

test('export Markdown: rolul și jurnalul', () => {
  const r = newRole('x', 0);
  r.title = 'Tevye';
  r.work = 'Fiddler on the Roof';
  r.supertask = 'Vreau să-mi păstrez credința și familia.';
  r.given.unde = 'în curte, seara';
  r.bits[0].task = 'să-i cer socoteală lui Dumnezeu, cu umor';
  const md = roleMarkdown(r);
  assert.match(md, /^# Tevye · Fiddler on the Roof/);
  assert.match(md, /## Supratema\n\nVreau să-mi păstrez/);
  assert.match(md, /\*\*Unde sunt\?\*\* în curte, seara/);
  assert.match(md, /\*\*Sarcina:\*\* să-i cer socoteală/);
  assert.doesNotMatch(md, /Contra-acțiunea/);
  const j = journalMarkdown([{ id: '1', exId: 'P1-IV-17', title: 'Viața unui stejar', at: new Date(2026, 10, 25).getTime(), items: [{ q: 'Ce vezi?', a: 'Un stejar bătrân.' }] }]);
  assert.match(j, /## 2026-11-25 · Viața unui stejar \(P1-IV-17\)\n\n\*\*Ce vezi\?\*\*\n\nUn stejar bătrân\./);
});
