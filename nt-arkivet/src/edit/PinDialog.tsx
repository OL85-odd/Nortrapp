import { useState } from 'preact/hooks';
import { Modal } from '../ui/Modal';
import { harPin, lasOpp, settPin } from './state';

/* Første gang: velg en PIN-kode (to ganger). Senere: tast den inn. */

export function PinDialog({ onFerdig }: { onFerdig: (ok: boolean) => void }) {
  const ny = !harPin.value;
  const [pin, setPin] = useState('');
  const [igjen, setIgjen] = useState('');
  const [feil, setFeil] = useState('');

  const send = async (e: Event) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) return setFeil('PIN-koden må være 4–8 siffer.');
    if (ny) {
      if (pin !== igjen) return setFeil('Kodene er ikke like.');
      await settPin(pin);
      await lasOpp(pin);
      return onFerdig(true);
    }
    if (await lasOpp(pin)) return onFerdig(true);
    setFeil('Feil PIN-kode.');
    setPin('');
  };

  const sifre = (set: (v: string) => void) => (e: Event) => {
    set((e.target as HTMLInputElement).value.replace(/\D/g, ''));
    setFeil('');
  };

  return (
    <Modal tittel={ny ? 'Velg PIN-kode' : 'Lås opp'} etikett="Redigeringsmodus" onLukk={() => onFerdig(false)}>
      <p>
        {ny
          ? 'Redigeringsmodus låses med en PIN-kode, så ikke alle endrer kartet ved et uhell. Velg 4–8 siffer.'
          : 'Tast PIN-koden for å endre linjer, samlinger og stasjoner.'}
      </p>
      <form class="felt" onSubmit={send}>
        <input
          class="pin-felt"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          aria-label="PIN-kode"
          maxLength={8}
          value={pin}
          onInput={sifre(setPin)}
        />
        {ny && (
          <input
            class="pin-felt"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Gjenta PIN-kode"
            placeholder="Gjenta"
            maxLength={8}
            value={igjen}
            onInput={sifre(setIgjen)}
          />
        )}
        {feil && <p class="feil">{feil}</p>}
        <div class="modal-knapper">
          <button type="button" class="btn" onClick={() => onFerdig(false)}>
            Avbryt
          </button>
          <button type="submit" class="btn btn-primary">
            {ny ? 'Lagre og lås opp' : 'Lås opp'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
