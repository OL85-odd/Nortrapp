import { useState } from 'preact/hooks';
import { db } from '../data/store';
import { fargeVar } from '../data/types';
import { aktivtSteg, fremdrift, skjulteSteg } from '../prosess/motor';
import type { Prosjekt, ProsjektType } from '../prosess/types';
import { finnGamleProsjekter, importerGamle, opprett, PROSESSER } from '../prosess/prosjekter';
import { Modal } from '../ui/Modal';
import { modus } from '../ui/settings';
import { finnStasjon } from './Oversikt';
import { oppsummering } from './ProsjektVisning';
import '../prosess/ui/prosess.css';

interface Props {
  stasjonId: string;
  onApne: (prosjektId: string) => void;
  onTilbake: () => void;
}

/** Arbeidsflaten for en stasjon med prosess (f.eks. Staircon): prosjekter, tilbud og øving. */
export function Arbeidsflate({ stasjonId, onApne, onTilbake }: Props) {
  const prosess = PROSESSER[stasjonId];
  const sted = finnStasjon(db.value.kort, stasjonId);
  const [ny, setNy] = useState<ProsjektType | null>(null);
  const [visFerdige, setVisFerdige] = useState(false);
  const gamle = finnGamleProsjekter().length;

  if (!prosess) return null;
  const alle = db.value.prosjekter.filter((p) => p.prosessId === prosess.id);
  const aktive = alle.filter((p) => p.type === 'prosjekt' && !p.ferdig);
  const tilbud = alle.filter((p) => p.type === 'tilbud');
  const ovelser = alle.filter((p) => p.type === 'ovelse');
  const ferdige = alle.filter((p) => p.type === 'prosjekt' && p.ferdig);

  const ov = async () => {
    const p = await opprett({ prosessId: prosess.id, type: 'ovelse', nummer: 'Øving ' + new Date().toLocaleDateString('nb-NO') });
    modus.value = 'opplaring';
    onApne(p.id);
  };

  return (
    <main class="arbeidsflate">
      <header class="af-hode card" style={sted ? { '--linje': fargeVar(sted.kort.farge) } : undefined}>
        <div>
          <button class="velger-lenke" onClick={onTilbake}>
            ← NT-Arkivet
          </button>
          <span class="label">
            {sted ? `${sted.kort.kode} · ${sted.kort.navn}` : ''} · {prosess.navn} v{prosess.versjon}
          </span>
          <h1 class="dot af-tittel">{prosess.navn}</h1>
          <p class="af-tekst">{sted?.stasjon.beskrivelse ?? ''} Hvert svar bygger resten av stien, så du blir guidet gjennom alt som gjelder akkurat denne trappen.</p>
        </div>
        <div class="af-knapper">
          <button class="btn btn-primary" onClick={() => setNy('prosjekt')}>
            + Nytt prosjekt
          </button>
          <button class="btn" onClick={() => setNy('tilbud')}>
            + Nytt tilbud
          </button>
          <button class="btn" onClick={ov} title="Gå gjennom hele prosessen med full forklaring, uten å lagre et ekte prosjekt">
            Øv / opplæring
          </button>
          {gamle > 0 && (
            <button
              class="btn"
              onClick={async () => {
                const n = await importerGamle();
                alert(`${n} prosjekter og tilbud er hentet fra Staircon ABC.`);
              }}
            >
              Hent {gamle} fra Staircon ABC
            </button>
          )}
        </div>
      </header>

      <Seksjon tittel="Aktive prosjekter" liste={aktive} tom="Ingen aktive prosjekter. Start et nytt." onApne={onApne} />
      {tilbud.length > 0 && <Seksjon tittel="Tilbud" liste={tilbud} onApne={onApne} />}
      {ovelser.length > 0 && <Seksjon tittel="Øving" liste={ovelser} onApne={onApne} />}
      {ferdige.length > 0 && (
        <section class="af-seksjon">
          <button class="velger-lenke" onClick={() => setVisFerdige(!visFerdige)} aria-expanded={visFerdige}>
            {visFerdige ? 'Skjul' : 'Vis'} ferdige ({ferdige.length})
          </button>
          {visFerdige && <Seksjon tittel="Ferdige" liste={ferdige} onApne={onApne} />}
        </section>
      )}

      {ny && <NyDialog type={ny} prosessId={prosess.id} onLukk={() => setNy(null)} onOpprettet={onApne} />}
    </main>
  );
}

