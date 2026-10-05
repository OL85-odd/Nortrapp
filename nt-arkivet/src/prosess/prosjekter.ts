import { db, nyId, oppdater } from '../data/store';
import { bruker } from '../ui/settings';
import { svarTekst } from './motor';
import { nyesteVersjonsnr, prosessForProsjekt } from './arkiv';
import type { LoggPost, Prosess, Prosjekt, ProsjektDokument, ProsjektType, Svar } from './types';

/* Prosjekter: opprette, svare, krysse av og logge.
   Alt som skjer i et prosjekt loggføres med tid og initialer. */

/** Innholdet prosjektet er låst til (se arkiv.ts). */
export function prosessFor(p: Pick<Prosjekt, 'prosessId' | 'prosessVersjon'>): Prosess {
  return prosessForProsjekt(p);
}

function finnSteg(prosess: Prosess, id: string) {
  return prosess.faser.flatMap((f) => f.steg).find((s) => s.id === id);
}

function post(type: LoggPost['type'], tekst: string, stegId?: string): LoggPost {
  return { tid: new Date().toISOString(), brukerId: bruker.value, type, tekst, stegId };
}

function endreProsjekt(id: string, fn: (p: Prosjekt) => Prosjekt) {
  return oppdater((d) => ({ ...d, prosjekter: d.prosjekter.map((p) => (p.id === id ? fn(p) : p)) }));
}

export function hentProsjekt(id: string): Prosjekt | undefined {
  return db.value.prosjekter.find((p) => p.id === id);
}

export async function opprett(felt: { prosessId: string; type: ProsjektType; nummer: string; kalkylenr?: string; kunde?: string }) {
  const p: Prosjekt = {
    id: nyId('p'),
    ...felt,
    prosessVersjon: nyesteVersjonsnr(felt.prosessId),
    opprettet: new Date().toISOString(),
    opprettetAv: bruker.value,
    svar: {},
    felt: felt.nummer && felt.type === 'prosjekt' ? { prosjektnr: felt.nummer } : {},
    utfort: {},
    logg: [
      post(
        'opprettet',
        { ovelse: 'Øvingsprosjekt opprettet', tilbud: 'Tilbud opprettet', prosjekt: 'Prosjekt opprettet', gjennomforing: 'Gjennomføring startet' }[felt.type] +
          ` (prosessversjon ${nyesteVersjonsnr(felt.prosessId)})`,
      ),
    ],
  };
  await oppdater((d) => ({ ...d, prosjekter: [p, ...d.prosjekter] }));
  return p;
}

/** Svar på et valg. Et besvart valg regnes som utført, men steget blir stående
    som aktivt til brukeren går videre — så man ser konsekvensen av svaret. */
export function svar(prosjektId: string, stegId: string, verdi: Svar) {
  return endreProsjekt(prosjektId, (p) => {
    const steg = finnSteg(prosessFor(p), stegId);
    const forrige = p.svar[stegId];
    const tekst = steg ? svarTekst(steg, verdi) : String(verdi);
    const endret = forrige !== undefined && JSON.stringify(forrige) !== JSON.stringify(verdi);
    return {
      ...p,
      aktivt: stegId,
      svar: { ...p.svar, [stegId]: verdi },
      utfort: { ...p.utfort, [stegId]: p.utfort[stegId] ?? { tid: new Date().toISOString(), brukerId: bruker.value } },
      logg: [
        ...p.logg,
        post('svar', `${steg?.tittel ?? stegId} → ${tekst}${endret && steg ? ` (var: ${svarTekst(steg, forrige)})` : ''}`, stegId),
      ],
    };
  });
}

export function settFelt(prosjektId: string, nokkel: string, verdi: string, stegId?: string) {
  return endreProsjekt(prosjektId, (p) => {
    if ((p.felt[nokkel] ?? '') === verdi) return p;
    const etikett = prosessFor(p).faser.flatMap((f) => f.steg).flatMap((s) => s.felter ?? []).find((f) => f.nokkel === nokkel)?.etikett ?? nokkel;
    const ny = { ...p, felt: { ...p.felt, [nokkel]: verdi }, logg: [...p.logg, post('felt', `${etikett}: ${verdi || '(tom)'}`, stegId)] };
    if (nokkel === 'prosjektnr' && verdi && p.type === 'prosjekt') ny.nummer = verdi;
    return ny;
  });
}

