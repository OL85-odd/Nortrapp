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
  /** Merknad til den som kontrollerer innholdet. «test» = forslag som må prøves i programmet. */
  merknad?: { type: 'ny' | 'endret' | 'test'; tekst: string };
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
  /** Regelbiblioteket for innlesing av ordrebekreftelse og produksjonsordre. */
  innlesing?: Innlesing;
  faser: Fase[];
}

/* ── Innlesing av dokumenter ──────────────────────────────── */

/** Dokumenttypene som kan leses inn. «annet» (skisser o.l.) lagres, men tolkes ikke.
    «planview» er tegningen fra Staircon (tittelfeltet med etasjehøyde, inntrinn osv.). */
export type DokType = 'ob' | 'po' | 'planview' | 'annet';

/** Et felt som innlesingen skal fylle ut. Nøkkelen er et valg-steg (f.eks. «trappetype»),
    en feltnøkkel i prosessen (f.eks. «overflate») eller en egen nøkkel (f.eks. «etasjehoyde»). */
export interface ImportFelt {
  nokkel: string;
  /** Visningsnavn. Hentes fra prosessen hvis tomt. */
  etikett?: string;
  /** Må fylles ut. Hvis ikke funnet, spør appen. */
  pakrevd?: boolean;
  /** Bare påkrevd når denne dokumenttypen er lest inn. */
  kreverDok?: Exclude<DokType, 'annet'>;
  /** Spørsmålet brukeren får når feltet mangler. */
  sporsmal?: string;
  /** Foreslått verdi når dokumentene ikke nevner feltet (vises som usikker). */
  standard?: string;
  /** Tall sammenlignes som tall (056867 = 56867). */
  tall?: boolean;
  enhet?: string;
  /** Rimelige verdier [min, maks]. Utenfor → usikker (fanger opp OCR-feil). */
  omrade?: [number, number];
}

/** En regel: finner et mønster i en linje og gir en verdi til et felt. */
export interface ImportRegel {
  id: string;
  felt: string;
  /** Tekst med {tall}, {tekst} og {*} — eller «regex:» foran et regulært uttrykk. */
  monster: string;
  /** Fast verdi (f.eks. alternativet «rett»). Tom: verdien hentes fra {tall}/{tekst}. */
  verdi?: string;
  /** Bare i denne dokumenttypen. */
  dok?: Exclude<DokType, 'annet'>;
  /** Linjen teller ikke hvis den også inneholder dette (samme mønsterspråk). */
  unntak?: string;
  /** Treffet er bare et hint — feltet markeres som usikkert. */
  usikker?: boolean;
  /** Rødt varsel som vises når regelen slår til. */
  varsel?: string;
}

export interface Innlesing {
  felter: ImportFelt[];
  regler: ImportRegel[];
}

/** Et dokument som er lest inn og lagret med prosjektet. */
export interface ProsjektDokument {
  id: string;
  navn: string;
  type: DokType;
  /** Originalfilen («media:…»). */
  fil: string;
  /** Sidene som bilder («media:…»). */
  sider: string[];
  lest: string;
  brukerId: string | null;
  /** Lest med OCR (skannet) eller som tekst. */
  ocr: boolean;
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
  /** Bare i papirkurven: stasjonene prosessen var koblet til, så koblingen kan gjenopprettes. */
  stasjoner?: string[];
}

/* ── Prosjekter ────────────────────────────────────────────── */

export type Svar = string | string[];

export type LoggType = 'opprettet' | 'utfort' | 'angret' | 'svar' | 'felt' | 'notat' | 'omgjort' | 'importert' | 'oppgradert' | 'innlest';

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
  /** Ordrebekreftelse, produksjonsordre o.l. som er lest inn. */
  dokumenter?: ProsjektDokument[];
  ferdig?: string;
}

export const MERKNAD: Record<'ny' | 'endret' | 'test', string> = { ny: 'Nytt i v3.0', endret: 'Endret i v3.0', test: 'Må testes' };
