import type { Hurtigtast, Prosess, Steg } from '../types';

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

export function beskriv(prosess: Prosess, tast: string): Hurtigtast {
  return prosess.hurtigtaster?.find((h) => h.tast === tast) ?? { tast, tekst: '' };
}

/**
 * Fast panel ved siden av steget.
 * Programvare: hurtigtastene som er relevante akkurat nå.
 * Maskiner og annet: «Kjekt å vite».
 */
export function HurtigtastPanel({ prosess, steg }: { prosess: Prosess; steg: Steg | null }) {
  if (prosess.type !== 'programvare') return <KjektAVite prosess={prosess} />;

  const egne = steg?.hurtigtaster ?? [];
  const alltid = (prosess.alltidTaster ?? []).filter((t) => !egne.includes(t));

  return (
    <aside class="hurtigtaster card" aria-label="Hurtigtaster">
      <span class="label">Hurtigtaster · {prosess.navn}</span>

      <section>
        <h3 class="ht-tittel">I dette steget</h3>
        {egne.length ? (
          <ul class="ht-liste">
            {egne.map((t) => {
              const h = beskriv(prosess, t);
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

      {alltid.length > 0 && (
        <section>
          <h3 class="ht-tittel">{prosess.navn} – alltid</h3>
          <ul class="ht-liste">
            {alltid.map((t) => (
              <li key={t} class="ht-rad">
                <Taster tast={t} />
                <span>{beskriv(prosess, t).tekst}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

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

function KjektAVite({ prosess }: { prosess: Prosess }) {
  const punkter = (prosess.kjektAVite ?? '')
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  return (
    <aside class="hurtigtaster kjekt card" aria-label="Kjekt å vite">
      <span class="label">Kjekt å vite</span>
      {punkter.length ? (
        <ul class="kjekt-liste">
          {punkter.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      ) : (
        <p class="ht-tom">Ingenting lagt inn ennå. Fylles ut i redigeringsmodus.</p>
      )}
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
