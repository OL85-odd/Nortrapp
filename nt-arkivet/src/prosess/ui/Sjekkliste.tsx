import { useState } from 'preact/hooks';
import type { SynligFase } from '../motor';
import { svarTekst } from '../motor';
import type { Prosjekt } from '../types';
import { settAktivt, settUtfort } from '../prosjekter';
import { StegInnhold } from './StegInnhold';
import { Taster } from './HurtigtastPanel';

interface Props {
  faser: SynligFase[];
  prosjekt: Prosjekt;
  aktivtId: string | undefined;
  aktivFase: string | undefined;
}

/** Produksjon: kompakt sjekkliste for erfarne. Aktiv fase er åpen, resten kan foldes ut. */
export function Sjekkliste({ faser, prosjekt, aktivtId, aktivFase }: Props) {
  const [apneFaser, setApneFaser] = useState<Set<string>>(new Set());
  const [utfelt, setUtfelt] = useState<string | null>(null);

  const veksleFase = (id: string) => {
    const n = new Set(apneFaser);
    n.has(id) ? n.delete(id) : n.add(id);
    setApneFaser(n);
  };

  return (
    <div class="sjekkliste">
      {faser.map((f) => {
        const gjort = f.steg.filter((s) => prosjekt.utfort[s.id]).length;
        const apen = f.id === aktivFase || apneFaser.has(f.id);
        return (
          <section key={f.id} class={`sl-fase card ${gjort === f.steg.length ? 'ferdig' : ''}`}>
            <button class="sl-fase-hode" onClick={() => veksleFase(f.id)} aria-expanded={apen}>
              <span class="sl-fase-navn">{f.tittel}</span>
              <span class="label">
                {gjort}/{f.steg.length}
              </span>
              <span class="sl-pil" aria-hidden="true">
                {apen ? '▾' : '▸'}
              </span>
            </button>
            {apen && (
              <ol class="sl-steg">
                {f.steg.map((s) => {
                  const gjortSteg = !!prosjekt.utfort[s.id];
                  const erUtfelt = utfelt === s.id || (s.id === aktivtId && !!s.valg && prosjekt.svar[s.id] === undefined);
                  return (
                    <li key={s.id} class={`sl-rad ${gjortSteg ? 'ferdig' : ''} ${s.id === aktivtId ? 'aktiv' : ''}`}>
                      <div class="sl-linje">
                        <input
                          type="checkbox"
                          checked={gjortSteg}
                          disabled={!!s.valg && prosjekt.svar[s.id] === undefined}
                          aria-label={`Utført: ${s.tittel}`}
                          onChange={(e) => settUtfort(prosjekt.id, s.id, (e.target as HTMLInputElement).checked)}
                        />
                        <button
                          class="sl-tittel"
                          onClick={() => {
                            settAktivt(prosjekt.id, s.id);
                            setUtfelt(utfelt === s.id ? null : s.id);
                          }}
                          aria-expanded={erUtfelt}
                        >
                          {s.tittel}
                          {s.husk && <span class="sl-husk" title={s.husk}>!</span>}
                        </button>
                        <span class="sl-meta">
                          {prosjekt.svar[s.id] !== undefined && <span class="chip">{svarTekst(s, prosjekt.svar[s.id])}</span>}
                          {s.felter?.map((fe) => prosjekt.felt[fe.nokkel] && <span key={fe.nokkel} class="chip">{prosjekt.felt[fe.nokkel]}</span>)}
                          {s.verdier?.slice(0, 1).map((v) => (
                            <span key={v.navn} class="sl-verdi">
                              {v.verdi}
                            </span>
                          ))}
                          {s.hurtigtaster?.slice(0, 2).map((t) => (
                            <Taster key={t} tast={t} />
                          ))}
                        </span>
                      </div>
                      {erUtfelt && <StegInnhold steg={s} prosjekt={prosjekt} kompakt />}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
