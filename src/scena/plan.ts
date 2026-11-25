// Progresul pe capitole și antrenamentul zilnic („toaleta actorului”). Logică pură, fără DOM.
import { EXERCISES, exById, exercisesOf } from './catalog.ts';
import type { GroupId, Mode, StEx } from './catalog.ts';

export const PASS = 0.7;
export const scKey = (id: string): string => `scena/${id}`;

export const isDone = (best: Record<string, number>, id: string): boolean => (best[scKey(id)] ?? 0) >= PASS;

export function progressOf(best: Record<string, number>, list: StEx[]): { done: number; total: number } {
  return { done: list.filter((e) => isDone(best, e.id)).length, total: list.length };
}

export const chapterProgress = (best: Record<string, number>, key: string) => progressOf(best, exercisesOf(key));
export const totalProgress = (best: Record<string, number>) => progressOf(best, EXERCISES);

/**
 * Ordinea din „ritualul de cincisprezece minute” (Observații, nota XXII): corpul, apoi atenția, glasul și dicția,
 * tempo-ritmul, iar la sfârșit totul se unește într-o temă scurtă de imaginație.
 */
export const ROUTINE: { group: GroupId; label: string }[] = [
  { group: 'corp', label: 'Corp și destindere' },
  { group: 'atentie', label: 'Atenție' },
  { group: 'voce', label: 'Voce și dicție' },
  { group: 'ritm', label: 'Tempo-ritm' },
  { group: 'imaginatie', label: 'Imaginație și „dacă”' },
];

/**
 * Cap. I–II descriu greșelile elevului (mersul de „tigru”, oglinda, jocul „în general”): sunt de citit, nu de antrenat zilnic.
 * Antrenamentul pornește de la capitolele de metodă.
 */
const NOT_DAILY = new Set(['1-I', '1-II']);

/** Ce poți face singur, cu telefonul, în câteva minute. */
export const soloFriendly = (e: StEx, maxMin = 8): boolean => e.needs === 'solo' && e.feas !== 'class' && e.min <= maxMin && !NOT_DAILY.has(e.ch);

/**
 * Pentru fiecare grupă: primul exercițiu netrecut, în ordinea cărții. Când le-ai trecut pe toate,
 * cel făcut cel mai demult. Așa, zi de zi, antrenamentul parcurge toată cartea.
 */
/** La voce, pentru un cântăreț, „Dicțiunea și canto” și „Vorbirea pe scenă” vin înaintea trucurilor de caracterizare. */
const FIRST: Partial<Record<GroupId, string[]>> = { voce: ['2-V', '2-VI'] };

export function planRoutine(best: Record<string, number>, seen: Record<string, number>): StEx[] {
  return ROUTINE.map(({ group }) => {
    const first = FIRST[group] ?? [];
    const rank = (e: StEx): number => (first.includes(e.ch) ? 0 : 1);
    const pool = EXERCISES.filter((e) => e.group === group && soloFriendly(e)).sort((a, b) => rank(a) - rank(b));
    const open = pool.find((e) => !isDone(best, e.id));
    if (open) return open;
    return pool.slice().sort((a, b) => (seen[a.id] ?? 0) - (seen[b.id] ?? 0))[0];
  }).filter((e): e is StEx => !!e);
}

/** „Înainte de scenă”: toaleta sufletului, controlorul mușchilor, cercul mic, tempo-ritmul din cabină. */
export const PRESHOW = ['P1-VI-02', 'P1-V-11', 'P1-XIV-02', 'P2-VIII-26'];
export const preshowPlan = (): StEx[] => PRESHOW.map((id) => exById(id)).filter((e): e is StEx => !!e);

export function nextInChapter(e: StEx): StEx | undefined {
  const list = exercisesOf(e.ch);
  return list[list.indexOf(e) + 1];
}

/** Autoevaluarea: Da = 1, Parțial = 0,5, Nu = 0. */
export function selfScore(answers: (number | null)[]): number {
  const xs = answers.filter((a): a is number => a !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Întrebările de autoevaluare când exercițiul nu are unele proprii, pe tipul de lucru. */
export const MODE_CHECKS: Record<Mode, string[]> = {
  timer: ['Am rămas fără încordare inutilă?', 'Atenția a rămas pe ce aveam de făcut?'],
  movement: ['Mișcarea a pornit dintr-un impuls clar și a curs fără rupturi?', 'Am evitat gestul făcut doar pentru efect?', 'Trunchiul și respirația au rămas libere?'],
  circles: ['Am stat în cercul ales fără să mă încordez?', 'Am revenit repede când atenția a fugit?'],
  memory: ['Am privit activ, nu doar m-am uitat?', 'Am reținut detalii, nu doar nume?'],
  metronome: ['Am păstrat pulsul fără salturi?', 'Mișcarea sau vorbirea a rămas continuă între bătăi?', 'Am justificat tempo-ritmul printr-o situație?'],
  record: ['S-a înțeles fiecare silabă fără să forțez?', 'A rămas linia sonoră legată?', 'A susținut intonația sensul ales?'],
  marking: ['Pauzele au unit sau au despărțit exact sensul dorit?', 'Am scos în relief doar cuvintele necesare?'],
  situations: ['Am acționat, nu am jucat un sentiment?', 'Am crezut în situație măcar câteva momente?', 'Fiecare acțiune a avut un „pentru ce”?'],
  journal: ['Am scris concret (ce, unde, cum), nu în general?', 'Ce am scris mă ajută să acționez?'],
  action: ['Fiecare acțiune a fost logică și consecventă?', 'Am crezut în obiectul imaginar?', 'Am lucrat fără grabă și fără încordare?'],
  role: ['Am formulat sarcinile cu verbe active?', 'Se leagă totul de supratemă?'],
  sheet: ['Am înțeles ideea și pot s-o spun cu cuvintele mele?', 'Știu când o voi încerca la repetiție?'],
};

export const checksFor = (e: StEx): string[] => (e.checks.length ? e.checks : MODE_CHECKS[e.mode]);
