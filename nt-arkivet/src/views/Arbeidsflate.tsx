import { useState } from 'preact/hooks';
import { db } from '../data/store';
import { fargeVar } from '../data/types';
import { aktivtSteg, fremdrift, skjulteSteg } from '../prosess/motor';
import type { Prosjekt, ProsjektType } from '../prosess/types';
import { KATEGORIER } from '../prosess/types';
import { finnGamleProsjekter, importerGamle, opprett, prosessFor } from '../prosess/prosjekter';
import { hentPost, sisteVersjon, stasjonerFor } from '../prosess/arkiv';
import { redigerer } from '../edit/state';
import { bruker } from '../ui/settings';
import { Modal } from '../ui/Modal';
import { modus } from '../ui/settings';
import { oppsummering } from './ProsjektVisning';
import { LesVisning } from './LesVisning';
import { InnlesingDialog } from '../import/InnlesingDialog';
import '../prosess/ui/prosess.css';

interface Props {
  prosessId: string;
  onApne: (prosjektId: string) => void;
  onTilbake: () => void;
}

/** Siste fullførte gjennomføring, og om en gjentakende rutine er forfalt. */
export function forfall(prosessId: string): { forfalt: boolean; tekst: string } | null {
  const post = hentPost(prosessId);
  const dager = post && sisteVersjon(post).prosess.intervallDager;
  if (!dager) return null;
  const sist = db.value.prosjekter
    .filter((p) => p.prosessId === prosessId && p.ferdig && p.type !== 'ovelse')
    .map((p) => p.ferdig!)
    .sort()
    .pop();
  if (!sist) return { forfalt: true, tekst: 'Aldri utført' };
  const igjen = Math.ceil((new Date(sist).getTime() + dager * 864e5 - Date.now()) / 864e5);
  return igjen < 0
    ? { forfalt: true, tekst: `Forfalt for ${-igjen} dag${igjen === -1 ? '' : 'er'} siden` }
    : { forfalt: false, tekst: igjen === 0 ? 'Forfaller i dag' : `Forfaller om ${igjen} dag${igjen === 1 ? '' : 'er'}` };
}

