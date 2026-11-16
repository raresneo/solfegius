// Solfegii transcrise din „Solfegiu pentru toți”, vol. I (C. Rîpă, N. Nedelcuț, MediaMusica, 2002).
// Transcriere manuală după scan; fiecare are pagina sursă ca să poată fi verificată.

export interface BookMelody {
  id: string;
  title: string;
  author: string;
  lesson: number;
  page: number;
  time: [number, number];
  bpm: number;
  source: string;
}

export const BOOK_MELODIES: BookMelody[] = [
  {
    id: 'l2-s1',
    title: 'Solfegiul 1',
    author: 'După C. Brăiloiu, I. Croitoru · Manual de muzică',
    lesson: 2,
    page: 12,
    time: [2, 4],
    bpm: 66,
    source: 'C4q D4q | E4q F4q | G4q A4q | B4h | C5h | B4h | A4q G4q | F4q E4q | D4q C4q',
  },
  {
    id: 'l2-s2',
    title: 'Solfegiul 2 · Canon',
    author: 'I. Vorobschievici',
    lesson: 2,
    page: 12,
    time: [2, 4],
    bpm: 72,
    source: 'C4q D4q | E4q E4q | E4q D4q | C4h | E4q F4q | G4q G4q | G4q F4q | E4h | G4q G4q | G4q C5q | C5q B4q | C5h',
  },
  {
    id: 'l2-s3',
    title: 'Solfegiul 3 · Cântec',
    author: 'G. D. Kiriac',
    lesson: 2,
    page: 12,
    time: [2, 4],
    bpm: 72,
    source:
      'C4q E4q | E4q E4q | C5q C5q | B4h | A4h | G4h | C5q E4q | G4q G4q | A4q G4q | F4h | E4h | D4h | ' +
      'C4q E4q | E4q E4q | C5q C5q | B4h | A4h | G4h | C5q E4q | G4q G4q | A4q F4q | E4h | D4h | C4h',
  },
  {
    id: 'l3-s3',
    title: 'Solfegiul 3 · Variațiuni pe o veche melodie franceză (var. I)',
    author: 'W. A. Mozart',
    lesson: 3,
    page: 15,
    time: [2, 4],
    bpm: 60,
    source:
      'C4e D4e E4e F4e | G4e A4e B4e C5e | A4e B4e C5e A4e | G4q G4q | F4e A4e D4e F4e | E4e G4e C4e E4e | ' +
      'D4e F4e B3e D4e | C4h | G4q E4e G4e | F4q D4e F4e | E4q C4e E4e | D4q D4q | ' +
      'G4e C5e E4e G4e | F4e A4e D4e F4e | E4e G4e C4e E4e | D4h | C4e D4e E4e F4e | G4e A4e B4e C5e | ' +
      'A4e B4e C5e A4e | G4q G4q | F4e A4e D4e F4e | E4e G4e C4e E4e | D4e F4e B3e D4e | C4h',
  },
];

export function bookMelody(id: string): BookMelody {
  const m = BOOK_MELODIES.find((x) => x.id === id);
  if (!m) throw new Error(`Solfegiu inexistent: ${id}`);
  return m;
}
