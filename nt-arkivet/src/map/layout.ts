import type { Linje, Stasjon } from '../data/types';

/* ─────────────────────────────────────────────────────────────
   Regner ut hvor stasjonene skal stå i T-banekartet.

   Bred skjerm: linjen går i «slange» — venstre→høyre, sving ned,
   høyre→venstre osv. En stasjon med grener (f.eks. Tegning) gir en
   egen kolonne der sporene deler seg og møtes igjen.

   Smal skjerm (mobil): linjen går rett nedover, og grenene legger
   seg ved siden av hverandre.
   ───────────────────────────────────────────────────────────── */

export interface Node {
  stasjon: Stasjon;
  x: number;
  y: number;
  gren: boolean;
  /** Hvor teksten skal stå i forhold til punktet. */
  etikett: 'under' | 'hoyre';
}

export interface Kant {
  fra: string;
  til: string;
  d: string;
}

export interface Layout {
  noder: Node[];
  kanter: Kant[];
  bredde: number;
  hoyde: number;
  /** Hvor linjemerket (sirkel med kode) skal stå. Null = ikke vis. */
  merke: { x: number; y: number } | null;
}

const DX = 128; // avstand mellom kolonner
const SPOR = 58; // avstand mellom parallelle grenspor
const RAD = 120; // grunnhøyde på en rad
const MARG = 48;
const TOPP = 24; // luft over første rad
const SVING = 64; // hvor langt U-svingen går ut til siden

/** En kolonne er enten én hovedstasjon eller en gruppe grener. */
type Kolonne = { type: 'stasjon'; s: Stasjon } | { type: 'grener'; g: Stasjon[] };

function kolonner(linje: Linje): Kolonne[] {
  const ut: Kolonne[] = [];
  for (const s of linje.stasjoner) {
    ut.push({ type: 'stasjon', s });
    if (s.grener?.length) ut.push({ type: 'grener', g: s.grener });
  }
  return ut;
}

/** S-kurve mellom to punkter i samme rad (brukes for deling og samling av spor). */
function sKurve(x0: number, y0: number, x1: number, y1: number) {
  if (y0 === y1) return `M${x0},${y0} L${x1},${y1}`;
  const m = (x0 + x1) / 2;
  return `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1}`;
}

export function lagLayout(linje: Linje, tilgjengeligBredde: number): Layout {
  if (!linje.stasjoner.length) return { noder: [], kanter: [], bredde: 0, hoyde: 0, merke: null };
  return tilgjengeligBredde < 560 ? loddrett(linje) : slange(linje, tilgjengeligBredde);
}

/* ── Bred skjerm ────────────────────────────────────────────── */

