import { describe, expect, it } from 'vitest';
import { STAIRCON } from '../staircon/staircon';
import { MALER } from '../maler';
import { flatSti, gjelder } from '../motor';
import { nesteNr } from '../arkiv';
import { migrer } from '../../data/store';
import { SEED } from '../../data/seed';
import type { ProsessPost } from '../types';
import { beskrivProsessEndringer } from './endringer';
import * as op from './ops';
import { medDeltBjelkelag } from '../staircon/deltBjelkelag';

const kopi = () => structuredClone(STAIRCON);
const titler = (faseId: string, p = kopi()) => p.faser.find((f) => f.id === faseId)!.steg.map((s) => s.id);

describe('prosessredigering', () => {
  it('endrer ikke originalen', () => {
    const p = kopi();
    const for_ = JSON.stringify(p);
    op.oppdaterSteg(p, 'k01', { tittel: 'X' });
    op.slettSteg(p, 'k01');
    op.flyttSteg(p, 'k01', 1);
    expect(JSON.stringify(p)).toBe(for_);
  });

  it('fjerner felt som settes til undefined', () => {
    const p = op.oppdaterSteg(kopi(), 'p06', { husk: undefined });
    expect('husk' in op.finnSteg(p, 'p06')!.steg).toBe(false);
  });

  it('flytter steg mellom faser i endene', () => {
    let p = op.flyttSteg(kopi(), 'k01', -1); // først i Kalken → sist i Oppsett
    expect(titler('oppsett', p).at(-1)).toBe('k01');
    p = op.flyttSteg(p, 'k01', 1); // tilbake
    expect(titler('kalken', p)[0]).toBe('k01');
  });

  it('dupliserer med ny id rett etter originalen', () => {
    const { prosess, nyId } = op.dupliserSteg(kopi(), 'p04');
    const ids = titler('kalken', prosess);
    expect(ids[ids.indexOf('p04') + 1]).toBe(nyId);
  });

  it('faser kan legges til, flyttes og slettes', () => {
    let p = op.settInnFase(kopi(), 1, { id: 'ny', tittel: 'Ny', steg: [] });
    expect(p.faser[1].id).toBe('ny');
    p = op.flyttFase(p, 'ny', 1);
    expect(p.faser[2].id).toBe('ny');
    p = op.slettFase(p, 'ny');
    expect(p.faser.some((f) => f.id === 'ny')).toBe(false);
  });

  it('finner hvem som bruker et svar før sletting', () => {
    expect(op.brukesAv(kopi(), 'e01')).toEqual(expect.arrayContaining(['«Sett overlapp på trinn med barnesikring»']));
  });
});

describe('regelbyggeren', () => {
  it('leser og skriver regler uten å endre betydningen', () => {
    // Prøv alle kombinasjoner av svar på de viktigste spørsmålene.
    const svarsett = ['rett', 'svingtrapp_u', 'svingtrapp_90'].flatMap((t) =>
      ['hoyre_opp', 'venstre_opp'].flatMap((g) =>
        [['repo'], ['glass', 'megler'], []].flatMap((ti) => ['ja', 'nei'].map((j) => ({ trappetype: t, ganglinje: g, vange: 'mellom_vegger', tillegg: ti, k02: j, e01: j, r01: j, repo_bygg: j }))),
      ),
    );
    for (const s of STAIRCON.faser.flatMap((f) => [f, ...f.steg])) {
      const r = op.tilRegler(s.gjelder);
      if (!r) continue;
      const tilbake = op.fraRegler(r);
      for (const svar of svarsett) expect(gjelder(tilbake, svar), s.id).toBe(gjelder(s.gjelder, svar));
    }
  });

  it('«er ikke» og flere linjer', () => {
    const b = op.fraRegler([
      { steg: 'trappetype', er: ['rett'], ikke: true },
      { steg: 'tillegg', er: ['repo', 'glass'], ikke: false },
    ]);
    expect(gjelder(b, { trappetype: 'svingtrapp_u', tillegg: ['glass'] })).toBe(true);
    expect(gjelder(b, { trappetype: 'rett', tillegg: ['glass'] })).toBe(false);
  });

  it('bare spørsmål før steget kan brukes', () => {
    const ids = op.sporsmalFor(STAIRCON, 'k02').map((s) => s.id);
    expect(ids).toContain('trappetype');
    expect(ids).not.toContain('k02');
    expect(ids).not.toContain('e01');
  });

  it('slug gir stabile id-er', () => {
    expect(op.slug('Stolpe/megler på toppen')).toBe('stolpe_megler_pa_toppen');
    expect(op.slug('Ærlig Øl')).toBe('aerlig_ol');
  });
});

