import { signal } from '@preact/signals';
import { filendelse, mediaKroker, alleMedia, TYPER } from '../media';
import { SEED } from '../seed';
import { db, lagringskrok, migrer, settDbStille } from '../store';
import type { Database } from '../types';
import { lesTekst, mappeFs, type Fs } from './fs';
import { DATA, erData, flett, fraFiler, settInn, tilFiler, trygtNavn } from './format';
import { lagZip } from './zip';

/* ─────────────────────────────────────────────────────────────
   Fellesmappen (f.eks. M:\NT-Arkivet på serveren).

   Alle PC-er leser og skriver de samme filene. Mappen kommer da med i
   serverens backup og «Tidligere versjoner». I tillegg:

   • Daglig kopi: backup\nt-arkivet-ÅÅÅÅ-MM-DD.zip, beholdes i 30 dager.
   • Trygg skriving: nettleseren skriver til en midlertidig fil og bytter
     den inn først når den er ferdig.
   • To PC-er samtidig: før en fil skrives, sjekkes det om noen andre har
     endret den. I så fall flettes endringene (begges avkrysninger og
     logglinjer beholdes).
   • Endringer fra andre PC-er hentes inn hvert 15. sekund.
   ───────────────────────────────────────────────────────────── */

export type MappeStatus = 'ingen' | 'ikke-stottet' | 'mangler-tilgang' | 'kobler' | 'tilkoblet' | 'feil';

export interface MappeTilstand {
  status: MappeStatus;
  navn?: string;
  melding?: string;
  /** Sist vi skrev eller leste uten feil. */
  sistSynk?: string;
  sisteKopi?: string;
}

export const mappe = signal<MappeTilstand>({ status: 'ingen' });

export const KOPI_DAGER = 30;
const SJEKK_MS = 15_000;
const MERKE = `${DATA}/endret.txt`;

let fs: Fs | null = null;
/** Innholdet vi sist leste eller skrev, per fil. Grunnlaget for fletting. */
const kjent = new Map<string, string>();
const mapper = new Map<string, string>();
let merke = '';
let ko: Promise<void> = Promise.resolve();
let planlagt = false;
let timer: ReturnType<typeof setInterval> | undefined;
let mediaNavn: Map<string, string> | null = null;

const naa = () => new Date().toISOString();
const dato = (d = new Date()) => d.toISOString().slice(0, 10);

/* ── Husk valgt mappe (i nettleseren) ────────────────────────── */

const OPPSETT_DB = 'nt-arkivet-oppsett';
function oppsett<T>(modus: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((ok, feil) => {
    const r = indexedDB.open(OPPSETT_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('oppsett');
    r.onerror = () => feil(r.error);
    r.onsuccess = () => {
      const q = fn(r.result.transaction('oppsett', modus).objectStore('oppsett'));
      q.onsuccess = () => ok(q.result);
      q.onerror = () => feil(q.error);
    };
  });
}

type Tilgang = { queryPermission(o: object): Promise<PermissionState>; requestPermission(o: object): Promise<PermissionState> };
const tilgang = (h: FileSystemDirectoryHandle) => h as unknown as Tilgang;

export const stottes = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

/* ── Oppstart og tilkobling ──────────────────────────────────── */

/** Kalles når appen starter. Kobler til mappen hvis den er valgt før og tilgangen fortsatt gjelder. */
export async function startMappe() {
  if (!stottes()) return void (mappe.value = { status: 'ikke-stottet' });
  const h = await oppsett<FileSystemDirectoryHandle | undefined>('readonly', (s) => s.get('mappe')).catch(() => undefined);
  if (!h) return void (mappe.value = { status: 'ingen' });
  const t = await tilgang(h).queryPermission({ mode: 'readwrite' });
  if (t === 'granted') await kobleTil(h, 'bruk-mappen');
  else mappe.value = { status: 'mangler-tilgang', navn: h.name };
}

/** Nettleseren krever et klikk for å gi tilgang på nytt (f.eks. etter omstart). */
export async function gjenopptaTilgang() {
  const h = await oppsett<FileSystemDirectoryHandle | undefined>('readonly', (s) => s.get('mappe'));
  if (!h) return;
  if ((await tilgang(h).requestPermission({ mode: 'readwrite' })) === 'granted') await kobleTil(h, 'bruk-mappen');
}

export interface MappeInnhold {
  handle: FileSystemDirectoryHandle;
  harData: boolean;
  prosjekter: number;
  prosesser: number;
}

/** Steg 1: brukeren velger mappen. Vi ser etter om det allerede ligger NT-Arkivet-data der. */
export async function velgMappe(): Promise<MappeInnhold | null> {
  const w = window as unknown as { showDirectoryPicker(o: object): Promise<FileSystemDirectoryHandle> };
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await w.showDirectoryPicker({ id: 'nt-arkivet', mode: 'readwrite' });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null; // avbrutt
    throw e;
  }
  const f = mappeFs(handle);
  const har = await f.info(`${DATA}/innstillinger.json`);
  let prosjekter = 0;
  for (const ar of await f.liste(`${DATA}/prosjekter`)) prosjekter += (await f.liste(`${DATA}/prosjekter/${ar.navn}`)).length;
  return { handle, harData: !!har, prosjekter, prosesser: (await f.liste(`${DATA}/prosesser`)).length };
}

