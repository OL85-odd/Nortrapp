import { useFeltVerdi } from '../ui/hooks';
import { nyId } from '../data/store';
import type { Stasjon } from '../data/types';
import { fargeVar } from '../data/types';
import * as op from './ops';
import { endre, speilIUtkast, synligeKort } from './state';
import { useState } from 'preact/hooks';
import { db } from '../data/store';
import { hentPost, kobleIKort, kobleStasjon, sisteVersjon } from '../prosess/arkiv';
import { NyProsessDialog } from '../views/Prosessarkiv';

interface Props {
  stasjonId: string;
  onVelg: (id: string | null) => void;
  onLukk: () => void;
}

const nyStasjon = (): Stasjon => ({ id: nyId('s'), navn: 'Ny stasjon', status: 'under_arbeid' });

/** Sidepanelet i redigeringsmodus når en stasjon (eller flis) er valgt. */
export function StasjonEditor({ stasjonId, onVelg, onLukk }: Props) {
  const p = op.finn(synligeKort.value, stasjonId);
  const [navn, setNavn] = useFeltVerdi(p?.stasjon.navn ?? '');
  const [beskrivelse, setBeskrivelse] = useFeltVerdi(p?.stasjon.beskrivelse ?? '');


  if (!p) return null;
  const { kort, stasjon, forelder, liste, indeks } = p;
  const erSamling = kort.type === 'samling';
  const erGren = !!forelder;
  const ord = erSamling ? 'flis' : erGren ? 'gren' : 'stasjon';

  const lagre = (felt: Partial<Stasjon>) => endre((k) => op.oppdaterStasjon(k, stasjon.id, felt));

  const settInn = (hvor: 'for' | 'etter') => {
    const ny = nyStasjon();
    endre((k) => op.settInnVed(k, stasjon.id, hvor, ny));
    onVelg(ny.id);
  };

  const nyGren = () => {
    const ny = { ...nyStasjon(), navn: 'Ny gren' };
    endre((k) => op.leggTilGren(k, stasjon.id, ny));
    onVelg(ny.id);
  };

  const slett = () => {
    const ekstra = stasjon.grener?.length ? ` og ${stasjon.grener.length} grener` : '';
    if (!confirm(`Slette «${stasjon.navn}»${ekstra}?\n\nDu kan angre, eller la være å publisere.`)) return;
    endre((k) => op.slett(k, stasjon.id));
    onVelg(null);
  };

  const [forrigeTekst, nesteTekst] = erGren ? ['▲ Opp', '▼ Ned'] : ['◀ Tidligere', 'Senere ▶'];

  return (
    <aside class="panel card redigering" aria-labelledby="panel-tittel">
      <div class="panel-topp">
        <span class="label" style={{ color: fargeVar(kort.farge) }}>
          {kort.kode} · {kort.navn}
          {forelder ? ` · gren av ${forelder.navn}` : ''}
        </span>
        <button class="panel-lukk" onClick={onLukk} aria-label="Lukk">
          ×
        </button>
      </div>
      <h2 id="panel-tittel" class="dot panel-tittel">
        Rediger {ord}
      </h2>

      <label class="felt">
        <span>Navn</span>
        <input
          value={navn}
          onInput={(e) => setNavn((e.target as HTMLInputElement).value)}
          onBlur={() => navn.trim() && navn.trim() !== stasjon.navn && lagre({ navn: navn.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>

      <label class="felt">
        <span>Beskrivelse</span>
        <textarea
          value={beskrivelse}
          onInput={(e) => setBeskrivelse((e.target as HTMLTextAreaElement).value)}
          onBlur={() =>
            beskrivelse.trim() !== (stasjon.beskrivelse ?? '') && lagre({ beskrivelse: beskrivelse.trim() || undefined })
          }
        />
      </label>

      <div class="felt">
        <span>Status</span>
        <div class="segmented" role="group" aria-label="Status">
          <button aria-pressed={stasjon.status === 'aktiv'} onClick={() => lagre({ status: 'aktiv' })}>
            Aktiv
          </button>
          <button aria-pressed={stasjon.status === 'under_arbeid'} onClick={() => lagre({ status: 'under_arbeid' })}>
            Under arbeid
          </button>
        </div>
      </div>

      <ProsessKobling stasjon={stasjon} />

      <div class="felt">
        <span>Plassering</span>
        <div class="knapperad">
          <button class="btn liten" disabled={indeks === 0} onClick={() => endre((k) => op.flytt(k, stasjon.id, -1))}>
            {forrigeTekst}
          </button>
          <button
            class="btn liten"
            disabled={indeks === liste.length - 1}
            onClick={() => endre((k) => op.flytt(k, stasjon.id, 1))}
          >
            {nesteTekst}
          </button>
        </div>
        <div class="knapperad">
          <button class="btn liten" onClick={() => settInn('for')}>
            + Ny før
          </button>
          <button class="btn liten" onClick={() => settInn('etter')}>
            + Ny etter
          </button>
          {!erSamling && !erGren && (
            <button class="btn liten" onClick={nyGren} title="Et alternativt spor, f.eks. Staircon / Fusion / FreeCAD">
              + Gren
            </button>
          )}
        </div>
      </div>

      {!erGren && (
        <label class="felt">
          <span>Flytt til et annet kort</span>
          <select
            value=""
            onChange={(e) => {
              const til = (e.target as HTMLSelectElement).value;
              if (til) endre((k) => op.flyttTilKort(k, stasjon.id, til));
            }}
          >
            <option value="">Velg kort …</option>
            {synligeKort.value
              .filter((k) => k.id !== kort.id)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.navn} ({k.type})
                </option>
              ))}
          </select>
        </label>
      )}

      <div class="panel-fot">
        <button class="btn liten fare" onClick={slett}>
          Slett {ord}
        </button>
      </div>
    </aside>
  );
}

