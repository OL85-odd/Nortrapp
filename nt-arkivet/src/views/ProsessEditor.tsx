import { useEffect, useState } from 'preact/hooks';
import { db } from '../data/store';
import { redigerer } from '../edit/state';
import { hentPost, tilbakestillProsess } from '../prosess/arkiv';
import { FaseEditor } from '../prosess/redigering/FaseEditor';
import * as op from '../prosess/redigering/ops';
import { ProsessInnstillinger } from '../prosess/redigering/ProsessInnstillinger';
import { InnlesingEditor } from '../prosess/redigering/InnlesingEditor';
import { regelTekst } from '../prosess/redigering/RegelBygger';
import { angreProsess, arbeidskopi, endreProsess, endringerI, forkastProsess, kanAngre, prosessUtkast, publiserUtkast } from '../prosess/redigering/state';
import { StegEditor } from '../prosess/redigering/StegEditor';
import { KATEGORIER, type Steg } from '../prosess/types';
import { Modal } from '../ui/Modal';
import '../prosess/redigering/redigering.css';

type Valgt = { type: 'steg'; id: string } | { type: 'fase'; id: string } | { type: 'innstillinger' } | { type: 'innlesing' };

/** Små ikoner som viser hvilke byggeklosser et steg har, så man ser innholdet uten å åpne det. */
function klossIkoner(s: Steg): string[] {
  const ut: string[] = [];
  if (s.valg) ut.push({ janei: 'J/N', ett: '◉', flere: '☑' }[s.valg.type]);
  if (s.felter) ut.push(s.felter.some((f) => f.type === 'tall') ? '123' : 'Aa');
  if (s.husk) ut.push('!');
  if (s.bilder?.length) ut.push(`🖼${s.bilder.length}`);
  if (s.video) ut.push('🎬');
  if (s.hurtigtaster?.length) ut.push('⌨');
  if (s.verdier) ut.push('=');
  if (s.lenke) ut.push('🔗');
  if (s.dokument) ut.push('📄');
  if (s.merknad) ut.push('●');
  return ut;
}

