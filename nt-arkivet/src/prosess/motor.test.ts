import { describe, expect, it } from 'vitest';
import { STAIRCON } from './staircon/staircon';

import { aktivtSteg, flatSti, fremdrift, gjelder, nesteUgjorte, skjulteSteg, sti, svarTekst } from './motor';
import type { Svar } from './types';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ider = (svar: Record<string, Svar>) => flatSti(STAIRCON, svar).map((s) => s.id);
const faser = (svar: Record<string, Svar>) => sti(STAIRCON, svar).map((f) => f.id);

const rett = { trappetype: 'rett', ganglinje: 'hoyre_opp', vange: 'mellom_vegger', tillegg: [] as string[] };

describe('betingelser', () => {
  it('ubesvart spørsmål skjuler det som avhenger av det', () => {
    expect(gjelder({ steg: 'x', er: 'ja' }, {})).toBe(false);
    expect(gjelder({ ikke: { steg: 'x', er: 'ja' } }, {})).toBe(true);
    expect(gjelder({ steg: 't', er: ['a', 'b'] }, { t: ['c', 'b'] })).toBe(true);
  });
});

describe('Staircon-stien', () => {
  it('uten svar vises bare oppsett og felles faser, og noe er skjult', () => {
    expect(faser({})).not.toContain('svingtrapp');
    expect(faser({})).not.toContain('repotrapp');
    expect(skjulteSteg(STAIRCON, {})).toBeGreaterThan(10);
  });

  it('rett trapp mellom vegger: ingen sving, repo, glass, synlige vanger', () => {
    const f = faser(rett);
    expect(f).toEqual(['oppsett', 'kalken', 'oppstart', 'bjelkelag', 'lagetrapp', 'egenskaper', 'vanger', 'produksjon']);
    expect(ider(rett)).toContain('p07d'); // dekklister mellom vegger
    expect(ider(rett)).not.toContain('v01');
  });

  it('svar på ett valg bygger videre: svingtrapp + repo + glass', () => {
    const s = { ...rett, trappetype: 'svingtrapp_u', vange: 'en_synlig', tillegg: ['repo', 'glass'] };
    const f = faser(s);
    expect(f).toContain('svingtrapp');
    expect(f).toContain('repotrapp');
    expect(f).toContain('glass');
    expect(ider(s)).toEqual(expect.arrayContaining(['vange_side', 'vange_omfang', 'repo_bygg', 'v01']));
    expect(ider(s)).not.toContain('p07d');
  });

  it('stusstrinn/barnesikring velger riktig overlapp', () => {
    expect(ider({ ...rett, e01: 'ja' })).toContain('e04');
    expect(ider({ ...rett, e01: 'ja' })).not.toContain('e03');
    expect(ider({ ...rett, e01: 'nei' })).toContain('e03');
  });

  it('selger har laget kalkylen: K-stegene faller bort', () => {
    expect(ider({ ...rett, k02: 'nei' })).toContain('k03');
    expect(ider({ ...rett, k02: 'ja' })).not.toContain('k03');
  });

  it('venstresvingt åpning bare for venstre opp med sving', () => {
    expect(ider({ ...rett, ganglinje: 'venstre_opp' })).not.toContain('b02v');
    expect(ider({ ...rett, ganglinje: 'venstre_opp', trappetype: 'svingtrapp_90' })).toContain('b02v');
  });
});