function slange(linje: Linje, bredde: number): Layout {
  const kol = kolonner(linje);
  const perRad = Math.max(3, Math.floor((bredde - MARG * 2 - SVING) / DX) + 1);

  // 1) Fordel kolonnene på rader som en slange: hver ny rad starter i samme
  //    kolonne som forrige rad sluttet, og går motsatt vei. En
  //    forgreningsgruppe (stasjon + grener + neste stasjon) deles aldri.
  type Plass = { k: Kolonne; ki: number };
  const rader: { dir: 1 | -1; plasser: Plass[] }[] = [{ dir: 1, plasser: [] }];
  let ki = 0;
  for (let i = 0; i < kol.length; i++) {
    let rad = rader[rader.length - 1];
    const startGruppe = kol[i].type === 'stasjon' && kol[i + 1]?.type === 'grener';
    const trenger = startGruppe ? Math.min(3, kol.length - i) : 1;
    const ledig = rad.dir === 1 ? perRad - ki : ki + 1;
    if (rad.plasser.length > 0 && trenger > ledig) {
      rad = { dir: rad.dir === 1 ? -1 : 1, plasser: [] };
      rader.push(rad);
      ki -= rader[rader.length - 2].dir; // stå i kolonnen forrige rad sluttet
    }
    rad.plasser.push({ k: kol[i], ki });
    ki += rad.dir;
  }

  // 2) Plasser nodene. Rader med grener får ekstra høyde.
  const noder: Node[] = [];
  const kanter: Kant[] = [];
  const brukteKol = Math.max(...rader.flatMap((r) => r.plasser.map((p) => p.ki))) + 1;
  const x0 = MARG + 28; // plass til linjemerket
  let y = TOPP;
  type Ref = { ids: string[]; x: number; ys: number[]; dir: 1 | -1; rad: number };
  const sekvens: Ref[] = [];

  rader.forEach(({ dir, plasser }, r) => {
    const grupper = plasser.map((p) => p.k);
    const harGrener = grupper.some((k) => k.type === 'grener');
    const maksGrener = Math.max(1, ...grupper.map((k) => (k.type === 'grener' ? k.g.length : 1)));
    const ekstra = harGrener ? ((maksGrener - 1) / 2) * SPOR : 0;
    const sporY = y + ekstra + 12;

    plasser.forEach(({ k, ki: kolIndeks }) => {
      const x = x0 + kolIndeks * DX;
      if (k.type === 'stasjon') {
        noder.push({ stasjon: k.s, x, y: sporY, gren: false, etikett: 'under' });
        sekvens.push({ ids: [k.s.id], x, ys: [sporY], dir, rad: r });
      } else {
        const ys = k.g.map((_, i) => sporY + (i - (k.g.length - 1) / 2) * SPOR);
        k.g.forEach((g, i) => noder.push({ stasjon: g, x, y: ys[i], gren: true, etikett: 'under' }));
        sekvens.push({ ids: k.g.map((g) => g.id), x, ys, dir, rad: r });
      }
    });

    y = sporY + ekstra + RAD - 12;
  });

  // 3) Tegn sporene mellom nabokolonner.
  for (let i = 0; i < sekvens.length - 1; i++) {
    const a = sekvens[i];
    const b = sekvens[i + 1];
    for (let ai = 0; ai < a.ids.length; ai++) {
      for (let bi = 0; bi < b.ids.length; bi++) {
        const ya = a.ys[ai];
        const yb = b.ys[bi];
        let d: string;
        if (a.rad === b.rad) {
          d = sKurve(a.x, ya, b.x, yb);
        } else {
          // U-sving ned til neste rad
          const ut = a.dir * SVING;
          d = `M${a.x},${ya} C${a.x + ut},${ya} ${b.x + ut},${yb} ${b.x},${yb}`;
        }
        kanter.push({ fra: a.ids[ai], til: b.ids[bi], d });
      }
    }
  }

  return {
    noder,
    kanter,
    bredde: x0 + (brukteKol - 1) * DX + MARG + SVING,
    hoyde: y - RAD + 12 + 52,
    merke: { x: MARG - 6, y: noder[0]?.y ?? TOPP },
  };
}

/* ── Smal skjerm ────────────────────────────────────────────── */

function loddrett(linje: Linje): Layout {
  const kol = kolonner(linje);
  const noder: Node[] = [];
  const kanter: Kant[] = [];
  const x = 40;
  const DY = 64;
  const GREN_DX = 104;
  let y = 24;
  type Ref = { ids: string[]; xs: number[]; y: number };
  const sekvens: Ref[] = [];

  for (const k of kol) {
    if (k.type === 'stasjon') {
      noder.push({ stasjon: k.s, x, y, gren: false, etikett: 'hoyre' });
      sekvens.push({ ids: [k.s.id], xs: [x], y });
      y += DY;
    } else {
      const xs = k.g.map((_, i) => x + i * GREN_DX);
      k.g.forEach((g, i) => noder.push({ stasjon: g, x: xs[i], y, gren: true, etikett: 'hoyre' }));
      sekvens.push({ ids: k.g.map((g) => g.id), xs, y });
      y += DY;
    }
  }

  for (let i = 0; i < sekvens.length - 1; i++) {
    const a = sekvens[i];
    const b = sekvens[i + 1];
    a.ids.forEach((fra, ai) =>
      b.ids.forEach((til, bi) => {
        const xa = a.xs[ai];
        const xb = b.xs[bi];
        const m = (a.y + b.y) / 2;
        const d = xa === xb ? `M${xa},${a.y} L${xb},${b.y}` : `M${xa},${a.y} C${xa},${m} ${xb},${m} ${xb},${b.y}`;
        kanter.push({ fra, til, d });
      }),
    );
  }

  const maksGren = Math.max(1, ...kol.map((k) => (k.type === 'grener' ? k.g.length : 1)));
  return {
    noder,
    kanter,
    bredde: Math.max(320, x + (maksGren - 1) * GREN_DX + 80),
    hoyde: y - 64 + 36,
    merke: null,
  };
}

/** Deler en etikett i linjer på maks `maks` tegn. */
export function brytTekst(tekst: string, maks = 13): string[] {
  const ord = tekst.split(' ');
  const linjer: string[] = [];
  let na = '';
  for (const o of ord) {
    if (na && (na + ' ' + o).length > maks) {
      linjer.push(na);
      na = o;
    } else {
      na = na ? na + ' ' + o : o;
    }
  }
  if (na) linjer.push(na);
  return linjer;
}
