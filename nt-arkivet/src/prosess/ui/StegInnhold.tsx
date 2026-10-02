import { useState } from 'preact/hooks';
import type { Prosjekt, Steg } from '../types';
import { bildeUrl } from '../bilder';
import { settFelt, settNotat, svar } from '../prosjekter';
import { useFeltVerdi } from '../../ui/hooks';
import { Taster } from './HurtigtastPanel';
import { Lightbox } from './Lightbox';

/* Innholdet i ett steg. Brukes stort i opplæring og kompakt (utfelt rad)
   i produksjon. Valg, felter og notat lagres med en gang. */

export function StegInnhold({ steg, prosjekt, kompakt }: { steg: Steg; prosjekt: Prosjekt; kompakt?: boolean }) {
  const [stortBilde, setStortBilde] = useState<number | null>(null);
  const bilder = steg.bilder ?? [];

  return (
    <div class={`steg-innhold ${kompakt ? 'kompakt' : ''}`}>
      {steg.merknad && (
        <p class={`merknad ${steg.merknad.type}`}>
          <span class="label">{steg.merknad.type === 'ny' ? 'Nytt i v3.0' : 'Endret i v3.0'}</span> {steg.merknad.tekst}
        </p>
      )}

      {steg.tekst && <p class="steg-tekst">{steg.tekst}</p>}

      {steg.husk && (
        <div class="husk" role="note">
          <span class="label">Husk!</span>
          <p>{steg.husk}</p>
        </div>
      )}

      {steg.valg && <ValgKontroll steg={steg} prosjekt={prosjekt} />}

      {steg.felter?.map((f) => (
        <FeltKontroll key={f.nokkel} prosjektId={prosjekt.id} stegId={steg.id} nokkel={f.nokkel} etikett={f.etikett} plassholder={f.plassholder} verdi={prosjekt.felt[f.nokkel] ?? ''} />
      ))}

      {steg.verdier && (
        <dl class="verdier">
          {steg.verdier.map((v, i) => (
            <div key={i}>
              <dt class="label">{v.navn}</dt>
              <dd class="dot">{v.verdi}</dd>
            </div>
          ))}
        </dl>
      )}

      {!kompakt && steg.hurtigtaster && (
        <div class="steg-taster">
          {steg.hurtigtaster.map((t) => (
            <Taster key={t} tast={t} />
          ))}
        </div>
      )}

      {bilder.length > 0 && (
        <div class={`bilder antall-${Math.min(bilder.length, 2)}`}>
          {bilder.map((b, i) => (
            <figure key={b.fil}>
              <button class="bilde-knapp" onClick={() => setStortBilde(i)} aria-label={`Vis stort: ${b.tekst}`}>
                <img src={bildeUrl(b.fil)} alt={b.tekst} loading="lazy" />
              </button>
              <figcaption>{b.tekst}</figcaption>
            </figure>
          ))}
        </div>
      )}

      {steg.hjelp && (
        <details class="hjelp" open={!kompakt}>
          <summary>
            <span class="label">Fra Staircons hjelpefil</span> · {steg.hjelp.kilde}
          </summary>
          <p>{steg.hjelp.tekst}</p>
        </details>
      )}

      {steg.farger && (
        <ul class="farger">
          {steg.farger.map((f) => (
            <li key={f.farge}>
              <span class="farge-lapp" style={{ background: f.hex }} />
              <div>
                <strong>{f.farge}</strong>
                <p>{f.tekst}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {steg.dokument && (
        <a class="btn" href={bildeUrl(steg.dokument.fil)} target="_blank" rel="noopener">
          📄 {steg.dokument.tekst}
        </a>
      )}

      <NotatKontroll prosjektId={prosjekt.id} stegId={steg.id} verdi={prosjekt.notater?.[steg.id] ?? ''} />

      {stortBilde !== null && <Lightbox bilder={bilder} start={stortBilde} onLukk={() => setStortBilde(null)} />}
    </div>
  );
}

/* ── Valg ──────────────────────────────────────────────────── */

export function ValgKontroll({ steg, prosjekt }: { steg: Steg; prosjekt: Prosjekt }) {
  const v = steg.valg!;
  const gitt = prosjekt.svar[steg.id];

  if (v.type === 'janei') {
    return (
      <div class="valg">
        <span class="label">{v.sporsmal}</span>
        <div class="valg-knapper">
          {(['ja', 'nei'] as const).map((k, i) => (
            <button key={k} class="valg-knapp" aria-pressed={gitt === k} onClick={() => svar(prosjekt.id, steg.id, k)}>
              <kbd>{i === 0 ? 'J' : 'N'}</kbd>
              {k === 'ja' ? (v.knapper?.ja ?? 'Ja') : (v.knapper?.nei ?? 'Nei')}
            </button>
          ))}
        </div>
        {gitt && <p class="valg-folge">→ {gitt === 'ja' ? v.ja : v.nei}</p>}
      </div>
    );
  }

  const flere = v.type === 'flere';
  const valgt = new Set(Array.isArray(gitt) ? gitt : gitt ? [gitt] : []);
  const velg = (id: string) => {
    if (!flere) return svar(prosjekt.id, steg.id, id);
    const neste = new Set(valgt);
    neste.has(id) ? neste.delete(id) : neste.add(id);
    // Rekkefølgen følger alternativene, så svaret er stabilt.
    svar(prosjekt.id, steg.id, v.alternativer.map((a) => a.id).filter((a) => neste.has(a)));
  };

  return (
    <div class="valg">
      <span class="label">
        {v.sporsmal}
        {flere ? ' · velg alle som gjelder' : ''}
      </span>
      <div class={`valg-alternativer ${flere ? 'flere' : ''}`}>
        {v.alternativer.map((a, i) => (
          <button key={a.id} class="valg-alt" aria-pressed={valgt.has(a.id)} onClick={() => velg(a.id)}>
            <kbd>{i + 1}</kbd>
            <span class="valg-alt-tekst">
              <strong>{a.navn}</strong>
              {a.beskrivelse && <span>{a.beskrivelse}</span>}
            </span>
          </button>
        ))}
      </div>
      {flere && gitt === undefined && (
        <button class="btn liten" onClick={() => svar(prosjekt.id, steg.id, [])}>
          Ingen tillegg
        </button>
      )}
    </div>
  );
}

/* ── Felter og notat ───────────────────────────────────────── */

interface FeltProps {
  prosjektId: string;
  stegId: string;
  nokkel: string;
  etikett: string;
  plassholder?: string;
  verdi: string;
}

function FeltKontroll({ prosjektId, stegId, nokkel, etikett, plassholder, verdi }: FeltProps) {
  const [tekst, setTekst] = useFeltVerdi(verdi);
  return (
    <label class="felt">
      <span>{etikett}</span>
      <input
        value={tekst}
        placeholder={plassholder}
        onInput={(e) => setTekst((e.target as HTMLInputElement).value)}
        onBlur={() => settFelt(prosjektId, nokkel, tekst.trim(), stegId)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
}

function NotatKontroll({ prosjektId, stegId, verdi }: { prosjektId: string; stegId: string; verdi: string }) {
  const [tekst, setTekst] = useFeltVerdi(verdi);
  const [apen, setApen] = useState(!!verdi);
  if (!apen)
    return (
      <button class="notat-knapp" onClick={() => setApen(true)}>
        + Notat til dette steget
      </button>
    );
  return (
    <label class="felt notat">
      <span>Notat</span>
      <textarea
        value={tekst}
        placeholder="Spesielt for dette prosjektet …"
        onInput={(e) => setTekst((e.target as HTMLTextAreaElement).value)}
        onBlur={() => settNotat(prosjektId, stegId, tekst.trim())}
      />
    </label>
  );
}
