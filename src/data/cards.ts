// Fișe întrebare/răspuns extrase din rezumatele modulelor de Armonie I–IV (AMGD Cluj, ID)
// și din „Gen, opus, formă” (2007). Exemplele muzicale din module sunt imagini și vor fi transcrise separat.

export interface Card {
  id: string;
  q: string;
  a: string;
}

export const DECKS: Record<string, { title: string; source: string; cards: Card[] }> = {
  arm1: {
    title: 'Armonie I · Trisonul major',
    source: 'E. Terényi, G. Coca, Armonie, Modulul I',
    cards: [
      { id: 'a1-1', q: 'Cum se completează trisonul major la 4 voci?', a: 'Prin dublarea fundamentalei.' },
      { id: 'a1-2', q: 'Distribuția largă', a: 'Distanță mare între vocile învecinate: între ele se mai poate intercala cel puțin un sunet al acordului.' },
      { id: 'a1-3', q: 'Distribuția strânsă', a: 'Cele trei voci superioare sunt atât de apropiate încât nu mai încape alt sunet al acordului între ele.' },
      { id: 'a1-4', q: 'Distribuția mixtă', a: 'Combinația dintre distribuția largă și cea strânsă.' },
      { id: 'a1-5', q: 'După ce se stabilește poziția unui acord în stare directă?', a: 'După sunetul din sopran: poziția octavei (fundamentala dublată), a terței sau a cvintei.' },
      { id: 'a1-6', q: 'Cifrajul acordului major în stare directă', a: '5/3.' },
      { id: 'a1-7', q: 'Funcțiile treptelor I, IV, V', a: 'I = Tonică (T), IV = Subdominantă (S), V = Dominantă (D).' },
      { id: 'a1-8', q: 'Cadența autentică / plagală / autentică compusă', a: 'Autentică: I–V–I. Plagală: I–IV–I. Autentică compusă: I–IV–V–I.' },
      { id: 'a1-9', q: 'Stare directă, răsturnarea I, răsturnarea a II-a', a: 'Stare directă: fundamentala în bas. Răsturnarea I (sextacord): terța în bas. Răsturnarea a II-a (cvartsextacord): cvinta în bas.' },
      { id: 'a1-10', q: 'Cele patru tipuri de cvartsextacord', a: 'De arpegiu, de pasaj, de schimb, de întârziere (cadențial).' },
      { id: 'a1-11', q: 'Cele patru tipuri de note melodice', a: 'Nota de schimb, nota de pasaj, întârzierea, anticipația.' },
    ],
  },
  arm2: {
    title: 'Armonie II · Acordul minor, septima de dominantă',
    source: 'E. Terényi, Armonie, Modulul II',
    cards: [
      { id: 'a2-1', q: 'În sfera cărei funcții se află treptele II, III, VI, VII?', a: 'II → Subdominantă. III → Dominantă. VI → Tonică. VII → Dominantă.' },
      { id: 'a2-2', q: 'Cum se înlănțuie acordurile treptelor secundare?', a: 'După aceleași legi ca treptele principale, respectând funcționalitatea lor.' },
      { id: 'a2-3', q: 'Cum se formează acordul de septimă de dominantă?', a: 'Adaugi o terță peste trisonul treptei a V-a: un acord de 4 sunete.' },
      { id: 'a2-4', q: 'Intervalele caracteristice ale lui D7', a: 'Septima mică și cvarta mărită (tritonul): de aici caracterul disonant, care cere rezolvare.' },
      { id: 'a2-5', q: 'Rezolvarea lui D7 pe I', a: 'Septima coboară treptat la terța tonicii, sensibila urcă la tonică, basul sare la fundamentala lui I, cvinta coboară la fundamentala lui I.' },
      { id: 'a2-6', q: 'Răsturnările acordului de septimă', a: 'I: cvintsextacord (6/5). II: terțcvartacord (4/3). III: secundacord (2).' },
      { id: 'a2-7', q: 'Pe ce acorduri poate apărea septima?', a: 'Pe toate tipurile de acord cunoscute.' },
    ],
  },
  arm3: {
    title: 'Armonie III · Modulația diatonică, armonia cromatică',
    source: 'E. Terényi, Armonie, Modulul III',
    cards: [
      { id: 'a3-1', q: 'Ce este modulația?', a: 'Trecerea dintr-o tonalitate în alta.' },
      { id: 'a3-2', q: 'Pe ce se bazează modulația diatonică?', a: 'Pe polisemia acordurilor: același acord aparține mai multor tonalități, cu funcții diferite (acordul comun).' },
      { id: 'a3-3', q: 'În ce tonalități se găsește acordul Do–Mi–Sol?', a: 'Do major, Sol major, sol minor melodic, Fa major, fa minor, mi minor.' },
      { id: 'a3-4', q: 'Cei trei pași ai unei modulații', a: '1. Fixezi tonalitatea inițială printr-o cadență. 2. Treci prin acordul comun (transferul funcțional). 3. Fixezi noua tonalitate printr-o cadență.' },
      { id: 'a3-5', q: 'Ce este un cromatism?', a: 'Orice sunet străin de tonalitate.' },
      { id: 'a3-6', q: 'Ce poate genera un cromatism?', a: 'Un acord alterat fără părăsirea tonalității, o notă melodică cromatică, sau un acord alterat care produce modulație cromatică.' },
      { id: 'a3-7', q: 'Cum se produce modulația cromatică?', a: 'Brusc, fără acord comun.' },
    ],
  },
  arm4: {
    title: 'Armonie IV · Dominante secundare, modulația enarmonică',
    source: 'C. Pop, Armonie, Modulul IV',
    cards: [
      { id: 'a4-1', q: 'Ce este o dominantă?', a: 'Un acord instabil care se rezolvă pe un acord stabil (acordul țintă). Conține o sensibilă (inferioară, superioară sau ambele) spre acordul de rezolvare.' },
      { id: 'a4-2', q: 'Dominante principale vs. secundare', a: 'Principale: se rezolvă pe treapta I. Secundare: se rezolvă pe alte trepte.' },
      { id: 'a4-3', q: 'Dominanta secundară de tip 1', a: 'Acord major, cu sau fără septimă mică, construit pe cvinta inferioară a fundamentalei acordului țintă.' },
      { id: 'a4-4', q: 'Dominanta secundară de tip 2', a: 'Acord micșorat, cu sau fără septimă micșorată, pe sensibila fundamentalei țintei. Sensibila nu se dublează; se evită răsturnarea a III-a.' },
      { id: 'a4-5', q: 'Dominanta de tip 3 (contradominanta)', a: 'Tip 1 sau 2 care conține și sensibila superioară a fundamentalei țintei, plasată în bas. Se rezolvă de obicei pe V. Variante: IV6 (sexta italiană), IV6/5 (germană), II4/3 (franceză). Frecventă în minor.' },
      { id: 'a4-6', q: 'Dominanta de tip 4', a: 'Tip 1 sau 2 care conține și sensibila terței acordului țintă. Doar în major, ținte I și IV. Se evită sensibilele la interval de terță micșorată.' },
      { id: 'a4-7', q: 'Nota moll-dur', a: 'Treapta a VI-a coborâtă, doar în major. Tendință de rezolvare descendentă. Apare în acordurile treptelor II, IV, VI, VII și în V9.' },
      { id: 'a4-8', q: 'Sexta napolitană', a: 'Treapta a II-a în sextacord, cu fundamentala coborâtă (în minor) sau fundamentala și cvinta coborâte (în major), cu terța dublată. Funcție de subdominantă, urmată de obicei de dominantă.' },
      { id: 'a4-9', q: 'Cum se rezolvă fundamentala sextei napolitane?', a: 'Coborâtor, de regulă pe o terță micșorată. Acordul se introduce fără mișcări cromatice.' },
      { id: 'a4-10', q: 'Cele trei feluri de modulație', a: 'Diatonică, cromatică, enarmonică.' },
      { id: 'a4-11', q: 'Modulația enarmonică', a: 'Enarmonizezi unul sau mai multe sunete ale unui acord și îl reinterpretezi în tonalitatea țintă (ex. dominanta de tip 2 reinterpretată ca dominantă a noii tonalități).' },
      { id: 'a4-12', q: 'Notele melodice cromatice', a: 'Întârzierea cromatică (de obicei inferioară), schimbul cromatic (doar inferior), pasajul cromatic (ascendent).' },
      { id: 'a4-13', q: 'Modulația cromatică: reguli', a: 'Două acorduri: primul în tonalitatea inițială, al doilea în cea țintă (de preferat cu funcție de dominantă). Între ele, unul sau mai multe semitonuri cromatice, de preferat la o singură voce. Se evită ca ambele să fie trisonuri consonante în stare directă.' },
    ],
  },
  forme: {
    title: 'Genuri și forme muzicale',
    source: 'Gen, opus, formă (2007)',
    cards: [
      { id: 'f-1', q: 'Ce reținem din definiția formei muzicale?', a: 'E un mod de organizare a evenimentelor sonore pe principii de construcție (repetiție, variație, contrast); e un proces cu segmente (strofe) cu număr, loc și funcție precise; se raportează la tipare arhitectonice fără să se confunde cu ele.' },
      { id: 'f-2', q: 'Criteriile după care se diferențiază formele', a: 'Numărul strofelor, funcția lor (introductivă, expozitivă, mediană, reexpozitivă, concluzivă), modul de îmbinare (repetare, alternanță, simetrie, variație, contrast) și tipul de discurs.' },
      { id: 'f-3', q: 'Monodie, omofonie, polifonie, heterofonie', a: 'Monodie: o singură voce, melodia e totul. Omofonie: cântare armonică la mai multe voci. Polifonie: linii melodice suprapuse, relativ independente. Heterofonie: abateri periodice ale vocilor de la unison (specifică muzicii populare românești, Enescu, Bartók).' },
      { id: 'f-4', q: 'Motetul', a: 'Gen religios vocal, a cappella sau acompaniat, polifonic imitativ (2–5 voci); a dus la apariția fugii. Caracteristic Renașterii.' },
      { id: 'f-5', q: 'Madrigalul', a: 'Replica laică a motetului, gen vocal-coral; de la polifonie spre omofonie și monodie acompaniată (Monteverdi); a contribuit la nașterea operei.' },
      { id: 'f-6', q: 'Dansurile de bază ale suitei baroce', a: 'Allemanda (germană, binară, cu anacruză), couranta (franceză, rapidă, ternară), sarabanda (spaniolă, lentă, ternară), giga (engleză, rapidă, 3/8 sau 6/8).' },
      { id: 'f-7', q: 'Sonata da chiesa vs. da camera', a: 'Da chiesa („de biserică”): 4 părți, din canzona, cu fugato. Da camera („de cameră”): succesiune de dansuri, apropiată de suită.' },
      { id: 'f-8', q: 'Ciclul concertului clasic (Mozart)', a: 'I Allegro (sonată cu dublă expoziție), II Andante (lied, sonată fără tratare sau variațiuni), III Allegro (rondo, rondo-sonată, sonată sau variațiuni).' },
      { id: 'f-9', q: 'Cine fixează ciclul repede–lent–repede în concertul cu un solist?', a: 'Torelli și Vivaldi.' },
      { id: 'f-10', q: 'Concerto grosso', a: 'Concert baroc: un grup de soliști (concertino) opus orchestrei (tutti, ripieni). Reprezentant principal: Corelli.' },
    ],
  },
};
