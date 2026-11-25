// Test cap-coadă pentru Scena (Stanislavski), în Chromium headless, cu microfon simulat: voce 0,8 s, liniște 0,7 s, în buclă.
// Rulare: npm run build && node tests/e2e/scena.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { tmpdir } from 'node:os';

const DIST = new URL('../../dist/', import.meta.url).pathname;
const SHOTS = process.env.SHOTS_DIR ?? 'test-results';
mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.map': 'application/json' };

/** WAV mono: vorbire simulată (ton cu armonice) alternând cu liniște, ca să apară pauze în înregistrare. */
function speechWav(seconds = 30, sr = 48000) {
  const n = seconds * sr;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const on = t % 1.5 < 0.8;
    const v = on ? 0.35 * Math.sin(2 * Math.PI * 150 * t) + 0.12 * Math.sin(4 * Math.PI * 150 * t) : 0.0004 * Math.sin(2 * Math.PI * 50 * t);
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(DIST, p);
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const wavPath = join(tmpdir(), 'solfegius-vorbire.wav');
writeFileSync(wavPath, speechWav());

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wavPath}`, '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['microphone'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(`✔ ${name}`); } catch (e) { results.push(`✘ ${name}: ${e.message.split('\n')[0]}`); }
};
const selfCheckAll = async (answer = 'Da') => {
  await page.locator('.st-check').waitFor({ timeout: 8000 });
  const n = await page.locator('.st-check .chk').count();
  for (let i = 0; i < n; i++) await page.locator('.st-check .chk').nth(i).getByText(answer, { exact: true }).click();
  await page.getByText('Vezi rezultatul').click();
  await page.locator('.result .score').waitFor({ timeout: 5000 });
};

await step('azi: cardul Scenei, cele 7 abilități neatinse, tab-ul Scenă', async () => {
  await page.goto(base);
  await page.getByText('Scena · artistul liric').waitFor();
  const skills = await page.locator('.skill').count();
  if (skills !== 7) throw new Error(`sunt ${skills} abilități, nu 7`);
  const items = await page.locator('.st-home li').count();
  if (items !== 5) throw new Error(`toaleta are ${items} exerciții, nu 5`);
  if ((await page.locator('.tabbar a').count()) !== 4) throw new Error('bara de jos nu are 4 tab-uri');
  await page.locator('.st-home').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/s01-azi-scena.png` });
});

await step('hub: toaleta, uneltele și toate cele 29 de capitole', async () => {
  await page.goto(base + '#/scena');
  await page.getByText('Toaleta actorului').first().waitFor();
  const rows = await page.locator('.lesson-row').count();
  if (rows !== 29) throw new Error(`${rows} capitole, nu 29`);
  if ((await page.locator('.st-tool').count()) !== 6) throw new Error('lipsesc unelte');
  if (!(await page.locator('.tabbar a[data-tab="scena"].active').count())) throw new Error('tab-ul Scenă nu e activ');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/s02-hub.png` });
});

await step('capitolul III: 18 exerciții și conceptele', async () => {
  await page.goto(base + '#/scena/cap/1-III');
  const n = await page.locator('.ex-row').count();
  if (n !== 18) throw new Error(`${n} exerciții`);
  if (!(await page.locator('.theory details').count())) throw new Error('fără concepte');
  await page.screenshot({ path: `${SHOTS}/s03-capitol.png` });
});

await step('cronometru: fazele trec, apoi autoevaluare și rezultat; mod concentrat', async () => {
  await page.goto(base + '#/scena/ex/P1-VI-02');
  if (await page.locator('.tabbar').isVisible()) throw new Error('bara de jos e vizibilă în exercițiu');
  await page.getByText('▶ Pornește').click();
  await page.getByText('❚❚ Pauză').waitFor();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${SHOTS}/s04-cronometru.png` });
  for (let i = 0; i < 12 && !(await page.locator('.st-check').count()); i++) {
    await page.getByText('Faza următoare ›').click();
    await page.waitForTimeout(150);
  }
  await selfCheckAll('Da');
  const sc = await page.locator('.result .score').textContent();
  if (sc !== '100%') throw new Error(`scor ${sc}`);
});

