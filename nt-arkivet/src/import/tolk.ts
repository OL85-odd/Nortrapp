import { flatSti } from '../prosess/motor';
import type { DokType, ImportFelt, ImportRegel, Innlesing, Prosess, Steg, Svar } from '../prosess/types';
import { fangerVerdi, fjernPriser, kompiler, KOLONNE } from './monster';

/* ─────────────────────────────────────────────────────────────
   Tolking: fra tekstlinjer til felt med status.

   Hvert felt får status:
     funnet  – ett entydig treff (eller flere som er enige)
     usikker – hint-regel, lav OCR-sikkerhet, uenige dokumenter
               eller en foreslått standardverdi
     mangler – påkrevd, men ikke funnet → appen spør

   Ingenting brukes før brukeren har bekreftet det (se Innlesing.tsx).
   ───────────────────────────────────────────────────────────── */

export interface Linje {
  tekst: string;
  /** Sidenummer, fra 1. */
  side: number;
  /** Plassering på siden som andel (0–1): x, y, bredde, høyde. */
  boks?: [number, number, number, number];
  /** OCR-sikkerhet 0–100. Mangler for lesbar PDF. */
  sikkerhet?: number;
}

export interface TolkDok {
  id: string;
  type: DokType;
  navn: string;
  linjer: Linje[];
}

export interface Treff {
  regelId: string;
  verdi: string;
  dokId: string;
  dokType: DokType;
  linje: Linje;
  usikker?: string;
}

export type Art = 'ett' | 'flere' | 'janei' | 'tekst' | 'tall';
export type Status = 'funnet' | 'usikker' | 'mangler';

export interface Resultat {
  nokkel: string;
  etikett: string;
  art: Art;
  alternativer?: { id: string; navn: string }[];
  enhet?: string;
  verdi: Svar | undefined;
  status: Status;
  grunn?: string;
  treff: Treff[];
  varsler: { tekst: string; treff: Treff }[];
}

export const DOK_NAVN: Record<DokType, string> = { ob: 'Ordrebekreftelse', po: 'Produksjonsordre', planview: 'Planview', annet: 'Annet (skisse, tegning)' };
export const DOK_KORT: Record<DokType, string> = { ob: 'OB', po: 'PO', planview: 'PV', annet: 'Annet' };

/** Lav OCR-sikkerhet gjør treffet usikkert. */
const OCR_GRENSE = 70;

/** Gjett dokumenttypen ut fra innholdet. */
export function gjettType(linjer: Linje[]): DokType {
  const alt = linjer.map((l) => l.tekst).join('\n');
  if (/ORDREBEKREFTELSE|Reg\.?\s*nr/i.test(alt)) return 'ob';
  if (/Prod\.?\s*nr|Best\.?\s*nr/i.test(alt)) return 'po';
  if (/Etasjeh.yde|Bjelkelag|Inntrinn|Opptrinn\s*\d|Frih.yde/i.test(alt)) return 'planview';
  return 'annet';
}

function alleSteg(p: Prosess): Steg[] {
  return p.faser.flatMap((f) => f.steg);
}

/** Hva slags felt er nøkkelen i prosessen: et valg, et skrivefelt eller noe eget? */
export function feltInfo(p: Prosess, f: ImportFelt): Pick<Resultat, 'etikett' | 'art' | 'alternativer' | 'enhet'> & { stegId?: string } {
  const steg = alleSteg(p);
  const valgSteg = steg.find((s) => s.id === f.nokkel && s.valg);
  if (valgSteg?.valg) {
    const v = valgSteg.valg;
    if (v.type === 'janei') {
      return {
        etikett: f.etikett ?? v.sporsmal,
        art: 'janei',
        alternativer: [
          { id: 'ja', navn: v.knapper?.ja ?? 'Ja' },
          { id: 'nei', navn: v.knapper?.nei ?? 'Nei' },
        ],
        stegId: valgSteg.id,
      };
    }
    return { etikett: f.etikett ?? v.sporsmal, art: v.type, alternativer: v.alternativer.map((a) => ({ id: a.id, navn: a.navn })), stegId: valgSteg.id };
  }
  const feltSteg = steg.find((s) => s.felter?.some((x) => x.nokkel === f.nokkel));
  const felt = feltSteg?.felter?.find((x) => x.nokkel === f.nokkel);
  if (felt) return { etikett: f.etikett ?? felt.etikett, art: felt.type === 'tall' || f.tall ? 'tall' : 'tekst', enhet: f.enhet ?? felt.enhet, stegId: feltSteg!.id };
  return { etikett: f.etikett ?? f.nokkel, art: f.tall ? 'tall' : 'tekst', enhet: f.enhet };
}

