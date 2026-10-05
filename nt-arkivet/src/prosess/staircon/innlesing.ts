import type { ImportRegel, Innlesing } from '../types';

/* ─────────────────────────────────────────────────────────────
   Regelbiblioteket for Staircon: ordrebekreftelse (OB, skannet fra
   Kalken) og produksjonsordre (PO, lesbar PDF med Planview limt inn).

   Bygget på eksempeldokumentene H420–H483 (se docs/NT-Arkivet-plan.md).
   Biblioteket kan redigeres i appen under «Rediger prosess → Innlesing».
   ───────────────────────────────────────────────────────────── */

let n = 0;
const r = (felt: string, monster: string, ekstra: Partial<ImportRegel> = {}): ImportRegel => ({ id: `r${String(++n).padStart(2, '0')}`, felt, monster, ...ekstra });

export const STAIRCON_INNLESING: Innlesing = {
  felter: [
    { nokkel: 'kalkylenr', etikett: 'Kalkylenummer', pakrevd: true, tall: true },
    { nokkel: 'prosjektnr', pakrevd: true, kreverDok: 'po', sporsmal: 'Fant ikke produksjonsnummeret (HXXX-XX). Fyll inn.' },
    { nokkel: 'kunde', etikett: 'Kunde', pakrevd: true },
    { nokkel: 'leveringsadresse', etikett: 'Leveringsadresse' },
    { nokkel: 'leveringsuke', etikett: 'Leveringsuke', tall: true },
    {
      nokkel: 'trappetype',
      pakrevd: true,
      sporsmal: 'Trappetypen står bare på ordrebekreftelsen. Hvilken trapp er det?',
    },
    { nokkel: 'treslag', etikett: 'Treslag' },
    { nokkel: 'trappebredde', etikett: 'Trappebredde (LØP1)', tall: true, enhet: 'mm', omrade: [600, 1600] },
    { nokkel: 'antall_opptrinn', etikett: 'Antall opptrinn', tall: true, omrade: [2, 25] },
    {
      nokkel: 'ganglinje',
      pakrevd: true,
      sporsmal: 'Ganglinjen står ikke i dokumentene. Se pilen på skissen: høyre eller venstre opp?',
    },
    { nokkel: 'vange', pakrevd: true, sporsmal: 'Vangeoppsettet står ikke i dokumentene. Se skissen.' },
    { nokkel: 'tillegg', pakrevd: true, sporsmal: 'Fant ingen tillegg (gelender, repo, megler …). Stemmer det?' },
    { nokkel: 'repo_bygg', standard: 'nei' },
    { nokkel: 'gelender_type' },
    { nokkel: 'gelender_sprosser' },
    { nokkel: 'gelender_meglere' },
    { nokkel: 'gelender_lengde', tall: true, enhet: 'mm', omrade: [100, 6000] },
    { nokkel: 'e01', pakrevd: true, sporsmal: 'Står det stusstrinn (tett trapp) eller barnesikring (åpen trapp)?' },
    { nokkel: 'overflate', pakrevd: true },
    { nokkel: 'endelister', pakrevd: true, kreverDok: 'po', tall: true, omrade: [0, 10] },
    { nokkel: 'p07c', standard: 'nei' },
    { nokkel: 'p07d', standard: 'nei' },
    { nokkel: 'etasjehoyde', etikett: 'Etasjehøyde (Planview)', tall: true, enhet: 'mm', omrade: [2000, 4500] },
    { nokkel: 'bjelkelag', etikett: 'Bjelkelagstykkelse (Planview)', tall: true, enhet: 'mm', omrade: [150, 600] },
    { nokkel: 'inntrinn', etikett: 'Inntrinn (Planview)', tall: true, enhet: 'mm', omrade: [200, 330] },
    { nokkel: 'opptrinn', etikett: 'Opptrinn (Planview)', tall: true, enhet: 'mm', omrade: [140, 230] },
    { nokkel: 'frihoyde', etikett: 'Frihøyde (Planview)', tall: true, enhet: 'mm', omrade: [1900, 4000] },
  ],
  regler: [
    // Nummer og kunde
    r('kalkylenr', 'Reg.nr.: {tall}', { dok: 'ob' }),
    r('kalkylenr', 'Best.nr.: {tall}', { dok: 'po' }),
    r('prosjektnr', 'regex:Prod\\.?\\s*nr\\.?:?[\\s│]*(H\\d{3,4}-\\d{2})', { dok: 'po' }),
    r('prosjektnr', 'regex:Proj:?[\\s│]*(H\\d{3,4}-\\d{2})'),
    r('kunde', 'Kunde: {tekst}', { dok: 'po' }),
    r('leveringsadresse', 'Lev.adr. {tekst}', { dok: 'ob' }),
    r('leveringsuke', 'Leveringstid: Uke {tall}', { dok: 'ob' }),
    r('leveringsuke', 'Uke: {tall}', { dok: 'po' }),

    // Trappen
    r('trappetype', 'RETT TRAPP', { verdi: 'rett' }),
    r('trappetype', 'KVARTSVING', { verdi: 'svingtrapp_90', usikker: true }),
    r('trappetype', 'SVINGTRAPP', { verdi: 'svingtrapp_90', usikker: true }),
    r('trappetype', 'HALVSVING', { verdi: 'svingtrapp_u', usikker: true }),
    r('trappetype', 'U-TRAPP', { verdi: 'svingtrapp_u', usikker: true }),
    r('treslag', 'TRAPP I {tekst} med', { dok: 'ob' }),
    r('treslag', 'regex:TRESLAG:?\\s*(?:I\\s+)?([^│]+?)\\s*(?:SKALLTRINN|│|$)', { dok: 'po' }),
    r('trappebredde', 'LØP1: {tall} mm'),
    r('antall_opptrinn', '{tall} opptrinn', { dok: 'ob' }),

    // Ganglinje og vanger (står i samme felt i Kalken: «gangretning»)
    r('ganglinje', 'HØYRE opp', { verdi: 'hoyre_opp' }),
    r('ganglinje', 'VENSTRE opp', { verdi: 'venstre_opp' }),
    r('vange', 'Mellom vegger', { verdi: 'mellom_vegger' }),
    r('vange', 'Mellom 2 vegger', { verdi: 'mellom_vegger' }),
    r('vange', 'Synlig veggvange', { verdi: 'en_synlig', usikker: true }),
    r('vange', 'Synlig VV', { verdi: 'en_synlig', usikker: true }),
    r('vange', '2 synlige vanger', { verdi: 'to_synlige' }),

    // Tillegg
    r('tillegg', 'Returgelender -', { verdi: 'gelender' }),
    r('tillegg', 'balustre', { verdi: 'gelender' }),
    r('tillegg', 'REPO', { verdi: 'repo' }),
    r('tillegg', 'regex:Meglere?\\s+(?:type|oppe|nede|på)(?![\\p{L}])', { verdi: 'megler' }),
    r('tillegg', 'Glassrekkverk', { verdi: 'glass' }),
    r('tillegg', 'TV-ramme', { verdi: 'tvramme' }),
    r('tillegg', 'Spilevegg', { verdi: 'spiler_tak', usikker: true }),
    r('repo_bygg', 'REPO PÅ BYGG', { verdi: 'ja' }),

    // Gelender
    r('gelender_type', 'Returgelender - {tekst}'),
    r('gelender_type', 'regex:[·*]\\s*(håndløper\\s+\\d+\\s*x\\s*\\d+\\s*mm\\s+TYPE\\s+\\w)'),
    r('gelender_sprosser', 'regex:(runde\\s+sprosser/balustre\\s+\\d+\\s*mm(?:\\s+TYPE\\s+\\w+)?)'),
    r('gelender_meglere', 'regex:(Meglere?\\s+type\\s+\\d+[^│]*?)(?:\\s+inkl\\.?)?\\s*(?:│|$)'),
    r('gelender_lengde', 'regex:Returgelender.*?(\\d{3,4})\\s*mm\\s*$', { unntak: 'ikke medregnet' }),

    // Stusstrinn eller barnesikring
    r('e01', 'STUSSTRINN', { verdi: 'ja' }),
    r('e01', 'TETT TRAPP', { verdi: 'ja' }),
    r('e01', 'regex:barnesikring', { verdi: 'nei' }),
    r('e01', 'ÅPEN TRAPP', { verdi: 'nei', usikker: true }),

    // Overflate
    r('overflate', 'fargekoder: {tekst}'),
    r('overflate', 'Malt fargekode: {tekst}'),
    r('overflate', 'ubehandlet', { verdi: 'Ubehandlet' }),
    r('overflate', 'Ikke avklart', { varsel: 'Overflaten er ikke avklart. Den må avklares før produksjon.' }),

    // Endelister, trinnkasse, dekklister
    r('endelister', 'regex:[-–]\\s*(\\d+)\\s*(?:stk\\.?\\s*)?EL\\b', { dok: 'po' }),
    r('p07c', 'regex:trinnkasse', { verdi: 'ja' }),
    r('p07d', 'regex:Dekklist', { verdi: 'ja' }),

    // Planview (tittelfeltet fra Staircon, limt inn i produksjonsordren)
    r('etasjehoyde', 'regex:Etasjeh.yde[^\\d\\n]{0,4}(\\d{3,4})'),
    r('bjelkelag', 'regex:Bjelkelagstykkelse[^\\d\\n]{0,4}(\\d{2,3})(?!\\d)'),
    r('inntrinn', 'regex:Inntrinn[^\\d\\n]{0,4}(\\d{3}(?:[.,]\\d+)?)'),
    r('opptrinn', 'regex:Opptrinn[^\\d\\n]{0,4}(\\d{3}(?:[.,]\\d+)?)'),
    r('frihoyde', 'regex:Frih.yde[^\\d\\n]{0,4}(\\d{3,4})'),
  ],
};
