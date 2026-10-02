import { effect, signal } from '@preact/signals';

/* Innstillinger per maskin (tema og hvem som sitter her).
   Dette er bekvemmelighet, ikke felles data, så det ligger i nettleseren. */

export type Tema = 'auto' | 'lys' | 'mork';

function les(nokkel: string): string | null {
  try {
    return localStorage.getItem(nokkel);
  } catch {
    return null;
  }
}

function skriv(nokkel: string, verdi: string | null) {
  try {
    if (verdi === null) localStorage.removeItem(nokkel);
    else localStorage.setItem(nokkel, verdi);
  } catch {
    /* ignorer */
  }
}

export const tema = signal<Tema>((les('nt-tema') as Tema) || 'auto');
/** Id-en til brukeren som sitter ved maskinen (ikke initialene). */
export const bruker = signal<string | null>(les('nt-bruker'));

effect(() => {
  const t = tema.value;
  skriv('nt-tema', t);
  if (typeof document === 'undefined') return; // tester uten nettleser
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t === 'mork' ? 'dark' : 'light');
});

effect(() => skriv('nt-bruker', bruker.value));

/** Visning i prosjekter: opplæring (ett steg, full forklaring), produksjon (kompakt sjekkliste) eller oversikt (hele stien). */
export type Modus = 'opplaring' | 'produksjon' | 'oversikt';
export const modus = signal<Modus>((les('nt-modus') as Modus) || 'opplaring');
effect(() => skriv('nt-modus', modus.value));

/** Er mørk modus aktiv akkurat nå (inkludert «auto»)? */
export function erMork(): boolean {
  if (tema.value === 'mork') return true;
  if (tema.value === 'lys') return false;
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
}
