import type { Database } from './types';

/* Startinnholdet første gang appen åpnes.
   Senere endres dette i redigeringsmodus — ikke her. */

export const SEED: Database = {
  skjema: 1,
  oppdatert: '2026-10-02',
  brukere: [
    { initialer: 'OL', navn: 'Odd' },
    { initialer: 'RA', navn: 'Roger' },
    { initialer: 'SA', navn: 'Simen' },
  ],
  linjer: [
    {
      id: 'hoved',
      navn: 'Hovedlinjen',
      kode: 'H',
      farge: 'var(--accent)',
      beskrivelse: 'Fra kunden tar kontakt til ettermarked.',
      stasjoner: [
        { id: 'kontakt', navn: 'Kunde tar kontakt', status: 'under_arbeid' },
        {
          id: 'tilbud',
          navn: 'Tilbud',
          status: 'aktiv',
          beskrivelse: 'Trappevalg, tilbudstegning og Sketchfab-modell til salget er i havn.',
        },
        { id: 'ordrebekreftelse', navn: 'Ordrebekreftelse', status: 'under_arbeid' },
        {
          id: 'produksjonsordre',
          navn: 'Produksjonsordre',
          status: 'aktiv',
          beskrivelse: 'Produksjonsordre og -seddel i Kalken (Access).',
        },
        {
          id: 'tegning',
          navn: 'Tegning',
          status: 'aktiv',
          beskrivelse: 'Verktøyet avhenger av prosjektet.',
          grener: [
            {
              id: 'staircon',
              navn: 'Staircon',
              status: 'aktiv',
              beskrivelse: 'Trapper tegnes og produksjonsunderlag lages i Staircon.',
            },
            { id: 'fusion', navn: 'Fusion 360', status: 'under_arbeid' },
            { id: 'freecad', navn: 'FreeCAD', status: 'under_arbeid' },
          ],
        },
        { id: 'produksjon', navn: 'Produksjon', status: 'under_arbeid' },
        { id: 'pakking', navn: 'Pakking', status: 'under_arbeid' },
        { id: 'levering', navn: 'Levering', status: 'under_arbeid' },
        { id: 'montering', navn: 'Montering', status: 'under_arbeid' },
        { id: 'oppfolging', navn: 'Oppfølging', status: 'under_arbeid' },
        { id: 'ettermarked', navn: 'Ettermarked', status: 'under_arbeid' },
      ],
    },
    {
      id: 'maskiner',
      navn: 'Maskiner og vedlikehold',
      kode: 'M',
      farge: 'var(--secondary)',
      beskrivelse: 'Opplæring, renhold og faste vedlikeholdsoppgaver.',
      stasjoner: [
        { id: 'cnc', navn: 'CNC-fres', status: 'under_arbeid' },
        { id: 'avsug', navn: 'Avsug og filter', status: 'under_arbeid' },
        { id: 'kantpresse', navn: 'Kantpresse', status: 'under_arbeid' },
        { id: 'kaffemaskin', navn: 'Kaffemaskin', status: 'under_arbeid' },
      ],
    },
    {
      id: 'hms',
      navn: 'HMS',
      kode: 'S',
      farge: 'var(--warn)',
      beskrivelse: 'Verneutstyr, rutiner og sikkerhet.',
      stasjoner: [
        { id: 'verneutstyr', navn: 'Verneutstyr', status: 'under_arbeid' },
        { id: 'forstehjelp', navn: 'Førstehjelp', status: 'under_arbeid' },
        { id: 'brann', navn: 'Brannvern', status: 'under_arbeid' },
      ],
    },
    {
      id: 'admin',
      navn: 'Administrasjon',
      kode: 'A',
      farge: 'var(--text-soft)',
      beskrivelse: 'Struktur, rutiner og innkjøp.',
      stasjoner: [
        { id: 'innkjop', navn: 'Innkjøp', status: 'under_arbeid' },
        { id: 'arkiv', navn: 'Arkivering', status: 'under_arbeid' },
        { id: 'nyansatt', navn: 'Ny ansatt', status: 'under_arbeid' },
      ],
    },
  ],
};
