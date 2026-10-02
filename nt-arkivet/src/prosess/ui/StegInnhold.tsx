import { useState } from 'preact/hooks';
import type { Prosjekt, Steg } from '../types';
import { bildeUrl } from '../bilder';
import { BildeVisning } from './BildeVisning';
import { hentPost, sisteVersjon } from '../arkiv';
import { settFelt, settNotat, svar } from '../prosjekter';
import { useFeltVerdi } from '../../ui/hooks';
import { Taster } from './HurtigtastPanel';
import { Lightbox } from './Lightbox';

/* Innholdet i ett steg. Brukes stort i opplæring og kompakt (utfelt rad)
   i produksjon. Valg, felter og notat lagres med en gang.
   Uten prosjekt (les-visning og forhåndsvisning i redigering) vises innholdet
   uten noe som kan fylles ut. */

export function StegInnhold({ steg, prosjekt, kompakt }: { steg: Steg; prosjekt?: Prosjekt; kompakt?: boolean }) {
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

      {steg.valg && prosjekt && <ValgKontroll steg={steg} prosjekt={prosjekt} />}
      {steg.valg && !prosjekt && <ValgForhandsvisning steg={steg} />}

      {steg.felter?.map((f) =>
        prosjekt ? (
          <FeltKontroll
            key={f.nokkel}
            prosjektId={prosjekt.id}
            stegId={steg.id}
            nokkel={f.nokkel}
            etikett={f.etikett + (f.enhet ? ` (${f.enhet})` : '')}
            plassholder={f.plassholder}
            tall={f.type === 'tall'}
            verdi={prosjekt.felt[f.nokkel] ?? ''}
          />
        ) : (
          <label key={f.nokkel} class="felt">
            <span>
              {f.etikett}
              {f.enhet ? ` (${f.enhet})` : ''}
            </span>
            <input disabled placeholder={f.plassholder} />
          </label>
        ),
      )}

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
                <BildeVisning fil={b.fil} alt={b.tekst} loading="lazy" />
              </button>
              <figcaption>{b.tekst}</figcaption>
            </figure>
          ))}
        </div>
      )}

      {steg.video && <VideoKloss kilde={steg.video.kilde} tekst={steg.video.tekst} />}

      {steg.lenke && <LenkeKloss prosessId={steg.lenke.prosessId} tekst={steg.lenke.tekst} />}

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

      {prosjekt && <NotatKontroll prosjektId={prosjekt.id} stegId={steg.id} verdi={prosjekt.notater?.[steg.id] ?? ''} />}

      {stortBilde !== null && <Lightbox bilder={bilder} start={stortBilde} onLukk={() => setStortBilde(null)} />}
    </div>
  );
}

/* ── Video og lenke ────────────────────────────────────────── */

function VideoKloss({ kilde, tekst }: { kilde: string; tekst: string }) {
  // Filer på serveren og vanlige videolenker spilles av direkte. YouTube o.l. åpnes som lenke.
  const fil = /\.(mp4|webm|mov|m4v)$/i.test(kilde);
  const src = kilde.startsWith('\\\\') ? 'file:' + kilde.replace(/\\/g, '/') : kilde;
  return (
    <figure class="video">
      {fil ? <video controls preload="metadata" src={src} /> : null}
      <figcaption>
        🎬 {tekst || 'Video'}{' '}
        <a href={src} target="_blank" rel="noopener">
          Åpne video ↗
        </a>
      </figcaption>
    </figure>
  );
}

function LenkeKloss({ prosessId, tekst }: { prosessId: string; tekst?: string }) {
  const post = hentPost(prosessId);
  if (!post) return <p class="panel-hint">Lenket prosess finnes ikke lenger.</p>;
  const p = sisteVersjon(post).prosess;
  return (
    <a class="lenke-kloss" href={p.kunLesing ? `#/les/${post.id}` : `#/p/${post.id}`}>
      <span class="label">{post.nr}</span>
      <strong>{tekst || `Følg: ${p.navn}`}</strong>
      <span aria-hidden="true">→</span>
    </a>
  );
}

/** Viser valget uten å kunne svare (les-visning og forhåndsvisning). */
function ValgForhandsvisning({ steg }: { steg: Steg }) {
  const v = steg.valg!;
  return (
    <div class="valg">
      <span class="label">{v.sporsmal}</span>
      <div class="valg-knapper">
        {v.type === 'janei'
          ? [v.knapper?.ja ?? 'Ja', v.knapper?.nei ?? 'Nei'].map((t) => (
              <span key={t} class="valg-knapp forhand">
                {t}
              </span>
            ))
          : v.alternativer.map((a) => (
              <span key={a.id} class="valg-knapp forhand">
                {v.type === 'flere' ? '☐ ' : ''}
                {a.navn}
              </span>
            ))}
      </div>
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
  tall?: boolean;
  verdi: string;
}

function FeltKontroll({ prosjektId, stegId, nokkel, etikett, plassholder, tall, verdi }: FeltProps) {
  const [tekst, setTekst] = useFeltVerdi(verdi);
  return (
    <label class="felt">
      <span>{etikett}</span>
      <input
        inputMode={tall ? 'decimal' : undefined}
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
