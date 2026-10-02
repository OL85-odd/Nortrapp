import type { Betingelse, Fase, Prosess, Steg } from '../types';

/* ─────────────────────────────────────────────────────────────
   Redigeringsoperasjoner på en prosess (faser og steg).
   Rene funksjoner: tar inn en prosess og gir tilbake en NY prosess.
   Testes i ops.test.ts.
   ───────────────────────────────────────────────────────────── */

export function nyId(prefiks: string) {
  return `${prefiks}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Lager en stabil id av en tekst: «Stolpe/megler på toppen» → «stolpe_megler_pa_toppen». */
export function slug(tekst: string): string {
  return (
    tekst
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || 'valg'
  );
}

export interface StegPlass {
  fase: Fase;
  faseIndeks: number;
  steg: Steg;
  indeks: number;
}

export function finnSteg(p: Prosess, id: string): StegPlass | null {
  for (let fi = 0; fi < p.faser.length; fi++) {
    const i = p.faser[fi].steg.findIndex((s) => s.id === id);
    if (i >= 0) return { fase: p.faser[fi], faseIndeks: fi, steg: p.faser[fi].steg[i], indeks: i };
  }
  return null;
}

function medFase(p: Prosess, faseId: string, fn: (f: Fase) => Fase): Prosess {
  return { ...p, faser: p.faser.map((f) => (f.id === faseId ? fn(f) : f)) };
}

/* ── Steg ──────────────────────────────────────────────────── */

export function oppdaterSteg(p: Prosess, id: string, felt: Partial<Steg>): Prosess {
  const plass = finnSteg(p, id);
  if (!plass) return p;
  return medFase(p, plass.fase.id, (f) => ({
    ...f,
    steg: f.steg.map((s) => {
      if (s.id !== id) return s;
      const ny: Steg = { ...s, ...felt };
      // Felt satt til undefined fjernes helt, så JSON-en holder seg ren.
      for (const k of Object.keys(ny) as (keyof Steg)[]) if (ny[k] === undefined) delete ny[k];
      return ny;
    }),
  }));
}

export function settInnSteg(p: Prosess, faseId: string, indeks: number, steg: Steg): Prosess {
  return medFase(p, faseId, (f) => {
    const liste = [...f.steg];
    liste.splice(Math.max(0, Math.min(indeks, liste.length)), 0, steg);
    return { ...f, steg: liste };
  });
}

/** Flytter et steg opp/ned. I enden av en fase går det over i nabofasen. */
export function flyttSteg(p: Prosess, id: string, retning: -1 | 1): Prosess {
  const plass = finnSteg(p, id);
  if (!plass) return p;
  const { faseIndeks, indeks, steg } = plass;
  const ny = { ...p, faser: p.faser.map((f) => ({ ...f, steg: [...f.steg] })) };
  const fase = ny.faser[faseIndeks];
  const j = indeks + retning;
  if (j >= 0 && j < fase.steg.length) {
    [fase.steg[indeks], fase.steg[j]] = [fase.steg[j], fase.steg[indeks]];
    return ny;
  }
  const nabo = ny.faser[faseIndeks + retning];
  if (!nabo) return p;
  fase.steg.splice(indeks, 1);
  if (retning === 1) nabo.steg.unshift(steg);
  else nabo.steg.push(steg);
  return ny;
}

export function slettSteg(p: Prosess, id: string): Prosess {
  return { ...p, faser: p.faser.map((f) => ({ ...f, steg: f.steg.filter((s) => s.id !== id) })) };
}

export function dupliserSteg(p: Prosess, id: string): { prosess: Prosess; nyId: string } {
  const plass = finnSteg(p, id);
  if (!plass) return { prosess: p, nyId: id };
  const kopi: Steg = { ...structuredClone(plass.steg), id: nyId('s'), tittel: plass.steg.tittel + ' (kopi)' };
  return { prosess: settInnSteg(p, plass.fase.id, plass.indeks + 1, kopi), nyId: kopi.id };
}

/* ── Faser ─────────────────────────────────────────────────── */

export function oppdaterFase(p: Prosess, id: string, felt: Partial<Omit<Fase, 'id' | 'steg'>>): Prosess {
  return medFase(p, id, (f) => {
    const ny: Fase = { ...f, ...felt };
    if (ny.gjelder === undefined) delete ny.gjelder;
    if (!ny.undertittel) delete ny.undertittel;
    return ny;
  });
}

export function settInnFase(p: Prosess, indeks: number, fase: Fase): Prosess {
  const faser = [...p.faser];
  faser.splice(Math.max(0, Math.min(indeks, faser.length)), 0, fase);
  return { ...p, faser };
}

export function flyttFase(p: Prosess, id: string, retning: -1 | 1): Prosess {
  const i = p.faser.findIndex((f) => f.id === id);
  const j = i + retning;
  if (i < 0 || j < 0 || j >= p.faser.length) return p;
  const faser = [...p.faser];
  [faser[i], faser[j]] = [faser[j], faser[i]];
  return { ...p, faser };
}

export function slettFase(p: Prosess, id: string): Prosess {
  return { ...p, faser: p.faser.filter((f) => f.id !== id) };
}

/* ── Regler ────────────────────────────────────────────────── */

/** Én linje i regelbyggeren: «<spørsmål> er/er ikke <svar …>». */
export interface Regel {
  steg: string;
  er: string[];
  ikke: boolean;
}

/**
 * Gjør en betingelse om til enkle regler som kan vises i skjemaet.
 * Returnerer null hvis betingelsen er for avansert for regelbyggeren.
 */
export function tilRegler(b: Betingelse | undefined): Regel[] | null {
  if (!b) return [];
  const en = (x: Betingelse): Regel | null => {
    if ('steg' in x) return { steg: x.steg, er: Array.isArray(x.er) ? x.er : [x.er], ikke: false };
    if ('ikke' in x && 'steg' in x.ikke) return { steg: x.ikke.steg, er: Array.isArray(x.ikke.er) ? x.ikke.er : [x.ikke.er], ikke: true };
    return null;
  };
  const deler = 'alle' in b ? b.alle : [b];
  const ut = deler.map(en);
  return ut.every(Boolean) ? (ut as Regel[]) : null;
}

export function fraRegler(regler: Regel[]): Betingelse | undefined {
  const gyldige = regler.filter((r) => r.steg && r.er.length);
  const deler: Betingelse[] = gyldige.map((r) => {
    const b: Betingelse = { steg: r.steg, er: r.er.length === 1 ? r.er[0] : r.er };
    return r.ikke ? { ikke: b } : b;
  });
  if (!deler.length) return undefined;
  return deler.length === 1 ? deler[0] : { alle: deler };
}

/** Steg som bruker svaret fra `stegId` i en regel (for advarsel før sletting). */
export function brukesAv(p: Prosess, stegId: string): string[] {
  const treff = (b?: Betingelse): boolean => {
    if (!b) return false;
    if ('steg' in b) return b.steg === stegId;
    if ('ikke' in b) return treff(b.ikke);
    return ('alle' in b ? b.alle : b.noen).some(treff);
  };
  const ut: string[] = [];
  for (const f of p.faser) {
    if (treff(f.gjelder)) ut.push(`Fasen «${f.tittel}»`);
    for (const s of f.steg) if (treff(s.gjelder)) ut.push(`«${s.tittel}»`);
  }
  return ut;
}

/** Alle spørsmål (steg med valg) som kommer FØR et gitt steg — de kan brukes i regler. */
export function sporsmalFor(p: Prosess, stegId?: string): Steg[] {
  const ut: Steg[] = [];
  for (const f of p.faser) {
    for (const s of f.steg) {
      if (s.id === stegId) return ut;
      if (s.valg) ut.push(s);
    }
  }
  return ut;
}