function Seksjon({ tittel, liste, tom, onApne }: { tittel: string; liste: Prosjekt[]; tom?: string; onApne: (id: string) => void }) {
  return (
    <section class="af-seksjon">
      <h2 class="label af-seksjon-tittel">
        {tittel} · {liste.length}
      </h2>
      {liste.length === 0 && tom && <p class="af-tom">{tom}</p>}
      <ul class="af-liste">
        {liste.map((p) => (
          <ProsjektKort key={p.id} p={p} onApne={onApne} />
        ))}
      </ul>
    </section>
  );
}

function ProsjektKort({ p, onApne }: { p: Prosjekt; onApne: (id: string) => void }) {
  const prosess = PROSESSER[p.prosessId];
  const fr = fremdrift(prosess, p);
  const skjulte = skjulteSteg(prosess, p.svar);
  const neste = aktivtSteg(prosess, p);
  const sist = p.logg[p.logg.length - 1];

  return (
    <li>
      <button class="pk card" onClick={() => onApne(p.id)}>
        <span class="pk-topp">
          <span class="dot pk-nummer">{p.nummer}</span>
          <span class="dot pk-prosent">{fr.prosent}%</span>
        </span>
        <span class="pk-kunde">{[p.kunde, p.kalkylenr && `Kalkyle ${p.kalkylenr}`].filter(Boolean).join(' · ') || ' '}</span>
        <span class="pk-oppsett">{oppsummering(prosess, p).join(' · ') || 'Oppsett ikke startet'}</span>
        <span class="ph-bar" style={{ '--andel': fr.prosent / 100 }} />
        <span class="pk-neste label">
          {p.ferdig ? 'Ferdig' : neste ? `Neste: ${neste.tittel}` : ''}
          {skjulte ? ` · +${skjulte} bak valg` : ''}
        </span>
        {sist && <span class="pk-sist">Sist: {new Date(sist.tid).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
      </button>
    </li>
  );
}

function NyDialog({ type, prosessId, onLukk, onOpprettet }: { type: ProsjektType; prosessId: string; onLukk: () => void; onOpprettet: (id: string) => void }) {
  const [nummer, setNummer] = useState('');
  const [kalkylenr, setKalkylenr] = useState('');
  const [kunde, setKunde] = useState('');
  const erTilbud = type === 'tilbud';

  const send = async (e: Event) => {
    e.preventDefault();
    const nr = nummer.trim() || (kalkylenr.trim() ? `Kalkyle ${kalkylenr.trim()}` : '');
    if (!nr) return;
    const p = await opprett({ prosessId, type, nummer: erTilbud ? nr : nr.toUpperCase(), kalkylenr: kalkylenr.trim() || undefined, kunde: kunde.trim() || undefined });
    onLukk();
    onOpprettet(p.id);
  };

  return (
    <Modal tittel={erTilbud ? 'Nytt tilbud' : 'Nytt prosjekt'} etikett="Staircon" onLukk={onLukk}>
      <p>{erTilbud ? 'Tilbudet holder trappevalgene til salget er i havn. Blir det solgt, gjør du det om til et prosjekt.' : 'Prosjektnummeret kan også fylles inn senere, i Kalken-fasen.'}</p>
      <form class="ny-skjema" onSubmit={send}>
        <label class="felt">
          <span>{erTilbud ? 'Tilbudsnavn' : 'Prosjektnummer (HXXX-XX)'}</span>
          <input value={nummer} placeholder={erTilbud ? 'F.eks. Hansen, Ski' : 'H483-26'} onInput={(e) => setNummer((e.target as HTMLInputElement).value)} />
        </label>
        <label class="felt">
          <span>Kalkylenummer</span>
          <input value={kalkylenr} placeholder="056869" inputMode="numeric" onInput={(e) => setKalkylenr((e.target as HTMLInputElement).value)} />
        </label>
        <label class="felt">
          <span>Kunde / referanse</span>
          <input value={kunde} placeholder="Larsen Kolstad Bygg AS" onInput={(e) => setKunde((e.target as HTMLInputElement).value)} />
        </label>
        <div class="modal-knapper">
          <button type="button" class="btn" onClick={onLukk}>
            Avbryt
          </button>
          <button class="btn btn-primary" disabled={!nummer.trim() && !kalkylenr.trim()}>
            Opprett
          </button>
        </div>
      </form>
    </Modal>
  );
}
