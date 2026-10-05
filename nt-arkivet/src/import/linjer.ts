import { KOLONNE } from './monster';
import type { Linje } from './tolk';

/** Et tekstbit fra pdf.js (getTextContent). */
export interface PdfBit {
  str: string;
  /** [a, b, c, d, x, y] — x/y er nede til venstre, i PDF-punkter. */
  transform: number[];
  width: number;
}

/**
 * Setter tekstbitene fra en lesbar PDF sammen til linjer.
 * Bitene sorteres på høyde (y) og så fra venstre mot høyre. Der det er en stor
 * avstand (en kolonne), settes «│» inn, så regler kan skille kolonnene.
 */
export function byggLinjer(biter: PdfBit[], bredde: number, hoyde: number, side: number): Linje[] {
  const ord = biter
    .filter((b) => b.str.trim())
    .map((b) => ({ tekst: b.str, x: b.transform[4], y: b.transform[5], str: Math.abs(b.transform[3]) || Math.abs(b.transform[0]) || 10, b: b.width }));
  ord.sort((a, b) => b.y - a.y || a.x - b.x);

  const rader: (typeof ord)[] = [];
  for (const o of ord) {
    const rad = rader.find((r) => Math.abs(r[0].y - o.y) < Math.min(r[0].str, o.str) * 0.45);
    if (rad) rad.push(o);
    else rader.push([o]);
  }

  return rader
    .map((rad) => {
      rad.sort((a, b) => a.x - b.x);
      let tekst = '';
      let slutt = -Infinity;
      const plassert: typeof rad = [];
      for (const o of rad) {
        // Noen PDF-er (f.eks. limt inn Planview) har samme tekst to ganger oppå hverandre.
        if (plassert.some((p) => p.tekst === o.tekst && Math.abs(p.x - o.x) < o.str * 0.5)) continue;
        plassert.push(o);
        const gap = o.x - slutt;
        if (tekst) tekst += gap > o.str * 1.5 ? ` ${KOLONNE} ` : gap > o.str * 0.15 ? ' ' : '';
        tekst += o.tekst;
        slutt = o.x + o.b;
      }
      const x0 = Math.min(...plassert.map((o) => o.x));
      const x1 = Math.max(...plassert.map((o) => o.x + o.b));
      const y1 = Math.max(...rad.map((o) => o.y + o.str));
      const y0 = Math.min(...rad.map((o) => o.y - o.str * 0.25));
      const boks: [number, number, number, number] = [x0 / bredde, 1 - y1 / hoyde, (x1 - x0) / bredde, (y1 - y0) / hoyde];
      return { tekst: tekst.replace(/\s+/g, ' ').trim(), side, boks, y: y1 };
    })
    .sort((a, b) => b.y - a.y)
    .map(({ y: _y, ...l }) => l);
}

/** Vanlige OCR-feil i tall: «l6» → «16», «1O5» → «105». */
export function rensOcr(t: string): string {
  return t
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)[lI|](?=\d)/g, '$11')
    .replace(/(?<=\d)[lI](?=\d|\s|$)/g, '1')
    .replace(/(?<=\d)[oO](?=\d)/g, '0')
    .replace(/(^|\s)[lI](?=\s+stk)/gi, '$11')
    .trim();
}
