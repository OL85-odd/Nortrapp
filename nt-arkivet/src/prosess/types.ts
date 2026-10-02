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
  /** Vises i statuslinjen/rapporten når den er fylt ut. */
  viktig?: boolean;
}

export interface Bilde {
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

export interface Prosess {
  id: string;
  navn: string;
  versjon: string;
  oppdatert: string;
  faser: Fase[];
}

/* ── Prosjekter ────────────────────────────────────────────── */

export type Svar = string | string[];

export type LoggType = 'opprettet' | 'utfort' | 'angret' | 'svar' | 'felt' | 'notat' | 'omgjort' | 'importert';

export interface LoggPost {
  tid: string;
  brukerId: string | null;
  type: LoggType;
  stegId?: string;
  tekst: string;
}

export type ProsjektType = 'prosjekt' | 'tilbud' | 'ovelse';

export interface Prosjekt {
  id: string;
  prosessId: string;
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
