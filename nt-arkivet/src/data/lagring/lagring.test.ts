import { describe, expect, it } from 'vitest';
import { SEED } from '../seed';
import { migrer } from '../store';
import type { Database } from '../types';
import type { Prosjekt } from '../../prosess/types';
import { minneFs } from './fs';
import { flett, fraFiler, settInn, tilFiler } from './format';
import { lagZip, lesZip } from './zip';
import { dagerIgjen, tomUtlopte } from '../papirkurv';

const prosjekt = (id: string, nummer: string, ekstra: Partial<Prosjekt> = {}): Prosjekt => ({
  id,
  prosessId: 'staircon',
  prosessVersjon: 1,
  type: 'prosjekt',
  nummer,
  opprettet: '2026-10-01T08:00:00.000Z',
  opprettetAv: 'b-ol',
  svar: {},
  felt: {},
  utfort: {},
  logg: [],
  ...ekstra,
});

const medProsjekter = (...p: Prosjekt[]): Database => ({ ...structuredClone(SEED), prosjekter: p });

async function skrivTil(fs: ReturnType<typeof minneFs>, d: Database, mapper = new Map<string, string>()) {
  for (const [sti, t] of tilFiler(d, mapper)) await fs.skriv(sti, t);
  return mapper;
}

describe('filformatet', () => {
  it('databasen tåler en tur til filer og tilbake', async () => {
    const d = medProsjekter(prosjekt('p-1', 'H430-26', { svar: { trappetype: 'rett' } }), prosjekt('p-2', 'Kalkyle 056867'));
    const fs = minneFs();
    await skrivTil(fs, d);
    const lest = await fraFiler(fs);
    const tilbake = migrer(lest!.db);
    expect(tilbake.prosjekter.map((p) => p.id).sort()).toEqual(['p-1', 'p-2']);
    expect(tilbake.prosjekter.find((p) => p.id === 'p-1')!.svar.trappetype).toBe('rett');
    expect(tilbake.prosesser.map((p) => p.nr)).toEqual(d.prosesser.map((p) => p.nr));
    expect(tilbake.kort).toEqual(d.kort);
  });

  it('lesbare mapper og logg per prosjekt', async () => {
    const d = medProsjekter(prosjekt('p-1', 'H430-26', { logg: [{ tid: '2026-10-01T08:00:00.000Z', brukerId: 'b-ol', type: 'opprettet', tekst: 'Prosjekt opprettet' }] }));
    const fs = minneFs();
    await skrivTil(fs, d);
    expect([...fs.filer.keys()]).toContain('data/prosjekter/2026/H430-26 [p-1]/prosjekt.json');
    expect([...fs.filer.keys()]).toContain('data/prosesser/NT-PRO-001.json');
    expect(await fs.filer.get('data/prosjekter/2026/H430-26 [p-1]/logg.txt')!.text()).toMatch(/Prosjekt opprettet/);
  });

  it('mappen beholder navnet når prosjektnummeret endres', () => {
    const mapper = new Map<string, string>();
    tilFiler(medProsjekter(prosjekt('p-1', 'Kalkyle 056867')), mapper);
    const filer = tilFiler(medProsjekter(prosjekt('p-1', 'H430-26')), mapper);
    expect([...filer.keys()].some((k) => k.includes('Kalkyle 056867 [p-1]/prosjekt.json'))).toBe(true);
  });

  it('settInn legger til, oppdaterer og fjerner prosjekter', () => {
    let d = medProsjekter(prosjekt('p-1', 'A'));
    const p2 = prosjekt('p-2', 'B');
    d = settInn(d, 'data/prosjekter/2026/B [p-2]/prosjekt.json', JSON.stringify(p2));
    expect(d.prosjekter.map((p) => p.id)).toEqual(['p-2', 'p-1']);
    d = settInn(d, 'data/prosjekter/2026/A [p-1]/prosjekt.json', null);
    expect(d.prosjekter.map((p) => p.id)).toEqual(['p-2']);
  });
});