await step('observație: privești, recunoști, culori, scor automat', async () => {
  await page.goto(base + '#/scena/ex/P1-V-09');
  await page.locator('.mem-cell').first().waitFor();
  const cells = await page.locator('.mem-cell').count();
  if (cells !== 9) throw new Error(`${cells} obiecte`);
  await page.screenshot({ path: `${SHOTS}/s05-observatie.png` });
  const seen = await page.locator('.mem-cell span').allTextContents();
  await page.getByText('Am reținut ›').click();
  for (const w of seen) await page.locator('.chip-btn', { hasText: new RegExp(`^${w}$`) }).click();
  await page.getByText('Mai departe ›').click();
  for (let i = 0; i < 3; i++) { await page.locator('.swatch-btn').first().click(); await page.waitForTimeout(100); }
  await page.locator('.result .score').waitFor({ timeout: 5000 });
  const txt = await page.locator('.result').textContent();
  if (!/9 din 9 obiecte recunoscute/.test(txt ?? '')) throw new Error(txt ?? '');
});

await step('tempo-ritm: bați pe metronom și primești scorul', async () => {
  await page.goto(base + '#/scena/ex/P2-VIII-04');
  await page.locator('input[type=range]').first().fill('120');
  await page.getByText('● Bate tu').click();
  await page.screenshot({ path: `${SHOTS}/s06-metronom.png` });
  for (let i = 0; i < 16; i++) { await page.waitForTimeout(500); await page.locator('.tap-pad').dispatchEvent('pointerdown'); }
  await page.locator('.result .score').waitFor({ timeout: 15000 });
  const txt = await page.locator('.result').textContent();
  if (!/bătăi la timp/.test(txt ?? '')) throw new Error(txt ?? '');
});

await step('voce: înregistrezi două duble, vezi pauzele și compari', async () => {
  await page.goto(base + '#/scena/ex/P2-V-05');
  for (let k = 0; k < 2; k++) {
    await page.getByText('● Înregistrează').click();
    await page.getByText('■ Stop').waitFor({ timeout: 8000 });
    await page.waitForTimeout(3600);
    await page.getByText('■ Stop').click();
    await page.locator('.take').nth(k).waitFor({ timeout: 8000 });
  }
  const t = await page.locator('.take').first().textContent();
  if (!/pauz/.test(t ?? '')) throw new Error(`fără pauze: ${t}`);
  if (!/Față de dubla dinainte/.test(t ?? '')) throw new Error('fără comparație');
  if (!(await page.locator('.take .segbar i.v').count())) throw new Error('bara de voce e goală');
  await page.screenshot({ path: `${SHOTS}/s07-voce.png`, fullPage: true });
  await page.getByText('Gata › Autoevaluare').click();
  await selfCheckAll('Parțial');
});

await step('text: pauzele și accentul lui Torțov pe „Revino!”', async () => {
  await page.goto(base + '#/scena/ex/P2-V-02');
  await page.locator('button.tok').nth(0).click();
  await page.locator('button.tok').nth(2).click();
  await page.getByText('Accent', { exact: true }).click();
  await page.locator('button.tok').nth(3).click();
  await page.getByText('✓ Verifică').click();
  await page.locator('.feedback', { hasText: 'Pauze: 2 din 2' }).waitFor({ timeout: 3000 });
  await page.screenshot({ path: `${SHOTS}/s08-text.png` });
  await page.getByText('Gata › Autoevaluare').click();
  await page.locator('.result .score').waitFor({ timeout: 5000 });
  const sc = await page.locator('.result .score').textContent();
  if (sc !== '100%') throw new Error(`scor ${sc}`);
});

await step('„dacă”: situații noi, improvizație cu cronometru', async () => {
  await page.goto(base + '#/scena/ex/P1-III-16');
  const before = await page.locator('.magic').textContent();
  for (let i = 0; i < 5; i++) await page.getByText('↻ Altă situație').click();
  if ((await page.locator('.magic').textContent()) === before) throw new Error('situația nu se schimbă');
  await page.getByText('▶ Improvizează').click();
  await page.locator('.st-ring').waitFor();
  await page.screenshot({ path: `${SHOTS}/s09-daca.png` });
  await page.getByText('Gata › Autoevaluare').click();
  await selfCheckAll('Da');
});

