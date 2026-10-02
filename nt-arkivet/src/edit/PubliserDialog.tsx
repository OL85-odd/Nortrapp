import { useState } from 'preact/hooks';
import { db } from '../data/store';
import { Modal } from '../ui/Modal';
import { endringer, publiser } from './state';

export function PubliserDialog({ onLukk }: { onLukk: () => void }) {
  const [kommentar, setKommentar] = useState('');
  const neste = (db.value.revisjoner.at(-1)?.nr ?? 0) + 1;

  const send = async (e: Event) => {
    e.preventDefault();
    if (!kommentar.trim()) return;
    await publiser(kommentar.trim());
    onLukk();
  };

  return (
    <Modal tittel={`Publiser rev. ${neste}`} etikett="Redigeringsmodus" onLukk={onLukk} bred>
      <p>Dette blir gjeldende for alle. Den forrige versjonen ligger i historikken og kan hentes tilbake.</p>
      <ul class="endringsliste">
        {endringer.value.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      <form class="felt" onSubmit={send}>
        <span>Hva og hvorfor (påkrevd)</span>
        <textarea
          value={kommentar}
          placeholder="F.eks. Skilt kaffemaskinen ut fra produksjonsmaskinene."
          onInput={(e) => setKommentar((e.target as HTMLTextAreaElement).value)}
        />
        <div class="modal-knapper">
          <button type="button" class="btn" onClick={onLukk}>
            Avbryt
          </button>
          <button type="submit" class="btn btn-primary" disabled={!kommentar.trim()}>
            Publiser
          </button>
        </div>
      </form>
    </Modal>
  );
}
