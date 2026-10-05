import { describe, expect, it } from 'vitest';
import { STAIRCON } from '../prosess/staircon/staircon';
import { byggLinjer, rensOcr } from './linjer';
import { fjernPriser, kompiler } from './monster';
import { gjettType, kontroller, tolk, type Linje, type TolkDok } from './tolk';

// Oppdiktede linjer i samme format som Kalken skriver ut (ingen ekte kundedata).
const linjer = (tekst: string, ocr?: number): Linje[] => tekst.trim().split('\n').map((t) => ({ tekst: t.trim(), side: 1, sikkerhet: ocr }));

const PO = linjer(`
Best.nr.: 12345 │ Avd: 8 │ Prod.nr.: │ H999-26
Kunde: │ TESTBYGG AS │ Byggherre: OLA NORDMANN
Monteres │ Uke: 41 │ Dag: 0 │ Ant: 1 │ Gangretning: HØYRE opp trappen
98 · håndløper 40x67mm TYPE C
21 Returgelender - håndløper 40x67mm TYPE C │ 1200 mm
98 · runde sprosser/balustre 23mm TYPE 1
90 Meglere type 11, 90x40mm inkl.
98 · åpen trapp m/barnesikringslist underkant trinn
04 Malt fargekode: S-0502-Y / Ikke avklart
- REPO PÅ BYGG. │ - 2 stk. EL
TRESLAG: I FURU KOMPLETT │ SKALLTRINN: │ X
Etasjehøyde │ 2700
Inntrinn │ 260.0
Opptrinn │ 180.0
`);

const OB = linjer(
  `
Reg.nr.: 012345 Gruppe 1 Ordrenr: TEST
1 stk. RETT TRAPP I FURU med bredde utvendig vanger
LØP1: 900mm
15 opptrinn - gangretning HØYRE opp trappen
41 Malt fargekode: S-0502-Y 5 10 929
Leveringstid: Uke 41 / Med hilsen
`,
  92,
);

const dok = (type: 'ob' | 'po', l: Linje[]): TolkDok => ({ id: type, type, navn: type, linjer: l });
const som = (r: ReturnType<typeof tolk>) => Object.fromEntries(r.map((x) => [x.nokkel, x]));

describe('mønsterspråket', () => {
  it('fanger tall og tekst, og {tekst} stopper ved neste kolonne', () => {
    expect(kompiler('Best.nr.: {tall}')!.exec('Best.nr.:  56867 │ Avd: 8')![1]).toBe('56867');
    expect(kompiler('Kunde: {tekst}')!.exec('Kunde: │ TESTBYGG AS │ Byggherre: X')![1]).toBe('TESTBYGG AS');
    expect(kompiler('LØP1: {tall} mm')!.exec('LØP1: 885mm')![1]).toBe('885');
  });
  it('treffer ikke midt i ord, og ugyldig regex gir null', () => {
    expect(kompiler('REPO')!.test('Repodeler, BJ. inkl')).toBe(false);
    expect(kompiler('REPO')!.test('- REPO PÅ BYGG.')).toBe(true);
    expect(kompiler('regex:(')).toBeNull();
  });
  it('fjerner priser fra OCR-linjer, men ikke fargekoder', () => {
    expect(fjernPriser('S 0500-N / 3409 Hvit 5 10 929')).toBe('S 0500-N / 3409 Hvit');
    expect(fjernPriser('håndløper TYPE C ” 721')).toBe('håndløper TYPE C');
  });
});

