/* ─────────────────────────────────────────────────────────────
   Mønsterspråket i regelbiblioteket.

   Skrevet som vanlig tekst, så det kan redigeres uten å kunne regex:

     Reg.nr.: {tall}          → fanger et tall
     fargekoder: {tekst}      → fanger resten av kolonnen
     RETT TRAPP               → treffer bare (regelen har en fast verdi)
     Returgelender{*}{tall} mm → {*} hopper over hva som helst

   Store/små bokstaver og mellomrom spiller ingen rolle. Med «regex:»
   foran kan et vanlig regulært uttrykk brukes for spesielle tilfeller.

   Linjer fra lesbare PDF-er har «│» der det er en kolonne-avstand,
   så {tekst} stopper ved neste kolonne (f.eks. «Kunde: X │ Byggherre: Y»).
   ───────────────────────────────────────────────────────────── */

export const KOLONNE = '│';

const BOKSTAV = /[\p{L}\p{N}]/u;

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Gjør om et mønster til et regulært uttrykk. Gir null hvis mønsteret er ugyldig. */
export function kompiler(monster: string): RegExp | null {
  const m = monster.trim();
  if (!m) return null;
  try {
    if (m.toLowerCase().startsWith('regex:')) return new RegExp(m.slice(6).trim(), 'iu');
    const deler = m.split(/(\{tall\}|\{tekst\}|\{\*\}|\s+)/).filter(Boolean);
    let ut = '';
    deler.forEach((d, i) => {
      const siste = i === deler.length - 1;
      if (d === '{tall}') ut += '(\\d+(?:[.,]\\d+)?)';
      else if (d === '{tekst}') ut += siste ? `([^${KOLONNE}]*[^\\s${KOLONNE}])` : `([^${KOLONNE}]+?)`;
      else if (d === '{*}') ut += '.*?';
      else if (/^\s+$/.test(d)) ut += `[\\s${KOLONNE}]*`;
      else ut += escape(d).replace(/\s/g, '');
    });
    // Ord skal ikke treffe midt i andre ord («EL» skal ikke treffe «ELEMENT»).
    if (BOKSTAV.test(m[0])) ut = '(?<![\\p{L}\\p{N}])' + ut;
    if (BOKSTAV.test(m[m.length - 1]) && !m.endsWith('}')) ut += '(?![\\p{L}\\p{N}])';
    return new RegExp(ut, 'iu');
  } catch {
    return null;
  }
}

/** Har mønsteret en del som fanger en verdi ({tall}/{tekst} eller en regex-gruppe)? */
export function fangerVerdi(monster: string): boolean {
  const m = monster.trim();
  if (m.toLowerCase().startsWith('regex:')) return /\((?!\?)/.test(m);
  return /\{tall\}|\{tekst\}/.test(m);
}

/**
 * Ordrebekreftelsen er skannet, og OCR slår sammen tekst og priskolonnene
 * («fargekoder: S 0500-N / 3409 Hvit 5 10 929»). Fjern tall på opptil tre
 * siffer og prissymboler fra slutten av en fanget tekst.
 */
export function fjernPriser(tekst: string): string {
  const ord = tekst.trim().split(/\s+/);
  while (ord.length > 1 && /^(\d{1,3}|kr|ka|hå|[”"%'’.,=\-–])$/i.test(ord[ord.length - 1])) ord.pop();
  return ord.join(' ');
}
