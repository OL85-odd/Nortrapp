import { useEffect, useState } from 'preact/hooks';
import { TopBar } from './ui/TopBar';
import { BrukerVelger } from './ui/BrukerVelger';
import { bruker } from './ui/settings';
import { db } from './data/store';
import { Oversikt } from './views/Oversikt';
import { Arbeidsflate } from './views/Arbeidsflate';
import { ProsjektVisning } from './views/ProsjektVisning';
import { hentProsjekt } from './prosess/prosjekter';
import { EditBar } from './edit/EditBar';
import { PinDialog } from './edit/PinDialog';
import { las, redigerer } from './edit/state';

/* Adressen i nettleseren styrer hva som vises, så en QR-kode eller lenke
   kan peke rett på en stasjon:  #/s/staircon
   I redigeringsmodus redigeres et kort på:  #/k/hoved */

export type Rute =
  | { type: 'hjem' }
  | { type: 's'; id: string } // stasjon valgt i kartet
  | { type: 'k'; id: string } // kort som redigeres
  | { type: 'p'; id: string } // arbeidsflate for en stasjon med prosess (#/p/staircon)
  | { type: 'prosjekt'; id: string }; // et prosjekt som kjøres

function lesRute(): Rute {
  const m = location.hash.match(/^#\/(s|k|p|prosjekt)\/([\w-]+)/);
  return m ? ({ type: m[1], id: m[2] } as Rute) : { type: 'hjem' };
}

function skrivRute(r: Rute) {
  location.hash = r.type === 'hjem' ? '#/' : `#/${r.type}/${r.id}`;
}

export function App() {
  const [rute, setRute] = useState<Rute>(lesRute());
  const [visVelger, setVisVelger] = useState(() => {
    // Eldre versjoner lagret initialer i stedet for id — oversett, og be om valg
    // på nytt hvis brukeren er slettet eller arkivert.
    const b = db.value.brukere.find((x) => x.id === bruker.value || x.initialer === bruker.value);
    bruker.value = b && !b.arkivert ? b.id : null;
    return !bruker.value;
  });
  const [visPin, setVisPin] = useState(false);

  useEffect(() => {
    const vedEndring = () => {
      const ny = lesRute();
      // Til toppen ved sidebytte, men ikke når man bare velger en stasjon i kartet.
      if (ny.type === 'p' || ny.type === 'prosjekt') window.scrollTo(0, 0);
      setRute(ny);
    };
    window.addEventListener('hashchange', vedEndring);
    return () => window.removeEventListener('hashchange', vedEndring);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('redigerer', redigerer.value);
  }, [redigerer.value]);

  const veksleRedigering = () => (redigerer.value ? las() : setVisPin(true));

  return (
    <>
      <TopBar onByttBruker={() => setVisVelger(true)} onRediger={veksleRedigering} />
      {redigerer.value && <EditBar />}
      {rute.type === 'p' ? (
        <Arbeidsflate stasjonId={rute.id} onApne={(id) => skrivRute({ type: 'prosjekt', id })} onTilbake={() => skrivRute({ type: 's', id: rute.id })} />
      ) : rute.type === 'prosjekt' ? (
        <ProsjektVisning
          id={rute.id}
          onTilbake={() => skrivRute({ type: 'p', id: hentProsjekt(rute.id)?.prosessId ?? 'staircon' })}
        />
      ) : (
        <Oversikt rute={rute} onNaviger={skrivRute} />
      )}
      {visVelger && <BrukerVelger onFerdig={() => setVisVelger(false)} />}
      {visPin && <PinDialog onFerdig={() => setVisPin(false)} />}
    </>
  );
}