describe('fletting når to PC-er endrer samme prosjekt', () => {
  const base = prosjekt('p-1', 'H430-26', {
    utfort: { a: { tid: '1', brukerId: 'b-ol' } },
    logg: [{ tid: '2026-10-06T10:00:00.000Z', brukerId: 'b-ol', type: 'utfort', tekst: 'A' }],
  });

  it('begges avkrysninger og logglinjer beholdes, i tidsrekkefølge', () => {
    const vaar = structuredClone(base);
    vaar.utfort.b = { tid: '2', brukerId: 'b-ol' };
    vaar.logg.push({ tid: '2026-10-06T10:05:00.000Z', brukerId: 'b-ol', type: 'utfort', tekst: 'B' });
    const deres = structuredClone(base);
    deres.utfort.c = { tid: '3', brukerId: 'b-sa' };
    deres.logg.push({ tid: '2026-10-06T10:03:00.000Z', brukerId: 'b-sa', type: 'utfort', tekst: 'C' });
    const f = flett(base, vaar, deres) as Prosjekt;
    expect(Object.keys(f.utfort).sort()).toEqual(['a', 'b', 'c']);
    expect(f.logg.map((l) => l.tekst)).toEqual(['A', 'C', 'B']);
  });

  it('en angret avkrysning hos én PC slettes også i resultatet', () => {
    const vaar = structuredClone(base);
    delete (vaar.utfort as Record<string, unknown>).a;
    const deres = structuredClone(base);
    deres.felt.overflate = 'Hvit';
    const f = flett(base, vaar, deres) as Prosjekt;
    expect(f.utfort.a).toBeUndefined();
    expect(f.felt.overflate).toBe('Hvit');
  });

  it('samme felt endret begge steder: vår vinner', () => {
    const vaar = { ...structuredClone(base), felt: { overflate: 'Hvit' } };
    const deres = { ...structuredClone(base), felt: { overflate: 'Sort' } };
    expect((flett(base, vaar, deres) as Prosjekt).felt.overflate).toBe('Hvit');
  });
});

describe('backup-zip', () => {
  it('tekst og binære filer kommer uendret tilbake', async () => {
    const bilde = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/webp' });
    const zip = await lagZip(new Map<string, Blob | string>([
      ['data/innstillinger.json', '{"skjema":7}'],
      ['media/m1.webp', bilde],
    ]));
    const fs = await lesZip(zip);
    expect(await fs.filer.get('data/innstillinger.json')!.text()).toBe('{"skjema":7}');
    expect([...new Uint8Array(await fs.filer.get('media/m1.webp')!.arrayBuffer())]).toEqual([1, 2, 3, 250]);
    expect((await fs.liste('data')).map((x) => x.navn)).toEqual(['innstillinger.json']);
  });
});

describe('papirkurv', () => {
  it('tømmes etter 30 dager, og prosessnumre brukes ikke på nytt', () => {
    const naa = Date.parse('2026-10-06T12:00:00Z');
    const d: Database = {
      ...structuredClone(SEED),
      papirkurv: [
        { id: 'p-gammel', type: 'prosjekt', navn: 'H1', slettet: '2026-09-01T12:00:00Z', brukerId: null, prosjekt: prosjekt('p-gammel', 'H1') },
        { id: 'p-ny', type: 'prosjekt', navn: 'H2', slettet: '2026-10-05T12:00:00Z', brukerId: null, prosjekt: prosjekt('p-ny', 'H2') },
        { id: 'x', type: 'prosess', navn: 'NT-MAS-004', slettet: '2026-08-01T12:00:00Z', brukerId: null, prosess: { id: 'x', nr: 'NT-MAS-004', kategori: 'MAS', opprettet: '', versjoner: [] } },
      ],
    };
    expect(dagerIgjen(d.papirkurv[1], naa)).toBe(29);
    const etter = tomUtlopte(d, naa);
    expect(etter.papirkurv.map((p) => p.id)).toEqual(['p-ny']);
    expect(etter.innstillinger.brukteNr).toEqual(['NT-MAS-004']);
  });
});