describe('endringer mellom versjoner', () => {
  it('beskriver nye, endrede og slettede steg', () => {
    let p = op.oppdaterSteg(kopi(), 'p04', { husk: 'Nytt' });
    p = op.slettSteg(p, 'e07');
    p = op.settInnSteg(p, 'oppstart', 0, { id: 'x', tittel: 'Sjekk lisens' });
    expect(beskrivProsessEndringer(STAIRCON, p)).toEqual([
      'Skriv inn kalkylenummeret i feltet «Nummer»: endret «Husk!»',
      'Nytt steg: Sjekk lisens',
      'Steg slettet: Test trappen mot norm',
    ]);
  });
});

describe('maler', () => {
  it('alle maler gir gyldige prosesser med regler som peker riktig', () => {
    for (const m of MALER) {
      const p = m.lag('Test');
      const ids = new Set(p.faser.flatMap((f) => f.steg.map((s) => s.id)));
      expect(ids.size, m.id).toBe(p.faser.flatMap((f) => f.steg).length);
      for (const s of p.faser.flatMap((f) => f.steg)) {
        for (const r of op.tilRegler(s.gjelder) ?? []) expect(ids, `${m.id}: ${s.tittel}`).toContain(r.steg);
      }
      expect(flatSti(p, {}).length, m.id).toBeGreaterThan(0);
    }
  });
});

describe('arkiv', () => {
  it('neste nummer per kategori', () => {
    const post = (nr: string, kategori: ProsessPost['kategori']): ProsessPost => ({ id: nr, nr, kategori, opprettet: '', versjoner: [] });
    const alle = [post('NT-MAS-001', 'MAS'), post('NT-MAS-007', 'MAS'), post('NT-PRO-001', 'PRO')];
    expect(nesteNr('MAS', alle)).toBe('NT-MAS-008');
    expect(nesteNr('FAS', alle)).toBe('NT-FAS-001');
  });

  it('migrering fra skjema 4 kobler Staircon og låser prosjekter til versjon 1', () => {
    const v4 = { ...structuredClone(SEED), skjema: 4, prosjekter: [{ id: 'p1', prosessId: 'staircon' }] } as unknown as Record<string, unknown>;
    delete v4.prosesser;
    delete v4.innstillinger;
    const d = migrer(v4);
    expect(d.skjema).toBe(8);
    expect(d.prosesser[0].nr).toBe('NT-PRO-001');
    expect(d.prosjekter[0].prosessVersjon).toBe(1);
    const staircon = d.kort[0].stasjoner.flatMap((s) => [s, ...(s.grener ?? [])]).find((s) => s.id === 'staircon');
    expect(staircon?.prosessId).toBe('staircon');
  });
});

describe('delt bjelkelagsåpning', () => {
  it('fasen kommer rett etter «Egenskaper – Trapp», bare når tillegget er valgt', () => {
    const ids = STAIRCON.faser.map((f) => f.id);
    expect(ids[ids.indexOf('egenskaper') + 1]).toBe('deltbjelkelag');
    const med = flatSti(STAIRCON, { tillegg: ['delt_bjelkelag'] }).map((s) => s.id);
    expect(med).toEqual(expect.arrayContaining(['db1', 'db2', 'db3']));
    expect(flatSti(STAIRCON, { tillegg: [] }).some((s) => s.id === 'db1')).toBe(false);
  });

  it('legges ikke inn to ganger', () => {
    expect(medDeltBjelkelag(STAIRCON)).toBeNull();
  });

  it('migrering til skjema 8 publiserer en ny versjon oppå en redigert Staircon', () => {
    const gammel = structuredClone(STAIRCON);
    gammel.faser = gammel.faser.filter((f) => f.id !== 'deltbjelkelag');
    const tillegg = gammel.faser[0].steg.find((s) => s.id === 'tillegg')!;
    if (tillegg.valg?.type === 'flere') tillegg.valg.alternativer = tillegg.valg.alternativer.filter((a) => a.id !== 'delt_bjelkelag');
    gammel.navn = 'Staircon (redigert)';
    const v7 = { ...structuredClone(SEED), skjema: 7 } as unknown as Record<string, unknown> & { prosesser: ProsessPost[] };
    v7.prosesser = [{ ...v7.prosesser[0], versjoner: [1, 2].map((nr) => ({ nr, dato: '', brukerId: null, kommentar: '', endringer: [], prosess: gammel })) }];
    const d = migrer(v7);
    const post = d.prosesser[0];
    expect(post.versjoner.map((v) => v.nr)).toEqual([1, 2, 3]);
    const ny = post.versjoner[2].prosess;
    expect(ny.navn).toBe('Staircon (redigert)'); // egne endringer beholdes
    expect(ny.faser.some((f) => f.id === 'deltbjelkelag')).toBe(true);
    expect(ny.hurtigtaster?.some((h) => h.tast === 'Ctrl + F7')).toBe(true);
    expect(post.versjoner[2].endringer).toEqual(expect.arrayContaining(['Ny fase: Delt bjelkelagsåpning']));
  });
});