/** Arbeidsflaten for en prosess: prosjekter, tilbud og øving — eller gjennomføringer for enkle rutiner. */
export function Arbeidsflate({ prosessId, onApne, onTilbake }: Props) {
  const post = hentPost(prosessId);
  const [ny, setNy] = useState<ProsjektType | null>(null);
  const [visFerdige, setVisFerdige] = useState(false);
  const [innlesing, setInnlesing] = useState<File[] | null>(null);
  const gamle = prosessId === 'staircon' ? finnGamleProsjekter().length : 0;

  if (!post) return <main class="arbeidsflate">Fant ikke prosessen.</main>;
  const versjon = sisteVersjon(post);
  const prosess = versjon.prosess;
  if (prosess.kunLesing) return <LesVisning id={prosessId} onTilbake={onTilbake} />;
  const sted = stasjonerFor(prosessId)[0];
  const f = forfall(prosessId);

  const alle = db.value.prosjekter.filter((p) => p.prosessId === prosessId);
  const erProsjekt = !!prosess.prosjekter;
  const aktive = alle.filter((p) => (p.type === 'prosjekt' || p.type === 'gjennomforing') && !p.ferdig);
  const tilbud = alle.filter((p) => p.type === 'tilbud');
  const ovelser = alle.filter((p) => p.type === 'ovelse');
  const ferdige = alle.filter((p) => (p.type === 'prosjekt' || p.type === 'gjennomforing') && p.ferdig).sort((a, b) => (b.ferdig! > a.ferdig! ? 1 : -1));

  const ov = async () => {
    const p = await opprett({ prosessId, type: 'ovelse', nummer: 'Øving ' + new Date().toLocaleDateString('nb-NO') });
    modus.value = 'opplaring';
    onApne(p.id);
  };

  const start = async () => {
    const ini = db.value.brukere.find((b) => b.id === bruker.value)?.initialer ?? '';
    const p = await opprett({ prosessId, type: 'gjennomforing', nummer: `${new Date().toLocaleDateString('nb-NO')} ${ini}`.trim() });
    onApne(p.id);
  };

  const kanLeseInn = erProsjekt && !!prosess.innlesing;

  return (
    <main
      class="arbeidsflate"
      onDragOver={(e) => kanLeseInn && e.preventDefault()}
      onDrop={(e) => {
        if (!kanLeseInn || !e.dataTransfer?.files.length) return;
        e.preventDefault();
        setInnlesing([...e.dataTransfer.files]);
      }}
    >
      <header class="af-hode card" style={sted ? { '--linje': fargeVar(sted.kort.farge) } : undefined}>
        <div>
          <button class="velger-lenke" onClick={onTilbake}>
            ← NT-Arkivet
          </button>
          <span class="label">
            {post.nr} · {KATEGORIER[post.kategori]}
            {sted ? ` · ${sted.kort.navn}` : ''} · versjon {versjon.nr}
          </span>
          <h1 class="dot af-tittel">{prosess.navn}</h1>
          <p class="af-tekst">
            {prosess.beskrivelse ?? sted?.stasjon.beskrivelse ?? ''}
            {erProsjekt ? ' Hvert svar bygger resten av stien, så du blir guidet gjennom alt som gjelder akkurat dette prosjektet.' : ''}
          </p>
          {f && <span class={`chip ${f.forfalt ? 'fare' : 'aktiv'}`}>{f.tekst} · hver {prosess.intervallDager}. dag</span>}
        </div>
        <div class="af-knapper">
          {erProsjekt ? (
            <>
              {kanLeseInn && (
                <button class="btn btn-primary" onClick={() => setInnlesing([])} title="Dra inn ordrebekreftelse og/eller produksjonsordre">
                  ⇩ Les inn ordre
                </button>
              )}
              <button class={`btn ${kanLeseInn ? '' : 'btn-primary'}`} onClick={() => setNy('prosjekt')}>
                + Nytt prosjekt
              </button>
              <button class="btn" onClick={() => setNy('tilbud')}>
                + Nytt tilbud
              </button>
            </>
          ) : (
            <button class="btn btn-primary" onClick={start}>
              Start {prosess.intervallDager ? 'og kvitter' : 'gjennomføring'}
            </button>
          )}
          <a class="btn" href={`#/qr/${prosessId}`}>
            QR
          </a>
          {redigerer.value && (
            <a class="btn" href={`#/rediger/${prosessId}`}>
              ✎ Rediger prosess
            </a>
          )}
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

      <Seksjon tittel={erProsjekt ? 'Aktive prosjekter' : 'Pågår'} liste={aktive} tom={erProsjekt ? 'Ingen aktive prosjekter. Start et nytt.' : undefined} onApne={onApne} />
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

      {!erProsjekt && ferdige.length > 0 && !visFerdige && (
        <section class="af-seksjon">
          <h2 class="label af-seksjon-tittel">Siste gjennomføringer</h2>
          <ul class="kvitteringer">
            {ferdige.slice(0, 5).map((p) => (
              <li key={p.id}>
                <button class="velger-lenke" onClick={() => onApne(p.id)}>
                  ✓ {new Date(p.ferdig!).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} ·{' '}
                  {db.value.brukere.find((b) => b.id === p.opprettetAv)?.initialer ?? '—'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ny && <NyDialog type={ny} prosessId={prosessId} onLukk={() => setNy(null)} onOpprettet={onApne} />}
      {innlesing && (
        <InnlesingDialog
          prosessId={prosessId}
          filer={innlesing}
          onLukk={() => setInnlesing(null)}
          onFerdig={(id) => {
            setInnlesing(null);
            onApne(id);
          }}
        />
      )}
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
  const prosess = prosessFor(p);
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