export function settUtfort(prosjektId: string, stegId: string, utfort: boolean) {
  return endreProsjekt(prosjektId, (p) => {
    if (!!p.utfort[stegId] === utfort) return p;
    const steg = finnSteg(prosessFor(p), stegId);
    const u = { ...p.utfort };
    if (utfort) u[stegId] = { tid: new Date().toISOString(), brukerId: bruker.value };
    else delete u[stegId];
    return { ...p, utfort: u, logg: [...p.logg, post(utfort ? 'utfort' : 'angret', steg?.tittel ?? stegId, stegId)] };
  });
}

export function settNotat(prosjektId: string, stegId: string, tekst: string) {
  return endreProsjekt(prosjektId, (p) => {
    if ((p.notater?.[stegId] ?? '') === tekst) return p;
    return { ...p, notater: { ...p.notater, [stegId]: tekst }, logg: [...p.logg, post('notat', tekst ? `Notat: ${tekst}` : 'Notat fjernet', stegId)] };
  });
}

export function settAktivt(prosjektId: string, stegId: string) {
  return endreProsjekt(prosjektId, (p) => (p.aktivt === stegId ? p : { ...p, aktivt: stegId }));
}

export function gjorOmTilProsjekt(prosjektId: string, nummer: string) {
  return endreProsjekt(prosjektId, (p) => ({
    ...p,
    type: 'prosjekt',
    nummer,
    felt: { ...p.felt, prosjektnr: nummer },
    logg: [...p.logg, post('omgjort', `Tilbudet «${p.nummer}» er gjort om til prosjekt ${nummer}`)],
  }));
}

export function settTilbudsinfo(prosjektId: string, info: Prosjekt['tilbud']) {
  return endreProsjekt(prosjektId, (p) => ({ ...p, tilbud: { ...p.tilbud, ...info } }));
}

/** Flytter et aktivt prosjekt over på nyeste versjon av prosessen (bare når brukeren velger det). */
export function oppgraderVersjon(prosjektId: string) {
  return endreProsjekt(prosjektId, (p) => {
    const ny = nyesteVersjonsnr(p.prosessId);
    if (ny === p.prosessVersjon) return p;
    return { ...p, prosessVersjon: ny, logg: [...p.logg, post('oppgradert', `Oppgradert fra prosessversjon ${p.prosessVersjon} til ${ny}`)] };
  });
}

export function settFerdig(prosjektId: string, ferdig: boolean) {
  return endreProsjekt(prosjektId, (p) => ({ ...p, ferdig: ferdig ? new Date().toISOString() : undefined }));
}

export function slettProsjekt(prosjektId: string) {
  return oppdater((d) => ({ ...d, prosjekter: d.prosjekter.filter((p) => p.id !== prosjektId) }));
}

/* ── Import fra den gamle «Staircon ABC»-appen ───────────────
   Den gamle appen lagret i nettleseren under «nortrapp.staircon.v2».
   Åpnes NT-Arkivet i samme nettleser, kan prosjektene hentes over. */

const GAMMEL_NOKKEL = 'nortrapp.staircon.v2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gammel = any;

export function finnGamleProsjekter(): Gammel[] {
  try {
    const d = JSON.parse(localStorage.getItem(GAMMEL_NOKKEL) || 'null');
    const alle = [...(d?.prosjekter ?? []).map((x: Gammel) => ({ ...x, _type: 'prosjekt' })), ...(d?.tilbud ?? []).map((x: Gammel) => ({ ...x, _type: 'tilbud' }))];
    const har = new Set(db.value.prosjekter.map((p) => p.id));
    return alle.filter((x) => !har.has('abc-' + x.id));
  } catch {
    return [];
  }
}

