import type { Betingelse, Fase, Prosess, Prosjekt, Steg, Svar } from './types';

/* ─────────────────────────────────────────────────────────────
   Prosessmotoren: regner ut stien et prosjekt skal gå, ut fra svarene.
   Rene funksjoner uten nettleser — testes i motor.test.ts.
   ───────────────────────────────────────────────────────────── */

/**
 * Gjelder betingelsen for disse svarene?
 * Et spørsmål som ikke er besvart ennå gir `false`: stien bak et ubesvart
 * valg vises først når valget er tatt.
 */
export function gjelder(b: Betingelse | undefined, svar: Record<string, Svar>): boolean {
  if (!b) return true;
  if ('alle' in b) return b.alle.every((x) => gjelder(x, svar));
  if ('noen' in b) return b.noen.some((x) => gjelder(x, svar));
  if ('ikke' in b) return !gjelder(b.ikke, svar);
  const s = svar[b.steg];
  if (s === undefined) return false;
  const onsket = Array.isArray(b.er) ? b.er : [b.er];
  const gitt = Array.isArray(s) ? s : [s];
  return gitt.some((x) => onsket.includes(x));
}

/** Avhenger betingelsen av et spørsmål som ikke er besvart ennå? */
export function venterPaSvar(b: Betingelse | undefined, svar: Record<string, Svar>): boolean {
  if (!b) return false;
  if ('alle' in b) return b.alle.some((x) => venterPaSvar(x, svar));
  if ('noen' in b) return b.noen.some((x) => venterPaSvar(x, svar));
  if ('ikke' in b) return venterPaSvar(b.ikke, svar);
  return svar[b.steg] === undefined;
}

export interface SynligFase extends Omit<Fase, 'steg'> {
  steg: Steg[];
}

/** Fasene og stegene som gjelder for prosjektet akkurat nå. */
export function sti(prosess: Prosess, svar: Record<string, Svar>): SynligFase[] {
  return prosess.faser
    .filter((f) => gjelder(f.gjelder, svar))
    .map((f) => ({ ...f, steg: f.steg.filter((s) => gjelder(s.gjelder, svar)) }))
    .filter((f) => f.steg.length > 0);
}

export function flatSti(prosess: Prosess, svar: Record<string, Svar>): Steg[] {
  return sti(prosess, svar).flatMap((f) => f.steg);
}

/** Antall steg som fortsatt er skjult bak ubesvarte valg (vises som «?» i kartet). */
export function skjulteSteg(prosess: Prosess, svar: Record<string, Svar>): number {
  let n = 0;
  for (const f of prosess.faser) {
    if (!gjelder(f.gjelder, svar)) {
      if (venterPaSvar(f.gjelder, svar)) n += f.steg.length;
      continue;
    }
    n += f.steg.filter((s) => !gjelder(s.gjelder, svar) && venterPaSvar(s.gjelder, svar)).length;
  }
  return n;
}

export function erBesvart(steg: Steg, svar: Record<string, Svar>): boolean {
  if (!steg.valg) return true;
  const s = svar[steg.id];
  return s !== undefined;
}

export interface Fremdrift {
  utfort: number;
  totalt: number;
  prosent: number;
  /** Utførte steg som ikke lenger er på stien (forlatte grener). */
  forlatte: string[];
}

export function fremdrift(prosess: Prosess, p: Pick<Prosjekt, 'svar' | 'utfort'>): Fremdrift {
  const steg = flatSti(prosess, p.svar);
  const ids = new Set(steg.map((s) => s.id));
  const utfort = steg.filter((s) => p.utfort[s.id]).length;
  return {
    utfort,
    totalt: steg.length,
    prosent: steg.length ? Math.round((utfort / steg.length) * 100) : 0,
    forlatte: Object.keys(p.utfort).filter((id) => !ids.has(id)),
  };
}

/** Steget brukeren står på: det lagrede, eller første som ikke er utført. */
export function aktivtSteg(prosess: Prosess, p: Pick<Prosjekt, 'svar' | 'utfort' | 'aktivt'>): Steg | null {
  const steg = flatSti(prosess, p.svar);
  const lagret = steg.find((s) => s.id === p.aktivt);
  if (lagret) return lagret;
  return steg.find((s) => !p.utfort[s.id]) ?? steg[steg.length - 1] ?? null;
}

/** Neste (+1) eller forrige (-1) steg på stien. */
export function naboSteg(prosess: Prosess, svar: Record<string, Svar>, id: string, retning: 1 | -1): Steg | null {
  const steg = flatSti(prosess, svar);
  const i = steg.findIndex((s) => s.id === id);
  return steg[i + retning] ?? null;
}

/** Første steg etter `id` som ikke er utført (hopper over det som allerede er gjort). */
export function nesteUgjorte(prosess: Prosess, p: Pick<Prosjekt, 'svar' | 'utfort'>, id: string): Steg | null {
  const steg = flatSti(prosess, p.svar);
  const i = steg.findIndex((s) => s.id === id);
  return steg.slice(i + 1).find((s) => !p.utfort[s.id]) ?? steg.slice(0, i).find((s) => !p.utfort[s.id]) ?? null;
}

export function faseFor(prosess: Prosess, stegId: string): Fase | undefined {
  return prosess.faser.find((f) => f.steg.some((s) => s.id === stegId));
}

/** Teksten for et svar, f.eks. «svingtrapp_u» → «Svingtrapp (U) 180°». */
export function svarTekst(steg: Steg, s: Svar | undefined): string {
  if (s === undefined || !steg.valg) return '';
  const v = steg.valg;
  if (v.type === 'janei') return s === 'ja' ? (v.knapper?.ja ?? 'Ja') : (v.knapper?.nei ?? 'Nei');
  const navn = (id: string) => v.alternativer.find((a) => a.id === id)?.navn ?? id;
  return Array.isArray(s) ? (s.length ? s.map(navn).join(', ') : 'Ingen') : navn(s);
}
