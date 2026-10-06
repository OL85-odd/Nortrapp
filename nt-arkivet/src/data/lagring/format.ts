import type { Prosjekt, ProsessPost } from '../../prosess/types';
import type { Database } from '../types';
import { lesTekst, type Fs } from './fs';

/* ─────────────────────────────────────────────────────────────
   Hvordan databasen ligger som filer — i fellesmappen og i backup:

   data/innstillinger.json        skjema, felles innstillinger, PIN (kryptert)
   data/kart.json                 linjer, samlinger, stasjoner og revisjoner
   data/brukere.json
   data/papirkurv.json
   data/prosesser/NT-PRO-001.json prosessen med alle versjoner
   data/prosjekter/2026/H430-26 [p-…]/prosjekt.json
                                  …/logg.txt   (lesbar logg, bare til folk)
                                  …/dokumenter/ (kopi av innleste dokumenter)
   media/<id>.<ext>               bilder og dokumenter

   Én fil per prosess og per prosjekt gjør at to PC-er sjelden skriver
   til samme fil, og at alt kan leses uten appen.
   ───────────────────────────────────────────────────────────── */

export const DATA = 'data';

const json = (x: unknown) => JSON.stringify(x, null, 2);

/** Trygt filnavn på Windows. */
export function trygtNavn(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60) || 'uten navn';
}

export function prosjektMappe(p: Prosjekt): string {
  return `${DATA}/prosjekter/${p.opprettet.slice(0, 4)}/${trygtNavn(p.nummer)} [${p.id}]`;
}

/** Leselig logg, f.eks. «06.10.2026 14:32  OL  Trappetype → Rett trapp». */
export function loggTekst(p: Prosjekt, initialer: (id: string | null) => string): string {
  const hode = [`${p.nummer}${p.kunde ? ' · ' + p.kunde : ''}${p.kalkylenr ? ' · kalkyle ' + p.kalkylenr : ''}`, `Opprettet ${new Date(p.opprettet).toLocaleString('nb-NO')}`, ''];
  const linjer = p.logg.map((l) => `${new Date(l.tid).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}  ${initialer(l.brukerId).padEnd(4)}  ${l.tekst}`);
  return [...hode, ...linjer, ''].join('\r\n');
}

/**
 * Databasen som filer. `mapper` husker hvilken mappe hvert prosjekt ligger i
 * (navnet settes første gang og endres ikke, selv om prosjektnummeret endres).
 */
export function tilFiler(db: Database, mapper: Map<string, string>): Map<string, string> {
  const filer = new Map<string, string>();
  filer.set(`${DATA}/innstillinger.json`, json({ skjema: db.skjema, innstillinger: db.innstillinger, pinHash: db.pinHash }));
  filer.set(`${DATA}/kart.json`, json({ kort: db.kort, revisjoner: db.revisjoner }));
  filer.set(`${DATA}/brukere.json`, json({ brukere: db.brukere }));
  filer.set(`${DATA}/papirkurv.json`, json({ papirkurv: db.papirkurv ?? [] }));
  for (const p of db.prosesser) filer.set(`${DATA}/prosesser/${trygtNavn(p.nr)}.json`, json(p));
  const initialer = (id: string | null) => db.brukere.find((b) => b.id === id)?.initialer ?? '?';
  for (const p of db.prosjekter) {
    if (!mapper.has(p.id)) mapper.set(p.id, prosjektMappe(p));
    const m = mapper.get(p.id)!;
    filer.set(`${m}/prosjekt.json`, json(p));
    filer.set(`${m}/logg.txt`, loggTekst(p, initialer));
  }
  return filer;
}

/** Filer som bærer data (logg.txt er bare en lesbar kopi). */
export const erData = (sti: string) => sti.endsWith('.json');

/** Leser databasen fra filene. Gir null hvis det ikke ligger noe der. */
export async function fraFiler(fs: Fs): Promise<{ db: Record<string, unknown>; tekster: Map<string, string>; mapper: Map<string, string> } | null> {
  const tekster = new Map<string, string>();
  const les = async (sti: string) => {
    const t = await lesTekst(fs, sti);
    if (t !== null) tekster.set(sti, t);
    return t ? JSON.parse(t) : null;
  };
  const inn = await les(`${DATA}/innstillinger.json`);
  if (!inn) return null;
  const kart = (await les(`${DATA}/kart.json`)) ?? {};
  const brukere = (await les(`${DATA}/brukere.json`)) ?? {};
  const kurv = (await les(`${DATA}/papirkurv.json`)) ?? {};

  const prosesser: ProsessPost[] = [];
  for (const f of await fs.liste(`${DATA}/prosesser`)) if (!f.mappe && f.navn.endsWith('.json')) prosesser.push(await les(`${DATA}/prosesser/${f.navn}`));

  const prosjekter: Prosjekt[] = [];
  const mapper = new Map<string, string>();
  for (const ar of await fs.liste(`${DATA}/prosjekter`)) {
    if (!ar.mappe) continue;
    for (const m of await fs.liste(`${DATA}/prosjekter/${ar.navn}`)) {
      if (!m.mappe) continue;
      const mappe = `${DATA}/prosjekter/${ar.navn}/${m.navn}`;
      const p = (await les(`${mappe}/prosjekt.json`)) as Prosjekt | null;
      if (!p) continue;
      prosjekter.push(p);
      mapper.set(p.id, mappe);
    }
  }
  prosesser.sort((a, b) => a.opprettet.localeCompare(b.opprettet) || a.nr.localeCompare(b.nr));
  prosjekter.sort((a, b) => b.opprettet.localeCompare(a.opprettet));
  return {
    db: {
      skjema: inn.skjema,
      oppdatert: new Date().toISOString().slice(0, 10),
      innstillinger: inn.innstillinger ?? {},
      pinHash: inn.pinHash,
      kort: kart.kort ?? [],
      revisjoner: kart.revisjoner ?? [],
      brukere: brukere.brukere ?? [],
      papirkurv: kurv.papirkurv ?? [],
      prosesser,
      prosjekter,
    },
    tekster,
    mapper,
  };
}

