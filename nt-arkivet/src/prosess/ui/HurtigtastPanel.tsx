import type { Steg } from '../types';
import { ALLTID, beskriv } from '../staircon/hurtigtaster';

/** Tast vist som tastaturknapper: «Ctrl + Shift + F6» → [Ctrl] [Shift] [F6]. */
export function Taster({ tast }: { tast: string }) {
  return (
    <span class="taster">
      {tast.split(' + ').map((t, i) => (
        <kbd key={i}>{t}</kbd>
      ))}
    </span>
  );
}

const APP: [string, string][] = [
  ['Enter', 'Utført – til neste steg'],
  ['← / →', 'Forrige / neste steg'],
  ['J / N', 'Svar ja / nei'],
  ['1 – 9', 'Velg alternativ'],
];

/** Fast panel med hurtigtastene som er relevante akkurat nå. */
export function HurtigtastPanel({ steg }: { steg: Steg | null }) {
  const egne = steg?.hurtigtaster ?? [];
  const alltid = ALLTID.filter((t) => !egne.includes(t));

  return (
    <aside class="hurtigtaster card" aria-label="Hurtigtaster">
      <span class="label">Hurtigtaster</span>

      <section>
        <h3 class="ht-tittel">I dette steget</h3>
        {egne.length ? (
          <ul class="ht-liste">
            {egne.map((t) => {
              const h = beskriv(t);
              return (
                <li key={t} class="ht-rad viktig">
                  <Taster tast={t} />
                  <span>
                    {h.tekst}
                    {h.kontroller && <em class="ht-egen" title={h.kontroller}> · må kontrolleres: {h.kontroller}</em>}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p class="ht-tom">Ingen spesielle taster i dette steget.</p>
        )}
      </section>

      <section>
        <h3 class="ht-tittel">Staircon – alltid</h3>
        <ul class="ht-liste">
          {alltid.map((t) => (
            <li key={t} class="ht-rad">
              <Taster tast={t} />
              <span>{beskriv(t).tekst}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 class="ht-tittel">NT-Arkivet</h3>
        <ul class="ht-liste">
          {APP.map(([t, tekst]) => (
            <li key={t} class="ht-rad">
              <Taster tast={t} />
              <span>{tekst}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
