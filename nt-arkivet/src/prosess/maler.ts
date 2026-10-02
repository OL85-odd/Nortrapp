import type { Kategori, Prosess } from './types';
import { nyId } from './redigering/ops';

/* ─────────────────────────────────────────────────────────────
   Maler for nye prosesser. Hver mal gir et ferdig skjelett som
   redigeres videre i strukturkartet. Ingenting her er låst.
   ───────────────────────────────────────────────────────────── */

export interface Mal {
  id: string;
  navn: string;
  beskrivelse: string;
  kategori: Kategori;
  lag: (navn: string) => Prosess;
}

const grunn = (navn: string, felt: Partial<Prosess>): Prosess => ({
  id: nyId('pr'),
  navn,
  versjon: '1',
  oppdatert: new Date().toISOString().slice(0, 10),
  type: 'annet',
  faser: [],
  ...felt,
});

const s = (tittel: string, felt: Partial<Prosess['faser'][number]['steg'][number]> = {}) => ({ id: nyId('s'), tittel, ...felt });
const f = (tittel: string, steg: Prosess['faser'][number]['steg'], undertittel?: string) => ({ id: nyId('f'), tittel, undertittel, steg });

export const MALER: Mal[] = [
  {
    id: 'programvare',
    navn: 'Programvare (som Staircon)',
    beskrivelse: 'Spørsmål først, så faser med steg. Svarene bygger stien. Eget hurtigtastpanel. Kjøres som prosjekter med nummer og kunde.',
    kategori: 'PRO',
    lag: (navn) => {
      const typeId = nyId('s');
      return grunn(navn, {
        type: 'programvare',
        prosjekter: true,
        hurtigtaster: [{ tast: 'Ctrl + S', tekst: 'Lagre' }],
        alltidTaster: ['Ctrl + S'],
        faser: [
          f('Oppsett', [
            s('Hvilken type jobb er dette?', {
              id: typeId,
              valg: {
                type: 'ett',
                sporsmal: 'Type',
                alternativer: [
                  { id: 'standard', navn: 'Standard' },
                  { id: 'spesial', navn: 'Spesialtilpasset' },
                ],
              },
            }),
          ], 'Svarene bestemmer resten av stien.'),
          f('Oppstart', [s('Åpne programmet'), s('Opprett eller åpne prosjektet', { hurtigtaster: ['Ctrl + S'] })]),
          f('Arbeid', [s('Første arbeidssteg', { tekst: 'Beskriv hva som skal gjøres.' }), s('Ekstra steg for spesialtilpasning', { gjelder: { steg: typeId, er: 'spesial' } })]),
          f('Ferdigstilling', [s('Kontroller mot ordren'), s('Lagre og arkiver')]),
        ],
      });
    },
  },
  {
    id: 'rutine',
    navn: 'Enkel rutine',
    beskrivelse: 'Én sjekkliste uten spørsmål. Hver gjennomføring logges med hvem og når.',
    kategori: 'FAS',
    lag: (navn) => grunn(navn, { faser: [f('Rutine', [s('Første punkt'), s('Andre punkt'), s('Kontroller at alt er i orden')])] }),
  },
  {
    id: 'les',
    navn: 'Les-instruks',
    beskrivelse: 'Bare lesing, ingen avkrysning. F.eks. «Slik fyller du papir i printeren».',
    kategori: 'ADM',
    lag: (navn) =>
      grunn(navn, {
        kunLesing: true,
        faser: [f('Instruks', [s('Slik gjør du', { tekst: 'Skriv instruksen her. Legg gjerne til bilder.' })])],
      }),
  },
  {
    id: 'maskinopplaering',
    navn: 'Maskinopplæring',
    beskrivelse: 'Sikkerhet → oppstart → bruk → stopp → renhold, med kvittering for gjennomført opplæring.',
    kategori: 'MAS',
    lag: (navn) =>
      grunn(navn, {
        type: 'maskin',
        kjektAVite: 'Nødstopp sitter …\nKontaktperson ved feil: …',
        faser: [
          f('Sikkerhet', [
            s('Verneutstyr', { husk: 'Vernebriller og hørselsvern skal alltid brukes.' }),
            s('Vis hvor nødstoppen er'),
            s('Kontroller sikkerhetsutstyret', { valg: { type: 'janei', sporsmal: 'Fungerer sikkerhetsutstyret?', ja: 'Fortsett.', nei: 'STOPP. Meld fra til ansvarlig før maskinen brukes.' } }),
          ]),
          f('Oppstart', [s('Slå på maskinen'), s('Kjør prøve')]),
          f('Bruk', [s('Normal bruk', { tekst: 'Beskriv arbeidsflyten.' })]),
          f('Stopp og renhold', [s('Slå av maskinen'), s('Rengjør arbeidsområdet')]),
          f('Kvittering', [
            s('Opplæringen er gjennomført', {
              felter: [
                { nokkel: 'laerling', etikett: 'Hvem fikk opplæring', viktig: true },
                { nokkel: 'instruktor', etikett: 'Instruktør' },
              ],
            }),
          ]),
        ],
      }),
  },
  {
    id: 'vedlikehold',
    navn: 'Vedlikehold med intervall',
    beskrivelse: 'Fast rutine som blir rød når den er forfalt (f.eks. filterrens hver uke).',
    kategori: 'MAS',
    lag: (navn) =>
      grunn(navn, {
        type: 'maskin',
        intervallDager: 7,
        faser: [
          f('Vedlikehold', [
            s('Slå av og sikre maskinen', { husk: 'Maskinen skal være strømløs.' }),
            s('Utfør vedlikeholdet', { tekst: 'Beskriv hva som skal gjøres.' }),
            s('Noter avvik', { felter: [{ nokkel: 'avvik', etikett: 'Avvik (la stå tomt hvis ingen)' }] }),
          ]),
        ],
      }),
  },
  {
    id: 'feilsoking',
    navn: 'Feilsøking',
    beskrivelse: 'Ja/nei-tre: hvert svar leder til neste sjekk.',
    kategori: 'MAS',
    lag: (navn) => {
      const a = nyId('s');
      const b = nyId('s');
      return grunn(navn, {
        type: 'maskin',
        faser: [
          f('Feilsøking', [
            s('Starter maskinen?', { id: a, valg: { type: 'janei', sporsmal: 'Starter maskinen?', ja: 'Gå videre til neste sjekk.', nei: 'Sjekk strøm og nødstopp.' } }),
            s('Er nødstoppen trykket inn?', { id: b, gjelder: { steg: a, er: 'nei' }, valg: { type: 'janei', sporsmal: 'Nødstopp inne?', ja: 'Vri nødstoppen ut og prøv igjen.', nei: 'Kontakt ansvarlig.' } }),
            s('Kjør prøve', { gjelder: { steg: a, er: 'ja' } }),
          ]),
        ],
      });
    },
  },
  {
    id: 'kontroll',
    navn: 'Kvalitets-/mottakskontroll',
    beskrivelse: 'Sjekkpunkter med tallfelt og registrering av avvik.',
    kategori: 'PRD',
    lag: (navn) => {
      const ok = nyId('s');
      return grunn(navn, {
        faser: [
          f('Kontroll', [
            s('Kontroller antall', { felter: [{ nokkel: 'antall', etikett: 'Antall', type: 'tall', enhet: 'stk' }] }),
            s('Kontroller mål', { felter: [{ nokkel: 'maal', etikett: 'Målt lengde', type: 'tall', enhet: 'mm' }] }),
            s('Er alt i orden?', { id: ok, valg: { type: 'janei', sporsmal: 'I orden?', ja: 'Godkjent.', nei: 'Registrer avviket i neste steg.' } }),
            s('Beskriv avviket', { gjelder: { steg: ok, er: 'nei' }, felter: [{ nokkel: 'avvik', etikett: 'Avvik' }] }),
          ]),
        ],
      });
    },
  },
  {
    id: 'blank',
    navn: 'Blank',
    beskrivelse: 'Tom prosess med én fase.',
    kategori: 'ADM',
    lag: (navn) => grunn(navn, { faser: [f('Fase 1', [s('Første steg')])] }),
  },
];
