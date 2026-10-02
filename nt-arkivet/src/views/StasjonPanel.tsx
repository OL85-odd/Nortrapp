import { useEffect } from 'preact/hooks';
import type { Kort, Stasjon } from '../data/types';
import { fargeVar } from '../data/types';
import { db } from '../data/store';
import { opprett } from '../prosess/prosjekter';
import { hentPost, sisteVersjon } from '../prosess/arkiv';
import { modus } from '../ui/settings';
import { forfall } from './Arbeidsflate';

interface Props {
  kort: Kort;
  stasjon: Stasjon;
  onLukk: () => void;
}

/** Detaljer om valgt stasjon. Innholdet fylles ut i de neste milepælene. */
export function StasjonPanel({ kort, stasjon, onLukk }: Props) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onLukk();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onLukk]);

  const underArbeid = stasjon.status === 'under_arbeid';
  const post = stasjon.prosessId ? hentPost(stasjon.prosessId) : undefined;
  const prosess = post && sisteVersjon(post).prosess;
  const aktive = post ? db.value.prosjekter.filter((p) => p.prosessId === post.id && (p.type === 'prosjekt' || p.type === 'gjennomforing') && !p.ferdig).length : 0;
  const f = post ? forfall(post.id) : null;

  const ov = async () => {
    const p = await opprett({ prosessId: post!.id, type: 'ovelse', nummer: 'Øving ' + new Date().toLocaleDateString('nb-NO') });
    modus.value = 'opplaring';
    location.hash = `#/prosjekt/${p.id}`;
  };

  return (
    <aside class="panel card" aria-labelledby="panel-tittel">
      <div class="panel-topp">
        <span class="label" style={{ color: fargeVar(kort.farge) }}>
          {kort.kode} · {kort.navn}
        </span>
        <button class="panel-lukk" onClick={onLukk} aria-label="Lukk">
          ×
        </button>
      </div>

      <h2 id="panel-tittel" class="dot panel-tittel">
        {stasjon.navn}
      </h2>
      <span class={`chip ${underArbeid ? 'under-arbeid' : 'aktiv'}`}>{underArbeid ? 'Under arbeid' : 'Aktiv'}</span>

      {stasjon.beskrivelse && <p class="panel-tekst">{stasjon.beskrivelse}</p>}

      {stasjon.grener && (
        <div class="panel-blokk">
          <span class="label">Spor herfra</span>
          <ul class="panel-grener">
            {stasjon.grener.map((g) => (
              <li key={g.id}>
                <a href={`#/s/${g.id}`}>{g.navn}</a>
                <span class={`chip ${g.status === 'under_arbeid' ? 'under-arbeid' : 'aktiv'}`}>
                  {g.status === 'under_arbeid' ? 'Under arbeid' : 'Aktiv'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {post && prosess ? (
        <div class="panel-blokk">
          <span class="label">
            {post.nr} · {prosess.kunLesing ? 'Instruks' : prosess.navn}
          </span>
          {f && <span class={`chip ${f.forfalt ? 'fare' : 'aktiv'}`}>{f.tekst}</span>}
          <div class="panel-handlinger">
            {prosess.kunLesing ? (
              <a class="btn btn-primary" href={`#/les/${post.id}`}>
                Les instruksen
              </a>
            ) : (
              <>
                <a class="btn btn-primary" href={`#/p/${post.id}`}>
                  Åpne {prosess.navn} {aktive ? `· ${aktive} aktive` : ''}
                </a>
                <button class="btn" onClick={ov}>
                  Opplæring
                </button>
              </>
            )}
            <a class="btn" href={`#/qr/${post.id}`}>
              QR
            </a>
          </div>
        </div>
      ) : underArbeid ? (
        <div class="panel-tom">
          <strong>Ingen prosedyre ennå</strong>
          Lås opp redigering og velg «Lag prosess» for å fylle stasjonen med innhold.
        </div>
      ) : (
        <div class="panel-handlinger">
          <button class="btn" disabled title="Kommer med prosedyrebiblioteket">
            Åpne prosedyre
          </button>
        </div>
      )}
    </aside>
  );
}