describe('ferdige prosjekter', () => {
  // Svar på alle spørsmål som dukker opp på stien, med ulike valg, til ingen flere kommer.
  // Da skal ingenting være «skjult bak valg» — ellers kan prosjektet aldri fullføres.
  const besvar = (velg: (alt: string[]) => Svar) => {
    const svar: Record<string, Svar> = {};
    for (let runde = 0; runde < 50; runde++) {
      const neste = flatSti(STAIRCON, svar).find((s) => s.valg && svar[s.id] === undefined);
      if (!neste) break;
      const v = neste.valg!;
      svar[neste.id] = velg(v.type === 'janei' ? ['ja', 'nei'] : v.alternativer.map((a) => a.id));
      if (v.type === 'flere' && !Array.isArray(svar[neste.id])) svar[neste.id] = [svar[neste.id] as string];
    }
    return svar;
  };
  for (const [navn, velg] of [
    ['første valg', (a: string[]) => a[0]],
    ['siste valg', (a: string[]) => a[a.length - 1]],
    ['midterste valg', (a: string[]) => a[Math.floor(a.length / 2)]],
    ['ingen tillegg', (a: string[]) => (a.includes('gelender') ? [] : a[1] ?? a[0])],
  ] as [string, (a: string[]) => Svar][]) {
    it(`ingen skjulte steg når alt er besvart (${navn})`, () => {
      expect(skjulteSteg(STAIRCON, besvar(velg))).toBe(0);
    });
  }
});

describe('fremdrift og navigasjon', () => {
  it('teller utførte og finner forlatte grener', () => {
    const p = { svar: { ...rett, e01: 'nei' }, utfort: { e03: { tid: '', brukerId: null }, k01: { tid: '', brukerId: null } } };
    expect(fremdrift(STAIRCON, p).utfort).toBe(2);
    const byttet = { ...p, svar: { ...p.svar, e01: 'ja' } };
    expect(fremdrift(STAIRCON, byttet).forlatte).toEqual(['e03']);
  });

  it('aktivt steg er første ugjorte, og neste hopper over det som er gjort', () => {
    const p = { svar: {}, utfort: { trappetype: { tid: '', brukerId: null } } };
    expect(aktivtSteg(STAIRCON, p)!.id).toBe('ganglinje');
    const q = { svar: rett, utfort: { ganglinje: { tid: '', brukerId: null } } };
    expect(nesteUgjorte(STAIRCON, q, 'trappetype')!.id).toBe('vange');
  });

  it('svartekst', () => {
    const e01 = STAIRCON.faser.flatMap((f) => f.steg).find((s) => s.id === 'e01')!;
    expect(svarTekst(e01, 'ja')).toBe('Stusstrinn');
  });
});

describe('innholdet er gyldig', () => {
  const alle = STAIRCON.faser.flatMap((f) => f.steg);

  it('alle steg-id-er er unike', () => {
    const ids = alle.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('betingelser peker på steg som finnes', () => {
    const ids = new Set(alle.map((s) => s.id));
    const sjekk = (b: unknown): void => {
      if (!b || typeof b !== 'object') return;
      const o = b as Record<string, unknown>;
      if ('steg' in o) expect(ids, `ukjent steg i betingelse: ${o.steg}`).toContain(o.steg);
      Object.values(o).forEach((v) => (Array.isArray(v) ? v.forEach(sjekk) : sjekk(v)));
    };
    STAIRCON.faser.forEach((f) => sjekk(f.gjelder));
    alle.forEach((s) => sjekk(s.gjelder));
  });

  it('alle bilder og dokumenter finnes', () => {
    const filer = new Set(readdirSync(fileURLToPath(new URL('./staircon/bilder', import.meta.url))));
    for (const s of alle) {
      for (const b of s.bilder ?? []) expect(filer, s.id).toContain(b.fil);
      if (s.dokument) expect(filer, s.id).toContain(s.dokument.fil);
    }
  });

  it('alle hurtigtaster er forklart', () => {
    const kjente = new Set(STAIRCON.hurtigtaster!.map((h) => h.tast));
    for (const s of alle) for (const t of s.hurtigtaster ?? []) expect(kjente, `${s.id}: ${t}`).toContain(t);
  });

  it('bare Ctrl + F gjenstår å kontrollere', () => {
    expect(STAIRCON.hurtigtaster!.filter((h) => h.kontroller).map((h) => h.tast)).toEqual(['Ctrl + F']);
  });
});
