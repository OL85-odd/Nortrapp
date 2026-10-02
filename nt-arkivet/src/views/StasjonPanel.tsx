import { useEffect } from 'preact/hooks';
import type { Linje, Stasjon } from '../data/types';

interface Props {
  linje: Linje;
  stasjon: Stasjon;
  onLukk: () => void;
}

/** Detaljer om valgt stasjon. Innholdet fylles ut i de neste milepælene. */
export function StasjonPanel({ linje, stasjon, onLukk }: Props) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onLukk();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onLukk]);

  const underArbeid = stasjon.status === 'under_arbeid';
  const erStaircon = stasjon.id === 'staircon';

  return (
    <aside class="panel card" aria-labelledby="panel-tittel">
      <div class="panel-topp">
        <span class="label" style={{ color: linje.farge }}>
          {linje.kode} · {linje.navn}
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

      {underArbeid ? (
        <div class="panel-tom">
          <strong>Ingen prosedyre ennå</strong>
          Denne stasjonen fylles med innhold i redigeringsmodus.
        </div>
      ) : (
        <div class="panel-handlinger">
          {erStaircon && (
            <button class="btn btn-primary" disabled title="Kommer i M2">
              Start nytt prosjekt
            </button>
          )}
          <button class="btn" disabled title="Kommer i M5">
            Åpne prosedyre
          </button>
          <button class="btn" disabled title="Kommer i M2">
            Opplæring
          </button>
        </div>
      )}
    </aside>
  );
}
