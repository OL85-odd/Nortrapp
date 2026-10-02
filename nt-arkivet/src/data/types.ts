import type { ProsessPost, Prosjekt } from '../prosess/types';

/* Datamodellen for NT-Arkivet.
   Alt som lagres er rene JSON-objekter, slik at samme data kan ligge i
   nettleseren, i en fil på serveren eller i SharePoint senere. */

export type StasjonStatus = 'aktiv' | 'under_arbeid';

/** Et stopp på en linje, eller en flis i en samling. Peker (etter hvert) til en prosedyre. */
export interface Stasjon {
  id: string;
  navn: string;
  /** Kort forklaring som vises i kartet og i sidepanelet. */
  beskrivelse?: string;
  status: StasjonStatus;
  /** Prosessen (fra arkivet) som hører til stasjonen. */
  prosessId?: string;
  /** Alternative spor, f.eks. Staircon / Fusion / FreeCAD under «Tegning». Bare på linjer. */
  grener?: Stasjon[];
}

/**
 * Linje: en prosess der rekkefølgen betyr noe — tegnes som T-banekart.
 * Samling: rutiner og oppgaver uten rekkefølge — tegnes som fliser.
 */
export type KortType = 'linje' | 'samling';

/** Faste farger som fungerer i både lys og mørk modus. */
export const FARGER = ['rod', 'bla', 'gul', 'gronn', 'lilla', 'oransje', 'turkis', 'gra'] as const;
export type Farge = (typeof FARGER)[number];

export const FARGENAVN: Record<Farge, string> = {
  rod: 'Nortrapp-rød',
  bla: 'Nortrapp-blå',
  gul: 'Gul',
  gronn: 'Grønn',
  lilla: 'Lilla',
  oransje: 'Oransje',
  turkis: 'Turkis',
  gra: 'Grå',
};

export function fargeVar(f: Farge): string {
  return `var(--k-${f})`;
}

/** Et kort på oversikten: enten en linje eller en samling. */
export interface Kort {
  id: string;
  type: KortType;
  navn: string;
  /** Kort kode (1–2 tegn) som vises i merket, f.eks. «H» for hovedlinjen. */
  kode: string;
  farge: Farge;
  beskrivelse?: string;
  stasjoner: Stasjon[];
}

/** @deprecated Gammelt navn — bruk Kort. */
export type Linje = Kort;

export interface Bruker {
  /** Fast ID som aldri endres — logger og kontroller peker hit. */
  id: string;
  initialer: string;
  navn: string;
  /** Arkiverte brukere vises ikke i velgeren, men beholdes i historikken. */
  arkivert?: boolean;
}

/** En publisert versjon av kartet. Hele kartet lagres, så man kan gå tilbake. */
export interface Revisjon {
  nr: number;
  dato: string;
  brukerId: string | null;
  kommentar: string;
  endringer: string[];
  kort: Kort[];
}

export interface Database {
  /** Øk ved endringer i strukturen, så eldre data kan oppgraderes. */
  skjema: number;
  oppdatert: string;
  kort: Kort[];
  brukere: Bruker[];
  revisjoner: Revisjon[];
  prosjekter: Prosjekt[];
  /** Alle prosesser og prosedyrer (Staircon, kaffemaskin …) med versjoner. */
  prosesser: ProsessPost[];
  innstillinger: {
    /** Adressen appen har på serveren, f.eks. http://nt-arkivet/. Brukes i QR-koder. */
    serverAdresse?: string;
  };
  /** SHA-256 av PIN-koden for redigeringsmodus. Ikke ekte sikkerhet — hindrer uhell. */
  pinHash?: string;
}
