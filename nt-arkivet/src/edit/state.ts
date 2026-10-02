import { computed, signal } from '@preact/signals';
import { db, oppdater } from '../data/store';
import type { Kort, Revisjon } from '../data/types';
import { bruker } from '../ui/settings';
import { beskrivEndringer } from './endringer';

/* ─────────────────────────────────────────────────────────────
   Redigeringsmodus.

   - Låses opp med PIN-kode (lagret som hash i databasen).
   - Alle endringer skjer i et UTKAST — det publiserte kartet er
     urørt til du trykker «Publiser» og skriver en kommentar.
   - Utkastet huskes på maskinen, så du kan lukke appen og fortsette.
   - Hver publisering blir en revisjon med hele kartet, så du kan gå
     tilbake til en tidligere versjon.
   ───────────────────────────────────────────────────────────── */

const UTKAST_NOKKEL = 'nt-arkivet.utkast';

export const redigerer = signal(false);
export const utkast = signal<Kort[] | null>(lesUtkast());
const angreStabel = signal<Kort[][]>([]);

/** Kortene som vises: utkastet i redigeringsmodus, ellers det publiserte. */
export const synligeKort = computed(() => (redigerer.value && utkast.value ? utkast.value : db.value.kort));

export const endringer = computed(() => (utkast.value ? beskrivEndringer(db.value.kort, utkast.value) : []));
export const kanAngre = computed(() => angreStabel.value.length > 0);

function lesUtkast(): Kort[] | null {
  try {
    const r = localStorage.getItem(UTKAST_NOKKEL);
    return r ? (JSON.parse(r) as Kort[]) : null;
  } catch {
    return null;
  }
}

function lagreUtkast(k: Kort[] | null) {
  try {
    if (k) localStorage.setItem(UTKAST_NOKKEL, JSON.stringify(k));
    else localStorage.removeItem(UTKAST_NOKKEL);
  } catch {
    /* ignorer */
  }
}

/** Gjør en endring i utkastet. `fn` er en av operasjonene i ops.ts. */
export function endre(fn: (k: Kort[]) => Kort[]) {
  const for_ = utkast.value ?? db.value.kort;
  const etter = fn(for_);
  if (etter === for_) return;
  angreStabel.value = [...angreStabel.value.slice(-49), for_];
  utkast.value = etter;
  lagreUtkast(etter);
}

export function angre() {
  const stabel = angreStabel.value;
  if (!stabel.length) return;
  const forrige = stabel[stabel.length - 1];
  angreStabel.value = stabel.slice(0, -1);
  utkast.value = forrige;
  lagreUtkast(forrige);
}

export function forkast() {
  utkast.value = null;
  angreStabel.value = [];
  lagreUtkast(null);
}

/* ── PIN ───────────────────────────────────────────────────── */

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode('nt-arkivet:' + pin);
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Reserve hvis siden ikke kjører i en sikker kontekst.
  let h = 5381;
  for (const b of data) h = ((h << 5) + h + b) >>> 0;
  return 'djb2-' + h.toString(16);
}

export const harPin = computed(() => !!db.value.pinHash);

export async function settPin(pin: string) {
  const pinHash = await hashPin(pin);
  await oppdater((d) => ({ ...d, pinHash }));
}

export async function lasOpp(pin: string): Promise<boolean> {
  const ok = (await hashPin(pin)) === db.value.pinHash;
  if (ok) redigerer.value = true;
  return ok;
}

export function las() {
  redigerer.value = false;
}

/* ── Publisering og historikk ──────────────────────────────── */

export async function publiser(kommentar: string) {
  const ny = utkast.value;
  if (!ny) return;
  const liste = endringer.value;
  await oppdater((d) => ({
    ...d,
    kort: ny,
    revisjoner: [...d.revisjoner, revisjon(d.revisjoner, kommentar, liste, ny)],
  }));
  forkast();
}

/** Gjør en tidligere revisjon gjeldende igjen — som en NY revisjon, så ingenting går tapt. */
export async function tilbakestill(nr: number) {
  const r = db.value.revisjoner.find((x) => x.nr === nr);
  if (!r) return;
  const liste = beskrivEndringer(db.value.kort, r.kort);
  await oppdater((d) => ({
    ...d,
    kort: r.kort,
    revisjoner: [...d.revisjoner, revisjon(d.revisjoner, `Tilbakestilt til rev. ${nr}`, liste, r.kort)],
  }));
  forkast();
}

function revisjon(alle: Revisjon[], kommentar: string, endringer: string[], kort: Kort[]): Revisjon {
  return {
    nr: (alle[alle.length - 1]?.nr ?? 0) + 1,
    dato: new Date().toISOString(),
    brukerId: bruker.value,
    kommentar,
    endringer,
    kort,
  };
}
