import { useFeltVerdi } from '../ui/hooks';
import { nyId } from '../data/store';
import type { Kort, KortType } from '../data/types';
import { FARGENAVN, FARGER, fargeVar } from '../data/types';
import * as op from './ops';
import { endre, synligeKort } from './state';

interface Props {
  kortId: string;
  onVelgStasjon: (id: string) => void;
  onLukk: () => void;
}

/** Sidepanelet i redigeringsmodus når et kort (linje eller samling) redigeres. */
export function KortEditor({ kortId, onVelgStasjon, onLukk }: Props) {
  const alle = synligeKort.value;
  const indeks = alle.findIndex((k) => k.id === kortId);
  const kort = alle[indeks];
  const [navn, setNavn] = useFeltVerdi(kort?.navn ?? '');
  const [kode, setKode] = useFeltVerdi(kort?.kode ?? '');
  const [beskrivelse, setBeskrivelse] = useFeltVerdi(kort?.beskrivelse ?? '');


  if (!kort) return null;

  const lagre = (felt: Partial<Kort>) => endre((k) => op.oppdaterKort(k, kort.id, felt));

  const byttType = (type: KortType) => {
    if (type === kort.type) return;
    const grener = kort.stasjoner.reduce((n, s) => n + (s.grener?.length ?? 0), 0);
    if (type === 'samling' && grener && !confirm(`Samlinger har ikke grener. ${grener} grener blir egne fliser. Fortsette?`)) return;
    lagre({ type });
  };

  const nyStasjon = () => {
    const id = nyId('s');
    endre((k) => op.settInn(k, kort.id, kort.stasjoner.length, { id, navn: kort.type === 'linje' ? 'Ny stasjon' : 'Ny oppgave', status: 'under_arbeid' }));
    onVelgStasjon(id);
  };

  const slett = () => {
    const n = kort.stasjoner.length;
    const tekst = n ? `\n\n${n} stasjoner i kortet blir også slettet.` : '';
    if (!confirm(`Slette kortet «${kort.navn}»?${tekst}\n\nDu kan angre, eller la være å publisere.`)) return;
    endre((k) => op.slettKort(k, kort.id));
    onLukk();
  };

  return (
    <aside class="panel card redigering" aria-labelledby="panel-tittel">
      <div class="panel-topp">
        <span class="label" style={{ color: fargeVar(kort.farge) }}>
          Kort {indeks + 1} av {alle.length}
        </span>
        <button class="panel-lukk" onClick={onLukk} aria-label="Lukk">
          ×
        </button>
      </div>
      <h2 id="panel-tittel" class="dot panel-tittel">
        Rediger kort
      </h2>

      <div class="felt">
        <span>Type</span>
        <div class="segmented" role="group" aria-label="Type kort">
          <button aria-pressed={kort.type === 'linje'} onClick={() => byttType('linje')}>
            Linje
          </button>
          <button aria-pressed={kort.type === 'samling'} onClick={() => byttType('samling')}>
            Samling
          </button>
        </div>
        <p class="panel-hint">
          {kort.type === 'linje'
            ? 'En prosess der rekkefølgen betyr noe. Tegnes som T-banekart.'
            : 'Rutiner og oppgaver uten fast rekkefølge. Vises som fliser.'}
        </p>
      </div>

      <div class="kort-navnrad">
        <label class="felt kode-felt">
          <span>Kode</span>
          <input
            class="dot"
            maxLength={2}
            value={kode}
            onInput={(e) => setKode((e.target as HTMLInputElement).value.toUpperCase())}
            onBlur={() => kode.trim() && kode.trim() !== kort.kode && lagre({ kode: kode.trim() })}
          />
        </label>
        <label class="felt">
          <span>Navn</span>
          <input
            value={navn}
            onInput={(e) => setNavn((e.target as HTMLInputElement).value)}
            onBlur={() => navn.trim() && navn.trim() !== kort.navn && lagre({ navn: navn.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </label>
      </div>

      <label class="felt">
        <span>Beskrivelse</span>
        <textarea
          value={beskrivelse}
          onInput={(e) => setBeskrivelse((e.target as HTMLTextAreaElement).value)}
          onBlur={() => beskrivelse.trim() !== (kort.beskrivelse ?? '') && lagre({ beskrivelse: beskrivelse.trim() || undefined })}
        />
      </label>

      <div class="felt">
        <span>Farge</span>
        <div class="fargevelger" role="radiogroup" aria-label="Farge">
          {FARGER.map((f) => (
            <button
              key={f}
              role="radio"
              aria-checked={kort.farge === f}
              aria-label={FARGENAVN[f]}
              title={FARGENAVN[f]}
              style={{ background: fargeVar(f) }}
              onClick={() => lagre({ farge: f })}
            />
          ))}
        </div>
      </div>

      <div class="felt">
        <span>Plassering på oversikten</span>
        <div class="knapperad">
          <button class="btn liten" disabled={indeks === 0} onClick={() => endre((k) => op.flyttKort(k, kort.id, -1))}>
            ▲ Opp
          </button>
          <button
            class="btn liten"
            disabled={indeks === alle.length - 1}
            onClick={() => endre((k) => op.flyttKort(k, kort.id, 1))}
          >
            ▼ Ned
          </button>
          <button class="btn liten" onClick={nyStasjon}>
            + {kort.type === 'linje' ? 'Stasjon' : 'Oppgave'}
          </button>
        </div>
      </div>

      <div class="panel-fot">
        <button class="btn liten fare" onClick={slett}>
          Slett kort
        </button>
      </div>
    </aside>
  );
}
