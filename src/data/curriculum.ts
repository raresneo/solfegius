// Parcursul de învățare. Ordinea și temele lecțiilor 1–35 urmează „Solfegiu pentru toți”, vol. I.
// Modulul 0 e completare: cartea presupune că știi deja să citești notele și duratele.

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

export type Exercise =
  | { kind: 'notes'; id: string; title: string; pool: string[]; count?: number }
  | { kind: 'ear'; id: string; title: string; pool: string[]; count?: number }
  | { kind: 'sing'; id: string; title: string; targets: string[] }
  | { kind: 'rhythm'; id: string; title: string; lesson: number; measures?: number }
  | {
      kind: 'solfegiu';
      id: string;
      title: string;
      melodyId?: string;
      source?: string;
      time?: [number, number];
      bpm?: number;
      generate?: { lesson: number; scaleGame?: boolean };
    }
  | { kind: 'quiz'; id: string; title: string; questions: QuizQuestion[] }
  | { kind: 'cards'; id: string; title: string; deck: string }
  | { kind: 'dictation'; id: string; title: string; lesson: number };

export interface TheoryBlock {
  title: string;
  body: string;
}

export interface Lesson {
  id: string;
  num: string;
  title: string;
  /** a) intonație · b) ritm, ca în carte */
  topics: string[];
  available: boolean;
  theory: TheoryBlock[];
  exercises: Exercise[];
}

export interface Chapter {
  id: string;
  title: string;
  note?: string;
  lessons: Lesson[];
}

const C_SCALE = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

