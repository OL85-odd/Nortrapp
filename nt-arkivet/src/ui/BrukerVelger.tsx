import { useState } from 'preact/hooks';
import { db, nyId, oppdater } from '../data/store';
import type { Bruker } from '../data/types';
import { bruker } from './settings';
import './brukervelger.css';

/* Enkel identifisering i prototypen: velg initialene dine.
   Ekte innlogging kommer når appen flyttes til serveren/SharePoint.

   «Administrer» lar deg rette navn og initialer, arkivere folk som har
   sluttet (de forsvinner fra velgeren, men står fortsatt i loggene) og
   slette feilregistreringer. */

const GYLDIGE_INITIALER = /^[A-ZÆØÅ]{2,3}$/;

export function BrukerVelger({ onFerdig }: { onFerdig: () => void }) {
  const [administrer, setAdministrer] = useState(false);

  return (
    <div class="velger-bakgrunn" role="dialog" aria-modal="true" aria-labelledby="velger-tittel">
      <div class="velger card">
        <div class="velger-topp">
          <span class="label">NT-Arkivet</span>
          {bruker.value && (
            <button class="panel-lukk" onClick={onFerdig} aria-label="Lukk">
              ×
            </button>
          )}
        </div>
        {administrer ? (
          <Administrer onTilbake={() => setAdministrer(false)} />
        ) : (
          <Velg onFerdig={onFerdig} onAdministrer={() => setAdministrer(true)} />
        )}
      </div>
    </div>
  );
}

/* ── Velg hvem du er ───────────────────────────────────────── */

function Velg({ onFerdig, onAdministrer }: { onFerdig: () => void; onAdministrer: () => void }) {
  const aktive = db.value.brukere.filter((b) => !b.arkivert);
  const velg = (id: string) => {
    bruker.value = id;
    onFerdig();
  };

  return (
    <>
      <h2 id="velger-tittel" class="dot velger-tittel">
        Hvem er du?
      </h2>
      <p class="velger-tekst">Initialene dine brukes i loggen, på endringer og på kontroller.</p>

      <div class="velger-liste">
        {aktive.map((b) => (
          <button key={b.id} class="velger-bruker" aria-pressed={bruker.value === b.id} onClick={() => velg(b.id)}>
            <span class="dot">{b.initialer}</span>
            <span class="velger-navn">{b.navn}</span>
          </button>
        ))}
      </div>

      <NyBruker onLagtTil={velg} />

      <button class="velger-lenke" onClick={onAdministrer}>
        Administrer brukere →
      </button>
    </>
  );
}

function NyBruker({ onLagtTil }: { onLagtTil: (id: string) => void }) {
  const [init, setInit] = useState('');
  const [navn, setNavn] = useState('');
  const [feil, setFeil] = useState('');

  const leggTil = async (e: Event) => {
    e.preventDefault();
    const i = init.trim().toUpperCase();
    if (!GYLDIGE_INITIALER.test(i)) return setFeil('Initialer må være 2–3 bokstaver.');
    if (db.value.brukere.some((b) => b.initialer === i && !b.arkivert)) return setFeil(`${i} finnes allerede.`);
    const ny: Bruker = { id: nyId('b'), initialer: i, navn: navn.trim() || i };
    await oppdater((d) => ({ ...d, brukere: [...d.brukere, ny] }));
    onLagtTil(ny.id);
  };

  return (
    <form class="velger-ny" onSubmit={leggTil}>
      <input
        aria-label="Nye initialer"
        placeholder="XX"
        maxLength={3}
        value={init}
        onInput={(e) => (setInit((e.target as HTMLInputElement).value), setFeil(''))}
      />
      <input aria-label="Navn" placeholder="Navn" value={navn} onInput={(e) => setNavn((e.target as HTMLInputElement).value)} />
      <button class="btn" type="submit">
        Legg til
      </button>
      {feil && <p class="velger-feil">{feil}</p>}
    </form>
  );
}

