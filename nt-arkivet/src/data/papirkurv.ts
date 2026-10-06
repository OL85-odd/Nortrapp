import { kobleIKort, stasjonerFor } from '../prosess/arkiv';
import { bruker } from '../ui/settings';
import { db, oppdater } from './store';
import type { Database, PapirkurvPost } from './types';

/* ─────────────────────────────────────────────────────────────
   Papirkurv: slettede prosjekter og prosesser flyttes hit i stedet
   for å forsvinne. De kan gjenopprettes i 30 dager.
   ───────────────────────────────────────────────────────────── */

export const PAPIRKURV_DAGER = 30;

export function dagerIgjen(p: PapirkurvPost, naa = Date.now()): number {
  return Math.max(0, PAPIRKURV_DAGER - Math.floor((naa - Date.parse(p.slettet)) / 86_400_000));
}

export function slettProsjekt(prosjektId: string) {
  return oppdater((d) => {
    const p = d.prosjekter.find((x) => x.id === prosjektId);
    if (!p) return d;
    const post: PapirkurvPost = { id: p.id, type: 'prosjekt', navn: p.nummer, slettet: new Date().toISOString(), brukerId: bruker.value, prosjekt: p };
    return { ...d, prosjekter: d.prosjekter.filter((x) => x.id !== prosjektId), papirkurv: [post, ...d.papirkurv] };
  });
}

/** Prosjekter (ikke øvinger) som bruker prosessen. En prosess i bruk kan ikke slettes. */
export function brukesAvProsjekter(prosessId: string): number {
  return db.value.prosjekter.filter((p) => p.prosessId === prosessId && p.type !== 'ovelse').length;
}

export function slettProsess(prosessId: string) {
  const steder = stasjonerFor(prosessId).map((s) => s.stasjon.id);
  return oppdater((d) => {
    const post = d.prosesser.find((x) => x.id === prosessId);
    if (!post) return d;
    const navn = post.versjoner[post.versjoner.length - 1]?.prosess.navn ?? post.nr;
    const ny: PapirkurvPost = {
      id: post.id,
      type: 'prosess',
      navn: `${post.nr} ${navn}`,
      slettet: new Date().toISOString(),
      brukerId: bruker.value,
      prosess: { ...post, stasjoner: steder },
    };
    let kort = d.kort;
    for (const s of steder) kort = kobleIKort(kort, s, undefined);
    return {
      ...d,
      kort,
      prosesser: d.prosesser.filter((x) => x.id !== prosessId),
      // Øvinger på prosessen forsvinner sammen med den.
      prosjekter: d.prosjekter.filter((p) => p.prosessId !== prosessId),
      papirkurv: [ny, ...d.papirkurv],
    };
  });
}

export function gjenopprett(id: string) {
  return oppdater((d) => {
    const post = d.papirkurv.find((x) => x.id === id);
    if (!post) return d;
    const papirkurv = d.papirkurv.filter((x) => x !== post);
    if (post.prosjekt) return { ...d, papirkurv, prosjekter: [post.prosjekt, ...d.prosjekter] };
    if (post.prosess) {
      const { stasjoner = [], ...prosess } = post.prosess;
      let kort = d.kort;
      for (const s of stasjoner) kort = kobleIKort(kort, s, prosess.id);
      return { ...d, papirkurv, kort, prosesser: [...d.prosesser, prosess] };
    }
    return d;
  });
}

export function slettForGodt(id: string) {
  return oppdater((d) => fjern(d, (p) => p.id === id));
}

/** Fjerner alt som har ligget i papirkurven lenger enn 30 dager. */
export function tomUtlopte(d: Database, naa = Date.now()): Database {
  return d.papirkurv.some((p) => dagerIgjen(p, naa) === 0) ? fjern(d, (p) => dagerIgjen(p, naa) === 0) : d;
}

function fjern(d: Database, hvilke: (p: PapirkurvPost) => boolean): Database {
  const ut = d.papirkurv.filter(hvilke);
  // Prosessnumre brukes aldri på nytt, så gamle QR-lapper ikke peker på feil prosess.
  const nr = ut.flatMap((p) => (p.prosess ? [p.prosess.nr] : []));
  return {
    ...d,
    papirkurv: d.papirkurv.filter((p) => !hvilke(p)),
    innstillinger: nr.length ? { ...d.innstillinger, brukteNr: [...(d.innstillinger.brukteNr ?? []), ...nr] } : d.innstillinger,
  };
}
