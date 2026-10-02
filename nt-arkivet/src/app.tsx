import { useEffect, useState } from 'preact/hooks';
import { TopBar } from './ui/TopBar';
import { BrukerVelger } from './ui/BrukerVelger';
import { bruker } from './ui/settings';
import { Oversikt } from './views/Oversikt';

/* Adressen i nettleseren styrer hva som vises, så en QR-kode eller lenke
   kan peke rett på en stasjon:  #/s/staircon */

function lesRute(): string | null {
  const m = location.hash.match(/^#\/s\/([\w-]+)/);
  return m ? m[1] : null;
}

export function App() {
  const [valgt, setValgt] = useState<string | null>(lesRute());
  const [visVelger, setVisVelger] = useState(!bruker.value);

  useEffect(() => {
    const vedEndring = () => setValgt(lesRute());
    window.addEventListener('hashchange', vedEndring);
    return () => window.removeEventListener('hashchange', vedEndring);
  }, []);

  const velg = (id: string | null) => {
    location.hash = id ? `#/s/${id}` : '#/';
  };

  return (
    <>
      <TopBar onByttBruker={() => setVisVelger(true)} />
      <Oversikt valgt={valgt} onVelg={velg} />
      {visVelger && <BrukerVelger onFerdig={() => setVisVelger(false)} />}
    </>
  );
}