/**
 * Steg 2: koble til.
 * «bruk-mappen»: innholdet i mappen gjelder (en annen PC har satt den opp).
 * «flytt-hit»: innholdet i denne nettleseren skrives til mappen (første gang).
 */
export async function kobleTil(handle: FileSystemDirectoryHandle, valg: 'bruk-mappen' | 'flytt-hit') {
  mappe.value = { status: 'kobler', navn: handle.name, melding: 'Kobler til …' };
  try {
    const f = mappeFs(handle);
    fs = f;
    kjent.clear();
    mapper.clear();
    mediaNavn = null;
    if (valg === 'bruk-mappen') {
      const lest = await fraFiler(f);
      if (lest) {
        if ((lest.db.skjema as number) > SEED.skjema) throw new Error('Mappen er laget med en nyere versjon av NT-Arkivet. Bruk den nyeste HTML-filen.');
        for (const [k, v] of lest.tekster) kjent.set(k, v);
        for (const [k, v] of lest.mapper) mapper.set(k, v);
        settDbStille(migrer(lest.db));
      }
    } else {
      mappe.value = { ...mappe.value, melding: 'Kopierer bilder og dokumenter …' };
      for (const [id, blob] of await alleMedia()) await f.skriv(`media/${id}.${filendelse(blob)}`, blob);
    }
    await oppsett('readwrite', (s) => s.put(handle, 'mappe'));
    if (!(await f.info('LES-MEG.txt'))) await f.skriv('LES-MEG.txt', LES_MEG);
    merke = (await lesTekst(f, MERKE)) ?? '';
    mediaKroker.lagret = async (id, blob) => {
      await koSkriv(`media/${id}.${filendelse(blob)}`, blob);
      mediaNavn?.set(id, `${id}.${filendelse(blob)}`);
    };
    mediaKroker.hent = hentMediaFraMappe;
    lagringskrok.etter = () => planlegg();
    mappe.value = { status: 'tilkoblet', navn: handle.name, sistSynk: naa() };
    // Skriv det som mangler eller er endret (alt, første gang med «flytt-hit»).
    planlegg();
    await ko;
    await dagligKopi();
    clearInterval(timer);
    timer = setInterval(() => void sjekk(), SJEKK_MS);
    window.addEventListener('focus', fokus);
  } catch (e) {
    console.error(e);
    fs = null;
    mappe.value = { status: 'feil', navn: handle.name, melding: e instanceof Error ? e.message : String(e) };
  }
}

const fokus = () => void sjekk();

export async function kobleFra() {
  clearInterval(timer);
  window.removeEventListener('focus', fokus);
  lagringskrok.etter = undefined;
  mediaKroker.lagret = undefined;
  mediaKroker.hent = undefined;
  fs = null;
  await oppsett('readwrite', (s) => s.delete('mappe'));
  mappe.value = { status: 'ingen' };
}

/* ── Skriving ────────────────────────────────────────────────── */

function feil(e: unknown) {
  console.error(e);
  mappe.value = { ...mappe.value, status: 'feil', melding: `Kunne ikke lagre i fellesmappen: ${e instanceof Error ? e.message : String(e)}. Endringen er lagret på denne PC-en og prøves igjen.` };
}

function koSkriv(sti: string, data: Blob | string) {
  const f = fs;
  if (!f) return Promise.resolve();
  ko = ko.then(() => f.skriv(sti, data)).catch(feil);
  return ko;
}

/** Skriver alt som er endret siden sist. Flere endringer rett etter hverandre slås sammen. */
function planlegg() {
  if (planlagt || !fs) return;
  planlagt = true;
  ko = ko
    .then(async () => {
      planlagt = false;
      await skrivEndringer();
    })
    .catch(feil);
}