describe('tolking', () => {
  it('kjenner igjen dokumenttypen', () => {
    expect(gjettType(PO)).toBe('po');
    expect(gjettType(linjer('ORDREBEKREFTELSE\nReg.nr.: 1'))).toBe('ob');
    expect(gjettType(linjer('Proj: H1\nEtasjehøyde 2700\nInntrinn 250'))).toBe('planview');
    expect(gjettType(linjer('noe helt annet'))).toBe('annet');
  });

  it('produksjonsordre + ordrebekreftelse gir riktige felt', () => {
    const r = som(tolk([dok('po', PO), dok('ob', OB)], STAIRCON.innlesing!, STAIRCON));
    expect(r.kalkylenr).toMatchObject({ verdi: '12345', status: 'funnet' }); // 012345 = 12345
    expect(r.prosjektnr.verdi).toBe('H999-26');
    expect(r.kunde.verdi).toBe('TESTBYGG AS');
    expect(r.trappetype).toMatchObject({ verdi: 'rett', status: 'funnet' });
    expect(r.ganglinje.verdi).toBe('hoyre_opp');
    expect(r.tillegg.verdi).toEqual(['gelender', 'repo', 'megler']);
    expect(r.repo_bygg.verdi).toBe('ja');
    expect(r.gelender_lengde.verdi).toBe('1200');
    expect(r.e01.verdi).toBe('nei'); // barnesikring
    expect(r.endelister.verdi).toBe('2');
    expect(r.treslag.verdi).toBe('FURU KOMPLETT');
    expect(r.overflate.varsler[0].tekst).toMatch(/ikke avklart/i);
  });

  it('mangler vangeoppsett → spør, og trinnkasse foreslås som nei', () => {
    const r = som(tolk([dok('po', PO)], STAIRCON.innlesing!, STAIRCON));
    expect(r.vange).toMatchObject({ status: 'mangler' });
    expect(r.vange.grunn).toMatch(/skissen/);
    expect(r.trappetype.status).toBe('mangler');
    expect(r.p07c).toMatchObject({ verdi: 'nei', status: 'usikker' });
  });

  it('uenige dokumenter gir usikker med begge verdiene', () => {
    const ob = linjer('Reg.nr.: 054321\nLeveringstid: Uke 40', 95);
    const r = som(tolk([dok('po', PO), dok('ob', ob)], STAIRCON.innlesing!, STAIRCON));
    expect(r.kalkylenr.status).toBe('usikker');
    expect(r.kalkylenr.grunn).toMatch(/12345.*54321|54321.*12345/);
  });

  it('lav OCR-sikkerhet og urimelige verdier gir usikker', () => {
    const ob = linjer('Reg.nr.: 012345\nEtasjehøyde (2905 >\nBjelkelagstykkelse (39', 50);
    const r = som(tolk([dok('ob', ob)], STAIRCON.innlesing!, STAIRCON));
    expect(r.etasjehoyde).toMatchObject({ verdi: '2905', status: 'usikker' });
    expect(r.bjelkelag.grunn).toMatch(/Uvanlig verdi/);
  });

  it('felt for steg som ikke er på stien tas bort', () => {
    const r = som(tolk([dok('ob', OB)], STAIRCON.innlesing!, STAIRCON));
    expect(r.repo_bygg).toBeUndefined(); // ingen repo
    expect(r.prosjektnr).toBeUndefined(); // bare påkrevd med produksjonsordre
  });

  it('idealformelen', () => {
    expect(kontroller({ opptrinn: '180', inntrinn: '260' })[0]).toMatchObject({ ok: true });
    expect(kontroller({ opptrinn: '200', inntrinn: '260' })[0]).toMatchObject({ ok: false });
  });
});

describe('linjer fra lesbar PDF', () => {
  const bit = (str: string, x: number, y: number) => ({ str, transform: [10, 0, 0, 10, x, y], width: str.length * 6 });
  it('setter sammen rader, markerer kolonner og fjerner doble tekster', () => {
    const l = byggLinjer([bit('Kunde:', 30, 790), bit('TEST', 90, 790.4), bit('AS', 120, 790), bit('Etasjehøyde', 300, 700), bit('Etasjehøyde', 300.2, 700), bit('2700', 400, 700)], 600, 800, 1);
    expect(l.map((x) => x.tekst)).toEqual(['Kunde: │ TEST AS', 'Etasjehøyde │ 2700']);
    expect(l[0].boks![0]).toBeCloseTo(0.05);
  });
  it('retter vanlige OCR-feil i tall', () => {
    expect(rensOcr('l6 opptrinn - gangretning')).toBe('16 opptrinn - gangretning');
    expect(rensOcr('l stk. RETT TRAPP')).toBe('1 stk. RETT TRAPP');
    expect(rensOcr('LØP1: 8O5mm Ikke')).toBe('LØP1: 805mm Ikke');
  });
});