/** Legger innholdet i én fil inn i databasen (når en annen PC har endret den). `null` = filen er slettet. */
export function settInn(db: Database, sti: string, tekst: string | null): Database {
  const x = tekst === null ? null : JSON.parse(tekst);
  if (sti === `${DATA}/innstillinger.json`) return x ? { ...db, innstillinger: x.innstillinger ?? {}, pinHash: x.pinHash } : db;
  if (sti === `${DATA}/kart.json`) return x ? { ...db, kort: x.kort, revisjoner: x.revisjoner } : db;
  if (sti === `${DATA}/brukere.json`) return x ? { ...db, brukere: x.brukere } : db;
  if (sti === `${DATA}/papirkurv.json`) return x ? { ...db, papirkurv: x.papirkurv } : db;
  if (sti.startsWith(`${DATA}/prosesser/`)) {
    const nr = sti.slice(`${DATA}/prosesser/`.length, -'.json'.length);
    const uten = db.prosesser.filter((p) => trygtNavn(p.nr) !== nr && p.id !== x?.id);
    return { ...db, prosesser: x ? [...uten, x].sort((a, b) => a.opprettet.localeCompare(b.opprettet) || a.nr.localeCompare(b.nr)) : uten };
  }
  if (sti.startsWith(`${DATA}/prosjekter/`) && sti.endsWith('/prosjekt.json')) {
    const id = /\[([^\]]+)\]\/prosjekt\.json$/.exec(sti)?.[1] ?? x?.id;
    const finnes = db.prosjekter.some((p) => p.id === id);
    if (!x) return { ...db, prosjekter: db.prosjekter.filter((p) => p.id !== id) };
    return { ...db, prosjekter: finnes ? db.prosjekter.map((p) => (p.id === x.id ? x : p)) : [x, ...db.prosjekter] };
  }
  return db;
}

/* ── Fletting når to PC-er har endret samme fil ─────────────── */

type J = unknown;
const lik = (a: J, b: J) => JSON.stringify(a) === JSON.stringify(b);
const erObjekt = (x: J): x is Record<string, J> => !!x && typeof x === 'object' && !Array.isArray(x);

function nokkel(x: J): string {
  if (erObjekt(x)) {
    if (typeof x.id === 'string' || typeof x.id === 'number') return `id:${x.id}`;
    if (typeof x.tid === 'string') return `tid:${x.tid}:${x.tekst ?? ''}`;
    if (typeof x.nr === 'number') return `nr:${x.nr}`;
  }
  return `json:${JSON.stringify(x)}`;
}

/**
 * Tre-veis fletting: `base` er det vi sist leste, `vaar` er vår nye versjon,
 * `deres` er det som ligger i filen nå. Endringer fra begge beholdes:
 * f.eks. avkrysninger fra to PC-er, og logglinjer fra begge.
 * Hvis begge har endret samme verdi, vinner vår.
 */
export function flett(base: J, vaar: J, deres: J): J {
  if (lik(vaar, deres)) return vaar;
  if (lik(vaar, base)) return deres;
  if (lik(deres, base)) return vaar;
  if (erObjekt(vaar) && erObjekt(deres)) {
    const b = erObjekt(base) ? base : {};
    const ut: Record<string, J> = {};
    for (const k of new Set([...Object.keys(deres), ...Object.keys(vaar)])) {
      const v = k in vaar ? vaar[k] : undefined;
      const d = k in deres ? deres[k] : undefined;
      const f = flett(b[k], v, d);
      if (f !== undefined) ut[k] = f;
    }
    return ut;
  }
  if (Array.isArray(vaar) && Array.isArray(deres)) {
    const b = new Map((Array.isArray(base) ? base : []).map((x) => [nokkel(x), x]));
    const v = new Map(vaar.map((x) => [nokkel(x), x]));
    const d = new Map(deres.map((x) => [nokkel(x), x]));
    const ut: J[] = [];
    for (const k of new Set([...d.keys(), ...v.keys()])) {
      const iV = v.has(k);
      const iD = d.has(k);
      // Slettet hos én og uendret hos den andre → slettet.
      if (!iV && b.has(k) && lik(d.get(k), b.get(k))) continue;
      if (!iD && b.has(k) && lik(v.get(k), b.get(k))) continue;
      ut.push(iV && iD ? flett(b.get(k), v.get(k), d.get(k)) : iV ? v.get(k) : d.get(k));
    }
    // Logglinjer og lignende holdes i tidsrekkefølge.
    if (ut.length && ut.every((x) => erObjekt(x) && typeof x.tid === 'string')) ut.sort((a, c) => String((a as { tid: string }).tid).localeCompare(String((c as { tid: string }).tid)));
    return ut;
  }
  return vaar;
}
