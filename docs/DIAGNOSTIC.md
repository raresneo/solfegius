# Diagnostic pe exerciții (v0.2)

**Cum am verificat.** Am folosit aceeași detecție YIN ca aplicația, la 60 de cadre pe secundă, pe o voce sintetică realistă: bărbat (o octavă mai jos), portamento de 40 ms între note, vibrato de cântăreț și întârzierea căștilor Bluetooth. Logica veche a fost comparată cu cea nouă pe aceleași semnale; testele unitare noi (`tests/judge`, `tests/hold`, `tests/session`, `tests/rhythm`, `tests/onsets`) fixează comportamentul nou.

## Pe scurt

| Exercițiu | Blocaj găsit | Cauza | Reparat în |
|---|---|---|---|
| Citire | niciunul | | |
| Test | niciunul | | |
| Auz | pe iPhone, cu telefonul pe silențios, nu se aude nimic | Web Audio e sunet „ambiental” pe iOS și tace pe silențios ([WebKit 237322](https://bugs.webkit.org/show_bug.cgi?id=237322)) | `src/audio/audio.ts`: `navigator.audioSession.type = 'playback'` la fiecare redare |
| Dicteu | la fel: fără sunet pe silențios | la fel | la fel |
| Ritm | fără sunet pe silențios; bătăile date din reflex pe numărătoare erau „în plus” (75% la 4/4, deși ai bătut perfect) | penalizare de 0,5 pe fiecare bătaie în afara notelor | `src/lib/rhythm.ts`: bătăile de dinainte de prima notă nu se mai socotesc; timpul atingerii, nu al procesării |
| Intonație | cu vibrato de cântăreț nota nu se valida la ±35/±20, iar la ±100 de cenți nici la ±50 | mediana pe 5 cadre (~80 ms, o jumătate de oscilație) urmărea vibrato-ul | `src/lib/hold.ts`: centrul intonației pe 0,35 s |
| Intonație | „▶ Ascultă nota” cu microfonul pornit valida nota din difuzor | microfonul fără anulare de ecou aude pianul | microfonul ignoră nota de referință cât sună |
| Solfegiu | cu AirPods și vibrato, o interpretare corectă ieșea 0/15 note (30%) | ferestrele notelor la momentul teoretic + regula „45% din cadre la ±50 de cenți” | `src/lib/judge.ts`: aliniere după înălțime, nota judecată după centru (mediană), atacuri pe pista netezită |
| Solfegiu (invers) | cu 6 note din 15 false treceai cu 72% | ritmul (30%) acoperea notele false | sub 70% note corecte, scorul nu trece de intonație |
| Fișe | la un pachet nou nu treceai de 70% | scorul era „câte știai din prima”, iar repetiția spațiată îți aducea exact fișele grele | `src/lib/session.ts`: ce nu știai revine în aceeași sesiune |
| Antrenament | lista se schimba la jumătate, fără „Sari” | (reparat în commitul anterior) | `src/main.ts` |

## Cifre (vechi / nou)

**Intonație**: Do cântat de bărbat, timpul până la validare

| Vibrato | ±50 | ±35 | ±20 |
|---|---|---|---|
| fără | 0,52 s / 0,52 s | 0,52 s / 0,52 s | 0,52 s / 0,52 s |
| ±50 de cenți | 0,52 s / 0,52 s | 0,72 s / 0,55 s | **nu trece** / 0,58 s |
| ±80 de cenți | 0,97 s / 0,55 s | **nu trece** / 0,57 s | **nu trece** / 0,58 s |
| ±100 de cenți | **nu trece** / 0,57 s | **nu trece** / 0,58 s | **nu trece** / 0,62 s |

Ca verificare, un Do cântat constant cu 70 de cenți prea sus nu trece nici acum.

**Solfegiu**: interpretare corectă, note și ritm exacte

| Melodie | Condiții | Vechi | Nou |
|---|---|---|---|
| gama, lecția 1 (pătrimi, 60) | fără vibrato, fără latență | 15/15, 98% | 15/15, 100% |
| gama, lecția 1 | AirPods 200 ms + vibrato ±80 | **0/15, 30%** | 15/15, 100% (aliniat 190 ms) |
| optimi, lecția 3 (66) | AirPods 200 ms | 15/17, 90% | 17/17, 98% |
| optimi, lecția 3 | AirPods 200 ms + vibrato ±80 | **1/17, 34%** | 17/17, 98% (aliniat 210 ms) |

Ca verificare, gama cu Re, Fa și La cântate cu un semiton prea sus dă 9/15 note și **pică** (60%).

**Ritm**: bați corect, dar și pe numărătoare, cu AirPods (+220 ms, ±25 ms)

| | v0.1 | fixul anterior | acum |
|---|---|---|---|
| lecția 1, 2/4 | 0% | 88% | 100% |
| lecția 6, 4/4 | 0% | 75% | 100% |

**Fișe**: pachet nou, știi 40% din prima, iar după ce vezi răspunsul îl reții în 80% din cazuri. Înainte: 30%, pică. Acum: 10 din 10 știute la final, trece.

## Ce nu pot verifica de aici

- microfonul real al iPhone-ului (zgomot, distanță) și latența exactă a căștilor tale: se testează pe Preview
- `navigator.audioSession` există din Safari 16.4; pe iOS mai vechi, silențiosul rămâne o problemă
