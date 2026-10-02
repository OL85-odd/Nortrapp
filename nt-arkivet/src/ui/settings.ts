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
export const bruker = signal<string | null>(les('nt-bruker'));

effect(() => {
  const t = tema.value;
  skriv('nt-tema', t);
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t === 'mork' ? 'dark' : 'light');
});

effect(() => skriv('nt-bruker', bruker.value));

/** Er mørk modus aktiv akkurat nå (inkludert «auto»)? */
export function erMork(): boolean {
  if (tema.value === 'mork') return true;
  if (tema.value === 'lys') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}
