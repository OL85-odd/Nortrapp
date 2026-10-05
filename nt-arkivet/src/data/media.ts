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
  return 'media:' + id;
}

const urler = new Map<string, string>();

export async function mediaUrl(ref: string): Promise<string | null> {
  if (urler.has(ref)) return urler.get(ref)!;
  try {
    const blob = await transaksjon<Blob | undefined>('readonly', (s) => s.get(ref.slice(6)) as IDBRequest<Blob | undefined>);
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
