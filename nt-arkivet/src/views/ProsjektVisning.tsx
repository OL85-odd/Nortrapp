import { useEffect, useState } from 'preact/hooks';
import { aktivtSteg, faseFor, fremdrift, naboSteg, nesteUgjorte, skjulteSteg, sti, svarTekst } from '../prosess/motor';
import type { Prosess, Prosjekt, Steg } from '../prosess/types';
import { gjorOmTilProsjekt, hentProsjekt, oppgraderVersjon, prosessFor, settAktivt, settFerdig, settTilbudsinfo, settUtfort, slettProsjekt, svar } from '../prosess/prosjekter';
import { hentPost, nyesteVersjonsnr } from '../prosess/arkiv';
import { redigerer } from '../edit/state';
import { StegEditor } from '../prosess/redigering/StegEditor';
import { endringerI } from '../prosess/redigering/state';
import { Modal } from '../ui/Modal';
import { FaseStripe } from '../prosess/ui/FaseStripe';
import { HurtigtastPanel } from '../prosess/ui/HurtigtastPanel';
import { Sjekkliste } from '../prosess/ui/Sjekkliste';
import { StegInnhold } from '../prosess/ui/StegInnhold';
import { StiKart } from '../prosess/ui/StiKart';
import { modus, type Modus } from '../ui/settings';
import { useFeltVerdi } from '../ui/hooks';
import { DokumentDialog } from '../import/Dokumenter';
import { InnlesingDialog } from '../import/InnlesingDialog';
import '../prosess/ui/prosess.css';

const MODUSER: { id: Modus; navn: string }[] = [
  { id: 'opplaring', navn: 'Opplæring' },
  { id: 'produksjon', navn: 'Produksjon' },
  { id: 'oversikt', navn: 'Oversikt' },
];

/** Et tilbud viser bare oppsettet — resten kommer når det blir et prosjekt. */
function prosessForType(p: Prosjekt): Prosess {
  const prosess = prosessFor(p);
  return p.type === 'tilbud' ? { ...prosess, faser: prosess.faser.filter((f) => f.id === 'oppsett') } : prosess;
}

/** Kort oppsummering av oppsettet: «Rett trapp · Høyre opp · Mellom 2 vegger · Repo». */
export function oppsummering(prosess: Prosess, p: Prosjekt): string[] {
  const oppsett = prosess.faser.find((f) => f.id === 'oppsett');
  const ut: string[] = [];
  for (const s of oppsett?.steg ?? []) {
    const v = p.svar[s.id];
    if (v === undefined || !s.valg || s.valg.type === 'janei') continue;
    if (Array.isArray(v)) ut.push(...(v.length ? [svarTekst(s, v)] : []));
    else if (['trappetype', 'ganglinje', 'vange'].includes(s.id)) ut.push(svarTekst(s, v));
  }
  if (p.svar.repo_bygg === 'ja') ut.push('Repo i bygg (leveres ikke)');
  return ut;
}

export function ProsjektVisning({ id, onTilbake }: { id: string; onTilbake: () => void }) {
  const p = hentProsjekt(id);
  if (!p) {
    return (
      <main class="prosjekt">
        <div class="panel-tom">
          <strong>Fant ikke prosjektet</strong>
          Det kan være slettet. <button class="velger-lenke" onClick={onTilbake}>Til prosjektlisten</button>
        </div>
      </main>
    );
  }
  return <Visning p={p} onTilbake={onTilbake} />;
}

