import type { Kort, KortType, Stasjon } from '../data/types';

/* ─────────────────────────────────────────────────────────────
   Redigeringsoperasjoner på kartet.
   Alle er «rene»: de tar inn en liste med kort og gir tilbake en NY
   liste, uten å endre originalen. Det gjør angre og publisering enkelt,
   og funksjonene kan testes uten nettleser (se ops.test.ts).
   ───────────────────────────────────────────────────────────── */

/** Hvor en stasjon befinner seg i treet. */
export interface Plassering {
  kort: Kort;
  /** Stasjonen som eier grenen, hvis stasjonen er en gren. */
  forelder: Stasjon | null;
  /** Listen stasjonen ligger i (kort.stasjoner eller forelder.grener). */
  liste: Stasjon[];
  indeks: number;
  stasjon: Stasjon;
}

export function finn(kort: Kort[], id: string): Plassering | null {
  for (const k of kort) {
    for (let i = 0; i < k.stasjoner.length; i++) {
      const s = k.stasjoner[i];
      if (s.id === id) return { kort: k, forelder: null, liste: k.stasjoner, indeks: i, stasjon: s };
      const gi = s.grener?.findIndex((g) => g.id === id) ?? -1;
      if (gi >= 0) return { kort: k, forelder: s, liste: s.grener!, indeks: gi, stasjon: s.grener![gi] };
    }
  }
  return null;
}

/** Bytter ut listen der stasjonen `id` ligger. */
function endreListe(kort: Kort[], id: string, fn: (liste: Stasjon[], indeks: number) => Stasjon[]): Kort[] {
  const p = finn(kort, id);
  if (!p) return kort;
  const nyListe = fn([...p.liste], p.indeks);
  return kort.map((k) => {
    if (k.id !== p.kort.id) return k;
    if (!p.forelder) return { ...k, stasjoner: nyListe };
    return {
      ...k,
      stasjoner: k.stasjoner.map((s) =>
        s.id === p.forelder!.id ? { ...s, grener: nyListe.length ? nyListe : undefined } : s,
      ),
    };
  });
}

export function oppdaterStasjon(kort: Kort[], id: string, felt: Partial<Omit<Stasjon, 'id'>>): Kort[] {
  return endreListe(kort, id, (liste, i) => {
    liste[i] = { ...liste[i], ...felt };
    return liste;
  });
}

/** Setter inn en ny stasjon i et kort på gitt posisjon. */
export function settInn(kort: Kort[], kortId: string, indeks: number, ny: Stasjon): Kort[] {
  return kort.map((k) => {
    if (k.id !== kortId) return k;
    const st = [...k.stasjoner];
    st.splice(Math.max(0, Math.min(indeks, st.length)), 0, ny);
    return { ...k, stasjoner: st };
  });
}

/** Setter inn en ny stasjon rett før eller etter en eksisterende (også blant grener). */
export function settInnVed(kort: Kort[], id: string, hvor: 'for' | 'etter', ny: Stasjon): Kort[] {
  return endreListe(kort, id, (liste, i) => {
    liste.splice(hvor === 'for' ? i : i + 1, 0, ny);
    return liste;
  });
}

export function leggTilGren(kort: Kort[], forelderId: string, ny: Stasjon): Kort[] {
  const p = finn(kort, forelderId);
  if (!p || p.forelder) return kort; // grener kan ikke ha egne grener
  return oppdaterStasjon(kort, forelderId, { grener: [...(p.stasjon.grener ?? []), ny] });
}

/** Flytter en stasjon ett steg frem (+1) eller tilbake (-1) i sin liste. */
export function flytt(kort: Kort[], id: string, retning: -1 | 1): Kort[] {
  return endreListe(kort, id, (liste, i) => {
    const j = i + retning;
    if (j < 0 || j >= liste.length) return liste;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    return liste;
  });
}

export function slett(kort: Kort[], id: string): Kort[] {
  return endreListe(kort, id, (liste, i) => {
    liste.splice(i, 1);
    return liste;
  });
}

/** Flytter en stasjon (med grener) til slutten av et annet kort. */
export function flyttTilKort(kort: Kort[], id: string, tilKortId: string): Kort[] {
  const p = finn(kort, id);
  if (!p || p.kort.id === tilKortId) return kort;
  const maal = kort.find((k) => k.id === tilKortId);
  if (!maal) return kort;
  // Samlinger har ikke grener: grenene blir egne fliser.
  const flyttes = maal.type === 'samling' ? [{ ...p.stasjon, grener: undefined }, ...(p.stasjon.grener ?? [])] : [p.stasjon];
  const uten = slett(kort, id);
  return uten.map((k) => (k.id === tilKortId ? { ...k, stasjoner: [...k.stasjoner, ...flyttes] } : k));
}

/* ── Kort ──────────────────────────────────────────────────── */

export function leggTilKort(kort: Kort[], nytt: Kort): Kort[] {
  return [...kort, nytt];
}

export function oppdaterKort(kort: Kort[], id: string, felt: Partial<Omit<Kort, 'id' | 'stasjoner'>>): Kort[] {
  return kort.map((k) => {
    if (k.id !== id) return k;
    const neste = { ...k, ...felt };
    // Blir en linje til en samling, blir grenene egne fliser.
    if (felt.type === 'samling' && k.type === 'linje') {
      neste.stasjoner = k.stasjoner.flatMap((s) => [{ ...s, grener: undefined }, ...(s.grener ?? [])]);
    }
    return neste;
  });
}

export function flyttKort(kort: Kort[], id: string, retning: -1 | 1): Kort[] {
  const i = kort.findIndex((k) => k.id === id);
  const j = i + retning;
  if (i < 0 || j < 0 || j >= kort.length) return kort;
  const ny = [...kort];
  [ny[i], ny[j]] = [ny[j], ny[i]];
  return ny;
}

export function slettKort(kort: Kort[], id: string): Kort[] {
  return kort.filter((k) => k.id !== id);
}

export function nyttKort(id: string, type: KortType): Kort {
  return {
    id,
    type,
    navn: type === 'linje' ? 'Ny linje' : 'Ny samling',
    kode: type === 'linje' ? 'L' : 'S',
    farge: 'gra',
    stasjoner: [],
  };
}
