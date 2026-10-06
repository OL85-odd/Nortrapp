import { useEffect, useState } from 'preact/hooks';

/* ─────────────────────────────────────────────────────────────
   Bilder som lastes opp i appen (dra inn, lim inn, velg fil).

   Lagres i nettleserens database (IndexedDB), som tåler mye mer enn
   vanlig lagring. Når appen flyttes til serveren, lagres de i
   NT-Arkivet\media\ i stedet — resten av appen merker ingen forskjell.

   Et bilde refereres som «media:<id>» i prosessinnholdet.
   ───────────────────────────────────────────────────────────── */

const DB_NAVN = 'nt-arkivet-media';
const LAGER = 'filer';

function apne(): Promise<IDBDatabase> {
  return new Promise((ok, feil) => {
    const req = indexedDB.open(DB_NAVN, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(LAGER);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => feil(req.error);
  });
}

async function transaksjon<T>(modus: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await apne();
  return new Promise((ok, feil) => {
    const req = fn(db.transaction(LAGER, modus).objectStore(LAGER));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => feil(req.error);
  });
}

/** Skjermbilder blir store som PNG. Gjør om til WebP og begrens bredden. */
async function komprimer(fil: Blob): Promise<Blob> {
  if (!fil.type.startsWith('image/') || fil.type === 'image/svg+xml' || fil.type === 'image/gif') return fil;
  try {
    const bilde = await createImageBitmap(fil);
    const skala = Math.min(1, 1600 / bilde.width);
    const c = document.createElement('canvas');
    c.width = Math.round(bilde.width * skala);
    c.height = Math.round(bilde.height * skala);
    c.getContext('2d')!.drawImage(bilde, 0, 0, c.width, c.height);
    const ut = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/webp', 0.85));
    return ut && ut.size < fil.size ? ut : fil;
  } catch {
    return fil;
  }
}

export async function lagreMedia(fil: Blob): Promise<string> {
  return lagreFil(await komprimer(fil));
}

/** Lagrer en fil uendret (f.eks. original-PDF-en til en ordrebekreftelse). */
export async function lagreFil(fil: Blob): Promise<string> {
  const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await transaksjon('readwrite', (s) => s.put(fil, id));
  await mediaKroker.lagret?.(id, fil);
  return 'media:' + id;
}

/** Fellesmappen kobler seg på her: nye filer skrives dit, og filer som mangler lokalt hentes derfra. */
export const mediaKroker: { lagret?: (id: string, fil: Blob) => Promise<void>; hent?: (id: string) => Promise<Blob | null> } = {};

const ENDELSER: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
};

export function filendelse(fil: Blob): string {
  return ENDELSER[fil.type] ?? 'bin';
}

export const TYPER: Record<string, string> = Object.fromEntries(Object.entries(ENDELSER).map(([t, e]) => [e, t]));

/** Alle filer i den lokale mediabasen (til backup). */
export async function alleMedia(): Promise<Map<string, Blob>> {
  const db = await apne();
  return new Promise((ok, feil) => {
    const ut = new Map<string, Blob>();
    const req = db.transaction(LAGER, 'readonly').objectStore(LAGER).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return ok(ut);
      ut.set(String(c.key), c.value as Blob);
      c.continue();
    };
    req.onerror = () => feil(req.error);
  });
}

/** Legger en fil inn med kjent id (gjenoppretting og henting fra fellesmappen). */
export async function settMedia(id: string, fil: Blob) {
  await transaksjon('readwrite', (s) => s.put(fil, id));
}

export async function hentMedia(ref: string): Promise<Blob | null> {
  const id = ref.replace(/^media:/, '');
  const lokal = await transaksjon<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>).catch(() => undefined);
  if (lokal) return lokal;
  const fra = await mediaKroker.hent?.(id);
  if (fra) await settMedia(id, fra);
  return fra ?? null;
}

const urler = new Map<string, string>();

export async function mediaUrl(ref: string): Promise<string | null> {
  if (urler.has(ref)) return urler.get(ref)!;
  try {
    const blob = await hentMedia(ref);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urler.set(ref, url);
    return url;
  } catch {
    return null;
  }
}

/** Gir en visbar adresse for «media:…»-referanser (tom til den er hentet). */
export function useMediaUrl(ref: string): string | null {
  const [url, setUrl] = useState<string | null>(urler.get(ref) ?? null);
  useEffect(() => {
    let aktiv = true;
    mediaUrl(ref).then((u) => aktiv && setUrl(u));
    return () => {
      aktiv = false;
    };
  }, [ref]);
  return url;
}
