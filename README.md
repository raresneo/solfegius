# Solfegius

Solfegiu de la zero, interactiv. Urmează **„Solfegiu pentru toți”, vol. I** (Rîpă, Nedelcuț) lecție cu lecție și adaugă ce îi lipsește unei cărți: feedback pe intonație la microfon, ritm verificat, auz funcțional, solfegii generate pe lecție și repetiție spațiată.

Merge pe iPhone ca aplicație (Safari → Partajează → Adaugă pe ecranul principal) și offline după prima deschidere. Progresul rămâne pe dispozitiv.

## Ce poți face (v0.1)

- **Modulul 0 · Bazele**: portativ, cheia sol, durate, ton/semiton, acordajul vocii
- **Lecțiile 1–6**: gama Do major, arpegiul, sensibila, treptele II, VI, IV · 2/4 cu pătrimi, doimi, optimi, pauze, pătrime cu punct · 4/4
- **Exerciții**: citire de note, recunoașterea treptelor după cadență, intonație cu acordor, ritm bătut pe ecran, solfegii (din carte + generate) cântate cu evaluare notă cu notă
- **Teorie pentru facultate**: fișe Armonie I–IV și Forme, cu repetiție spațiată
- **Antrenamentul de azi**: 15–20 de minute, lecția curentă + recapitulare

Detalii despre surse, ce lipsea și ce urmează: [docs/CURRICULUM.md](docs/CURRICULUM.md).

## Tehnic

TypeScript, zero dependențe la rulare (sunet cu Web Audio, portativ în SVG desenat de mână, detecție de înălțime YIN). Build cu esbuild în `dist/`.

```bash
npm install
npm run check      # tsc + teste unitare + build
npm run e2e        # test în Chromium cu microfon simulat (după: npx playwright install chromium)
npx serve dist     # sau orice server static
```

Structură: `src/lib` (teorie, notație, ritm, generator, pitch, SRS, portativ: logică pură, testată), `src/audio` (sinteză, metronom, microfon), `src/data` (lecții, solfegii transcrise, fișe), `src/ui` (ecrane și exerciții).

**Deploy (Vercel):** framework „Other”, build `npm run build`, output `dist` (setat în `vercel.json`).

**Microfon pe iPhone:** cere HTTPS. Cu microfonul pornit, iOS poate coborî volumul difuzorului; cu căști merge cel mai bine.
