/* ─────────────────────────────────────────────────────────────
   Prosesser (f.eks. Staircon) og prosjekter som kjøres gjennom dem.

   En prosess består av faser, og faser av steg. Et steg kan stille et
   spørsmål (valg). Svarene bestemmer hvilke faser og steg som gjelder,
   slik at stien bygger seg selv: valg 1 leder til valg 2 osv.
   ───────────────────────────────────────────────────────────── */

/** Når gjelder en fase eller et steg? */
export type Betingelse =
  | { steg: string; er: string | string[] } // svaret på steget er (ett av) disse
  | { alle: Betingelse[] }
  | { noen: Betingelse[] }
  | { ikke: Betingelse };

export interface Alternativ {
  id: string;
  navn: string;
  beskrivelse?: string;
}

export type Valg =
  /** Ja/nei. `knapper` kan gi andre etiketter, f.eks. Stusstrinn / Barnesikring. */
  | { type: 'janei'; sporsmal: string; ja: string; nei: string; knapper?: { ja: string; nei: string } }
  /** Velg ett alternativ. */
  | { type: 'ett'; sporsmal: string; alternativer: Alternativ[] }
  /** Velg ingen, ett eller flere alternativer. */
  | { type: 'flere'; sporsmal: string; alternativer: Alternativ[] };

export interface Felt {
  nokkel: string;
  etikett: string;
  plassholder?: string;
  /** Tallfelt kan brukes i kryss-kontroll og beregninger. */
  type?: 'tekst' | 'tall';
  enhet?: string;
  /** Vises i statuslinjen/rapporten når den er fylt ut. */
  viktig?: boolean;
}

export interface Bilde {
  /** Filnavn i appen (f.eks. «p1-….webp») eller «media:<id>» for opplastede bilder. */
  fil: string;
  tekst: string;
}

export interface Steg {
  id: string;
  tittel: string;
  tekst?: string;
  /** Rød «Husk!»-advarsel. */
  husk?: string;
  /** Staircon-tastene som brukes i steget, f.eks. ["F7", "Ctrl + E"]. */
  hurtigtaster?: string[];
  verdier?: { navn: string; verdi: string }[];
  bilder?: Bilde[];
  /** Forklaring fra Staircons hjelpefil (oversatt til norsk). */
  hjelp?: { kilde: string; tekst: string };
  dokument?: { fil: string; tekst: string };
  /** Video på serveren eller en nettlenke. */
  video?: { kilde: string; tekst: string };
  /** Lenke til en annen prosess, f.eks. «Følg NT-MAS-002 Kantpresse». */
  lenke?: { prosessId: string; tekst?: string };
  farger?: { farge: string; hex: string; tekst: string }[];
  felter?: Felt[];
  valg?: Valg;
  gjelder?: Betingelse;
  /** Markerer nytt/endret innhold i denne versjonen, så det kan kontrolleres. */
  merknad?: { type: 'ny' | 'endret'; tekst: string };
}

export interface Fase {
  id: string;
  tittel: string;
  undertittel?: string;
  gjelder?: Betingelse;
  steg: Steg[];
}

/** Programvare får hurtigtastpanel. Maskiner og annet får «Kjekt å vite». */
export type ProsessType = 'programvare' | 'maskin' | 'annet';

export interface Hurtigtast {
  tast: string;
  tekst: string;
  /** Kildene er uenige eller tasten er ukjent — må kontrolleres. */
  kontroller?: string;
}

export interface Prosess {
  id: string;
  navn: string;
  versjon: string;
  oppdatert: string;
  beskrivelse?: string;
  type?: ProsessType;
  /** Instruks som bare skal leses — ingen avkrysning eller logg. */
  kunLesing?: boolean;
  /** Kjøres som prosjekter med nummer, kunde og tilbud (som Staircon). Ellers som gjennomføringer. */
  prosjekter?: boolean;
  /** Gjentakende rutine: forfaller så mange dager etter siste gjennomføring. */
  intervallDager?: number;
  /** Hurtigtastene prosessen bruker (programvare). */
  hurtigtaster?: Hurtigtast[];
  /** Taster som vises i panelet uansett steg. */
  alltidTaster?: string[];
  /** Fritekst i panelet for maskiner og annet. Én linje per punkt. */
  kjektAVite?: string;
  faser: Fase[];
}

/* ── Prosessarkivet ────────────────────────────────────────── */

export const KATEGORIER = {
  MAS: 'Maskiner',
  FAS: 'Fasiliteter',
  PRO: 'Programvare',
  HMS: 'HMS',
  ADM: 'Administrasjon',
  PRD: 'Produksjon',
} as const;
export type Kategori = keyof typeof KATEGORIER;

/** En publisert versjon. Hele innholdet lagres, så prosjekter kan låses til den. */
export interface ProsessVersjon {
  nr: number;
  dato: string;
  brukerId: string | null;
  kommentar: string;
  endringer: string[];
  prosess: Prosess;
}

/** En prosess i arkivet. `nr` (f.eks. NT-PRO-001) settes én gang og endres aldri — QR-koder peker hit. */
export interface ProsessPost {
  id: string;
  nr: string;
  kategori: Kategori;
  opprettet: string;
  versjoner: ProsessVersjon[];
}

/* ── Prosjekter ────────────────────────────────────────────── */

export type Svar = string | string[];

export type LoggType = 'opprettet' | 'utfort' | 'angret' | 'svar' | 'felt' | 'notat' | 'omgjort' | 'importert' | 'oppgradert';

export interface LoggPost {
  tid: string;
  brukerId: string | null;
  type: LoggType;
  stegId?: string;
  tekst: string;
}

/** «gjennomforing» er én kjøring av en enkel rutine (f.eks. rengjøring). */
export type ProsjektType = 'prosjekt' | 'tilbud' | 'ovelse' | 'gjennomforing';

export interface Prosjekt {
  id: string;
  prosessId: string;
  /** Prosjektet er låst til denne versjonen av prosessen. */
  prosessVersjon: number;
  type: ProsjektType;
  /** Prosjektnummer (HXXX-XX) eller tilbudsnavn. */
  nummer: string;
  kalkylenr?: string;
  kunde?: string;
  opprettet: string;
  opprettetAv: string | null;
  svar: Record<string, Svar>;
  felt: Record<string, string>;
  utfort: Record<string, { tid: string; brukerId: string | null }>;
  /** Egne notater per steg. */
  notater?: Record<string, string>;
  /** Steget brukeren står på. */
  aktivt?: string;
  logg: LoggPost[];
  tilbud?: { filbane?: string; sketchfab?: string };
  ferdig?: string;
}
