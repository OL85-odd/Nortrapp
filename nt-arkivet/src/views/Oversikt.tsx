import type { Linje, Stasjon } from '../data/types';
import { db } from '../data/store';
import { MetroMap } from '../map/MetroMap';
import { StasjonPanel } from './StasjonPanel';
import './oversikt.css';

/** Alle stasjoner på en linje, inkludert grener. */
function alleStasjoner(linje: Linje): Stasjon[] {
  return linje.stasjoner.flatMap((s) => [s, ...(s.grener ?? [])]);
}

export function finnStasjon(id: string | null): { linje: Linje; stasjon: Stasjon } | null {
  if (!id) return null;
  for (const linje of db.value.linjer) {
    const stasjon = alleStasjoner(linje).find((s) => s.id === id);
    if (stasjon) return { linje, stasjon };
  }
  return null;
}

export function Oversikt({ valgt, onVelg }: { valgt: string | null; onVelg: (id: string | null) => void }) {
  const linjer = db.value.linjer;
  const alle = linjer.flatMap(alleStasjoner);
  const aktive = alle.filter((s) => s.status === 'aktiv').length;
  const treff = finnStasjon(valgt);

  return (
    <main class={`oversikt ${treff ? 'med-panel' : ''}`}>
      <section class="oversikt-hode card">
        <div>
          <span class="label">Nortrapp · prosesser og prosedyrer</span>
          <h1 class="dot oversikt-tittel">NT-Arkivet</h1>
          <p class="oversikt-ingress">
            Hele Nortrapp som et linjekart. Velg en stasjon for å se prosedyren, lære den eller starte et prosjekt.
          </p>
        </div>
        <dl class="tall">
          <div>
            <dt class="label">Linjer</dt>
            <dd class="dot">{linjer.length}</dd>
          </div>
          <div>
            <dt class="label">Stasjoner</dt>
            <dd class="dot">{alle.length}</dd>
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
          {linjer.map((l) => (
            <section key={l.id} class="linje card" aria-labelledby={`linje-${l.id}`}>
              <header class="linje-hode">
                <span class="linje-kode dot" style={{ background: l.farge }}>
                  {l.kode}
                </span>
                <div>
                  <h2 id={`linje-${l.id}`}>{l.navn}</h2>
                  {l.beskrivelse && <p>{l.beskrivelse}</p>}
                </div>
              </header>
              <MetroMap linje={l} valgt={valgt} onVelg={(id) => onVelg(id === valgt ? null : id)} />
            </section>
          ))}

          <p class="forklaring label">
            <span class="fk-punkt" /> Med innhold
            <span class="fk-punkt planlagt" /> Under arbeid
          </p>
        </div>

        {treff && <StasjonPanel linje={treff.linje} stasjon={treff.stasjon} onLukk={() => onVelg(null)} />}
      </div>
    </main>
  );
}
