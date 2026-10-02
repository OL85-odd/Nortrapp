/* Slår opp bilder og dokumenter som hører til prosessene.
   Vite bygger dem inn i appen, så de virker uten nett. */

const filer = import.meta.glob('./*/bilder/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const etterNavn = new Map(Object.entries(filer).map(([sti, url]) => [sti.split('/').pop()!, url]));

export function bildeUrl(fil: string): string {
  return etterNavn.get(fil) ?? fil;
}
