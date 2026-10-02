import { db } from '../../data/store';
import type { SynligFase } from '../motor';
import { svarTekst } from '../motor';
import type { Prosess, Prosjekt } from '../types';

interface Props {
  prosess: Prosess;
  faser: SynligFase[];
  prosjekt: Prosjekt;
  aktivtId: string | undefined;
  forlatte: string[];
  onVelg: (stegId: string) => void;
}

const ini = (id: string | null) => db.value.brukere.find((b) => b.id === id)?.initialer ?? '';
const kl = (iso: string) =>
  new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Oversikt: hele stien som én loddrett linje, pluss loggen over hvor du har vært. */
export function StiKart({ prosess, faser, prosjekt, aktivtId, forlatte, onVelg }: Props) {
  const alleSteg = prosess.faser.flatMap((f) => f.steg);

  return (
    <div class="oversikt-modus">
      <section class="stikart card" aria-label="Hele stien">
        {faser.map((f) => (
          <div key={f.id} class="sk-fase">
            <h3 class="sk-fase-navn">
              <span class="sk-fase-punkt" aria-hidden="true" />
              {f.tittel}
            </h3>
            <ol class="sk-steg">
              {f.steg.map((s) => {
                const gjort = !!prosjekt.utfort[s.id];
                const status = gjort ? 'ferdig' : s.id === aktivtId ? 'aktiv' : 'kommende';
                const svar = prosjekt.svar[s.id];
                return (
                  <li key={s.id} class={`sk-rad ${status}`}>
                    <button onClick={() => onVelg(s.id)}>
                      <span class="sk-punkt" aria-hidden="true" />
                      <span class="sk-tittel">{s.tittel}</span>
                      {svar !== undefined && <span class="chip">{svarTekst(s, svar)}</span>}
                      {gjort && (
                        <span class="sk-tid label">
                          {ini(prosjekt.utfort[s.id].brukerId)} {kl(prosjekt.utfort[s.id].tid)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
        {forlatte.length > 0 && (
          <div class="sk-forlatt">
            <span class="label">Forlatte grener</span>
            <p>Utført før et valg ble endret, og gjelder ikke lenger:</p>
            <ul>
              {forlatte.map((id) => (
                <li key={id}>{alleSteg.find((s) => s.id === id)?.tittel ?? id}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section class="logg card" aria-label="Logg">
        <span class="label">Logg · hvor du har vært</span>
        <ol>
          {[...prosjekt.logg].reverse().map((l, i) => (
            <li key={i} class={`logg-rad ${l.type}`}>
              <span class="label">
                {kl(l.tid)} · {ini(l.brukerId) || '—'}
              </span>
              <span>{l.tekst}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