function normTekst(s: string) {
  return s
    .toLowerCase()
    .replace(/\$/g, 's')
    .replace(/[\s.,:;/\-–|]+/g, ' ')
    .trim();
}

/** Antall tegn som må endres for å gå fra a til b (fanger små OCR-feil). */
function avstand(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let forrige = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, forrige + (a[i - 1] === b[j - 1] ? 0 : 1));
      forrige = tmp;
    }
  }
  return d[b.length];
}

/** Er to verdier «like»? Tall som tall, tekst hvis den ene inneholder den andre. */
export function like(art: Art, a: string, b: string): boolean {
  if (art === 'tall') return Number(a.replace(',', '.')) === Number(b.replace(',', '.'));
  if (art === 'tekst') {
    const x = normTekst(a);
    const y = normTekst(b);
    return x === y || (x.length > 2 && y.length > 2 && (x.includes(y) || y.includes(x))) || (Math.min(x.length, y.length) >= 8 && avstand(x, y) <= 2);
  }
  return a === b;
}

function navnPa(r: Pick<Resultat, 'alternativer'>, id: string) {
  return r.alternativer?.find((a) => a.id === id)?.navn ?? id;
}

/** Kjør alle reglene over linjene i dokumentene. */
export function finnTreff(dokumenter: TolkDok[], regler: ImportRegel[]): { regel: ImportRegel; treff: Treff; varsel: boolean }[] {
  const ut: { regel: ImportRegel; treff: Treff; varsel: boolean }[] = [];
  for (const regel of regler) {
    const re = kompiler(regel.monster);
    if (!re) continue;
    const unntak = regel.unntak ? kompiler(regel.unntak) : null;
    const fanger = fangerVerdi(regel.monster);
    for (const dok of dokumenter) {
      if (dok.type === 'annet' || (regel.dok && regel.dok !== dok.type)) continue;
      for (const linje of dok.linjer) {
        const m = re.exec(linje.tekst);
        if (!m || unntak?.test(linje.tekst)) continue;
        let verdi = regel.verdi?.trim() || '';
        if (!verdi && fanger && m[1] !== undefined) {
          verdi = m[1].replace(new RegExp(KOLONNE, 'g'), ' ').replace(/\s+/g, ' ').trim();
          if (linje.sikkerhet !== undefined && !/^\d+([.,]\d+)?$/.test(verdi)) verdi = fjernPriser(verdi);
        }
        const usikker = regel.usikker
          ? `Hint fra regelen «${regel.monster}»`
          : linje.sikkerhet !== undefined && linje.sikkerhet < OCR_GRENSE
            ? `Lest med OCR, ${Math.round(linje.sikkerhet)} % sikkerhet`
            : undefined;
        const treff: Treff = { regelId: regel.id, verdi, dokId: dok.id, dokType: dok.type, linje, usikker };
        if (regel.varsel) ut.push({ regel, treff, varsel: true });
        if (verdi) ut.push({ regel, treff, varsel: false });
      }
    }
  }
  return ut;
}

