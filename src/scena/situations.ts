// „Dacă” magic și situațiile propuse (cap. III–IV): cine, unde, când, ce s-a întâmplat înainte, ce vrei, ce te oprește.
// Pornește din exemplele lui Torțov și le mută și în viața unui cântăreț.
import { mulberry32, pick } from '../lib/random.ts';
import type { Rng } from '../lib/random.ts';

export const POOLS = {
  cine: [
    'tu, așa cum ești azi', 'personajul ariei tale', 'Othello, înaintea primei îndoieli', 'Tevye, lăptarul, după o zi grea',
    'un tânăr cântăreț înaintea audiției', 'un mesager care aduce o veste proastă', 'o mamă care își caută copilul',
    'un student care a pierdut partitura', 'un om care se întoarce acasă după ani', 'Salieri, cu cupa în mână',
  ],
  unde: [
    'în camera ta, noaptea', 'în culise, cu cinci minute înainte de intrare', 'pe scena goală, cu cortina ridicată',
    'într-o casă rece, iarna', 'într-o gară, înaintea plecării trenului', 'într-o vale, după o aterizare forțată',
    'la repetiția cu orchestra', 'într-un salon plin de oaspeți', 'pe holul conservatorului, la examen', 'într-o biserică goală',
  ],
  cand: [
    'la miezul nopții', 'în zori', 'chiar acum', 'după o zi lungă', 'în ajunul premierei', 'în prima zi de primăvară',
    'cu un minut înainte de semnal', 'după o ceartă', 'într-o pauză de repetiție',
  ],
  inainte: [
    'ai pierdut o broșă scumpă, împrumutată', 'cineva a aruncat în foc banii pe care îi numărai', 'un nebun periculos e dincolo de ușă',
    'ai găsit o scrisoare care nu era pentru tine', 'ai primit vestea că ai intrat la Operă', 'prietenul tău nu a venit la întâlnire',
    'ai auzit pe cineva plângând în camera alăturată', 'ai uitat textul la repetiția generală', 'ți s-a stins lumina în toată casa',
    'ai aflat că partenerul te-a mințit',
  ],
  vreau: [
    'să ascunzi ceva', 'să convingi pe cineva', 'să liniștești pe cineva', 'să afli adevărul', 'să scapi neobservat',
    'să câștigi timp', 'să fii iertat', 'să protejezi pe cineva', 'să-l faci să râdă', 'să pleci fără să rănești',
  ],
  obstacol: [
    'nu ai voie să faci zgomot', 'partenerul nu te crede', 'ți-e frig', 'timpul se termină', 'cineva te privește',
    'nu știi unde e ușa', 'îți tremură vocea', 'trebuie să zâmbești', 'ai mâinile ocupate', 'nu poți spune adevărul',
  ],
} as const;

export interface Situation {
  cine: string;
  unde: string;
  cand: string;
  inainte: string;
  vreau: string;
  obstacol: string;
}

export const SITUATION_LABELS: Record<keyof Situation, string> = {
  cine: 'Cine ești',
  unde: 'Unde',
  cand: 'Când',
  inainte: 'Ce s-a întâmplat înainte',
  vreau: 'Ce vrei',
  obstacol: 'Ce te oprește',
};

export function situation(seed: number, rng: Rng = mulberry32(seed)): Situation {
  return {
    cine: pick(POOLS.cine, rng),
    unde: pick(POOLS.unde, rng),
    cand: pick(POOLS.cand, rng),
    inainte: pick(POOLS.inainte, rng),
    vreau: pick(POOLS.vreau, rng),
    obstacol: pick(POOLS.obstacol, rng),
  };
}

/** Întrebarea care pornește acțiunea, ca la Torțov: nu „ce simt?”, ci „ce aș face?”. */
export function magicIf(s: Situation): string {
  return `Dacă ai fi ${s.cine}, ${s.unde}, ${s.cand}: ${s.inainte}. Vrei ${s.vreau}, dar ${s.obstacol}. Ce faci?`;
}
