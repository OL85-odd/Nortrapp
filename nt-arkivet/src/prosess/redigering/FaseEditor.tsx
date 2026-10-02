import type { Fase, Steg } from '../types';
import { Tekst } from './Felter';
import * as op from './ops';
import { RegelBygger } from './RegelBygger';
import { arbeidskopi, endreProsess } from './state';

interface Props {
  prosessId: string;
  faseId: string;
  onVelgSteg: (id: string) => void;
  onVelgFase: (id: string | null) => void;
}

export function FaseEditor({ prosessId, faseId, onVelgSteg, onVelgFase }: Props) {
  const prosess = arbeidskopi(prosessId);
  const i = prosess?.faser.findIndex((f) => f.id === faseId) ?? -1;
  if (!prosess || i < 0) return null;
  const fase = prosess.faser[i];
  const lagre = (felt: Partial<Fase>) => endreProsess(prosessId, (p) => op.oppdaterFase(p, faseId, felt));

  const nyttSteg = () => {
    const s: Steg = { id: op.nyId('s'), tittel: 'Nytt steg' };
    endreProsess(prosessId, (p) => op.settInnSteg(p, faseId, fase.steg.length, s));
    onVelgSteg(s.id);
  };
  const nyFase = () => {
    const f: Fase = { id: op.nyId('f'), tittel: 'Ny fase', steg: [{ id: op.nyId('s'), tittel: 'Første steg' }] };
    endreProsess(prosessId, (p) => op.settInnFase(p, i + 1, f));
    onVelgFase(f.id);
  };
  const slett = () => {
    if (!confirm(`Slette fasen «${fase.tittel}» med ${fase.steg.length} steg?`)) return;
    endreProsess(prosessId, (p) => op.slettFase(p, faseId));
    onVelgFase(null);
  };

  return (
    <aside class="steg-editor card" aria-label="Rediger fase">
      <span class="label">
        Fase {i + 1} av {prosess.faser.length}
      </span>
      <h2 class="dot panel-tittel">Rediger fase</h2>
      <Tekst etikett="Navn" verdi={fase.tittel} onLagre={(v) => v.trim() && lagre({ tittel: v.trim() })} />
      <Tekst etikett="Undertittel" verdi={fase.undertittel ?? ''} onLagre={(v) => lagre({ undertittel: v.trim() || undefined })} />
      <details class="ed-blokk" open={!!fase.gjelder}>
        <summary>Vis hele fasen bare når … {fase.gjelder ? '· har regel' : ''}</summary>
        <RegelBygger prosess={prosess} forStegId={fase.steg[0]?.id} betingelse={fase.gjelder} onEndre={(b) => lagre({ gjelder: b })} />
      </details>
      <div class="panel-fot ed-fot">
        <div class="knapperad">
          <button class="btn liten" disabled={i === 0} onClick={() => endreProsess(prosessId, (p) => op.flyttFase(p, faseId, -1))}>
            ▲ Opp
          </button>
          <button class="btn liten" disabled={i === prosess.faser.length - 1} onClick={() => endreProsess(prosessId, (p) => op.flyttFase(p, faseId, 1))}>
            ▼ Ned
          </button>
          <button class="btn liten" onClick={nyttSteg}>
            + Steg i fasen
          </button>
          <button class="btn liten" onClick={nyFase}>
            + Ny fase etter
          </button>
          <button class="btn liten fare" onClick={slett}>
            Slett fase
          </button>
        </div>
      </div>
    </aside>
  );
}
