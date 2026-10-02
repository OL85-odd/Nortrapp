import { describe, expect, it } from 'vitest';
import { SEED } from '../data/seed';
import { migrer } from '../data/store';
import type { Kort } from '../data/types';
import { beskrivEndringer } from './endringer';
import * as op from './ops';

const kart = (): Kort[] => structuredClone(SEED.kort);
const ny = (id: string, navn = id) => ({ id, navn, status: 'under_arbeid' as const });
const navn = (k: Kort[], kortId: string) => k.find((x) => x.id === kortId)!.stasjoner.map((s) => s.navn);

describe('redigeringsoperasjoner', () => {
  it('endrer ikke originalen', () => {
    const a = kart();
    const kopi = JSON.stringify(a);
    op.slett(a, 'tilbud');
    op.flytt(a, 'pakking', -1);
    op.oppdaterStasjon(a, 'staircon', { navn: 'X' });
    expect(JSON.stringify(a)).toBe(kopi);
  });

  it('setter inn før og etter, også blant grener', () => {
    let k = op.settInnVed(kart(), 'tilbud', 'for', ny('a', 'A'));
    k = op.settInnVed(k, 'tilbud', 'etter', ny('b', 'B'));
    expect(navn(k, 'hoved').slice(0, 4)).toEqual(['Kunde tar kontakt', 'A', 'Tilbud', 'B']);
    k = op.settInnVed(k, 'fusion', 'etter', ny('c', 'C'));
    expect(op.finn(k, 'c')!.forelder!.id).toBe('tegning');
  });

  it('flytter innenfor listen og stopper i endene', () => {
    let k = op.flytt(kart(), 'kontakt', -1);
    expect(navn(k, 'hoved')[0]).toBe('Kunde tar kontakt');
    k = op.flytt(k, 'kontakt', 1);
    expect(navn(k, 'hoved').slice(0, 2)).toEqual(['Tilbud', 'Kunde tar kontakt']);
  });

  it('sletter siste gren og fjerner grener-feltet', () => {
    let k = op.slett(kart(), 'fusion');
    k = op.slett(k, 'freecad');
    k = op.slett(k, 'staircon');
    expect(op.finn(k, 'tegning')!.stasjon.grener).toBeUndefined();
  });

  it('grener kan ikke få egne grener', () => {
    const k = op.leggTilGren(kart(), 'staircon', ny('x'));
    expect(op.finn(k, 'x')).toBeNull();
  });

  it('flytter en linjestasjon med grener til en samling som egne fliser', () => {
    const k = op.flyttTilKort(kart(), 'tegning', 'admin');
    expect(navn(k, 'admin').slice(-4)).toEqual(['Tegning', 'Staircon', 'Fusion 360', 'FreeCAD']);
    expect(op.finn(k, 'tegning')!.stasjon.grener).toBeUndefined();
  });

  it('linje → samling gjør grener til fliser', () => {
    const k = op.oppdaterKort(kart(), 'hoved', { type: 'samling' });
    expect(navn(k, 'hoved')).toContain('Staircon');
  });
});

describe('beskrivEndringer', () => {
  it('ingen endringer gir tom liste', () => {
    expect(beskrivEndringer(kart(), kart())).toEqual([]);
  });

  it('ny stasjon gir ikke falsk «ny rekkefølge»', () => {
    const k = op.settInnVed(kart(), 'tilbud', 'for', ny('a', 'A'));
    expect(beskrivEndringer(kart(), k)).toEqual(['Ny: A i Hovedlinjen']);
  });

  it('beskriver navn, status, flytting og sletting', () => {
    let k = op.oppdaterStasjon(kart(), 'pakking', { navn: 'Pakk', status: 'aktiv' });
    k = op.flyttTilKort(k, 'kantpresse', 'fasiliteter');
    k = op.slett(k, 'brann');
    k = op.flytt(k, 'levering', 1);
    expect(beskrivEndringer(kart(), k)).toEqual([
      '«Pakking» heter nå «Pakk»',
      'Pakk: under arbeid → aktiv',
      'Kantpresse: flyttet fra Produksjonsmaskiner til Fasiliteter',
      'Slettet: Brannvern fra HMS',
      'Ny rekkefølge i Hovedlinjen',
    ]);
  });
});

describe('migrering', () => {
  it('løfter data fra M1 (skjema 1) til gjeldende skjema', () => {
    const m1 = {
      skjema: 1,
      oppdatert: '2026-10-02',
      brukere: [{ initialer: 'OL', navn: 'Odd' }],
      linjer: [
        { id: 'hoved', navn: 'Hovedlinjen', kode: 'H', farge: 'var(--accent)', stasjoner: [] },
        {
          id: 'maskiner',
          navn: 'Maskiner og vedlikehold',
          kode: 'M',
          farge: 'var(--secondary)',
          stasjoner: [ny('cnc', 'CNC-fres'), ny('kaffemaskin', 'Kaffemaskin')],
        },
      ],
    };
    const d = migrer(m1);
    expect(d.skjema).toBe(SEED.skjema);
    expect(d.brukere[0].id).toBe('b-ol');
    expect(d.kort.map((k) => [k.id, k.type, k.farge])).toEqual([
      ['hoved', 'linje', 'rod'],
      ['maskiner', 'samling', 'bla'],
      ['fasiliteter', 'samling', 'turkis'],
    ]);
    expect(navn(d.kort, 'maskiner')).toEqual(['CNC-fres']);
    expect(navn(d.kort, 'fasiliteter')).toEqual(['Kaffemaskin']);
    expect(d.revisjoner).toHaveLength(1);
    expect(d.prosjekter).toEqual([]);
  });
});
