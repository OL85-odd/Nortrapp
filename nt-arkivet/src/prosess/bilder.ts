/* Slår opp bilder og dokumenter som hører til prosessene.
   - Innebygde filer (f.eks. «p1-….webp») bygges inn i appen av Vite.
   - Opplastede bilder («media:…») hentes fra nettleserens database. */

const filer = import.meta.glob('./*/bilder/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const etterNavn = new Map(Object.entries(filer).map(([sti, url]) => [sti.split('/').pop()!, url]));

export function erMedia(fil: string): boolean {
  return fil.startsWith('media:');
}

/** Adressen til en innebygd fil, eller til en lenke/sti som den er. */
export function bildeUrl(fil: string): string {
  return etterNavn.get(fil) ?? fil;
}
