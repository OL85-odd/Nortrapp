import { db } from '../data/store';
import { Modal } from '../ui/Modal';
import { tilbakestill, utkast } from './state';

function initialer(id: string | null) {
  return db.value.brukere.find((b) => b.id === id)?.initialer ?? '—';
}

function dato(iso: string) {
  return new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function Historikk({ onLukk }: { onLukk: () => void }) {
  const revisjoner = [...db.value.revisjoner].reverse();
  const gjeldende = revisjoner[0]?.nr;

  const gaTilbake = async (nr: number) => {
    const advarsel = utkast.value ? '\n\nUtkastet ditt blir forkastet.' : '';
    if (!confirm(`Gjøre rev. ${nr} gjeldende igjen? Det lagres som en ny revisjon.${advarsel}`)) return;
    await tilbakestill(nr);
    onLukk();
  };

  return (
    <Modal tittel="Historikk" etikett="Revisjoner av kartet" onLukk={onLukk} bred>
      <ol class="historikk">
        {revisjoner.map((r) => (
          <li key={r.nr} class="historikk-rad">
            <div class="historikk-hode">
              <span class="dot historikk-nr">{r.nr}</span>
              <span class="label">
                {dato(r.dato)} · {initialer(r.brukerId)}
              </span>
              {r.nr === gjeldende ? (
                <span class="chip aktiv">Gjeldende</span>
              ) : (
                <button class="btn liten" onClick={() => gaTilbake(r.nr)}>
                  Gå tilbake hit
                </button>
              )}
            </div>
            <p class="historikk-kommentar">{r.kommentar}</p>
            {r.endringer.length > 0 && (
              <ul class="endringsliste">
                {r.endringer.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </Modal>
  );
}
