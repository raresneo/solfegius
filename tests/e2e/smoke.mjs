// Test cap-coadă în Chromium headless: navigare, exerciții, microfon simulat cu un Do cântat (fișier WAV).
// Rulare: npm run build && npm run e2e   (cere `npx playwright install chromium` o dată)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { tmpdir } from 'node:os';

const DIST = new URL('../../dist/', import.meta.url).pathname;
const SHOTS = process.env.SHOTS_DIR ?? 'test-results';
mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.map': 'application/json' };

/** WAV mono 16-bit cu o voce sintetică pe frecvența dată. */
function wav(freq, seconds = 30, sr = 48000) {
  const n = seconds * sr;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const v = 0.4 * Math.sin(2 * Math.PI * freq * t) + 0.15 * Math.sin(4 * Math.PI * freq * t) + 0.05 * Math.sin(6 * Math.PI * freq * t);
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

const wavPath = join(tmpdir(), 'solfegius-do3.wav');
writeFileSync(wavPath, wav(130.81)); // Do3: o voce bărbătească pe „Do”

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

await step('acasă: capitole + lecția 1', async () => {
  await page.goto(base);
  await page.getByText('Capitolul A · I. Gama Do major').waitFor();
  await page.getByText('Scara gamei Do major · Măsura de 2/4').waitFor();
  await page.screenshot({ path: `${SHOTS}/01-acasa.png`, fullPage: false });
});

await step('lecția 1: teorie + exerciții', async () => {
  await page.goto(base + '#/lectie/l1');
  await page.getByText('a) Gama Do major').waitFor();
  const n = await page.locator('.ex-row').count();
  if (n !== 6) throw new Error(`sunt ${n} exerciții, nu 6`);
  await page.screenshot({ path: `${SHOTS}/02-lectie1.png` });
});

await step('citire note: 10 întrebări până la rezultat', async () => {
  await page.goto(base + '#/ex/l1/citire');
  await page.locator('.ex-notes svg').waitFor();
  await page.screenshot({ path: `${SHOTS}/03-citire.png` });
  for (let i = 0; i < 10; i++) {
    await page.locator('.choice').first().click();
    await page.waitForTimeout(1600);
  }
  await page.locator('.result .score').waitFor({ timeout: 5000 });
});

await step('dicteu: completezi notele, verifici, primești corectura', async () => {
  await page.goto(base + '#/ex/l1/dicteu');
  await page.locator('.ex-dict svg').waitFor();
  for (let i = 0; i < 3; i++) await page.locator('.ex-dict .choice').first().click();
  await page.getByText('⌫ Șterge').click();
  await page.getByText('✓ Verifică').click();
  await page.locator('.ex-dict .feedback', { hasText: 'note corecte' }).waitFor({ timeout: 5000 });
  await page.screenshot({ path: `${SHOTS}/03b-dicteu.png` });
  await page.getByText('Gata', { exact: true }).click();
  await page.locator('.result .score').waitFor({ timeout: 5000 });
});

await step('intonație: Do cântat la microfon (o octavă mai jos) e acceptat', async () => {
  await page.goto(base + '#/ex/m0-4/do');
  await page.getByText('Pornește microfonul').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/04-intonatie.png` });
  await page.locator('.result .score').waitFor({ timeout: 12000 });
  const score = await page.locator('.result .score').textContent();
  if (score !== '100%') throw new Error(`scor ${score}`);
});

await step('intonație: Sol cântat ca Do e respins', async () => {
  await page.goto(base + '#/ex/m0-4/do-sol');
  await page.getByText('Pornește microfonul').click();
  await page.waitForTimeout(2500);
  const fb = await page.locator('.tuner-text').textContent();
  // primul e Do (trece), al doilea e Mi: Do-ul nostru trebuie să apară „prea jos”
  if (!/prea jos|prea sus|ține-o/.test(fb ?? '')) throw new Error(`acordor: ${fb}`);
  await page.waitForTimeout(1500);
  const done = await page.locator('.result').count();
  if (done) throw new Error('a acceptat Mi cântat ca Do');
});

await step('ritm: tap-uri și evaluare', async () => {
  await page.goto(base + '#/ex/l2/ritm');
  await page.locator('.ex-rhythm svg').waitFor();
  await page.screenshot({ path: `${SHOTS}/05-ritm.png` });
  await page.getByText('● Bate tu').click();
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(700); await page.locator('.tap-pad').dispatchEvent('pointerdown'); }
  await page.locator('.feedback', { hasText: 'bătăi la timp' }).waitFor({ timeout: 15000 });
});

await step('solfegiul 1 din carte: cântat cu microfonul, notă cu notă', async () => {
  await page.goto(base + '#/ex/l2/s1');
  await page.locator('.ex-sol svg').waitFor();
  await page.screenshot({ path: `${SHOTS}/06-solfegiu.png` });
  await page.locator('input[type=range]').fill('120');
  await page.getByText('🎙 Cântă').click();
  await page.locator('.feedback', { hasText: 'note intonate corect' }).waitFor({ timeout: 20000 });
  const fb = await page.locator('.feedback').textContent();
  // melodia are 3 Do (Do, Do sus, Do final): exact acelea trebuie să iasă verzi
  if (!/^3\/15/.test(fb ?? '')) throw new Error(fb);
  await page.screenshot({ path: `${SHOTS}/07-solfegiu-evaluat.png` });
});

await step('Mozart: optimi legate cu bare, randare', async () => {
  await page.goto(base + '#/ex/l3/mozart');
  await page.locator('.ex-sol svg').waitFor();
  await page.screenshot({ path: `${SHOTS}/08-mozart.png`, fullPage: true });
});

await step('fișe armonie: arată răspuns + notare', async () => {
  await page.goto(base + '#/ex/arm4/fise');
  await page.getByText('Arată răspunsul').click();
  await page.getByText('Știam', { exact: true }).click();
  await page.locator('.card-q').waitFor();
  await page.screenshot({ path: `${SHOTS}/09-fise.png` });
});

await step('progresul persistă după reîncărcare', async () => {
  await page.goto(base + '#/progres');
  await page.reload();
  const days = await page.locator('.stat b').nth(1).textContent();
  if (days !== '1') throw new Error(`zile = ${days}`);
});

await step('antrenamentul de azi pornește', async () => {
  await page.goto(base + '#/antrenament');
  await page.getByText('Antrenament · 1 /').waitFor();
});

await browser.close();
server.close();
console.log(results.join('\n'));
if (errors.length) console.log('ERORI ÎN CONSOLĂ:\n' + errors.join('\n'));
const failed = results.some((r) => r.startsWith('✘')) || errors.length > 0;
process.exit(failed ? 1 : 0);