export function ProsessEditor({ id, onTilbake }: { id: string; onTilbake: () => void }) {
  const post = hentPost(id);
  const prosess = arbeidskopi(id);
  const [valgt, setValgt] = useState<Valgt>({ type: 'innstillinger' });
  const [visPubliser, setVisPubliser] = useState(false);
  const [visHistorikk, setVisHistorikk] = useState(false);
  void prosessUtkast.value; // tegn på nytt når utkastet endres

  useEffect(() => {
    const tast = (e: KeyboardEvent) => {
      const iFelt = (e.target as HTMLElement).closest('input, textarea, select');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !iFelt) {
        e.preventDefault();
        angreProsess(id);
      }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [id]);

  if (!post || !prosess) return <main class="prosjekt"><p>Fant ikke prosessen.</p></main>;
  if (!redigerer.value) {
    return (
      <main class="prosjekt">
        <div class="panel-tom">
          <strong>Redigering er låst</strong>
          Trykk hengelåsen oppe til høyre og tast PIN-koden for å redigere «{prosess.navn}».
        </div>
      </main>
    );
  }

  const endringer = endringerI(id);
  const velgSteg = (sid: string | null) => setValgt(sid ? { type: 'steg', id: sid } : { type: 'innstillinger' });
  const velgFase = (fid: string | null) => setValgt(fid ? { type: 'fase', id: fid } : { type: 'innstillinger' });
  const settInn = (faseId: string, indeks: number) => {
    const s: Steg = { id: op.nyId('s'), tittel: 'Nytt steg' };
    endreProsess(id, (p) => op.settInnSteg(p, faseId, indeks, s));
    velgSteg(s.id);
  };
  const nyFase = () => {
    const f = { id: op.nyId('f'), tittel: 'Ny fase', steg: [{ id: op.nyId('s'), tittel: 'Første steg' }] };
    endreProsess(id, (p) => op.settInnFase(p, p.faser.length, f));
    velgFase(f.id);
  };

  return (
    <main class="prosessredigering">
      <header class="pr-hode card">
        <div>
          <button class="velger-lenke" onClick={onTilbake}>
            ← Tilbake
          </button>
          <span class="label">
            Rediger prosess · {post.nr} · {KATEGORIER[post.kategori]} · gjeldende versjon {post.versjoner[post.versjoner.length - 1].nr}
          </span>
          <h1 class="dot pr-tittel">{prosess.navn}</h1>
        </div>
        <div class="pr-status">
          <span class="editbar-antall">{endringer.length ? `${endringer.length} endring${endringer.length === 1 ? '' : 'er'} i utkast` : 'Ingen endringer'}</span>
          <div class="knapperad">
            <button class="btn liten" disabled={!kanAngre(id)} onClick={() => angreProsess(id)} title="Ctrl + Z">
              ↶ Angre
            </button>
            <button class="btn liten" onClick={() => setVisHistorikk(true)}>
              Historikk
            </button>
            <button class="btn liten" disabled={!endringer.length} onClick={() => confirm('Forkaste alle endringer i utkastet?') && forkastProsess(id)}>
              Forkast
            </button>
            <button class="btn liten btn-primary" disabled={!endringer.length} onClick={() => setVisPubliser(true)}>
              Publiser…
            </button>
            <a class="btn liten" href={`#/qr/${id}`}>
              QR
            </a>
          </div>
        </div>
      </header>

      <div class="pr-grid">
        <section class="strukturkart card" aria-label="Strukturkart">
          <button class={`sk2-innst ${valgt.type === 'innstillinger' ? 'valgt' : ''}`} onClick={() => setValgt({ type: 'innstillinger' })}>
            ⚙ Innstillinger for prosessen
          </button>
          {(prosess.prosjekter || prosess.innlesing) && (
            <button class={`sk2-innst ${valgt.type === 'innlesing' ? 'valgt' : ''}`} onClick={() => setValgt({ type: 'innlesing' })}>
              ⇩ Innlesing av ordre{prosess.innlesing ? ` · ${prosess.innlesing.regler.length} regler` : ''}
            </button>
          )}
          {prosess.faser.map((f, fi) => (
            <div key={f.id} class="sk2-fase">
              <button class={`sk2-fase-hode ${valgt.type === 'fase' && valgt.id === f.id ? 'valgt' : ''}`} onClick={() => velgFase(f.id)}>
                <span class="sk2-fase-punkt" aria-hidden="true" />
                <span class="sk2-fase-navn">
                  {fi + 1}. {f.tittel}
                </span>
                {f.gjelder && <span class="sk2-regel">når {regelTekst(prosess, f.gjelder)}</span>}
              </button>
              <ol class="sk2-steg">
                {f.steg.map((s, si) => (
                  <li key={s.id}>
                    <button class="sk2-pluss" onClick={() => settInn(f.id, si)} aria-label="Sett inn steg her" title="Sett inn steg her">
                      +
                    </button>
                    <button class={`sk2-rad ${valgt.type === 'steg' && valgt.id === s.id ? 'valgt' : ''}`} onClick={() => velgSteg(s.id)}>
                      <span class="sk2-punkt" aria-hidden="true" />
                      <span class="sk2-tittel">{s.tittel}</span>
                      <span class="sk2-ikoner">
                        {klossIkoner(s).map((k) => (
                          <span key={k} class="sk2-ikon">
                            {k}
                          </span>
                        ))}
                      </span>
                      {s.gjelder && <span class="sk2-regel">når {regelTekst(prosess, s.gjelder)}</span>}
                    </button>
                  </li>
                ))}
                <li>
                  <button class="sk2-ny" onClick={() => settInn(f.id, f.steg.length)}>
                    + Steg i «{f.tittel}»
                  </button>
                </li>
              </ol>
            </div>
          ))}
          <button class="btn sk2-ny-fase" onClick={nyFase}>
            + Ny fase
          </button>
          <p class="panel-hint sk2-forklaring">
            J/N ja/nei · ◉ velg ett · ☑ huk av flere · Aa tekstfelt · 123 tallfelt · ! husk · 🖼 bilder · ⌨ taster · ● merknad fra v3.0
          </p>
        </section>

        <div class="pr-panel">
          {valgt.type === 'steg' && <StegEditor key={valgt.id} prosessId={id} stegId={valgt.id} onVelg={velgSteg} />}
          {valgt.type === 'fase' && <FaseEditor key={valgt.id} prosessId={id} faseId={valgt.id} onVelgSteg={velgSteg} onVelgFase={velgFase} />}
          {valgt.type === 'innstillinger' && <ProsessInnstillinger prosessId={id} />}
          {valgt.type === 'innlesing' && <InnlesingEditor prosessId={id} />}
        </div>
      </div>

      {visPubliser && (
        <PubliserProsess
          id={id}
          neste={post.versjoner[post.versjoner.length - 1].nr + 1}
          endringer={endringer}
          onLukk={() => setVisPubliser(false)}
        />
      )}
      {visHistorikk && <ProsessHistorikk id={id} onLukk={() => setVisHistorikk(false)} />}
    </main>
  );
}

function PubliserProsess({ id, neste, endringer, onLukk }: { id: string; neste: number; endringer: string[]; onLukk: () => void }) {
  const [kommentar, setKommentar] = useState('');
  const aktive = db.value.prosjekter.filter((p) => p.prosessId === id && !p.ferdig && p.type !== 'ovelse').length;
  return (
    <Modal tittel={`Publiser versjon ${neste}`} etikett="Prosess" onLukk={onLukk} bred>
      <p>
        Nye prosjekter bruker den nye versjonen.
        {aktive ? ` ${aktive} aktive prosjekter fortsetter på versjonen de startet med, og kan oppgraderes hver for seg.` : ''}
      </p>
      <ul class="endringsliste">
        {endringer.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      <form
        class="felt"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!kommentar.trim()) return;
          await publiserUtkast(id, kommentar.trim());
          onLukk();
        }}
      >
        <span>Hva og hvorfor (påkrevd)</span>
        <textarea value={kommentar} placeholder="F.eks. La til steg for kontroll av etasjehøyde." onInput={(e) => setKommentar((e.target as HTMLTextAreaElement).value)} />
        <div class="modal-knapper">
          <button type="button" class="btn" onClick={onLukk}>
            Avbryt
          </button>
          <button class="btn btn-primary" disabled={!kommentar.trim()}>
            Publiser
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProsessHistorikk({ id, onLukk }: { id: string; onLukk: () => void }) {
  const post = hentPost(id)!;
  const ini = (b: string | null) => db.value.brukere.find((x) => x.id === b)?.initialer ?? '—';
  const versjoner = [...post.versjoner].reverse();
  return (
    <Modal tittel="Versjoner" etikett={`${post.nr} · ${versjoner[0].prosess.navn}`} onLukk={onLukk} bred>
      <ol class="historikk">
        {versjoner.map((v, i) => {
          const brukes = db.value.prosjekter.filter((p) => p.prosessId === id && p.prosessVersjon === v.nr).length;
          return (
            <li key={v.nr} class="historikk-rad">
              <div class="historikk-hode">
                <span class="dot historikk-nr">{v.nr}</span>
                <span class="label">
                  {new Date(v.dato).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} · {ini(v.brukerId)}
                  {brukes ? ` · ${brukes} prosjekter` : ''}
                </span>
                {i === 0 ? (
                  <span class="chip aktiv">Gjeldende</span>
                ) : (
                  <button
                    class="btn liten"
                    onClick={async () => {
                      if (!confirm(`Gjøre versjon ${v.nr} gjeldende igjen? Det lagres som en ny versjon.`)) return;
                      await tilbakestillProsess(id, v.nr);
                      forkastProsess(id);
                      onLukk();
                    }}
                  >
                    Gå tilbake hit
                  </button>
                )}
              </div>
              <p class="historikk-kommentar">{v.kommentar}</p>
              {v.endringer.length > 0 && (
                <ul class="endringsliste">
                  {v.endringer.map((e, j) => (
                    <li key={j}>{e}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}
