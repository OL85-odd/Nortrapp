import type { Kort, Stasjon } from '../data/types';
import { fargeVar } from '../data/types';
import { alleStasjoner, nyId } from '../data/store';
import { MetroMap } from '../map/MetroMap';
import { Samling } from '../map/Samling';
import { StasjonPanel } from './StasjonPanel';
import { StasjonEditor } from '../edit/StasjonEditor';
import { KortEditor } from '../edit/KortEditor';
import * as op from '../edit/ops';
import { endre, redigerer, synligeKort } from '../edit/state';
import type { Rute } from '../app';
import './oversikt.css';

export function finnStasjon(kort: Kort[], id: string | null): { kort: Kort; stasjon: Stasjon } | null {
  if (!id) return null;
  for (const k of kort) {
    const stasjon = alleStasjoner(k).find((s) => s.id === id);
    if (stasjon) return { kort: k, stasjon };
  }
  return null;
}

interface Props {
  rute: Rute;
  onNaviger: (r: Rute) => void;
}

export function Oversikt({ rute, onNaviger }: Props) {
  const kort = synligeKort.value;
  const rediger = redigerer.value;
  const linjer = kort.filter((k) => k.type === 'linje');
  const alle = kort.flatMap(alleStasjoner);
  const aktive = alle.filter((s) => s.status === 'aktiv').length;

  const valgtStasjon = rute.type === 's' ? rute.id : null;
  const treff = finnStasjon(kort, valgtStasjon);
  const kortSomRedigeres = rediger && rute.type === 'k' ? rute.id : null;

  const velg = (id: string | null) => onNaviger(id ? { type: 's', id } : { type: 'hjem' });
  const veksle = (id: string) => velg(id === valgtStasjon ? null : id);
  const lukk = () => onNaviger({ type: 'hjem' });

  const nyIKort = (k: Kort, indeks: number) => {
    const id = nyId('s');
    endre((alleKort) => op.settInn(alleKort, k.id, indeks, { id, navn: k.type === 'linje' ? 'Ny stasjon' : 'Ny oppgave', status: 'under_arbeid' }));
    velg(id);
  };

  const nyttKort = (type: 'linje' | 'samling') => {
    const id = nyId('k');
    endre((alleKort) => op.leggTilKort(alleKort, op.nyttKort(id, type)));
    onNaviger({ type: 'k', id });
  };

  let panel = null;
  if (kortSomRedigeres) {
    panel = <KortEditor key={kortSomRedigeres} kortId={kortSomRedigeres} onVelgStasjon={velg} onLukk={lukk} />;
  } else if (treff && rediger) {
    panel = <StasjonEditor key={treff.stasjon.id} stasjonId={treff.stasjon.id} onVelg={velg} onLukk={lukk} />;
  } else if (treff) {
    panel = <StasjonPanel kort={treff.kort} stasjon={treff.stasjon} onLukk={lukk} />;
  }

  return (
    <main class={`oversikt ${panel ? 'med-panel' : ''}`}>
      <section class="oversikt-hode card">
        <div>
          <span class="label">Nortrapp · prosesser og prosedyrer</span>
          <h1 class="dot oversikt-tittel">NT-Arkivet</h1>
          <p class="oversikt-ingress">
            Hele Nortrapp som linjer og samlinger. Velg en stasjon for å se prosedyren, lære den eller starte et prosjekt.
          </p>
        </div>
        <dl class="tall">
          <div>
            <dt class="label">Linjer</dt>
            <dd class="dot">{linjer.length}</dd>
          </div>
          <div>
            <dt class="label">Samlinger</dt>
            <dd class="dot">{kort.length - linjer.length}</dd>
          </div>
          <div>
            <dt class="label">Med innhold</dt>
            <dd class="dot">{aktive}</dd>
          </div>
          <div>
            <dt class="label">Under arbeid</dt>
            <dd class="dot">{alle.length - aktive}</dd>
          </div>
        </dl>
      </section>

      <div class="oversikt-innhold">
        <div class="linjer">
          {kort.map((k) => (
            <section
              key={k.id}
              class={`linje card ${kortSomRedigeres === k.id ? 'redigeres' : ''}`}
              aria-labelledby={`kort-${k.id}`}
              style={{ '--linje': fargeVar(k.farge) }}
            >
              <header class="linje-hode">
                <span class={`linje-kode kode-${k.type}`} style={{ background: fargeVar(k.farge) }}>
                  {k.kode}
                </span>
                <div>
                  <h2 id={`kort-${k.id}`}>{k.navn}</h2>
                  {k.beskrivelse && <p>{k.beskrivelse}</p>}
                </div>
                {rediger && (
                  <button class="btn liten linje-rediger" onClick={() => onNaviger({ type: 'k', id: k.id })}>
                    ✎ Rediger
                  </button>
                )}
              </header>

              {k.type === 'samling' ? (
                <Samling kort={k} valgt={valgtStasjon} onVelg={veksle} rediger={rediger} onNy={() => nyIKort(k, k.stasjoner.length)} />
              ) : k.stasjoner.length ? (
                <MetroMap linje={k} valgt={valgtStasjon} onVelg={veksle} rediger={rediger} onSettInn={(i) => nyIKort(k, i)} />
              ) : (
                <div class="tom-linje">
                  <span class="label">Tom linje</span>
                  {rediger && (
                    <button class="btn liten" onClick={() => nyIKort(k, 0)}>
                      + Første stasjon
                    </button>
                  )}
                </div>
              )}
            </section>
          ))}

          {rediger && (
            <div class="nytt-kort">
              <span class="label">Nytt kort</span>
              <button class="btn" onClick={() => nyttKort('linje')}>
                + Linje
              </button>
              <button class="btn" onClick={() => nyttKort('samling')}>
                + Samling
              </button>
            </div>
          )}

          <p class="forklaring label">
            <span class="fk-punkt" /> Med innhold
            <span class="fk-punkt planlagt" /> Under arbeid
          </p>
        </div>

        {panel}
      </div>
    </main>
  );
}
