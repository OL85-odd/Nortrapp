import { signal } from '@preact/signals';
import { alleMedia, filendelse, settMedia, TYPER } from '../media';
import { SEED } from '../seed';
import { db, migrer, settDbStille } from '../store';
import type { Database } from '../types';
import { bruker } from '../../ui/settings';
import { lesTekst } from './fs';
import { fraFiler, tilFiler } from './format';
import { manifest, mappe, mediaIMappen, skrivAltPaNytt } from './mappe';
import { lagZip, lesZip } from './zip';

/* ─────────────────────────────────────────────────────────────
   Manuell backup: én zip-fil med ALT — kart, prosesser, prosjekter,
   logg, bilder, innleste dokumenter og upubliserte utkast.
   Samme mappestruktur som fellesmappen, så filen kan leses uten appen.
   ───────────────────────────────────────────────────────────── */

const SIST = 'nt-arkivet.sisteBackup';
/** Utkast som bare ligger i nettleseren (kart og prosesser under redigering). */
const UTKAST = ['nt-arkivet.utkast', 'nt-arkivet.prosessutkast'];

export const sisteBackup = signal<string | null>(lesSist());

function lesSist(): string | null {
  try {
    return localStorage.getItem(SIST);
  } catch {
    return null;
  }
}

export const PAMINN_DAGER = 7;

/** Trenger brukeren en påminnelse? Bare når innholdet bare finnes i denne nettleseren. */
export function trengerBackup(d: Database = db.value, sist = sisteBackup.value, naa = Date.now()): boolean {
  if (mappe.value.status === 'tilkoblet') return false;
  const harInnhold = d.prosjekter.some((p) => p.type !== 'ovelse') || d.prosesser.length > SEED.prosesser.length || d.revisjoner.length > SEED.revisjoner.length;
  if (!harInnhold) return false;
  if (!sist) return true;
  return naa - Date.parse(sist) > PAMINN_DAGER * 86_400_000 && d.oppdatert > sist.slice(0, 10);
}

export async function lagFullBackup(): Promise<{ fil: Blob; navn: string }> {
  const d = db.value;
  const filer = new Map<string, Blob | string>(tilFiler(d, new Map()));
  const media = await alleMedia();
  for (const [id, blob] of await mediaIMappen()) if (!media.has(id)) media.set(id, blob);
  for (const [id, blob] of media) filer.set(`media/${id}.${filendelse(blob)}`, blob);
  const utkast: Record<string, string> = {};
  for (const k of UTKAST) {
    const v = localStorage.getItem(k);
    if (v) utkast[k] = v;
  }
  if (Object.keys(utkast).length) filer.set('utkast.json', JSON.stringify(utkast));
  const av = d.brukere.find((b) => b.id === bruker.value)?.initialer ?? null;
  filer.set('manifest.json', manifest('full backup', { media: media.size, av }, d));
  filer.set(
    'LES-MEG.txt',
    'NT-ARKIVET — FULL BACKUP\r\n\r\nGjenopprett: NT-Arkivet → Lagring og backup → Gjenopprett fra backup.\r\n\r\ndata\\   alt innhold som tekstfiler\r\nmedia\\  bilder og innleste dokumenter\r\n',
  );
  const stempel = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  return { fil: await lagZip(filer), navn: `nt-arkivet-backup-${stempel}.zip` };
}

export async function lastNedBackup() {
  const { fil, navn } = await lagFullBackup();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(fil);
  a.download = navn;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  const naa = new Date().toISOString();
  try {
    localStorage.setItem(SIST, naa);
  } catch {
    /* ikke kritisk */
  }
  sisteBackup.value = naa;
}

export interface LestBackup {
  manifest: { type?: string; laget?: string; av?: string; prosjekter?: number; prosesser?: number; media?: number };
  db: Database;
  media: Map<string, Blob>;
  utkast: Record<string, string>;
}

/** Leser en backup (full eller daglig kopi) uten å endre noe. */
export async function lesBackup(fil: Blob): Promise<LestBackup> {
  const zip = await lesZip(fil);
  const lest = await fraFiler(zip);
  if (!lest) throw new Error('Filen er ikke en backup fra NT-Arkivet.');
  if ((lest.db.skjema as number) > SEED.skjema) throw new Error('Backupen er laget med en nyere versjon av NT-Arkivet. Bruk den nyeste HTML-filen.');
  const media = new Map<string, Blob>();
  for (const [sti, blob] of zip.filer) {
    const m = /^media\/([^/]+)\.([a-z0-9]+)$/i.exec(sti);
    if (m) media.set(m[1], new Blob([blob], { type: TYPER[m[2].toLowerCase()] ?? '' }));
  }
  const utkastTekst = await lesTekst(zip, 'utkast.json');
  return {
    manifest: JSON.parse((await lesTekst(zip, 'manifest.json')) ?? '{}'),
    db: migrer(lest.db),
    media,
    utkast: utkastTekst ? JSON.parse(utkastTekst) : {},
  };
}

/** Erstatter alt med innholdet i backupen. Bilder og dokumenter legges til (ingenting slettes). */
export async function gjenopprettBackup(b: LestBackup) {
  for (const [id, blob] of b.media) await settMedia(id, blob);
  for (const k of UTKAST) {
    if (b.utkast[k]) localStorage.setItem(k, b.utkast[k]);
    else localStorage.removeItem(k);
  }
  settDbStille({ ...b.db, oppdatert: new Date().toISOString().slice(0, 10) });
  if (mappe.value.status === 'tilkoblet') await skrivAltPaNytt(b.media);
}