/* ── Administrer brukere ───────────────────────────────────── */

function Administrer({ onTilbake }: { onTilbake: () => void }) {
  const [visArkiv, setVisArkiv] = useState(false);
  const aktive = db.value.brukere.filter((b) => !b.arkivert);
  const arkiverte = db.value.brukere.filter((b) => b.arkivert);

  return (
    <>
      <h2 id="velger-tittel" class="dot velger-tittel">
        Brukere
      </h2>
      <p class="velger-tekst">
        Endringer lagres når du går ut av feltet. Arkiver folk som har sluttet. Slett bare feilregistreringer.
      </p>

      <ul class="admin-liste">
        {aktive.map((b) => (
          <BrukerRad key={b.id} b={b} />
        ))}
      </ul>

      {arkiverte.length > 0 && (
        <>
          <button class="velger-lenke" onClick={() => setVisArkiv(!visArkiv)} aria-expanded={visArkiv}>
            {visArkiv ? 'Skjul' : 'Vis'} arkiverte ({arkiverte.length})
          </button>
          {visArkiv && (
            <ul class="admin-liste arkiv">
              {arkiverte.map((b) => (
                <BrukerRad key={b.id} b={b} />
              ))}
            </ul>
          )}
        </>
      )}

      <button class="btn" onClick={onTilbake}>
        ← Ferdig
      </button>
    </>
  );
}

function BrukerRad({ b }: { b: Bruker }) {
  const [init, setInit] = useState(b.initialer);
  const [navn, setNavn] = useState(b.navn);
  const [feil, setFeil] = useState('');

  const endre = (felt: Partial<Bruker>) =>
    oppdater((d) => ({ ...d, brukere: d.brukere.map((x) => (x.id === b.id ? { ...x, ...felt } : x)) }));

  const lagreInit = () => {
    const i = init.trim().toUpperCase();
    if (i === b.initialer) return;
    if (!GYLDIGE_INITIALER.test(i)) return setFeil('2–3 bokstaver');
    if (db.value.brukere.some((x) => x.id !== b.id && x.initialer === i && !x.arkivert)) return setFeil('Finnes allerede');
    setFeil('');
    setInit(i);
    endre({ initialer: i });
  };

  const lagreNavn = () => {
    const n = navn.trim();
    if (n && n !== b.navn) endre({ navn: n });
  };

  const slett = () => {
    if (!confirm(`Slette ${b.initialer} (${b.navn}) for godt?\n\nHar personen sluttet, bruk «Arkiver» i stedet.`)) return;
    if (bruker.value === b.id) bruker.value = null;
    oppdater((d) => ({ ...d, brukere: d.brukere.filter((x) => x.id !== b.id) }));
  };

  const arkiver = () => {
    if (bruker.value === b.id) bruker.value = null;
    endre({ arkivert: !b.arkivert });
  };

  return (
    <li class={`admin-rad ${b.arkivert ? 'arkivert' : ''}`}>
      <input
        class="admin-init dot"
        aria-label={`Initialer for ${b.navn}`}
        maxLength={3}
        value={init}
        onInput={(e) => setInit((e.target as HTMLInputElement).value.toUpperCase())}
        onBlur={lagreInit}
      />
      <input
        class="admin-navn"
        aria-label={`Navn for ${b.initialer}`}
        value={navn}
        onInput={(e) => setNavn((e.target as HTMLInputElement).value)}
        onBlur={lagreNavn}
      />
      <div class="admin-knapper">
        <button class="btn liten" onClick={arkiver}>
          {b.arkivert ? 'Gjenopprett' : 'Arkiver'}
        </button>
        <button class="btn liten fare" onClick={slett} aria-label={`Slett ${b.initialer}`}>
          Slett
        </button>
      </div>
      {feil && <span class="velger-feil">{feil}</span>}
    </li>
  );
}
