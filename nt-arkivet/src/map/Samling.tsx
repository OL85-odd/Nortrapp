import type { Kort } from '../data/types';
import { hentPost } from '../prosess/arkiv';
import { forfall } from '../views/Arbeidsflate';
import './samling.css';

interface Props {
  kort: Kort;
  valgt?: string | null;
  onVelg: (id: string) => void;
  rediger?: boolean;
  onNy?: () => void;
}

/** En samling vises som fliser — rutiner og oppgaver uten fast rekkefølge. */
export function Samling({ kort, valgt, onVelg, rediger, onNy }: Props) {
  return (
    <ul class="samling" role="list">
      {kort.stasjoner.map((s) => (
        <li key={s.id}>
          <button
            class={`flis ${s.status} ${valgt === s.id ? 'valgt' : ''}`}
            aria-pressed={valgt === s.id}
            onClick={() => onVelg(s.id)}
          >
            <span class="flis-prikk" aria-hidden="true" />
            <span class="flis-navn">{s.navn}</span>
            {s.beskrivelse && <span class="flis-tekst">{s.beskrivelse}</span>}
            <FlisStatus prosessId={s.prosessId} aktiv={s.status === 'aktiv'} />
          </button>
        </li>
      ))}
      {rediger && (
        <li>
          <button class="flis ny" onClick={onNy}>
            <span class="flis-pluss" aria-hidden="true">
              +
            </span>
            <span class="label">Ny oppgave</span>
          </button>
        </li>
      )}
      {!rediger && kort.stasjoner.length === 0 && <li class="samling-tom label">Tom samling</li>}
    </ul>
  );
}

/** Status nederst på flisen: ID og forfall hvis det finnes en prosess, ellers aktiv/under arbeid. */
function FlisStatus({ prosessId, aktiv }: { prosessId?: string; aktiv: boolean }) {
  const post = prosessId ? hentPost(prosessId) : undefined;
  const f = post ? forfall(post.id) : null;
  return (
    <span class="flis-status">
      {post && <span class="label">{post.nr}</span>}
      {f ? <span class={`chip ${f.forfalt ? 'fare' : 'aktiv'}`}>{f.tekst}</span> : !post && <span class="label">{aktiv ? 'Aktiv' : 'Under arbeid'}</span>}
    </span>
  );
}