const M0: Lesson[] = [
  {
    id: 'm0-1',
    num: '0.1',
    title: 'Portativul și cheia sol',
    topics: ['5 linii, 4 spații', 'cheia sol', 'Do central'],
    available: true,
    theory: [
      {
        title: 'Portativul',
        body: 'Muzica se scrie pe 5 linii orizontale și pe cele 4 spații dintre ele. Le numărăm de jos în sus. Cu cât nota stă mai sus pe portativ, cu atât sună mai înalt.',
      },
      {
        title: 'Cheia sol',
        body: 'Cheia sol se „înfășoară” pe linia a 2-a și îi dă numele: pe linia a 2-a stă Sol. De aici afli toate celelalte note, mergând din treaptă în treaptă (linie, spațiu, linie...).',
      },
      {
        title: 'Notele pe linii și în spații',
        body: 'Pe linii, de jos în sus: Mi, Sol, Si, Re, Fa. În spații: Fa, La, Do, Mi. Do central stă pe o linie suplimentară mică sub portativ, iar Re imediat sub prima linie.',
      },
    ],
    exercises: [
      { kind: 'notes', id: 'lines', title: 'Notele de pe linii', pool: ['E4', 'G4', 'B4', 'D5', 'F5'] },
      { kind: 'notes', id: 'spaces', title: 'Notele din spații', pool: ['F4', 'A4', 'C5', 'E5'] },
      { kind: 'notes', id: 'all', title: 'Toate notele, Do central până la Sol sus', pool: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'], count: 14 },
    ],
  },
  {
    id: 'm0-2',
    num: '0.2',
    title: 'Durate, pauze și măsură',
    topics: ['întreagă, doime, pătrime, optime', 'punctul', 'măsura'],
    available: true,
    theory: [
      {
        title: 'Durate',
        body: 'Pătrimea (cap plin cu codiță) e unitatea de bază: un timp. Doimea (cap gol cu codiță) ține 2 timpi. Nota întreagă (cap gol, fără codiță) ține 4. Optimea (cu stegulet sau legată cu bară) ține jumătate de timp, deci două optimi fac o pătrime.',
      },
      {
        title: 'Punctul',
        body: 'Punctul de lângă notă îi adaugă jumătate din valoarea ei: pătrimea cu punct ține un timp și jumătate, doimea cu punct ține 3 timpi.',
      },
      {
        title: 'Pauze și măsură',
        body: 'Fiecare durată are o pauză echivalentă: tăcere de aceeași lungime. Barele verticale împart muzica în măsuri. Cifrele de la început (ex. 2/4) îți spun câți timpi are măsura (sus) și ce durată ține un timp (jos: 4 = pătrimea).',
      },
    ],
    exercises: [
      {
        kind: 'quiz',
        id: 'dur',
        title: 'Test rapid: durate',
        questions: [
          { q: 'Câte pătrimi încap într-o doime?', options: ['1', '2', '3', '4'], answer: 1 },
          { q: 'Câte optimi fac o pătrime?', options: ['2', '3', '4', '8'], answer: 0 },
          { q: 'Cât ține o pătrime cu punct?', options: ['1 timp', '1 timp și jumătate', '2 timpi', '3 timpi'], answer: 1 },
          { q: 'Cât ține nota întreagă?', options: ['2 timpi', '3 timpi', '4 timpi', '8 timpi'], answer: 2 },
          { q: 'În măsura de 2/4, ce înseamnă cifra 2?', options: ['2 măsuri', '2 timpi în măsură', 'tempo 2', 'doimea e unitatea'], answer: 1 },
          { q: 'Doimea cu punct ține...', options: ['2 timpi', '2 timpi și jumătate', '3 timpi', '4 timpi'], answer: 2 },
          { q: 'O pauză de pătrime înseamnă...', options: ['un timp de tăcere', 'o notă mai încet', 'oprire până la final', 'jumătate de timp'], answer: 0 },
          { q: 'Câte pătrimi are o măsură de 4/4?', options: ['2', '3', '4', '8'], answer: 2 },
        ],
      },
    ],
  },
  {
    id: 'm0-3',
    num: '0.3',
    title: 'Ton, semiton, alterații',
    topics: ['ton și semiton', 'diez, bemol, becar'],
    available: true,
    theory: [
      {
        title: 'Ton și semiton',
        body: 'Semitonul e cea mai mică distanță din muzica noastră. Între note naturale e semiton doar la Mi–Fa și Si–Do, în rest e ton (2 semitonuri). De aici „culoarea” gamei Do major: ton, ton, semiton, ton, ton, ton, semiton.',
      },
      {
        title: 'Alterațiile',
        body: 'Diezul (♯) urcă nota cu un semiton, bemolul (♭) o coboară cu un semiton, becarul (♮) anulează alterația. În volumul I alterațiile apar abia de la lecția 26, deci până acolo lucrezi doar cu note naturale.',
      },
    ],
    exercises: [
      {
        kind: 'quiz',
        id: 'semi',
        title: 'Test rapid: ton și semiton',
        questions: [
          { q: 'Între Mi și Fa este...', options: ['ton', 'semiton', 'terță', 'nimic'], answer: 1 },
          { q: 'Între Do și Re este...', options: ['ton', 'semiton'], answer: 0 },
          { q: 'Între Si și Do (sus) este...', options: ['ton', 'semiton'], answer: 1 },
          { q: 'Diezul face nota...', options: ['mai înaltă cu un semiton', 'mai joasă cu un semiton', 'mai lungă', 'mai tare'], answer: 0 },
          { q: 'Ce face becarul?', options: ['coboară nota', 'anulează alterația', 'dublează durata', 'urcă un ton'], answer: 1 },
          { q: 'Structura gamei majore este:', options: ['T T S T T T S', 'T S T T S T T', 'S T T T S T T', 'T T T S T T S'], answer: 0 },
        ],
      },
    ],
  },
  {
    id: 'm0-4',
    num: '0.4',
    title: 'Acordajul vocii',
    topics: ['găsește-ți Do', 'octava ta'],
    available: true,
    theory: [
      {
        title: 'Cum îți iei tonul',
        body: 'Cartea recomandă un instrument sau un diapazon pentru ton. Aici îl ai mereu la un buton: ascultă Do, apoi cântă-l pe „a”, relaxat, fără să împingi.',
      },
      {
        title: 'Octava ta',
        body: 'Vocile bărbătești cântă de obicei cu o octavă mai jos decât e scris. Aplicația acceptă orice octavă: contează să nimerești nota, nu registrul.',
      },
      {
        title: 'Cât și cum exersezi',
        body: 'Autorii cer 15–20 de minute pe zi, constant, mai degrabă decât sesiuni lungi rare. Dacă un exercițiu e prea greu, treci mai departe: problemele revin în lecțiile următoare.',
      },
    ],
    exercises: [
      { kind: 'sing', id: 'do', title: 'Cântă Do', targets: ['C4', 'C4', 'C4'] },
      { kind: 'sing', id: 'do-sol', title: 'Do, Mi, Sol', targets: ['C4', 'E4', 'G4', 'C4'] },
    ],
  },
];

const L: Lesson[] = [
  {
    id: 'l1',
    num: '1',
    title: 'Scara gamei Do major · Măsura de 2/4',
    topics: ['a) scara Do major', 'b) 2/4 cu pătrimi'],
    available: true,
    theory: [
      {
        title: 'a) Gama Do major',
        body: 'Gama Do major pornește de la Do și urcă din treaptă în treaptă până la Do de sus: 7 trepte și octava. Treptele au nume: I tonica, II supratonica, III medianta, IV subdominanta, V dominanta, VI supradominanta, VII sensibila.',
      },
      {
        title: 'Cum o fixezi în ureche',
        body: 'Gândește-te la o melodie luminoasă, oprește-te pe ultimul ei sunet și numește-l Do. Ține-l câteva secunde, apoi urcă treaptă cu treaptă și oprește-te mai mult pe Do de sus. Cânt-o sus și jos, când mai rar, când mai repede. Apoi lărgește-o: după Do de sus continuă până la Sol, și în jos sub Do.',
      },
      {
        title: 'b) Măsura de 2/4',
        body: 'Două pătrimi pe măsură: prima accentuată, a doua nu. Bați măsura cu mâna: timpul 1 în jos, timpul 2 în sus. O pătrime durează cam o secundă, ca un pendul sau ca inima. Numără tare „1–2”, apoi rostește „ta–ta”.',
      },
    ],
    exercises: [
      { kind: 'solfegiu', id: 'gama', title: 'Cântă gama Do major, sus și jos', source: 'C4q D4q | E4q F4q | G4q A4q | B4q C5q | B4q A4q | G4q F4q | E4q D4q | C4h', time: [2, 4], bpm: 60 },
      { kind: 'notes', id: 'citire', title: 'Citește notele gamei', pool: C_SCALE },
      { kind: 'ear', id: 'auz', title: 'Ce treaptă auzi? (după acordaj)', pool: ['C4', 'D4', 'E4', 'F4', 'G4'] },
      { kind: 'dictation', id: 'dicteu', title: 'Dicteu: scrie ce auzi, pe trepte alăturate', lesson: 1 },
      { kind: 'rhythm', id: 'ritm', title: 'Bate ritmul în 2/4', lesson: 1, measures: 4 },
      { kind: 'solfegiu', id: 'joc', title: 'Joc pe gamă', generate: { lesson: 1, scaleGame: true }, bpm: 66 },
    ],
  },
  {
    id: 'l2',
    num: '2',
    title: 'Arpegiul gamei Do major · 2/4 cu doimi',
    topics: ['a) arpegiul I–III–V–VIII', 'b) doimea'],
    available: true,
    theory: [
      {
        title: 'a) Arpegiul',
        body: 'Arpegiul rezumă gama: treptele I, III, V și VIII, adică Do, Mi, Sol, Do. Ca să-l prinzi, cântă gama și păstrează în voce doar sunetele arpegiului, pe celelalte doar gândește-le. Apoi sari direct între ele.',
      },
      {
        title: 'b) Doimea',
        body: 'Două pătrimi se pot contopi într-o doime, care ține două bătăi. În loc de „ta–ta” spui „ta–a”: al doilea timp e prelungirea primului.',
      },
      {
        title: 'Înainte de fiecare solfegiu: acordajul',
        body: 'Cântă gama și arpegiul ca să-ți stabilizezi sunetele în ureche. Când simți că „te-ai rătăcit”, oprește-te, reacordează-te și pornește de pe un sunet al arpegiului. Dacă intonația pe ritm e grea, citește întâi doar ritmul cu numele notelor, fără să cânți.',
      },
    ],
    exercises: [
      { kind: 'solfegiu', id: 'arpegiu', title: 'Cântă arpegiul', source: 'C4q E4q | G4q C5q | G4q E4q | C4h', time: [2, 4], bpm: 60 },
      { kind: 'ear', id: 'auz', title: 'Recunoaște sunetele arpegiului', pool: ['C4', 'E4', 'G4', 'C5'] },
      { kind: 'dictation', id: 'dicteu', title: 'Dicteu cu salturi pe arpegiu', lesson: 2 },
      { kind: 'rhythm', id: 'ritm', title: 'Ritm cu pătrimi și doimi', lesson: 2 },
      { kind: 'solfegiu', id: 's1', title: 'Solfegiul 1', melodyId: 'l2-s1' },
      { kind: 'solfegiu', id: 's2', title: 'Solfegiul 2 · Canon', melodyId: 'l2-s2' },
      { kind: 'solfegiu', id: 's3', title: 'Solfegiul 3 · Cântec', melodyId: 'l2-s3' },
      { kind: 'solfegiu', id: 'gen', title: 'Solfegiu nou (generat pe lecție)', generate: { lesson: 2 } },
    ],
  },
  {
    id: 'l3',
    num: '3',
    title: 'Sensibila · 2/4 cu optimi',
    topics: ['a) treapta a VII-a', 'b) optimea, „ti–ti”'],
    available: true,
    theory: [
      {
        title: 'a) Sensibila',
        body: 'Treapta a VII-a, Si, e tensiunea gamei: vrea să se rezolve pe tonică (Do), care e liniștea. Gândește-o mereu „lipită” de Do, la doar un semiton sub el.',
      },
      {
        title: 'b) Optimea',
        body: 'O bătaie se poate împărți în două optimi: două note pe un timp, citite „ti–ti”. Combină acum cele trei durate: pătrime (ta), doime (ta–a), optimi (ti–ti).',
      },
    ],
    exercises: [
      { kind: 'sing', id: 'si-do', title: 'Si care se rezolvă pe Do', targets: ['C4', 'B3', 'C4', 'B4', 'C5'] },
      { kind: 'notes', id: 'citire', title: 'Citire cu Si de jos', pool: ['B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] },
      { kind: 'ear', id: 'auz', title: 'Arpegiu + sensibila', pool: ['C4', 'E4', 'G4', 'B4', 'C5'] },
      { kind: 'dictation', id: 'dicteu', title: 'Dicteu cu sensibila', lesson: 3 },
      { kind: 'rhythm', id: 'ritm', title: 'Ritm cu optimi', lesson: 3 },
      { kind: 'solfegiu', id: 'mozart', title: 'Mozart · Variațiuni (var. I)', melodyId: 'l3-s3' },
      { kind: 'solfegiu', id: 'gen', title: 'Solfegiu nou (generat pe lecție)', generate: { lesson: 3 } },
    ],
  },
  {
    id: 'l4',
    num: '4',
    title: 'Treapta a II-a · 2/4 cu pauze',
    topics: ['a) supratonica (Re)', 'b) pauza de pătrime'],
    available: true,
    theory: [
      {
        title: 'a) Treapta a II-a',
        body: 'Re se gândește întotdeauna deasupra tonicii: întâi Do, apoi un ton mai sus, Re. Exersează Do–Re–Do și Do–Re–Mi până devine automat.',
      },
      {
        title: 'b) Pauza',
        body: 'Unii timpi pot fi fără sunet: în locul notei apare pauza. Ca să o simți, inspiră scurt pe timpul pauzei. Mâna continuă să bată măsura.',
      },
    ],
    exercises: [
      { kind: 'sing', id: 'do-re', title: 'Do–Re–Mi', targets: ['C4', 'D4', 'C4', 'D4', 'E4'] },
      { kind: 'ear', id: 'auz', title: 'Re printre sunetele arpegiului', pool: ['C4', 'D4', 'E4', 'G4', 'C5'] },
      { kind: 'dictation', id: 'dicteu', title: 'Dicteu cu Re și pauze', lesson: 4 },
      { kind: 'rhythm', id: 'ritm', title: 'Ritm cu pauze', lesson: 4 },
      { kind: 'solfegiu', id: 'gen', title: 'Solfegiu nou (generat pe lecție)', generate: { lesson: 4 } },
      { kind: 'solfegiu', id: 'gen2', title: 'Încă unul, alt ritm', generate: { lesson: 4 } },
    ],
  },
  {
    id: 'l5',
    num: '5',
    title: 'Treapta a VI-a · Pătrimea cu punct',
    topics: ['a) supradominanta (La)', 'b) pătrime cu punct + optime'],
    available: true,
    theory: [
      {
        title: 'a) Treapta a VI-a',
        body: 'La stă deasupra lui Sol (dominanta). E importantă pentru că mai încolo devine tonica gamei relative, la minor, deci merită fixată bine: Sol–La–Sol, apoi La legat de celelalte trepte învățate.',
      },
      {
        title: 'b) Pătrimea cu punct și optimea',
        body: 'Apare când prima pătrime se leagă de prima optime a timpului următor. Ca să o cânți, imaginează-ți legătura și „apasă” puțin pe punct: „ta–a–ti”. Citește întâi doar ritmul, apoi adaugă intonația.',
      },
    ],
    exercises: [
      { kind: 'sing', id: 'sol-la', title: 'Sol–La–Sol', targets: ['G4', 'A4', 'G4', 'A4', 'C5'] },
      { kind: 'ear', id: 'auz', title: 'Toate treptele învățate', pool: ['C4', 'D4', 'E4', 'G4', 'A4', 'B4', 'C5'] },
      { kind: 'dictation', id: 'dicteu', title: 'Dicteu cu La', lesson: 5 },
      { kind: 'rhythm', id: 'ritm', title: 'Ritm cu pătrime cu punct', lesson: 5 },
      { kind: 'solfegiu', id: 'gen', title: 'Solfegiu nou (generat pe lecție)', generate: { lesson: 5 } },
      { kind: 'solfegiu', id: 'gen2', title: 'Încă unul, alt ritm', generate: { lesson: 5 } },
    ],
  },
  {
    id: 'l6',
    num: '6',
    title: 'Treapta a IV-a · Măsura de 4/4',
    topics: ['a) subdominanta (Fa)', 'b) 4/4'],
    available: true,
    theory: [
      {
        title: 'a) Treapta a IV-a',
        body: 'Fa se gândește deasupra lui Mi (nota din arpegiu), la doar un semiton. Are tendința să coboare înapoi pe Mi.',
      },
      {
        title: 'b) Măsura de 4/4',
        body: 'Patru pătrimi pe măsură, ca două măsuri de 2/4 lipite. Se bate: jos, stânga, dreapta, sus. Timpul 1 are accentul principal, timpul 3 accent secundar, 2 și 4 sunt neaccentuați.',
      },
    ],
    exercises: [
      { kind: 'sing', id: 'mi-fa', title: 'Mi–Fa–Mi', targets: ['E4', 'F4', 'E4', 'F4', 'G4'] },
      { kind: 'notes', id: 'citire', title: 'Citire pe tot ambitusul', pool: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'], count: 14 },
      { kind: 'ear', id: 'auz', title: 'Toată gama', pool: C_SCALE },
      { kind: 'dictation', id: 'dicteu', title: 'Dicteu în 4/4, toată gama', lesson: 6 },
      { kind: 'rhythm', id: 'ritm', title: 'Ritm în 4/4', lesson: 6, measures: 2 },
      { kind: 'solfegiu', id: 'gen', title: 'Solfegiu nou în 4/4', generate: { lesson: 6 } },
    ],
  },
];

// Lecțiile 7–35, din cuprinsul cărții, deblocate pe rând în următoarele versiuni.
const NEXT: [string, string, string][] = [
  ['7', 'Intervalul de secundă (ton, semiton)', 'Legato peste bara de măsură'],
  ['8', 'Intervalul de terță', 'Măsura de 3/4'],
  ['9', 'Intervalul de cvartă', 'Recapitulare 2/4, 4/4, 3/4'],
  ['10', 'Intervalul de cvintă', 'Sincopa'],
  ['11', 'Intervalul de sextă', 'Contratimpul pe timp'],
  ['12', 'Intervalul de septimă', 'Contratimpul pe parte de timp'],
  ['13', 'Acordurile gamei Do major', 'Recapitulare ritmică'],
  ['14', 'Răsturnarea acordurilor', 'Șaisprezecimea'],
  ['15', 'Recapitulare Do major', 'Dactil și anapest'],
  ['16', 'Scările gamei la minor', ''],
  ['17', 'Gama la minor armonic', 'Trioletul'],
  ['18', 'Intervale în la minor armonic (1): secunda mărită, terțe, cvarte', 'Optime cu punct + șaisprezecime'],
  ['19', 'Intervale în la minor armonic (2): cvinte, sexte', 'Anacruza'],
  ['20', 'Intervale în la minor armonic (3): septimele', ''],
  ['21', 'Acordurile gamei la minor armonic', 'Sincopa pe parte de timp'],
  ['22', 'Recapitulare la minor armonic', 'Recapitulare formule dificile'],
  ['23', 'Gama la minor melodic', 'Legato între formule ritmice'],
  ['24', 'La minor melodic în coborâre („baroc”)', ''],
  ['25', 'Recapitulare la minor, toate variantele', 'Timpi ternari: 3/8, 6/8, 9/8, 12/8'],
  ['26', 'Intonații cromatice în la minor', 'Măsura de 6/8'],
  ['27', 'Treapta a IV-a urcată (Fa♯) în Do și la', 'Măsura de 9/8'],
  ['28', 'Treapta a VI-a coborâtă (La♭) în Do major', ''],
  ['29', 'Sol♯ și Si♭ în Do major', 'Formule ritmice ternare'],
  ['30', 'Treapta a II-a coborâtă (Re♭ în Do, Si♭ în la)', 'Siciliana'],
  ['31', 'Treapta a III-a: Mi♭ în Do, Do♯ în la', ''],
  ['32', 'Do♯, La♯, Re♯', 'Tactarea divizată'],
  ['33', 'Recapitulare alterații în Do major', 'Măsura de 2/2'],
  ['34', 'Recapitulare alterații în la minor', 'Măsurile de 3/2 și 4/2'],
  ['35', 'Recapitulare generală Do major și la minor', ''],
];

const locked = (n: string, a: string, b: string): Lesson => ({
  id: `l${n}`,
  num: n,
  title: a,
  topics: b ? [`a) ${a}`, `b) ${b}`] : [`a) ${a}`],
  available: false,
  theory: [],
  exercises: [],
});

export const CHAPTERS: Chapter[] = [
  {
    id: 'm0',
    title: 'Modulul 0 · Bazele',
    note: 'Completare: cartea presupune că știi deja notele și duratele. Dacă le știi, sari direct la lecția 1.',
    lessons: M0,
  },
  { id: 'a1', title: 'Capitolul A · I. Gama Do major', lessons: [...L, ...NEXT.slice(0, 9).map(([n, a, b]) => locked(n, a, b))] },
  { id: 'a2', title: 'II. Gama la minor', lessons: NEXT.slice(9, 20).map(([n, a, b]) => locked(n, a, b)) },
  { id: 'a3', title: 'III. Alterații și cromatisme', lessons: NEXT.slice(20).map(([n, a, b]) => locked(n, a, b)) },
  {
    id: 'fac',
    title: 'Teorie pentru facultate',
    note: 'Fișe din modulele de Armonie I–IV și din cursul de Forme și genuri. Repetiție spațiată: ce nu știi revine mai des.',
    lessons: [
      { id: 'arm1', num: 'A1', title: 'Armonie I · Trisonul major', topics: ['dublări, poziții, cadențe, cvartsextacord'], available: true, theory: [], exercises: [{ kind: 'cards', id: 'fise', title: 'Fișe Armonie I', deck: 'arm1' }] },
      { id: 'arm2', num: 'A2', title: 'Armonie II · Acordul minor și septima de dominantă', topics: ['trepte secundare, D7, răsturnări'], available: true, theory: [], exercises: [{ kind: 'cards', id: 'fise', title: 'Fișe Armonie II', deck: 'arm2' }] },
      { id: 'arm3', num: 'A3', title: 'Armonie III · Modulația diatonică, armonia cromatică', topics: ['acord comun, cromatism'], available: true, theory: [], exercises: [{ kind: 'cards', id: 'fise', title: 'Fișe Armonie III', deck: 'arm3' }] },
      { id: 'arm4', num: 'A4', title: 'Armonie IV · Dominante secundare, modulația enarmonică', topics: ['D1–D4, moll-dur, sexta napolitană'], available: true, theory: [], exercises: [{ kind: 'cards', id: 'fise', title: 'Fișe Armonie IV', deck: 'arm4' }] },
      { id: 'forme', num: 'F', title: 'Genuri și forme muzicale', topics: ['monodie, omofonie, polifonie, suită, sonată, concert'], available: true, theory: [], exercises: [{ kind: 'cards', id: 'fise', title: 'Fișe Forme și genuri', deck: 'forme' }] },
    ],
  },
];

export function allLessons(): Lesson[] {
  return CHAPTERS.flatMap((c) => c.lessons);
}

export function findLesson(id: string): Lesson | undefined {
  return allLessons().find((l) => l.id === id);
}

/** Lecțiile de solfegiu propriu-zis (Modulul 0 + cartea), în ordine. */
export function solfegeLessons(): Lesson[] {
  return CHAPTERS.filter((c) => c.id !== 'fac').flatMap((c) => c.lessons);
}