async function skrivEndringer() {
  const f = fs;
  if (!f) return;
  const filer = tilFiler(db.value, mapper);
  let skrevet = 0;
  let flettet = false;
  for (const [sti, tekst] of filer) {
    if (kjent.get(sti) === tekst) continue;
    let ut = tekst;
    if (erData(sti)) {
      const disk = await lesTekst(f, sti);
      const base = kjent.get(sti);
      if (disk !== null && disk !== tekst && disk !== base) {
        // Noen andre har endret filen siden vi leste den: flett.
        ut = JSON.stringify(flett(base === undefined ? undefined : JSON.parse(base), JSON.parse(tekst), JSON.parse(disk)), null, 2);
        if (ut !== tekst) {
          settDbStille(settInn(db.value, sti, ut));
          flettet = true;
        }
      }
    }
    await f.skriv(sti, ut);
    kjent.set(sti, ut);
    skrevet++;
  }
  // Prosesser og prosjekter som er borte (flyttet til papirkurven) fjernes fra mappen.
  // Mappen med logg og dokumenter blir liggende.
  for (const sti of [...kjent.keys()]) {
    if (filer.has(sti) || !(sti.endsWith('/prosjekt.json') || sti.startsWith(`${DATA}/prosesser/`))) continue;
    await f.slett(sti);
    kjent.delete(sti);
    skrevet++;
  }
  if (skrevet) {
    merke = `${naa()} ${Math.random().toString(36).slice(2, 8)}`;
    await f.skriv(MERKE, merke);
    mappe.value = { ...mappe.value, status: 'tilkoblet', melding: undefined, sistSynk: naa() };
  }
  if (flettet) planlegg(); // logg.txt o.l. for det flettede innholdet
}

/* ── Endringer fra andre PC-er ───────────────────────────────── */

let sjekker = false;

/** Ser etter endringer fra andre PC-er. Leser bare én liten fil, med mindre noe er endret. */
export function sjekk(): Promise<void> {
  if (!fs || sjekker) return ko;
  sjekker = true;
  // Går i samme kø som skrivingen, så en sjekk aldri blandes med en halvferdig lagring.
  ko = ko
    .then(async () => {
      const f = fs;
      if (!f) return;
      if (mappe.value.status === 'feil') await skrivEndringer(); // prøv igjen
      if (dato() !== kopiDato(mappe.value.sisteKopi)) await dagligKopi();
      const nytt = (await lesTekst(f, MERKE)) ?? '';
      if (nytt === merke) return;
      const lest = await fraFiler(f);
      merke = nytt;
      if (!lest) return;
      // Herfra og ned: ingen venting, så lokale endringer kan ikke komme imellom.
      let d = db.value;
      const vaare = tilFiler(d, mapper);
      const stier = new Set([...lest.tekster.keys(), ...[...kjent.keys()].filter(erData)]);
      let endret = false;
      for (const sti of stier) {
        const deres = lest.tekster.get(sti) ?? null;
        const base = kjent.get(sti);
        if (deres === base || (deres === null && base === undefined)) continue;
        const vaar = vaare.get(sti);
        if (vaar === undefined || vaar === base) {
          d = settInn(d, sti, deres); // ingen lokale endringer: ta deres
        } else if (deres !== null) {
          d = settInn(d, sti, JSON.stringify(flett(base === undefined ? undefined : JSON.parse(base), JSON.parse(vaar), JSON.parse(deres)), null, 2));
        }
        if (deres === null) kjent.delete(sti);
        else kjent.set(sti, deres);
        endret = true;
      }
      for (const [k, v] of lest.mapper) mapper.set(k, v);
      if (endret) settDbStille(d);
      mappe.value = { ...mappe.value, sistSynk: naa() };
      if (endret) planlegg(); // skriv tilbake det som ble flettet
    })
    .catch(feil)
    .finally(() => {
      sjekker = false;
    });
  return ko;
}

const kopiDato = (navn?: string) => /(\d{4}-\d{2}-\d{2})/.exec(navn ?? '')?.[1];

/* ── Media og dokumenter ─────────────────────────────────────── */

async function hentMediaFraMappe(id: string): Promise<Blob | null> {
  const f = fs;
  if (!f) return null;
  if (!mediaNavn) mediaNavn = new Map((await f.liste('media')).map((x) => [x.navn.replace(/\.[^.]+$/, ''), x.navn]));
  const navn = mediaNavn.get(id);
  if (!navn) return null;
  const b = await f.les(`media/${navn}`);
  return b ? new Blob([b], { type: TYPER[navn.split('.').pop()!] ?? '' }) : null;
}

