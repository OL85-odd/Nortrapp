import { useEffect, useRef } from 'preact/hooks';
import type { SynligFase } from '../motor';
import type { Prosjekt } from '../types';

interface Props {
  faser: SynligFase[];
  prosjekt: Prosjekt;
  aktivFase: string | undefined;
  skjulte: number;
  onVelgFase: (faseId: string) => void;
}

/** T-banelinje over fasene. Viser hvor i prosessen man er, og fylles etter hvert. */
export function FaseStripe({ faser, prosjekt, aktivFase, skjulte, onVelgFase }: Props) {
  const ref = useRef<HTMLElement>(null);

  // Hold aktiv fase synlig når stripen er bredere enn skjermen.
  useEffect(() => {
    const nav = ref.current;
    const li = nav?.querySelector<HTMLElement>('.fase.aktiv');
    if (nav && li) nav.scrollTo({ left: li.offsetLeft - nav.clientWidth / 2 + li.clientWidth / 2, behavior: 'smooth' });
  }, [aktivFase]);

  return (
    <nav class="fasestripe card" aria-label="Faser" ref={ref}>
      <ol>
        {faser.map((f, i) => {
          const gjort = f.steg.filter((s) => prosjekt.utfort[s.id]).length;
          const ferdig = gjort === f.steg.length;
          const status = ferdig ? 'ferdig' : f.id === aktivFase ? 'aktiv' : gjort ? 'paabegynt' : 'kommende';
          return (
            <li key={f.id} class={`fase ${status}`} style={{ '--andel': gjort / f.steg.length }}>
              {i > 0 && <span class="fase-spor" aria-hidden="true" />}
              <button
                class="fase-knapp"
                onClick={() => onVelgFase(f.id)}
                aria-current={f.id === aktivFase ? 'step' : undefined}
                title={`${f.tittel}: ${gjort} av ${f.steg.length} steg`}
              >
                <span class="fase-punkt" aria-hidden="true">
                  {ferdig ? '✓' : ''}
                </span>
                <span class="fase-navn">{f.tittel}</span>
                <span class="fase-teller label">
                  {gjort}/{f.steg.length}
                </span>
              </button>
            </li>
          );
        })}
        {skjulte > 0 && (
          <li class="fase skjult">
            <span class="fase-spor" aria-hidden="true" />
            <span class="fase-knapp" title="Flere steg dukker opp når du svarer på valgene">
              <span class="fase-punkt" aria-hidden="true">
                ?
              </span>
              <span class="fase-navn">+{skjulte} steg</span>
              <span class="fase-teller label">bak valg</span>
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
