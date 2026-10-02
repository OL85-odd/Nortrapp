import { useEffect, useState } from 'preact/hooks';
import { angre, endringer, forkast, kanAngre, las } from './state';
import { PubliserDialog } from './PubliserDialog';
import { Historikk } from './Historikk';
import './edit.css';

/** Linjen under toppfeltet mens redigeringsmodus er på. */
export function EditBar() {
  const [visPubliser, setVisPubliser] = useState(false);
  const [visHistorikk, setVisHistorikk] = useState(false);
  const antall = endringer.value.length;

  // Ctrl + Z angrer i utkastet (men ikke mens man skriver i et felt).
  useEffect(() => {
    const tast = (e: KeyboardEvent) => {
      const iFelt = (e.target as HTMLElement).closest('input, textarea, select');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !iFelt) {
        e.preventDefault();
        angre();
      }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, []);

  return (
    <div class="editbar" role="region" aria-label="Redigeringsmodus">
      <span class="editbar-status">
        <span class="editbar-prikk" aria-hidden="true" />
        <span class="label">Redigerer</span>
        <span class="editbar-antall">{antall ? `${antall} endring${antall === 1 ? '' : 'er'} i utkast` : 'Ingen endringer'}</span>
      </span>
      <div class="editbar-knapper">
        <button class="btn liten" onClick={angre} disabled={!kanAngre.value} title="Angre (Ctrl + Z)">
          ↶ Angre
        </button>
        <button class="btn liten" onClick={() => setVisHistorikk(true)}>
          Historikk
        </button>
        <button
          class="btn liten"
          disabled={!antall}
          onClick={() => confirm('Forkaste alle endringer i utkastet?') && forkast()}
        >
          Forkast
        </button>
        <button class="btn liten btn-primary" disabled={!antall} onClick={() => setVisPubliser(true)}>
          Publiser…
        </button>
        <button class="btn liten" onClick={las} title="Avslutt redigering. Utkastet huskes.">
          🔒 Lås
        </button>
      </div>
      {visPubliser && <PubliserDialog onLukk={() => setVisPubliser(false)} />}
      {visHistorikk && <Historikk onLukk={() => setVisHistorikk(false)} />}
    </div>
  );
}
