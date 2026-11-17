// Build: TypeScript -> un singur app.js (esbuild), plus fișierele statice. Ieșire în dist/.
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'esm',
  target: ['es2020', 'safari15'],
  minify: true,
  sourcemap: true,
  outfile: 'dist/app.js',
  logLevel: 'info',
});
cpSync('public', 'dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
const hash = createHash('sha1').update(readFileSync('dist/app.js')).update(readFileSync('dist/styles.css')).digest('hex').slice(0, 10);
writeFileSync('dist/sw.js', readFileSync('dist/sw.js', 'utf8').replace('__VERSION__', hash));
console.log(`dist/ gata · versiune ${hash}`);
