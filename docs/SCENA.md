# Scena · pregătirea artistului liric după Stanislavski

Sursa: K. S. Stanislavski, **„Munca actorului cu sine însuși”** (ediția românească, PDF de 451 de pagini), ambele părți: *trăirea* și *întruchiparea*.
Toate exercițiile din carte sunt în aplicație, capitol cu capitol, cu **pagina din PDF** de unde vin: **346 de exerciții, 199 de concepte, 112 texte**.

## Cum au fost extrase

Cartea a fost citită integral, capitol cu capitol. Fiecare exercițiu, studiu, joc, improvizație sau experiment pe care Torțov și Rahmanov îl fac cu elevii a devenit o fișă: rezumatul fidel, pașii, durata, de ce ai nevoie (singur, partener, grup, scenă), cum îl aplici la operă și întrebările de autoevaluare. Variantele („acum același lucru, dar...”) sunt fișe separate, legate de exercițiul de bază. Citatele au fost verificate automat față de textul cărții.

Datele sunt în `src/data/scena/` (un tuplu pe exercițiu, format descris în `types.ts`).

## Ce face aplicația cu fiecare exercițiu

| Mod | Exerciții | Ce face aplicația |
|---|---:|---|
| Cronometru | 37 | Faze cronometrate, semnal jos la trecere (nu „ding”), ecranul rămâne aprins |
| Mișcare | 25 | La fel, pe fazele mișcării (mers, plastică, energia prin corp) |
| Atenție | 14 | Cercurile atenției desenate, de la punct la cercul mare, fiecare cu timpul lui |
| Observație | 9 | Joc pe ecran cu scor automat (obiecte + culori) sau observație „în jurul tău” scrisă în jurnal |
| Tempo-ritm | 37 | Metronom 20–220, timpi, subdiviziuni până la 24, **mai multe metronoame deodată** ca la Torțov; la 11 tipare din carte îți notează bătăile și scade întârzierea constantă a căștilor |
| Voce | 38 | Înregistrezi „duble” cu variantele cerute, te asculți, vezi pauzele (câte, cât de lungi), nivelul în dB și diferența față de dubla dinainte |
| Text | 17 | Marchezi pauze logice (\|), psihologice (‖) și accente; compară cu soluția lui Torțov unde cartea o dă, apoi rostești cu marcajele tale |
| „Dacă” | 41 | Situații propuse (cine, unde, când, ce s-a întâmplat, ce vrei, ce te oprește) + exemplele din carte, cu cronometru de improvizație |
| Acțiune | 58 | Acțiuni fizice (și cu obiecte imaginare), cronometru și punctele de control |
| Jurnal | 38 | Viziuni interioare, memorie emoțională, biografia rolului; se salvează în jurnal, export .md |
| Rol | 26 | Notițe pe rolul activ, legate de partitura rolului |
| Fișă | 6 | Fișa și notițele tale |

**Fezabilitate:** 5 exerciții le verifică aplicația complet, 238 le ghidează (tu te autoevaluezi pe criteriile din carte), **103 cer partener, grup sau scenă**: pentru ele aplicația dă fișa și partea pe care o poți pregăti singur, iar după repetiție revii pentru autoevaluare.

## Ecrane

- **Scena** (tab nou): toaleta actorului, uneltele, progresul, cele 29 de capitole.
- **Toaleta actorului** (~15 min): câte un exercițiu din corp, atenție, voce, tempo-ritm și imaginație, în ordinea „ritualului de cincisprezece minute” din carte. Fiecare zi ia următoarele exerciții netrecute, deci parcurge toată cartea. Capitolele I–II (greșelile elevului) nu intră.
- **Înainte de scenă**: controlorul mușchilor, cercul mic, toaleta sufletului, tempo-ritmul din cabină, cu supratema și prima sarcină din rolul activ.
- **Partitura rolului**: situațiile propuse, „dacă”, supratema, acțiunea principală și contra-acțiunea, bucăți cu sarcină, obstacol, obiectul comunicării, viziuni, subtext și tempo-ritm interior, perspectiva, caracterizarea, memoria emoțională. Export Markdown (Obsidian).
- **Fișe**: cele 199 de concepte în 5 pachete, cu repetiție spațiată.
- **Texte din carte**: frazele, versurile și situațiile pe care lucrează Torțov, cu soluția lui, de rostit și înregistrat.
- **Jurnal** și **Catalog** (căutare + filtre).

Progresul intră în seria de zile și în ecranul Progres. Totul rămâne pe telefon.

## Teste

- `tests/scena.test.ts`: catalogul complet, antrenamentul zilnic, bătăile (inclusiv întârzierea AirPods), pauzele din voce, marcarea textului, observația, situațiile, exportul.
- `tests/e2e/scena.mjs`: fiecare ecran cap-coadă în Chromium, cu microfon simulat (voce 0,8 s, liniște 0,7 s).