/** Tolk dokumentene etter regelbiblioteket. Resultatet følger rekkefølgen på feltene. */
export function tolk(dokumenter: TolkDok[], oppsett: Innlesing, prosess: Prosess): Resultat[] {
  const alleTreff = finnTreff(dokumenter, oppsett.regler);
  const typer = new Set(dokumenter.map((d) => d.type));
  const resultater: Resultat[] = [];

  for (const f of oppsett.felter) {
    const info = feltInfo(prosess, f);
    const mine = alleTreff.filter((t) => t.regel.felt === f.nokkel);
    const treff = mine.filter((t) => !t.varsel).map((t) => t.treff);
    const varsler = mine.filter((t) => t.varsel).map((t) => ({ tekst: t.regel.varsel!, treff: t.treff }));
    const r: Resultat = { nokkel: f.nokkel, ...info, verdi: undefined, status: 'mangler', treff, varsler };
    const pakrevd = f.pakrevd && (!f.kreverDok || typer.has(f.kreverDok));

    if (info.art === 'flere') {
      const ids = info.alternativer!.map((a) => a.id).filter((id) => treff.some((t) => t.verdi === id));
      r.verdi = ids;
      const usikre = treff.filter((t) => t.usikker);
      if (!treff.length) {
        if (!pakrevd) continue;
        r.status = 'usikker';
        r.grunn = f.sporsmal ?? 'Fant ingen i dokumentene. Stemmer det?';
      } else {
        r.status = usikre.length ? 'usikker' : 'funnet';
        if (usikre.length) r.grunn = `Usikre: ${[...new Set(usikre.map((t) => navnPa(r, t.verdi)))].join(', ')}`;
      }
      resultater.push(r);
      continue;
    }

    if (treff.length) {
      // Grupper like verdier. Én gruppe = enige dokumenter.
      const grupper: Treff[][] = [];
      for (const t of treff) {
        const g = grupper.find((x) => like(info.art, x[0].verdi, t.verdi));
        if (g) g.push(t);
        else grupper.push([t]);
      }
      // Foretrekk lesbar tekst (produksjonsordren) foran OCR, og den lengste teksten.
      const best = (g: Treff[]) =>
        [...g].sort((a, b) => Number(a.linje.sikkerhet !== undefined) - Number(b.linje.sikkerhet !== undefined) || b.verdi.length - a.verdi.length)[0];
      const vist = (v: string) => (info.alternativer ? navnPa(r, v) : v);
      if (grupper.length === 1) {
        r.verdi = best(grupper[0]).verdi;
        const sikker = grupper[0].find((t) => !t.usikker);
        r.status = sikker ? 'funnet' : 'usikker';
        if (!sikker) r.grunn = grupper[0][0].usikker;
      } else {
        grupper.sort((a, b) => b.length - a.length || Number(b.some((t) => t.dokType === 'po')) - Number(a.some((t) => t.dokType === 'po')));
        r.verdi = best(grupper[0]).verdi;
        r.status = 'usikker';
        r.grunn = 'Dokumentene er uenige: ' + grupper.map((g) => `${[...new Set(g.map((t) => DOK_KORT[t.dokType]))].join('/')} «${vist(best(g).verdi)}»`).join(' · ');
      }
      const tallverdi = Number(String(r.verdi).replace(',', '.'));
      if (f.omrade && info.art === 'tall' && !(tallverdi >= f.omrade[0] && tallverdi <= f.omrade[1])) {
        r.status = 'usikker';
        r.grunn = `Uvanlig verdi (${r.verdi}${info.enhet ? ' ' + info.enhet : ''}). Forventet ${f.omrade[0]}–${f.omrade[1]}. Sjekk dokumentet.`;
      }
    } else if (f.standard !== undefined) {
      r.verdi = f.standard;
      r.status = 'usikker';
      r.grunn = `Ikke nevnt i dokumentene. Foreslår «${info.alternativer ? navnPa(r, f.standard) : f.standard}».`;
    } else if (pakrevd) {
      r.grunn = f.sporsmal ?? `Fant ikke «${info.etikett}» i dokumentene. Fyll inn.`;
    } else if (!varsler.length) {
      continue;
    }
    resultater.push(r);
  }

  return fjernUtenforSti(resultater, prosess);
}

/** Svarene som resultatene gir (for valg-steg). */
export function svarFra(resultater: Resultat[]): Record<string, Svar> {
  const svar: Record<string, Svar> = {};
  for (const r of resultater) if (r.verdi !== undefined && (r.art === 'ett' || r.art === 'flere' || r.art === 'janei')) svar[r.nokkel] = r.verdi;
  return svar;
}

/**
 * Felt som hører til steg som ikke er på stien (f.eks. «Er repoet på plass?»
 * når trappen ikke har repo) tas bort — så lenge dokumentene ikke nevner dem.
 */
export function fjernUtenforSti(resultater: Resultat[], prosess: Prosess): Resultat[] {
  const pa = new Set(flatSti(prosess, svarFra(resultater)).map((s) => s.id));
  const finnes = new Set(alleSteg(prosess).map((s) => s.id));
  return resultater.filter((r) => {
    const stegId = feltInfo(prosess, { nokkel: r.nokkel }).stegId;
    return !stegId || !finnes.has(stegId) || pa.has(stegId) || r.treff.length > 0;
  });
}

export interface Kontroll {
  tekst: string;
  ok: boolean;
}

/** Utregnede kontroller, f.eks. idealformelen 2 × opptrinn + inntrinn = 600–640. */
export function kontroller(verdier: Record<string, Svar | undefined>): Kontroll[] {
  const tall = (k: string) => {
    const v = verdier[k];
    const n = typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const ut: Kontroll[] = [];
  const o = tall('opptrinn');
  const i = tall('inntrinn');
  if (o && i) {
    const sum = Math.round((2 * o + i) * 10) / 10;
    const ok = sum >= 600 && sum <= 640;
    ut.push({ ok, tekst: `Idealformel: 2 × ${o} + ${i} = ${sum.toLocaleString('nb-NO')} ${ok ? '(innenfor 600–640)' : '— utenfor 600–640!'}` });
  }
  return ut;
}
