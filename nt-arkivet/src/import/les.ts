import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { createWorker, type Worker as OcrWorker } from 'tesseract.js';
import ocrWorkerUrl from 'tesseract.js/dist/worker.min.js?url';
import ocrKjerneUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url';
import norskUrl from '@tesseract.js-data/nor/4.0.0_best_int/nor.traineddata.gz?url';
import { byggLinjer, rensOcr, type PdfBit } from './linjer';
import type { Linje } from './tolk';

/* ─────────────────────────────────────────────────────────────
   Leser et dokument lokalt i nettleseren — ingenting sendes ut.

   • Lesbar PDF (produksjonsordre): teksten hentes med pdf.js.
   • Skannet PDF eller bilde (ordrebekreftelse): OCR med Tesseract
     og norsk språkdata.

   Alt (pdf.js, Tesseract og språkdata) er bakt inn i appen, så det
   virker også fra en enkelt HTML-fil uten nett.
   ───────────────────────────────────────────────────────────── */

export interface LestSide {
  nr: number;
  /** Siden som bilde (JPEG), til visning og lagring. */
  bilde: Blob;
  bredde: number;
  hoyde: number;
  ocr: boolean;
}

export interface LestDokument {
  linjer: Linje[];
  sider: LestSide[];
  ocr: boolean;
}

export type Fremdrift = (tekst: string, andel?: number) => void;

/** Sider med færre tegn enn dette regnes som skannet. */
const MIN_TEGN = 40;
/** Oppløsning for OCR (~250 dpi) og for visning. */
const OCR_SKALA = 250 / 72;
const VIS_BREDDE = 1400;

let pdfKlar = false;
function startPdf() {
  if (pdfKlar) return;
  // Fra en lokal fil (file://) godtar nettleseren bare arbeidere fra «data:»-adresser,
  // og det er nettopp det de innebakte filene er. På serveren er det vanlige adresser.
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(pdfWorkerUrl, { type: 'module' });
  pdfKlar = true;
}

let ocr: Promise<OcrWorker> | null = null;
let ocrMelding: Fremdrift = () => {};

async function hentTekst(url: string) {
  return (await fetch(url)).text();
}

async function hentBase64(url: string): Promise<string> {
  if (url.startsWith('data:') && url.includes(';base64,')) return url.slice(url.indexOf(',') + 1);
  const blob = await (await fetch(url)).blob();
  const data = await new Promise<string>((ok) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.readAsDataURL(blob);
  });
  return data.slice(data.indexOf(',') + 1);
}

/**
 * Starter Tesseract én gang.
 *
 * Fra en lokal HTML-fil (file://) får en arbeider ikke lov til å laste andre
 * filer. Derfor settes alt sammen til ett arbeider-skript: OCR-motoren,
 * Tesseract-arbeideren og den norske språkfilen.
 */
function startOcr(): Promise<OcrWorker> {
  ocr ??= (async () => {
    const [kjerne, arbeider, norsk] = await Promise.all([hentTekst(ocrKjerneUrl), hentTekst(ocrWorkerUrl), hentBase64(norskUrl)]);
    const skript = new Blob(
      [
        'self.TesseractCore = (function () {\n',
        kjerne,
        '\n; return TesseractCore; })();\n',
        `const NOR = Uint8Array.from(atob("${norsk}"), (c) => c.charCodeAt(0));
         const hent = self.fetch.bind(self);
         self.fetch = (u, o) => (String(u).includes('nor.traineddata') ? Promise.resolve(new Response(NOR)) : hent(u, o));\n`,
        arbeider,
      ],
      { type: 'text/javascript' },
    );
    const w = await createWorker('nor', 1, {
      workerPath: URL.createObjectURL(skript),
      workerBlobURL: false,
      corePath: 'innebygd.js',
      langPath: 'https://lokal.invalid',
      cacheMethod: 'none',
      gzip: true,
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') ocrMelding('Leser teksten (OCR)', m.progress);
      },
    });
    // Ordrebekreftelsen er én tekstblokk i fast bredde — det gir best resultat.
    await w.setParameters({ tessedit_pageseg_mode: '6' as never, preserve_interword_spaces: '1' });
    return w;
  })();
  ocr.catch(() => (ocr = null));
  return ocr;
}

