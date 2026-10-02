import { useEffect, useState } from 'preact/hooks';
import type { Betingelse, Prosess, Steg } from '../types';
import { fraRegler, sporsmalFor, tilRegler, type Regel } from './ops';

interface Props {
  prosess: Prosess;
  /** Steget eller fasen regelen gjelder for — bare spørsmål FØR dette kan brukes. */
  forStegId?: string;
  betingelse: Betingelse | undefined;
  onEndre: (b: Betingelse | undefined) => void;
}

function svarAlternativer(s: Steg): { id: string; navn: string }[] {
  const v = s.valg!;
  if (v.type === 'janei') return [{ id: 'ja', navn: v.knapper?.ja ?? 'Ja' }, { id: 'nei', navn: v.knapper?.nei ?? 'Nei' }];
  return v.alternativer.map((a) => ({ id: a.id, navn: a.navn }));
}

/**
 * «Vis bare når …»: bygg regler med nedtrekkslister i stedet for kode.
 * Flere linjer betyr at ALLE må stemme. Flere avkryssede svar på én linje
 * betyr at ETT av dem holder.
 */
export function RegelBygger({ prosess, forStegId, betingelse, onEndre }: Props) {
  const lagrede = tilRegler(betingelse);
  const sporsmal = sporsmalFor(prosess, forStegId);
  // Linjer uten avkryssede svar kan ikke lagres i betingelsen ennå — de holdes her til de er fylt ut.
  const [uferdige, setUferdige] = useState<Regel[]>([]);
  useEffect(() => setUferdige([]), [forStegId]);

  if (lagrede === null) {
    return (
      <div class="regel-avansert">
        <p class="panel-hint">Denne regelen er for avansert for regelbyggeren (laget i koden).</p>
        <code>{JSON.stringify(betingelse)}</code>
        <button class="btn liten fare" onClick={() => onEndre(undefined)}>
          Fjern regelen (vis alltid)
        </button>
      </div>
    );
  }

  const regler = [...lagrede, ...uferdige];
  const sett = (ny: Regel[]) => {
    const ferdige = ny.filter((r) => r.er.length);
    setUferdige(ny.filter((r) => !r.er.length));
    // Bare lagre når betingelsen faktisk endres, så en tom linje ikke gir en «endring» i utkastet.
    if (JSON.stringify(ferdige) !== JSON.stringify(lagrede)) onEndre(fraRegler(ferdige));
  };
  const endre = (i: number, felt: Partial<Regel>) => sett(regler.map((r, j) => (j === i ? { ...r, ...felt } : r)));

  if (!sporsmal.length) {
    return <p class="panel-hint">Ingen spørsmål kommer før dette. Legg inn et spørsmål (ja/nei, velg ett eller flere) tidligere i prosessen for å kunne lage regler.</p>;
  }

  return (
    <div class="regler">
      {regler.length === 0 && <p class="panel-hint">Vises alltid.</p>}
      {regler.map((r, i) => {
        const steg = sporsmal.find((s) => s.id === r.steg);
        return (
          <div key={i} class="regel">
            <div class="regel-linje">
              <span class="label">{i === 0 ? 'Vis når' : 'og'}</span>
              <select value={r.steg} onChange={(e) => endre(i, { steg: (e.target as HTMLSelectElement).value, er: [] })}>
                {!steg && <option value={r.steg}>(slettet spørsmål)</option>}
                {sporsmal.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.tittel}
                  </option>
                ))}
              </select>
              <select value={r.ikke ? 'ikke' : 'er'} onChange={(e) => endre(i, { ikke: (e.target as HTMLSelectElement).value === 'ikke' })}>
                <option value="er">er</option>
                <option value="ikke">er ikke</option>
              </select>
              <button class="regel-fjern" onClick={() => sett(regler.filter((_, j) => j !== i))} aria-label="Fjern betingelsen">
                ×
              </button>
            </div>
            {steg && (
              <div class="regel-svar">
                {svarAlternativer(steg).map((a) => (
                  <label key={a.id} class="sjekk">
                    <input
                      type="checkbox"
                      checked={r.er.includes(a.id)}
                      onChange={(e) =>
                        endre(i, { er: (e.target as HTMLInputElement).checked ? [...r.er, a.id] : r.er.filter((x) => x !== a.id) })
                      }
                    />
                    {a.navn}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button class="btn liten" onClick={() => sett([...regler, { steg: sporsmal[sporsmal.length - 1].id, er: [], ikke: false }])}>
        + {regler.length ? 'Og …' : 'Legg til regel'}
      </button>
      {regler.length > 0 && regler.some((r) => !r.er.length) && <p class="panel-hint">Kryss av minst ett svar, ellers ignoreres linjen.</p>}
    </div>
  );
}

/** Kort tekst om regelen, til strukturkartet: «når Trappetype = Svingtrapp». */
export function regelTekst(prosess: Prosess, b: Betingelse | undefined): string {
  if (!b) return '';
  const regler = tilRegler(b);
  if (!regler) return 'avansert regel';
  const alle = prosess.faser.flatMap((f) => f.steg);
  return regler
    .map((r) => {
      const s = alle.find((x) => x.id === r.steg);
      const navn = s?.valg ? svarAlternativer(s).filter((a) => r.er.includes(a.id)).map((a) => a.navn).join('/') : r.er.join('/');
      return `${s?.valg?.sporsmal ?? s?.tittel ?? '?'} ${r.ikke ? '≠' : '='} ${navn}`;
    })
    .join(' og ');
}
