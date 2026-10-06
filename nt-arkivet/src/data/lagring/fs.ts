/* ─────────────────────────────────────────────────────────────
   Et lite filsystem-grensesnitt. Samme kode skriver til
   fellesmappen (f.eks. M:\NT-Arkivet) og til backup-zip-filer.
   ───────────────────────────────────────────────────────────── */

export interface FilInfo {
  endret: number;
  storrelse: number;
}

export interface Fs {
  les(sti: string): Promise<Blob | null>;
  info(sti: string): Promise<FilInfo | null>;
  skriv(sti: string, data: Blob | string): Promise<void>;
  /** Innholdet i en mappe. Tom liste hvis mappen ikke finnes. */
  liste(mappe: string): Promise<{ navn: string; mappe: boolean }[]>;
  /** Sletter en fil eller en mappe med innhold. Ingen feil hvis den ikke finnes. */
  slett(sti: string): Promise<void>;
}

export async function lesTekst(fs: Fs, sti: string): Promise<string | null> {
  const b = await fs.les(sti);
  return b ? b.text() : null;
}

const deler = (sti: string) => sti.split('/').filter(Boolean);

/** Fellesmappen via nettleserens filsystem-tilgang (Chrome/Edge). */
export function mappeFs(rot: FileSystemDirectoryHandle): Fs {
  async function mappe(d: string[], lag: boolean): Promise<FileSystemDirectoryHandle | null> {
    let h = rot;
    for (const n of d) {
      try {
        h = await h.getDirectoryHandle(n, { create: lag });
      } catch {
        return null;
      }
    }
    return h;
  }
  async function fil(sti: string): Promise<FileSystemFileHandle | null> {
    const d = deler(sti);
    const m = await mappe(d.slice(0, -1), false);
    if (!m) return null;
    try {
      return await m.getFileHandle(d[d.length - 1]);
    } catch {
      return null;
    }
  }
  return {
    async les(sti) {
      const f = await fil(sti);
      return f ? f.getFile() : null;
    },
    async info(sti) {
      const f = await fil(sti);
      if (!f) return null;
      const x = await f.getFile();
      return { endret: x.lastModified, storrelse: x.size };
    },
    async skriv(sti, data) {
      const d = deler(sti);
      const m = await mappe(d.slice(0, -1), true);
      if (!m) throw new Error(`Kunne ikke lage mappen for ${sti}`);
      const f = await m.getFileHandle(d[d.length - 1], { create: true });
      // Nettleseren skriver til en midlertidig fil og bytter den inn først ved close().
      // En backup midt i en lagring får derfor aldri med en halvskrevet fil.
      const w = await f.createWritable();
      await w.write(data);
      await w.close();
    },
    async liste(sti) {
      const m = await mappe(deler(sti), false);
      if (!m) return [];
      const ut: { navn: string; mappe: boolean }[] = [];
      for await (const [navn, h] of m as unknown as AsyncIterable<[string, FileSystemHandle]>) {
        if (!navn.endsWith('.crswap')) ut.push({ navn, mappe: h.kind === 'directory' });
      }
      return ut.sort((a, b) => a.navn.localeCompare(b.navn));
    },
    async slett(sti) {
      const d = deler(sti);
      const m = await mappe(d.slice(0, -1), false);
      try {
        await m?.removeEntry(d[d.length - 1], { recursive: true });
      } catch {
        /* finnes ikke */
      }
    },
  };
}

/** Filsystem i minnet: brukes for zip-filer og i testene. */
export function minneFs(filer = new Map<string, Blob>()): Fs & { filer: Map<string, Blob> } {
  let klokke = 1;
  const tider = new Map<string, number>();
  return {
    filer,
    async les(sti) {
      return filer.get(sti) ?? null;
    },
    async info(sti) {
      const b = filer.get(sti);
      return b ? { endret: tider.get(sti) ?? 0, storrelse: b.size } : null;
    },
    async skriv(sti, data) {
      filer.set(sti, typeof data === 'string' ? new Blob([data]) : data);
      tider.set(sti, klokke++);
    },
    async liste(sti) {
      const pre = sti.replace(/\/?$/, '/');
      const navn = new Map<string, boolean>();
      for (const k of filer.keys()) {
        if (!k.startsWith(pre)) continue;
        const rest = k.slice(pre.length).split('/');
        navn.set(rest[0], rest.length > 1 || navn.get(rest[0]) === true);
      }
      return [...navn].map(([n, m]) => ({ navn: n, mappe: m })).sort((a, b) => a.navn.localeCompare(b.navn));
    },
    async slett(sti) {
      for (const k of [...filer.keys()]) if (k === sti || k.startsWith(sti + '/')) filer.delete(k);
    },
  };
}
