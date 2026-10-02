/* Datamodellen for NT-Arkivet.
   Alt som lagres er rene JSON-objekter, slik at samme data kan ligge i
   nettleseren, i en fil på serveren eller i SharePoint senere. */

export type StasjonStatus = 'aktiv' | 'under_arbeid';

/** Et stopp på en linje. Peker (etter hvert) til en prosedyre. */
export interface Stasjon {
  id: string;
  navn: string;
  /** Kort forklaring som vises i kartet og i sidepanelet. */
  beskrivelse?: string;
  status: StasjonStatus;
  prosedyreId?: string;
  /** Alternative spor, f.eks. Staircon / Fusion / FreeCAD under «Tegning». */
  grener?: Stasjon[];
}

/** En bane i T-banekartet. */
export interface Linje {
  id: string;
  navn: string;
  /** Kort kode som vises i linjemerket, f.eks. «H» for hovedlinjen. */
  kode: string;
  /** Navnet på en CSS-variabel eller en hex-farge. */
  farge: string;
  beskrivelse?: string;
  stasjoner: Stasjon[];
}

export interface Bruker {
  /** Fast ID som aldri endres — logger og kontroller peker hit. */
  id: string;
  initialer: string;
  navn: string;
  /** Arkiverte brukere vises ikke i velgeren, men beholdes i historikken. */
  arkivert?: boolean;
}

export interface Database {
  /** Øk ved endringer i strukturen, så eldre data kan oppgraderes. */
  skjema: number;
  oppdatert: string;
  linjer: Linje[];
  brukere: Bruker[];
}