/** Koble stasjonen til en prosess: lag ny fra mal, velg en eksisterende, eller fjern koblingen. */
function ProsessKobling({ stasjon }: { stasjon: Stasjon }) {
  const [ny, setNy] = useState(false);
  const post = stasjon.prosessId ? hentPost(stasjon.prosessId) : undefined;
  const koble = async (id: string | undefined) => {
    await kobleStasjon(stasjon.id, id);
    speilIUtkast((k) => kobleIKort(k, stasjon.id, id));
  };
  return (
    <div class="felt">
      <span>Prosess / prosedyre</span>
      {post ? (
        <div class="kobling">
          <strong>
            {post.nr} · {sisteVersjon(post).prosess.navn}
          </strong>
          <div class="knapperad">
            <a class="btn liten btn-primary" href={`#/rediger/${post.id}`}>
              ✎ Rediger prosessen
            </a>
            <a class="btn liten" href={`#/qr/${post.id}`}>
              QR
            </a>
            <button class="btn liten" onClick={() => confirm('Fjerne koblingen? Prosessen blir liggende i arkivet.') && koble(undefined)}>
              Fjern kobling
            </button>
          </div>
        </div>
      ) : (
        <div class="knapperad">
          <button class="btn liten btn-primary" onClick={() => setNy(true)}>
            + Lag prosess
          </button>
          <select
            value=""
            aria-label="Koble til eksisterende prosess"
            onChange={(e) => {
              const id = (e.target as HTMLSelectElement).value;
              if (id) koble(id);
            }}
          >
            <option value="">Koble til eksisterende …</option>
            {db.value.prosesser.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nr} · {sisteVersjon(p).prosess.navn}
              </option>
            ))}
          </select>
        </div>
      )}
      {ny && <NyProsessDialog stasjonId={stasjon.id} standardNavn={stasjon.navn} onLukk={() => setNy(false)} />}
    </div>
  );
}
