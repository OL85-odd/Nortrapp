import type { Kort, Stasjon } from '../data/types';
import { FARGENAVN } from '../data/types';

/* Sammenligner to versjoner av kartet og beskriver forskjellen med vanlige
   ord. Brukes i publiseringsdialogen og i revisjonshistorikken. */

interface Flat {
  s: Stasjon;
  kortId: string;
  kortNavn: string;
  forelder: string | null;
  indeks: number;
}

function flat(kort: Kort[]): Map<string, Flat> {
  const m = new Map<string, Flat>();
  for (const k of kort) {
    k.stasjoner.forEach((s, i) => {
      m.set(s.id, { s, kortId: k.id, kortNavn: k.navn, forelder: null, indeks: i });
      s.grener?.forEach((g, gi) => m.set(g.id, { s: g, kortId: k.id, kortNavn: k.navn, forelder: s.id, indeks: gi }));
    });
  }
  return m;
}

const STATUS = { aktiv: 'aktiv', under_arbeid: 'under arbeid' };

export function beskrivEndringer(for_: Kort[], etter: Kort[]): string[] {
  const ut: string[] = [];
  const forKort = new Map(for_.map((k) => [k.id, k]));
  const etterKort = new Map(etter.map((k) => [k.id, k]));

  // Kort
  for (const k of etter) {
    const g = forKort.get(k.id);
    if (!g) {
      ut.push(`Nytt kort: ${k.navn} (${k.type})`);
      continue;
    }
    if (g.navn !== k.navn) ut.push(`Kort «${g.navn}» heter nå «${k.navn}»`);
    if (g.type !== k.type) ut.push(`${k.navn}: endret fra ${g.type} til ${k.type}`);
    if (g.farge !== k.farge) ut.push(`${k.navn}: ny farge (${FARGENAVN[k.farge]})`);
    if (g.kode !== k.kode) ut.push(`${k.navn}: ny kode «${k.kode}»`);
    if ((g.beskrivelse ?? '') !== (k.beskrivelse ?? '')) ut.push(`${k.navn}: ny beskrivelse`);
  }
  for (const k of for_) if (!etterKort.has(k.id)) ut.push(`Kort slettet: ${k.navn}`);
  const rekkeFor = for_.filter((k) => etterKort.has(k.id)).map((k) => k.id).join();
  const rekkeEtter = etter.filter((k) => forKort.has(k.id)).map((k) => k.id).join();
  if (rekkeFor !== rekkeEtter) ut.push('Ny rekkefølge på kortene');

  // Stasjoner
  const a = flat(for_);
  const b = flat(etter);
  for (const [id, n] of b) {
    const g = a.get(id);
    if (!g) {
      ut.push(`Ny: ${n.s.navn} i ${n.kortNavn}${n.forelder ? ` (gren under ${b.get(n.forelder)?.s.navn})` : ''}`);
      continue;
    }
    if (g.s.navn !== n.s.navn) ut.push(`«${g.s.navn}» heter nå «${n.s.navn}»`);
    if (g.s.status !== n.s.status) ut.push(`${n.s.navn}: ${STATUS[g.s.status]} → ${STATUS[n.s.status]}`);
    if ((g.s.beskrivelse ?? '') !== (n.s.beskrivelse ?? '')) ut.push(`${n.s.navn}: ny beskrivelse`);
    if (g.kortId !== n.kortId) ut.push(`${n.s.navn}: flyttet fra ${g.kortNavn} til ${n.kortNavn}`);
    else if (g.forelder !== n.forelder) ut.push(`${n.s.navn}: flyttet i ${n.kortNavn}`);
  }
  for (const [id, g] of a) if (!b.has(id)) ut.push(`Slettet: ${g.s.navn} fra ${g.kortNavn}`);

  // Rekkefølge: sammenlign bare stasjoner som finnes i samme liste før og etter,
  // så en ny eller slettet stasjon ikke gir falsk «ny rekkefølge».
  const flyttetI = new Set<string>();
  const nokkel = (f: Flat) => f.kortId + '/' + (f.forelder ?? '');
  const lister = new Set([...b.values()].map(nokkel));
  for (const l of lister) {
    const felles = (m: Map<string, Flat>, andre: Map<string, Flat>) =>
      [...m.values()]
        .filter((f) => nokkel(f) === l && andre.has(f.s.id) && nokkel(andre.get(f.s.id)!) === l)
        .sort((x, y) => x.indeks - y.indeks)
        .map((f) => f.s.id)
        .join();
    if (felles(a, b) !== felles(b, a)) flyttetI.add([...b.values()].find((f) => nokkel(f) === l)!.kortNavn);
  }
  for (const k of flyttetI) ut.push(`Ny rekkefølge i ${k}`);

  return ut;
}