await step('jurnal: scrii, salvezi, apare în jurnal', async () => {
  await page.goto(base + '#/scena/ex/P1-IV-17');
  await page.locator('textarea').first().fill('Un stejar bătrân pe un deal, scoarța crăpată, vânt dinspre râu.');
  await page.getByText('Salvează în jurnal ›').click();
  await selfCheckAll('Da');
  await page.goto(base + '#/scena/jurnal');
  await page.getByText('Un stejar bătrân pe un deal').waitFor();
});

await step('partitura rolului: creezi, completezi, persistă, apare înainte de scenă', async () => {
  await page.goto(base + '#/scena/rol');
  await page.getByText('+ Rol nou').click();
  await page.locator('.fld', { hasText: 'Rolul' }).first().locator('input').fill('Tevye');
  await page.locator('.fld', { hasText: 'Supratema' }).locator('textarea').fill('Vreau să-mi păstrez credința și familia.');
  await page.locator('.bit .fld', { hasText: 'Sarcina' }).locator('textarea').fill('să-i cer socoteală lui Dumnezeu, cu umor');
  await page.reload();
  const v = await page.locator('.fld', { hasText: 'Rolul' }).first().locator('input').inputValue();
  if (v !== 'Tevye') throw new Error(`rol = ${v}`);
  await page.screenshot({ path: `${SHOTS}/s10-rol.png` });
  await page.goto(base + '#/scena/inainte');
  await page.locator('.st-rolecard', { hasText: 'Tevye' }).waitFor();
  await page.locator('.st-rolecard', { hasText: 'Vreau să-mi păstrez' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/s11-inainte.png` });
});

await step('fișe Stanislavski: răspuns și notare', async () => {
  await page.goto(base + '#/scena/fise/p1a');
  await page.getByText('Arată răspunsul').click();
  await page.getByText('Știam', { exact: true }).click();
  await page.locator('.card-q').waitFor();
  await page.screenshot({ path: `${SHOTS}/s12-fise.png` });
});

await step('texte din carte: lista și un text cu soluția', async () => {
  await page.goto(base + '#/scena/texte');
  const n = await page.locator('.lesson-row').count();
  if (n !== 112) throw new Error(`${n} texte`);
  await page.locator('.lesson-row').first().click();
  await page.locator('.st-sol summary').waitFor();
  await page.getByText('● Înregistrează').waitFor();
});

await step('catalog: căutare și filtru', async () => {
  await page.goto(base + '#/scena/catalog');
  if ((await page.locator('.ex-row').count()) !== 346) throw new Error('catalogul nu are 346');
  await page.locator('.st-search').fill('broș');
  const n = await page.locator('.ex-row').count();
  if (n < 2) throw new Error(`${n} rezultate pentru „broș”`);
});

await step('toaleta actorului: 5 exerciții la rând, până la final', async () => {
  await page.goto(base + '#/scena/toaleta');
  await page.getByText('Toaleta actorului · 1 / 5').waitFor();
  await page.screenshot({ path: `${SHOTS}/s13-toaleta.png` });
  for (let i = 0; i < 5; i++) await page.getByText('Sari ›').click();
  await page.getByText('Gata pe azi').waitFor();
});

await step('progres: exercițiile de scenă se numără, zilele rămân pe locul lor', async () => {
  await page.goto(base + '#/progres');
  await page.getByText('exerciții de scenă').waitFor();
  const days = await page.locator('.stat b').nth(1).textContent();
  if (days !== '1') throw new Error(`zile = ${days}`);
  const sc = await page.locator('.stat', { hasText: 'exerciții de scenă' }).locator('b').textContent();
  if (!/^[1-9]\d*\/346$/.test(sc ?? '')) throw new Error(`scenă = ${sc}`);
});

await browser.close();
server.close();
console.log(results.join('\n'));
if (errors.length) console.log('ERORI ÎN CONSOLĂ:\n' + errors.join('\n'));
const failed = results.some((r) => r.startsWith('✘')) || errors.length > 0;
process.exit(failed ? 1 : 0);