/** Leselig kopi av et innlest dokument i prosjektmappen (…/dokumenter/). */
export async function kopierDokument(prosjektId: string, navn: string, fil: Blob) {
  if (!fs) return;
  tilFiler(db.value, mapper); // sørger for at prosjektet har en mappe
  const m = mapper.get(prosjektId);
  if (m) await koSkriv(`${m}/dokumenter/${trygtNavn(navn)}`, fil);
}

/** Alle filer i media-mappen (til full backup). */
export async function mediaIMappen(): Promise<Map<string, Blob>> {
  const ut = new Map<string, Blob>();
  if (!fs) return ut;
  for (const x of await fs.liste('media')) {
    const b = await fs.les(`media/${x.navn}`);
    if (b) ut.set(x.navn.replace(/\.[^.]+$/, ''), new Blob([b], { type: TYPER[x.navn.split('.').pop()!] ?? '' }));
  }
  return ut;
}

/** Etter gjenoppretting fra backup: skriv alt på nytt, uten fletting. */
export async function skrivAltPaNytt(media: Map<string, Blob>) {
  const f = fs;
  if (!f) return;
  await ko;
  for (const [id, blob] of media) await f.skriv(`media/${id}.${filendelse(blob)}`, blob);
  for (const sti of [...kjent.keys()]) if (sti.endsWith('/prosjekt.json') || sti.startsWith(`${DATA}/prosesser/`)) await f.slett(sti);
  kjent.clear();
  mapper.clear();
  mediaNavn = null;
  planlegg();
  await ko;
}

/* ── Daglig kopi ─────────────────────────────────────────────── */

export interface Kopi {
  navn: string;
  dato: string;
  storrelse: number;
}

/** Én zip med alle data-filene per dag. Bilder og dokumenter endres aldri etter at de er lagret, så de tas ikke med her. */
async function dagligKopi() {
  const f = fs;
  if (!f) return;
  const navn = `backup/nt-arkivet-${dato()}.zip`;
  if (!(await f.info(navn))) {
    const filer = new Map<string, string>(tilFiler(db.value, mapper));
    filer.set('manifest.json', manifest('daglig kopi'));
    await f.skriv(navn, await lagZip(filer));
  }
  // Slett kopier eldre enn 30 dager.
  const grense = dato(new Date(Date.now() - KOPI_DAGER * 86_400_000));
  for (const k of await kopier()) if (k.dato < grense) await f.slett(`backup/${k.navn}`);
  mappe.value = { ...mappe.value, sisteKopi: navn };
}

export async function kopier(): Promise<Kopi[]> {
  if (!fs) return [];
  const ut: Kopi[] = [];
  for (const x of await fs.liste('backup')) {
    const m = /^nt-arkivet-(\d{4}-\d{2}-\d{2})\.zip$/.exec(x.navn);
    if (m) ut.push({ navn: x.navn, dato: m[1], storrelse: (await fs.info(`backup/${x.navn}`))?.storrelse ?? 0 });
  }
  return ut.sort((a, b) => b.dato.localeCompare(a.dato));
}

export async function lesKopi(navn: string): Promise<Blob | null> {
  return fs ? fs.les(`backup/${navn}`) : null;
}

export function manifest(type: string, ekstra: Record<string, unknown> = {}, d: Database = db.value) {
  return JSON.stringify(
    {
      app: 'NT-Arkivet',
      type,
      laget: naa(),
      skjema: d.skjema,
      prosesser: d.prosesser.length,
      prosjekter: d.prosjekter.length,
      ...ekstra,
    },
    null,
    2,
  );
}

const LES_MEG = `NT-ARKIVET — FELLESMAPPE
========================

Denne mappen er lageret til NT-Arkivet. Alle PC-er leser og skriver her.
Ikke endre eller flytt filene mens appen er i bruk.

data\\                 Alt innhold som lesbare tekstfiler (JSON).
  prosesser\\          Én fil per prosess (NT-PRO-001.json …) med alle versjoner.
  prosjekter\\ÅR\\      Én mappe per prosjekt: prosjekt.json, logg.txt og dokumenter\\.
media\\                Bilder og innleste dokumenter (originalfiler).
backup\\               Daglig kopi av data\\ (beholdes i 30 dager).

Gjenoppretting: åpne NT-Arkivet → Lagring og backup → Gjenopprett.
Mappen bør være med i serverens vanlige backup.
`;