function Visning({ p, onTilbake }: { p: Prosjekt; onTilbake: () => void }) {
  const id = p.id;
  const prosess = prosessForType(p);
  const faser = sti(prosess, p.svar);
  const fr = fremdrift(prosess, p);
  const skjulte = skjulteSteg(prosess, p.svar);
  const aktivt = aktivtSteg(prosess, p);
  const aktivFase = aktivt ? faseFor(prosess, aktivt.id)?.id : undefined;
  const m = modus.value;
  const [dok, setDok] = useState<'liste' | 'lesinn' | null>(null);

  const ga = (s: Steg | null) => s && settAktivt(p.id, s.id);

  /** Utført og videre til neste steg som ikke er gjort. */
  const utfortOgNeste = async (s: Steg) => {
    const fersk = hentProsjekt(p.id)!;
    if (s.valg && fersk.svar[s.id] === undefined) return;
    await settUtfort(p.id, s.id, true);
    const oppdatert = hentProsjekt(p.id)!;
    const pr = prosessForType(oppdatert);
    ga(nesteUgjorte(pr, oppdatert, s.id) ?? naboSteg(pr, oppdatert.svar, s.id, 1));
  };

  // Tastatur: Enter, ← →, J/N, 1–9 — ikke mens man skriver i et felt.
  // Leser alltid fersk tilstand, så raske tastetrykk ikke bruker en gammel versjon.
  useEffect(() => {
    const tast = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [role=dialog]') || document.querySelector('.modal-bakgrunn') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (modus.value === 'oversikt') return;
      const p = hentProsjekt(id);
      if (!p) return;
      const prosess = prosessForType(p);
      const aktivt = aktivtSteg(prosess, p);
      if (!aktivt) return;
      const v = aktivt.valg;
      if (e.key === 'Enter') return e.preventDefault(), utfortOgNeste(aktivt);
      if (e.key === 'ArrowRight') return e.preventDefault(), ga(naboSteg(prosess, p.svar, aktivt.id, 1));
      if (e.key === 'ArrowLeft') return e.preventDefault(), ga(naboSteg(prosess, p.svar, aktivt.id, -1));
      if (v?.type === 'janei' && (e.key === 'j' || e.key === 'n')) return svar(p.id, aktivt.id, e.key === 'j' ? 'ja' : 'nei');
      const tall = Number(e.key);
      if (v && v.type !== 'janei' && tall >= 1 && tall <= v.alternativer.length) {
        const a = v.alternativer[tall - 1].id;
        if (v.type === 'ett') return svar(p.id, aktivt.id, a);
        const gitt = new Set((p.svar[aktivt.id] as string[] | undefined) ?? []);
        gitt.has(a) ? gitt.delete(a) : gitt.add(a);
        return svar(p.id, aktivt.id, v.alternativer.map((x) => x.id).filter((x) => gitt.has(x)));
      }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [id]);

  const velgFase = (faseId: string) => {
    const f = faser.find((x) => x.id === faseId);
    ga(f?.steg.find((s) => !p.utfort[s.id]) ?? f?.steg[0] ?? null);
  };

  const viktigeFelt = (['overflate', 'endelister'] as const).filter((k) => p.felt[k]);
  const typeNavn = { tilbud: 'Tilbud', ovelse: 'Øving', prosjekt: 'Prosjekt', gjennomforing: 'Gjennomføring' }[p.type];
  const post = hentPost(p.prosessId);
  const nyeste = nyesteVersjonsnr(p.prosessId);

  return (
    <main class="prosjekt">
      <header class="prosjekt-hode card">
        <div class="ph-venstre">
          <button class="velger-lenke" onClick={onTilbake}>
            ← {prosess.navn} · alle prosjekter
          </button>
          <span class="label">
            {typeNavn} · {post?.nr} · {prosess.navn} · versjon {p.prosessVersjon}
          </span>
          <h1 class="dot ph-nummer">{p.nummer}</h1>
          <p class="ph-kunde">{[p.kunde, p.kalkylenr && `Kalkyle ${p.kalkylenr}`].filter(Boolean).join(' · ') || ' '}</p>
          <div class="ph-chips">
            {oppsummering(prosessFor(p), p).map((t) => (
              <span key={t} class="chip aktiv">
                {t}
              </span>
            ))}
            {viktigeFelt.map((k) => (
              <span key={k} class="chip">
                {k === 'endelister' ? `${p.felt[k]} EL` : p.felt[k]}
              </span>
            ))}
            {/ikke avklart/i.test(p.felt.overflate ?? '') && <span class="chip fare">Overflate ikke avklart</span>}
          </div>
          {(prosess.innlesing || (p.dokumenter ?? []).length > 0) && p.type !== 'gjennomforing' && (
            <div class="ph-dok">
              {(p.dokumenter ?? []).length > 0 && (
                <button class="btn liten" onClick={() => setDok('liste')}>
                  Dokumenter · {p.dokumenter!.length}
                </button>
              )}
              {prosess.innlesing && !p.ferdig && (
                <button class="btn liten" onClick={() => setDok('lesinn')} title="Les inn ordrebekreftelse eller produksjonsordre i dette prosjektet">
                  ⇩ Les inn dokument
                </button>
              )}
            </div>
          )}
        </div>
        <div class="ph-hoyre">
          <div class="ph-fremdrift" aria-label={`${fr.prosent} prosent ferdig`}>
            <span class="dot ph-prosent">{fr.prosent}%</span>
            <span class="label">
              {fr.utfort}/{fr.totalt} steg{skjulte ? ` · +${skjulte} bak valg` : ''}
            </span>
            <span class="ph-bar" style={{ '--andel': fr.prosent / 100 }} />
          </div>
          <div class="segmented" role="group" aria-label="Visning">
            {MODUSER.map((x) => (
              <button key={x.id} aria-pressed={m === x.id} onClick={() => (modus.value = x.id)}>
                {x.navn}
              </button>
            ))}
          </div>
        </div>
      </header>

      {dok === 'liste' && <DokumentDialog p={p} onLukk={() => setDok(null)} onLesInn={prosess.innlesing && !p.ferdig ? () => setDok('lesinn') : undefined} />}
      {dok === 'lesinn' && <InnlesingDialog prosessId={p.prosessId} prosjektId={p.id} onLukk={() => setDok(null)} onFerdig={() => setDok('liste')} />}

      {p.type === 'tilbud' && <TilbudKort p={p} />}

      {nyeste > p.prosessVersjon && !p.ferdig && (
        <div class="versjon-banner card">
          <span>
            <strong>Ny versjon av {prosess.navn} (versjon {nyeste}) er publisert.</strong> Dette {typeNavn.toLowerCase()}et følger versjon {p.prosessVersjon}, som det ble
            startet på.
          </span>
          <button
            class="btn liten"
            onClick={() => confirm(`Flytte «${p.nummer}» over på versjon ${nyeste}? Det du har krysset av beholdes. Nye steg dukker opp, og steg som er fjernet blir «forlatte grener».`) && oppgraderVersjon(p.id)}
          >
            Oppgrader til versjon {nyeste}
          </button>
        </div>
      )}

      <FaseStripe faser={faser} prosjekt={p} aktivFase={aktivFase} skjulte={skjulte} onVelgFase={velgFase} />

      {fr.prosent === 100 && skjulte === 0 && p.type !== 'tilbud' && (
        <div class="ferdig-banner card">
          <span class="dot">{p.ferdig ? `Ferdig ${new Date(p.ferdig).toLocaleDateString('nb-NO')}` : 'Alle steg er utført'}</span>
          {p.ferdig ? (
            <button class="btn" onClick={() => settFerdig(p.id, false)}>
              Gjenåpne
            </button>
          ) : (
            <button class="btn btn-primary" onClick={() => settFerdig(p.id, true)}>
              {p.type === 'gjennomforing' ? 'Kvitter som utført' : 'Marker som ferdig'}
            </button>
          )}
        </div>
      )}

      <div class="prosjekt-grid">
        <div class="prosjekt-hoved">
          {m === 'opplaring' && aktivt && (
            <Opplaering steg={aktivt} prosess={prosess} p={p} faseNavn={faser.find((f) => f.id === aktivFase)?.tittel ?? ''} onUtfort={utfortOgNeste} onGa={ga} />
          )}
          {m === 'produksjon' && <Sjekkliste faser={faser} prosjekt={p} aktivtId={aktivt?.id} aktivFase={aktivFase} />}
          {m === 'oversikt' && (
            <>
              <StiKart
                prosess={prosess}
                faser={faser}
                prosjekt={p}
                aktivtId={aktivt?.id}
                forlatte={fr.forlatte}
                onVelg={(sid) => {
                  settAktivt(p.id, sid);
                  modus.value = 'opplaring';
                }}
              />
              <div class="farlig-sone">
                <button
                  class="btn liten fare"
                  onClick={async () => {
                    if (!confirm(`Slette «${p.nummer}» med all logg? Dette kan ikke angres.`)) return;
                    await slettProsjekt(p.id);
                    onTilbake();
                  }}
                >
                  Slett {typeNavn.toLowerCase()}
                </button>
              </div>
            </>
          )}
        </div>
        <HurtigtastPanel prosess={prosess} steg={m === 'oversikt' ? null : aktivt} />
      </div>
    </main>
  );
}

/* ── Opplæring: ett steg om gangen ─────────────────────────── */

interface OpplProps {
  steg: Steg;
  prosess: Prosess;
  p: Prosjekt;
  faseNavn: string;
  onUtfort: (s: Steg) => void;
  onGa: (s: Steg | null) => void;
}

function Opplaering({ steg, prosess, p, faseNavn, onUtfort, onGa }: OpplProps) {
  const fase = sti(prosess, p.svar).find((f) => f.steg.some((s) => s.id === steg.id));
  const nr = (fase?.steg.findIndex((s) => s.id === steg.id) ?? 0) + 1;
  const forrige = naboSteg(prosess, p.svar, steg.id, -1);
  const neste = naboSteg(prosess, p.svar, steg.id, 1);
  const gjort = !!p.utfort[steg.id];
  const venter = !!steg.valg && p.svar[steg.id] === undefined;
  const [rediger, setRediger] = useState(false);

  return (
    <article class="steg-kort card" key={steg.id} aria-labelledby="steg-tittel">
      <div class="sk-topp">
        <span class="label">
          {faseNavn} · steg {nr} av {fase?.steg.length}
        </span>
        <span class="knapperad">
          {gjort && <span class="chip aktiv">Utført</span>}
          {redigerer.value && (
            <button class="btn liten btn-primary" onClick={() => setRediger(true)} title="Endre dette steget i prosessen">
              ✎ Rediger steget
            </button>
          )}
        </span>
      </div>
      {rediger && <InlineRedigering prosessId={p.prosessId} stegId={steg.id} gammel={p.prosessVersjon < nyesteVersjonsnr(p.prosessId)} onLukk={() => setRediger(false)} />}
      <h2 id="steg-tittel" class="steg-tittel">
        {steg.tittel}
      </h2>
      <StegInnhold steg={steg} prosjekt={p} />
      <div class="steg-nav">
        <button class="btn" disabled={!forrige} onClick={() => onGa(forrige)}>
          ← Forrige
        </button>
        {gjort ? (
          <>
            <button class="btn liten" onClick={() => settUtfort(p.id, steg.id, false)}>
              Angre utført
            </button>
            <button class="btn btn-primary" disabled={!neste} onClick={() => onGa(neste)}>
              Neste →
            </button>
          </>
        ) : (
          <button class="btn btn-primary" disabled={venter} onClick={() => onUtfort(steg)} title="Enter">
            {venter ? 'Svar for å gå videre' : 'Utført – neste ↵'}
          </button>
        )}
      </div>
    </article>
  );
}

/* ── Rediger steget rett fra opplæringsvisningen ───────────── */

function InlineRedigering({ prosessId, stegId, gammel, onLukk }: { prosessId: string; stegId: string; gammel: boolean; onLukk: () => void }) {
  const [valgt, setValgt] = useState<string | null>(stegId);
  const antall = endringerI(prosessId).length;
  return (
    <Modal tittel="Rediger steget" etikett="Endringer havner i utkastet til prosessen" onLukk={onLukk} bred>
      {gammel && <p class="husk">Dette prosjektet følger en eldre versjon. Du redigerer utkastet til den nyeste versjonen.</p>}
      {valgt ? <StegEditor prosessId={prosessId} stegId={valgt} onVelg={setValgt} /> : <p>Steget er slettet fra utkastet.</p>}
      <div class="modal-knapper">
        <span class="editbar-antall">{antall ? `${antall} endring${antall === 1 ? '' : 'er'} i utkast` : 'Ingen endringer ennå'}</span>
        <a class="btn" href={`#/rediger/${prosessId}`}>
          Strukturkart og publisering →
        </a>
        <button class="btn btn-primary" onClick={onLukk}>
          Ferdig
        </button>
      </div>
    </Modal>
  );
}

/* ── Tilbud ────────────────────────────────────────────────── */

function TilbudKort({ p }: { p: Prosjekt }) {
  const [filbane, setFilbane] = useFeltVerdi(p.tilbud?.filbane ?? '');
  const [sketchfab, setSketchfab] = useFeltVerdi(p.tilbud?.sketchfab ?? '');
  const [nr, setNr] = useState('');

  return (
    <section class="tilbud card">
      <span class="label">Tilbud · holder trappevalgene til salget er i havn</span>
      <div class="tilbud-felt">
        <label class="felt">
          <span>Filbane til tilbudet</span>
          <input value={filbane} placeholder="M:\Tilbud\…" onInput={(e) => setFilbane((e.target as HTMLInputElement).value)} onBlur={() => settTilbudsinfo(p.id, { filbane })} />
        </label>
        <label class="felt">
          <span>Sketchfab-lenke</span>
          <input value={sketchfab} placeholder="https://sketchfab.com/…" onInput={(e) => setSketchfab((e.target as HTMLInputElement).value)} onBlur={() => settTilbudsinfo(p.id, { sketchfab })} />
        </label>
        {p.tilbud?.sketchfab && (
          <a class="btn liten" href={p.tilbud.sketchfab} target="_blank" rel="noopener">
            Åpne 3D-modell ↗
          </a>
        )}
      </div>
      <form
        class="tilbud-omgjor"
        onSubmit={(e) => {
          e.preventDefault();
          if (nr.trim()) gjorOmTilProsjekt(p.id, nr.trim().toUpperCase());
        }}
      >
        <label class="felt">
          <span>Solgt? Gjør om til prosjekt</span>
          <input value={nr} placeholder="Prosjektnummer, f.eks. H483-26" onInput={(e) => setNr((e.target as HTMLInputElement).value)} />
        </label>
        <button class="btn btn-primary" disabled={!nr.trim()}>
          Gjør om til prosjekt
        </button>
      </form>
    </section>
  );
}
