import { useState } from 'preact/hooks';
import { db, oppdater } from '../data/store';
import { bruker } from './settings';
import './brukervelger.css';

/* Enkel identifisering i prototypen: velg initialene dine.
   Ekte innlogging kommer når appen flyttes til serveren/SharePoint. */

export function BrukerVelger({ onFerdig }: { onFerdig: () => void }) {
  const [ny, setNy] = useState('');
  const [navn, setNavn] = useState('');

  const velg = (init: string) => {
    bruker.value = init;
    onFerdig();
  };

  const leggTil = async (e: Event) => {
    e.preventDefault();
    const init = ny.trim().toUpperCase();
    if (!/^[A-ZÆØÅ]{2,3}$/.test(init)) return;
    if (!db.value.brukere.some((b) => b.initialer === init)) {
      await oppdater((d) => ({ ...d, brukere: [...d.brukere, { initialer: init, navn: navn.trim() || init }] }));
    }
    velg(init);
  };

  return (
    <div class="velger-bakgrunn" role="dialog" aria-modal="true" aria-labelledby="velger-tittel">
      <div class="velger card">
        <span class="label">NT-Arkivet</span>
        <h2 id="velger-tittel" class="dot velger-tittel">
          Hvem er du?
        </h2>
        <p class="velger-tekst">Initialene dine brukes i loggen, på endringer og på kontroller.</p>

        <div class="velger-liste">
          {db.value.brukere.map((b) => (
            <button
              key={b.initialer}
              class="velger-bruker"
              aria-pressed={bruker.value === b.initialer}
              onClick={() => velg(b.initialer)}
            >
              <span class="dot">{b.initialer}</span>
              <span class="velger-navn">{b.navn}</span>
            </button>
          ))}
        </div>

        <form class="velger-ny" onSubmit={leggTil}>
          <input
            aria-label="Nye initialer"
            placeholder="XX"
            maxLength={3}
            value={ny}
            onInput={(e) => setNy((e.target as HTMLInputElement).value)}
          />
          <input
            aria-label="Navn"
            placeholder="Navn"
            value={navn}
            onInput={(e) => setNavn((e.target as HTMLInputElement).value)}
          />
          <button class="btn" type="submit">
            Legg til
          </button>
        </form>
      </div>
    </div>
  );
}
