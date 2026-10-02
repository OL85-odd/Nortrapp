import { signal } from '@preact/signals';
import type { Database } from './types';
import { SEED } from './seed';

/* ─────────────────────────────────────────────────────────────
   Datalaget. Appen snakker bare med en «Lager»-adapter, så vi kan
   bytte fra nettleseren til serverfil eller SharePoint uten å
   endre resten av koden.
   ───────────────────────────────────────────────────────────── */

export interface Lager {
  hent(): Promise<Database | null>;
  lagre(db: Database): Promise<void>;
}

const NOKKEL = 'nt-arkivet.db';

/** Lagrer i nettleseren på denne maskinen (prototype). */
export const nettleserLager: Lager = {
  async hent() {
    try {
      const raw = localStorage.getItem(NOKKEL);
      return raw ? (JSON.parse(raw) as Database) : null;
    } catch {
      return null;
    }
  },
  async lagre(db) {
    try {
      localStorage.setItem(NOKKEL, JSON.stringify(db));
    } catch {
      /* Full eller blokkert lagring — appen virker fortsatt, men husker ikke. */
    }
  },
};

const lager: Lager = nettleserLager;

export const db = signal<Database>(SEED);

export async function lastInn() {
  const lagret = await lager.hent();
  if (lagret && lagret.skjema === SEED.skjema) db.value = lagret;
}

export async function oppdater(endre: (d: Database) => Database) {
  const neste = { ...endre(db.value), oppdatert: new Date().toISOString().slice(0, 10) };
  db.value = neste;
  await lager.lagre(neste);
}

/** Last ned hele databasen som fil (backup). */
export function eksporter() {
  const blob = new Blob([JSON.stringify(db.value, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nt-arkivet-${db.value.oppdatert}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