function lerret(b: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(b);
  c.height = Math.round(h);
  return c;
}

async function tilJpeg(kilde: HTMLCanvasElement | ImageBitmap, bredde = VIS_BREDDE): Promise<{ blob: Blob; b: number; h: number }> {
  const skala = Math.min(1, bredde / kilde.width);
  const c = lerret(kilde.width * skala, kilde.height * skala);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(kilde, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/jpeg', 0.82));
  return { blob, b: c.width, h: c.height };
}

interface OcrLinje {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** OCR på et bilde. Gir linjer med plassering og sikkerhet. */
async function lesMedOcr(bilde: HTMLCanvasElement, side: number, melding: Fremdrift): Promise<Linje[]> {
  melding('Starter OCR (første gang tar det noen sekunder)');
  const w = await startOcr();
  ocrMelding = melding;
  const res = await w.recognize(bilde, {}, { blocks: true, text: false });
  const linjer: OcrLinje[] = (res.data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines as unknown as OcrLinje[]));
  return linjer
    .map((l) => ({
      tekst: rensOcr(l.text),
      side,
      sikkerhet: l.confidence,
      boks: [l.bbox.x0 / bilde.width, l.bbox.y0 / bilde.height, (l.bbox.x1 - l.bbox.x0) / bilde.width, (l.bbox.y1 - l.bbox.y0) / bilde.height] as [number, number, number, number],
    }))
    .filter((l) => l.tekst);
}

/** Leser en PDF eller et bilde. */
export async function lesDokument(fil: File, melding: Fremdrift = () => {}): Promise<LestDokument> {
  if (fil.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(fil.name)) {
    melding('Åpner bildet');
    const bm = await createImageBitmap(fil);
    // Små bilder skaleres opp, store ned, så OCR får ca. 2500 px bredde.
    const skala = Math.min(2, 2500 / bm.width);
    const c = lerret(bm.width * skala, bm.height * skala);
    c.getContext('2d')!.drawImage(bm, 0, 0, c.width, c.height);
    const linjer = await lesMedOcr(c, 1, melding);
    const vis = await tilJpeg(bm);
    return { linjer, ocr: true, sider: [{ nr: 1, bilde: vis.blob, bredde: vis.b, hoyde: vis.h, ocr: true }] };
  }

  startPdf();
  melding('Åpner PDF');
  const oppgave = pdfjs.getDocument({ data: new Uint8Array(await fil.arrayBuffer()) });
  const doc = await oppgave.promise;
  const linjer: Linje[] = [];
  const sider: LestSide[] = [];
  try {
    for (let nr = 1; nr <= doc.numPages; nr++) {
      melding(`Side ${nr} av ${doc.numPages}`, (nr - 1) / doc.numPages);
      const side = await doc.getPage(nr);
      const vp1 = side.getViewport({ scale: 1 });
      const innhold = await side.getTextContent();
      const tekst = byggLinjer(innhold.items as PdfBit[], vp1.width, vp1.height, nr);
      const skannet = tekst.reduce((n, l) => n + l.tekst.length, 0) < MIN_TEGN;

      const vp = side.getViewport({ scale: skannet ? OCR_SKALA : VIS_BREDDE / vp1.width });
      const c = lerret(vp.width, vp.height);
      await side.render({ canvas: c, viewport: vp }).promise;
      if (skannet) linjer.push(...(await lesMedOcr(c, nr, (t, a) => melding(`Side ${nr} av ${doc.numPages}: ${t}`, a))));
      else linjer.push(...tekst);
      const vis = await tilJpeg(c);
      sider.push({ nr, bilde: vis.blob, bredde: vis.b, hoyde: vis.h, ocr: skannet });
      side.cleanup();
    }
  } finally {
    await oppgave.destroy();
  }
  return { linjer, sider, ocr: sider.some((s) => s.ocr) };
}
