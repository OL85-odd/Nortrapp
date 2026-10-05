import { signal } from '@preact/signals';
import type { Database, Farge, Kort, KortType, Stasjon } from './types';
import { SEED, STAIRCON_POST } from './seed';
import { STAIRCON_INNLESING } from '../prosess/staircon/innlesing';
import type { ProsessPost } from '../prosess/types';

/* ─────────────────────────────────────────────────────────────
   Datalaget. Appen snakker bare med en «Lager»-adapter, så vi kan
   bytte fra nettleseren til serverfil eller SharePoint uten å
   endre resten av koden.
   ───────────────────────────────────────────────────────────── */

export interface Lager {
  hent(): Promise<unknown | null>;
  lagre(db: Database): Promise<void>;
}

const NOKKEL = 'nt-arkivet.db';

/** Lagrer i nettleseren på denne maskinen (prototype). */
export const nettleserLager: Lager = {
  async hent() {
    try {
      const raw = localStorage.getItem(NOKKEL);
      return raw ? JSON.parse(raw) : null;
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

/* ── Migrering ─────────────────────────────────────────────────
   Oppgraderer data lagret med en eldre versjon av appen, så ingenting
   går tapt. Hver blokk løfter dataene ett skjema opp. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gammel = any;

const GAMLE_FARGER: Record<string, Farge> = {
  'var(--accent)': 'rod',
  'var(--secondary)': 'bla',
  'var(--warn)': 'gul',
  'var(--text-soft)': 'gra',
};

export function migrer(d: Gammel): Database {
  if (d.skjema < 2) {
    // v2: brukere får fast id, slik at initialer kan endres senere.
    d = {
      ...d,
      skjema: 2,
      brukere: d.brukere.map((b: Gammel) => ({ ...b, id: b.id ?? 'b-' + b.initialer.toLowerCase() })),
    };
  }
  if (d.skjema < 3) {
    // v3: «linjer» blir «kort» med type (linje/samling) og faste farger.
    //     Sidelinjene blir samlinger, og kaffemaskinen får egen samling.
    let kort: Kort[] = (d.linjer ?? []).map(
      (l: Gammel): Kort => ({
        id: l.id,
        type: (l.id === 'hoved' ? 'linje' : 'samling') as KortType,
        navn: l.navn === 'Maskiner og vedlikehold' ? 'Produksjonsmaskiner' : l.navn,
        kode: l.kode,
        farge: GAMLE_FARGER[l.farge] ?? 'gra',
        beskrivelse: l.beskrivelse,
        stasjoner: l.stasjoner,
      }),
    );
    const maskiner = kort.find((k) => k.id === 'maskiner');
    const kaffe = maskiner?.stasjoner.find((s) => s.id === 'kaffemaskin');
    if (maskiner && kaffe && !kort.some((k) => k.id === 'fasiliteter')) {
      maskiner.stasjoner = maskiner.stasjoner.filter((s) => s !== kaffe);
      const fasiliteter = SEED.kort.find((k) => k.id === 'fasiliteter')!;
      const i = kort.indexOf(maskiner) + 1;
      kort = [...kort.slice(0, i), { ...fasiliteter, stasjoner: [kaffe] }, ...kort.slice(i)];
    }
    d = {
      skjema: 3,
      oppdatert: d.oppdatert,
      brukere: d.brukere,
      kort,
      revisjoner: [{ nr: 1, dato: new Date().toISOString(), brukerId: null, kommentar: 'Første versjon av kartet.', endringer: [], kort }],
    };
  }
  if (d.skjema < 4) {
    // v4: prosjekter (Staircon-løp) lagres i databasen.
    d = { ...d, skjema: 4, prosjekter: d.prosjekter ?? [] };
  }
  if (d.skjema < 5) {
    // v5: prosesser blir data (redigerbare, versjonerte, med ID og QR).
    //     Staircon kobles til stasjonen sin, og prosjekter låses til versjon 1.
    const kobleStaircon = (s: Stasjon): Stasjon => ({
      ...s,
      prosessId: s.id === 'staircon' ? 'staircon' : s.prosessId,
      grener: s.grener?.map(kobleStaircon),
    });
    const kort = (d.kort as Kort[]).map((k) => ({ ...k, stasjoner: k.stasjoner.map(kobleStaircon) }));
    d = {
      ...d,
      skjema: 5,
      kort,
      revisjoner: d.revisjoner.map((r: Gammel) => ({ ...r, kort: r.kort.map((k: Kort) => ({ ...k, stasjoner: k.stasjoner.map(kobleStaircon) })) })),
      prosesser: d.prosesser ?? [STAIRCON_POST],
      innstillinger: d.innstillinger ?? {},
      prosjekter: d.prosjekter.map((p: Gammel) => ({ ...p, prosessVersjon: p.prosessVersjon ?? 1 })),
    };
  }
  if (d.skjema < 6) {
    // v6: Staircon får regelbiblioteket for innlesing av ordrebekreftelse og produksjonsordre.
    //     Det legges inn i alle versjoner, så også prosjekter på eldre versjoner kan lese inn.
    d = {
      ...d,
      skjema: 6,
      prosesser: d.prosesser.map((p: ProsessPost) =>
        p.id !== 'staircon'
          ? p
          : { ...p, versjoner: p.versjoner.map((v) => (v.prosess.innlesing ? v : { ...v, prosess: { ...v.prosess, innlesing: STAIRCON_INNLESING } })) },
      ),
    };
  }
  return d as Database;
}

export async function lastInn() {
  const lagret = (await lager.hent()) as Gammel;
  if (!lagret) return;
  if (lagret.skjema > SEED.skjema) {
    console.warn('Data er laget med en nyere versjon av NT-Arkivet. Bruker startinnhold.');
    return;
  }
  db.value = migrer(lagret);
  if (lagret.skjema !== SEED.skjema) await lager.lagre(db.value);
}

export function nyId(prefiks: string) {
  return `${prefiks}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function oppdater(endre: (d: Database) => Database) {
  const neste = { ...endre(db.value), oppdatert: new Date().toISOString().slice(0, 10) };
  db.value = neste;
  await lager.lagre(neste);
}

/** Alle stasjoner i et kort, inkludert grener. */
export function alleStasjoner(k: Kort): Stasjon[] {
  return k.stasjoner.flatMap((s) => [s, ...(s.grener ?? [])]);
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
