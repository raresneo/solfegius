// Formatul compact al exercițiilor din Stanislavski (un tuplu pe exercițiu, ca fișierele să rămână mici).
// Modurile: tg cronometru · om observație · ca cercuri de atenție · rm tempo-ritm · iv voce · mt marcare text
// gs „dacă” + situații · js jurnal · af acțiune fizică · mg mișcare · pr partitura rolului · fs fișă.
export type ModeCode = 'tg' | 'om' | 'ca' | 'rm' | 'iv' | 'mt' | 'gs' | 'js' | 'af' | 'mg' | 'pr' | 'fs';

export interface RawParams {
  /** faze cronometrate: [etichetă, secunde] */
  ph?: [string, number][];
  /** observație: secunde de privit + ce fel de obiecte */
  sh?: number;
  hint?: string;
  /** cercurile atenției, de la mic la mare */
  ci?: string[];
  /** tempo-ritm: numărul de metronom din carte (null = cartea nu dă cifră), măsura, tiparul, ce se bate */
  bpm?: number | null;
  me?: string;
  pa?: string;
  hit?: string;
  tl?: string;
  /** voce/text: textul de rostit și variantele cerute */
  tx?: string;
  rw?: string[];
  /** soluția din carte: cuvintele după care vine pauza, cuvintele accentuate, subtextul */
  ref?: { p: string[]; a: string[]; s?: string };
  pool?: string[];
  pr?: string[];
  ac?: string;
  cp?: string[];
  fi?: string[];
}

export type RawEx = [
  id: string,
  title: string,
  page: number,
  element: string,
  summary: string,
  steps: string[],
  min: number,
  needs: 's' | 'p' | 'g' | 'c',
  mode: ModeCode,
  params: RawParams,
  feas: 'f' | 'p' | 'c',
  opera: string,
  checks: string[],
  variantOf: string | null,
];
