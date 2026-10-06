import { useEffect, useState } from 'preact/hooks';
import { TopBar } from './ui/TopBar';
import { BrukerVelger } from './ui/BrukerVelger';
import { bruker } from './ui/settings';
import { db } from './data/store';
import { Oversikt } from './views/Oversikt';
import { Arbeidsflate } from './views/Arbeidsflate';
import { ProsjektVisning } from './views/ProsjektVisning';
import { ProsessEditor } from './views/ProsessEditor';
import { Prosessarkiv } from './views/Prosessarkiv';
import { QrSide } from './views/QrSide';
import { LesVisning } from './views/LesVisning';
import { Lagring } from './views/Lagring';
import { hentProsjekt } from './prosess/prosjekter';
import { hentPostForNr, sisteVersjon } from './prosess/arkiv';
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
  | { type: 'p'; id: string } // arbeidsflate for en prosess (#/p/staircon)
  | { type: 'prosjekt'; id: string } // et prosjekt som kjøres
  | { type: 'rediger'; id: string } // prosessredigering (strukturkart)
  | { type: 'les'; id: string } // instruks som bare leses
  | { type: 'qr'; id: string } // QR-lapp for utskrift
  | { type: 'prosesser' } // prosessarkivet
  | { type: 'lagring' }; // lagring, backup og papirkurv

function lesRute(): Rute {
  if (/^#\/prosesser/.test(location.hash)) return { type: 'prosesser' };
  if (/^#\/lagring/.test(location.hash)) return { type: 'lagring' };
  // QR-kodene peker på #/q/NT-MAS-001 — slå opp ID-en og send videre.
  const q = location.hash.match(/^#\/q\/([\w-]+)/);
  if (q) {
    const post = hentPostForNr(q[1]);
    if (post) {
      const ny = sisteVersjon(post).prosess.kunLesing ? `#/les/${post.id}` : `#/p/${post.id}`;
      history.replaceState(null, '', ny);
      return lesRute();
    }
  }
  const m = location.hash.match(/^#\/(s|k|p|prosjekt|rediger|les|qr)\/([\w-]+)/);
  return m ? ({ type: m[1], id: m[2] } as Rute) : { type: 'hjem' };
}

function skrivRute(r: Rute) {
  location.hash = r.type === 'hjem' ? '#/' : r.type === 'prosesser' || r.type === 'lagring' ? `#/${r.type}` : `#/${r.type}/${r.id}`;
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
      if (ny.type !== 'hjem' && ny.type !== 's' && ny.type !== 'k') window.scrollTo(0, 0);
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
        <Arbeidsflate prosessId={rute.id} onApne={(id) => skrivRute({ type: 'prosjekt', id })} onTilbake={() => history.back()} />
      ) : rute.type === 'prosjekt' ? (
        <ProsjektVisning
          id={rute.id}
          onTilbake={() => skrivRute({ type: 'p', id: hentProsjekt(rute.id)?.prosessId ?? 'staircon' })}
        />
      ) : rute.type === 'rediger' ? (
        <ProsessEditor id={rute.id} onTilbake={() => history.back()} />
      ) : rute.type === 'les' ? (
        <LesVisning id={rute.id} onTilbake={() => history.back()} />
      ) : rute.type === 'qr' ? (
        <QrSide id={rute.id} onTilbake={() => history.back()} />
      ) : rute.type === 'lagring' ? (
        <Lagring onTilbake={() => skrivRute({ type: 'hjem' })} />
      ) : rute.type === 'prosesser' ? (
        <Prosessarkiv onTilbake={() => skrivRute({ type: 'hjem' })} />
      ) : (
        <Oversikt rute={rute} onNaviger={skrivRute} />
      )}
      {visVelger && <BrukerVelger onFerdig={() => setVisVelger(false)} />}
      {visPin && <PinDialog onFerdig={() => setVisPin(false)} />}
    </>
  );
}