export function konverterGammelt(x: Gammel): Prosjekt {
  const svar: Record<string, Svar> = {};
  const trappetype = x.trappetype === 'repo' ? 'rett' : x.trappetype;
  if (trappetype) svar.trappetype = trappetype;
  if (x.ganglinje) svar.ganglinje = x.ganglinje;
  if (x.vange) svar.vange = x.vange;
  const vd = x.vangeData ?? {};
  const omfang = (v: string) => (v === 'Hele vangen' ? 'hele' : v === 'Deler av vangen' ? 'deler' : undefined);
  if (vd.side) svar.vange_side = vd.side === 'Venstre' ? 'venstre' : 'hoyre';
  if (omfang(vd.omfang)) svar.vange_omfang = omfang(vd.omfang)!;
  if (omfang(vd.venstre)) svar.vange_venstre = omfang(vd.venstre)!;
  if (omfang(vd.hoyre)) svar.vange_hoyre = omfang(vd.hoyre)!;
  svar.tillegg = [...(x.tillegg ?? []), ...(x.trappetype === 'repo' ? ['repo'] : [])];
  if (svar.tillegg.includes('repo')) svar.repo_bygg = x.repoIBygg ? 'ja' : 'nei';
  for (const [k, v] of Object.entries(x.valg ?? {})) svar[k] = v as string;

  const felt: Record<string, string> = {};
  for (const k of ['overflate', 'endelister']) if (x[k]) felt[k] = String(x[k]);
  const g = x.tilleggData?.gelender ?? {};
  if (g.type) felt.gelender_type = g.type;
  if (g.sprosser) felt.gelender_sprosser = g.sprosser;
  if (g.meglere) felt.gelender_meglere = g.meglere;
  if (x.prosjektnr) felt.prosjektnr = x.prosjektnr;

  const tid = x.opprettet ?? new Date().toISOString();
  const utfort: Prosjekt['utfort'] = {};
  for (const [k, v] of Object.entries(x.utfort ?? {})) utfort[k] = { tid: String(v), brukerId: null };
  for (const k of Object.keys(svar)) utfort[k] ??= { tid, brukerId: null };

  return {
    id: 'abc-' + x.id,
    prosessId: 'staircon',
    prosessVersjon: 1,
    type: x._type,
    nummer: x.prosjektnr || x.nummer || x.navn || (x.kalkylenr ? 'Kalkyle ' + x.kalkylenr : 'Uten nummer'),
    kalkylenr: x.kalkylenr || undefined,
    kunde: x.kunde || undefined,
    opprettet: tid,
    opprettetAv: null,
    svar,
    felt,
    utfort,
    notater: x.notater ?? {},
    logg: [post('importert', 'Importert fra Staircon ABC v2')],
    tilbud: x._type === 'tilbud' ? { filbane: x.filbane, sketchfab: x.sketchfab } : undefined,
  };
}

export async function importerGamle() {
  const nye = finnGamleProsjekter().map(konverterGammelt);
  if (nye.length) await oppdater((d) => ({ ...d, prosjekter: [...nye, ...d.prosjekter] }));
  return nye.length;
}

/** Én bekreftet verdi fra innlesingen. */
export interface InnlestVerdi {
  nokkel: string;
  etikett: string;
  verdi: Svar;
  /** Teksten som vises i loggen, f.eks. «Rett trapp». */
  tekst: string;
  /** Hvor verdien ble funnet, f.eks. «OB s.1: «1 stk. RETT TRAPP …»». */
  kilde?: string;
}

/**
 * Legger bekreftede verdier fra ordrebekreftelse/produksjonsordre inn i prosjektet.
 * Valg blir svar (og regnes som utført), resten blir felt. Alt loggføres med
 * hvem som bekreftet og hvor verdien kom fra.
 */
export function lesInn(prosjektId: string, verdier: InnlestVerdi[], dokumenter: ProsjektDokument[]) {
  return endreProsjekt(prosjektId, (p) => {
    const steg = prosessFor(p).faser.flatMap((f) => f.steg);
    const naa = new Date().toISOString();
    const ny: Prosjekt = { ...p, svar: { ...p.svar }, felt: { ...p.felt }, utfort: { ...p.utfort }, dokumenter: [...(p.dokumenter ?? []), ...dokumenter] };
    const logg: LoggPost[] = [];
    if (dokumenter.length) {
      logg.push(post('innlest', `Lest inn ${dokumenter.map((d) => `${{ ob: 'ordrebekreftelse', po: 'produksjonsordre', planview: 'planview', annet: 'dokument' }[d.type]} (${d.navn})`).join(', ')} — ${verdier.length} felt bekreftet`));
    }
    for (const v of verdier) {
      const valgSteg = steg.find((s) => s.id === v.nokkel && s.valg);
      if (valgSteg) {
        ny.svar[v.nokkel] = v.verdi;
        ny.utfort[v.nokkel] ??= { tid: naa, brukerId: bruker.value };
      } else {
        const tekst = Array.isArray(v.verdi) ? v.verdi.join(', ') : v.verdi;
        ny.felt[v.nokkel] = tekst;
        if (v.nokkel === 'kalkylenr') ny.kalkylenr = tekst;
        if (v.nokkel === 'kunde') ny.kunde = tekst;
        if (v.nokkel === 'prosjektnr' && tekst && p.type === 'prosjekt') ny.nummer = tekst.toUpperCase();
      }
      const stegId = valgSteg?.id ?? steg.find((s) => s.felter?.some((f) => f.nokkel === v.nokkel))?.id;
      logg.push(post('innlest', `${v.etikett} → ${v.tekst} (bekreftet${v.kilde ? `, fra ${v.kilde}` : ''})`, stegId));
    }
    ny.logg = [...p.logg, ...logg];
    return ny;
  });
}
