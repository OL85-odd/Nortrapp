import { useEffect } from 'preact/hooks';
import type { Kort, Stasjon } from '../data/types';
import { fargeVar } from '../data/types';
import { db } from '../data/store';
import { opprett, PROSESSER } from '../prosess/prosjekter';
import { modus } from '../ui/settings';

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
  const prosess = PROSESSER[stasjon.id];
  const aktive = prosess ? db.value.prosjekter.filter((p) => p.prosessId === prosess.id && p.type === 'prosjekt' && !p.ferdig).length : 0;

  const ov = async () => {
    const p = await opprett({ prosessId: prosess.id, type: 'ovelse', nummer: 'Øving ' + new Date().toLocaleDateString('nb-NO') });
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

      {prosess ? (
        <div class="panel-handlinger">
          <a class="btn btn-primary" href={`#/p/${stasjon.id}`}>
            Åpne {prosess.navn} {aktive ? `· ${aktive} aktive` : ''}
          </a>
          <button class="btn" onClick={ov}>
            Opplæring
          </button>
        </div>
      ) : underArbeid ? (
        <div class="panel-tom">
          <strong>Ingen prosedyre ennå</strong>
          Denne stasjonen fylles med innhold i redigeringsmodus.
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
