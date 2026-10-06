import { strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { minneFs, type Fs } from './fs';

/* Zip-filer for backup. Bilder og PDF-er er allerede komprimert og lagres som de er. */

const KOMPRIMERT = /\.(jpe?g|png|webp|gif|pdf|zip|gz)$/i;

export async function lagZip(filer: Map<string, Blob | string>): Promise<Blob> {
  const innhold: Zippable = {};
  for (const [sti, data] of filer) {
    const u8 = typeof data === 'string' ? strToU8(data) : new Uint8Array(await data.arrayBuffer());
    innhold[sti] = [u8, { level: KOMPRIMERT.test(sti) ? 0 : 6 }];
  }
  return new Blob([zipSync(innhold) as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}

/** Åpner en zip-fil som et filsystem i minnet. */
export async function lesZip(fil: Blob): Promise<Fs & { filer: Map<string, Blob> }> {
  const filer = new Map<string, Blob>();
  for (const [sti, u8] of Object.entries(unzipSync(new Uint8Array(await fil.arrayBuffer())))) {
    if (!sti.endsWith('/')) filer.set(sti, new Blob([u8 as Uint8Array<ArrayBuffer>]));
  }
  return minneFs(filer);
}
