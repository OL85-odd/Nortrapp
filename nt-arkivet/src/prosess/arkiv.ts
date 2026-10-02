import { db, oppdater } from '../data/store';
import type { Kort, Stasjon } from '../data/types';
import { bruker } from '../ui/settings';
import { beskrivProsessEndringer } from './redigering/endringer';
import type { Kategori, Prosess, ProsessPost, ProsessVersjon, Prosjekt } from './types';

/* ─────────────────────────────────────────────────────────────
   Prosessarkivet: alle prosesser med ID, kategori og versjoner.

   - `nr` (NT-PRO-001) settes én gang og endres aldri, så QR-koder
     som henger på veggen alltid virker.
   - Hver publisering lagrer hele innholdet som en ny versjon.
   - Et prosjekt er låst til versjonen det ble startet på.
   ───────────────────────────────────────────────────────────── */

export function hentPost(id: string): ProsessPost | undefined {
  return db.value.prosesser.find((p) => p.id === id);
}

export function hentPostForNr(nr: string): ProsessPost | undefined {
  const n = nr.toUpperCase();
  return db.value.prosesser.find((p) => p.nr === n);
}

export function sisteVersjon(post: ProsessPost): ProsessVersjon {
  return post.versjoner[post.versjoner.length - 1];
}

/** Gjeldende (siste publiserte) innhold. */
export function gjeldende(id: string): Prosess | undefined {
  const post = hentPost(id);
  return post && sisteVersjon(post).prosess;
}

/** Innholdet prosjektet er låst til. Faller tilbake til gjeldende hvis versjonen mangler. */
export function prosessForProsjekt(p: Pick<Prosjekt, 'prosessId' | 'prosessVersjon'>): Prosess {
  const post = hentPost(p.prosessId);
  if (!post) throw new Error(`Ukjent prosess: ${p.prosessId}`);
  return (post.versjoner.find((v) => v.nr === p.prosessVersjon) ?? sisteVersjon(post)).prosess;
}

export function nyesteVersjonsnr(id: string): number {
  const post = hentPost(id);
  return post ? sisteVersjon(post).nr : 1;
}

/** Neste ledige nummer i kategorien: NT-MAS-001, NT-MAS-002 … */
export function nesteNr(kategori: Kategori, alle: ProsessPost[] = db.value.prosesser): string {
  const brukt = alle
    .filter((p) => p.kategori === kategori)
    .map((p) => Number(p.nr.split('-').pop()))
    .filter((n) => !Number.isNaN(n));
  const neste = (brukt.length ? Math.max(...brukt) : 0) + 1;
  return `NT-${kategori}-${String(neste).padStart(3, '0')}`;
}

/** Hvilke stasjoner/fliser peker på prosessen. */
export function stasjonerFor(prosessId: string, kort: Kort[] = db.value.kort): { kort: Kort; stasjon: Stasjon }[] {
  const ut: { kort: Kort; stasjon: Stasjon }[] = [];
  for (const k of kort) for (const s of k.stasjoner.flatMap((x) => [x, ...(x.grener ?? [])])) if (s.prosessId === prosessId) ut.push({ kort: k, stasjon: s });
  return ut;
}

/** Oppretter en ny prosess (fra en mal) og kobler den eventuelt til en stasjon. */
export async function opprettProsess(innhold: Prosess, kategori: Kategori, stasjonId?: string): Promise<ProsessPost> {
  const id = innhold.id;
  const post: ProsessPost = {
    id,
    nr: nesteNr(kategori),
    kategori,
    opprettet: new Date().toISOString(),
    versjoner: [{ nr: 1, dato: new Date().toISOString(), brukerId: bruker.value, kommentar: 'Opprettet.', endringer: [], prosess: innhold }],
  };
  await oppdater((d) => ({
    ...d,
    prosesser: [...d.prosesser, post],
    kort: stasjonId ? kobleIKort(d.kort, stasjonId, id) : d.kort,
  }));
  return post;
}

/** Setter (eller fjerner) prosessen på en stasjon direkte i det publiserte kartet. */
export function kobleIKort(kort: Kort[], stasjonId: string, prosessId: string | undefined): Kort[] {
  const koble = (s: Stasjon): Stasjon => ({
    ...s,
    prosessId: s.id === stasjonId ? prosessId : s.prosessId,
    status: s.id === stasjonId && prosessId ? 'aktiv' : s.status,
    grener: s.grener?.map(koble),
  });
  return kort.map((k) => ({ ...k, stasjoner: k.stasjoner.map(koble) }));
}

export function kobleStasjon(stasjonId: string, prosessId: string | undefined) {
  return oppdater((d) => ({ ...d, kort: kobleIKort(d.kort, stasjonId, prosessId) }));
}

export async function publiserProsess(id: string, innhold: Prosess, kommentar: string) {
  const post = hentPost(id);
  if (!post) return;
  const forrige = sisteVersjon(post);
  const versjon: ProsessVersjon = {
    nr: forrige.nr + 1,
    dato: new Date().toISOString(),
    brukerId: bruker.value,
    kommentar,
    endringer: beskrivProsessEndringer(forrige.prosess, innhold),
    prosess: { ...innhold, oppdatert: new Date().toISOString().slice(0, 10) },
  };
  await oppdater((d) => ({ ...d, prosesser: d.prosesser.map((p) => (p.id === id ? { ...p, versjoner: [...p.versjoner, versjon] } : p)) }));
}

/** Gjør en gammel versjon gjeldende igjen — som en ny versjon, så ingenting går tapt. */
export async function tilbakestillProsess(id: string, nr: number) {
  const post = hentPost(id);
  const gammel = post?.versjoner.find((v) => v.nr === nr);
  if (gammel) await publiserProsess(id, gammel.prosess, `Tilbakestilt til versjon ${nr}`);
}

export function settServerAdresse(adresse: string) {
  return oppdater((d) => ({ ...d, innstillinger: { ...d.innstillinger, serverAdresse: adresse.trim() || undefined } }));
}

/** Adressen QR-koden peker på. Uten serveradresse brukes adressen appen er åpnet fra. */
export function qrAdresse(nr: string): string {
  const base = db.value.innstillinger.serverAdresse || location.href.split('#')[0];
  return `${base.replace(/\/?$/, base.includes('.html') ? '' : '/')}#/q/${nr}`;
}
