import { useEffect, useRef, useState } from 'preact/hooks';
import { db } from '../data/store';
import { dagerIgjen, gjenopprett, PAPIRKURV_DAGER, slettForGodt } from '../data/papirkurv';
import { gjenopprettBackup, lastNedBackup, lesBackup, sisteBackup, trengerBackup, type LestBackup } from '../data/lagring/backup';
import { gjenopptaTilgang, kobleFra, kobleTil, kopier, KOPI_DAGER, lesKopi, mappe, sjekk, velgMappe, type Kopi, type MappeInnhold } from '../data/lagring/mappe';
import { redigerer } from '../edit/state';
import { Modal } from '../ui/Modal';
import './lagring.css';

const tid = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const mb = (b: number) => (b > 1e6 ? `${(b / 1e6).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1e3))} kB`);

/** Lagring og backup: fellesmappe, manuell backup, daglige kopier og papirkurv. */
export function Lagring({ onTilbake }: { onTilbake: () => void }) {
  const [lest, setLest] = useState<{ b: LestBackup; kilde: string } | null>(null);
  const [feil, setFeil] = useState('');
  const [jobber, setJobber] = useState('');
  const fil = useRef<HTMLInputElement>(null);
  const admin = redigerer.value;

  const jobb = async (tekst: string, fn: () => Promise<unknown>) => {
    setFeil('');
    setJobber(tekst);
    try {
      await fn();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : String(e));
    } finally {
      setJobber('');
    }
  };

  return (
    <main class="arbeidsflate lagring">
      <header class="af-hode card">
        <div>
          <button class="velger-lenke" onClick={onTilbake}>
            ← NT-Arkivet
          </button>
          <span class="label">Sikring av innholdet</span>
          <h1 class="dot af-tittel">Lagring og backup</h1>
          <p class="af-tekst">Prosesser, prosjekter, logg, bilder og innleste dokumenter. Her ser du hvor det lagres, og hvordan det sikres.</p>
        </div>
      </header>

      {feil && <p class="lg-feil card">{feil}</p>}
      {jobber && <p class="lg-jobber card">{jobber} …</p>}

      <Fellesmappe admin={admin} jobb={jobb} />

      <section class="card lg-seksjon">
        <span class="label">Manuell backup</span>
        <h2 class="lg-tittel">Ta en kopi av alt</h2>
        <p>
          Én zip-fil med kart, prosesser, prosjekter, logg, bilder, innleste dokumenter og upubliserte utkast. Lagre den på serveren eller i firmaets OneDrive. Filen inneholder kundedata, så den skal ikke på private minnepinner.
        </p>
        <p class="lg-status">
          Sist tatt på denne PC-en: <strong>{tid(sisteBackup.value)}</strong>
          {trengerBackup() && <span class="chip fare">Ta backup</span>}
        </p>
        <div class="knapperad">
          <button class="btn btn-primary" disabled={!!jobber} onClick={() => jobb('Lager backup', lastNedBackup)}>
            ⇩ Ta full backup nå
          </button>
          {admin ? (
            <button class="btn" disabled={!!jobber} onClick={() => fil.current?.click()}>
              Gjenopprett fra backup …
            </button>
          ) : (
            <span class="panel-hint">Lås opp redigering for å gjenopprette.</span>
          )}
          <input
            ref={fil}
            type="file"
            accept=".zip"
            hidden
            onChange={(e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              (e.target as HTMLInputElement).value = '';
              if (f) void jobb('Leser backupen', async () => setLest({ b: await lesBackup(f), kilde: f.name }));
            }}
          />
        </div>
      </section>

      {mappe.value.status === 'tilkoblet' && <DagligeKopier admin={admin} jobb={jobb} onLest={(b, kilde) => setLest({ b, kilde })} />}

      <Papirkurv admin={admin} />

      {lest && (
        <GjenopprettDialog
          lest={lest.b}
          kilde={lest.kilde}
          onLukk={() => setLest(null)}
          onGjenopprett={() =>
            jobb('Gjenoppretter', async () => {
              await gjenopprettBackup(lest.b);
              setLest(null);
              location.reload();
            })
          }
        />
      )}
    </main>
  );
}

function Fellesmappe({ admin, jobb }: { admin: boolean; jobb: (t: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [valgt, setValgt] = useState<MappeInnhold | null>(null);
  const m = mappe.value;
  const lokalt = { prosjekter: db.value.prosjekter.length, prosesser: db.value.prosesser.length };

  return (
    <section class={`card lg-seksjon lg-mappe ${m.status}`}>
      <span class="label">Hvor lagres innholdet?</span>
      {m.status === 'tilkoblet' ? (
        <>
          <h2 class="lg-tittel">
            <span class="lg-prikk ok" /> Fellesmappen «{m.navn}»
          </h2>
          <p>
            Alle PC-er som er koblet til mappen ser det samme. Endringer fra andre hentes inn hvert 15. sekund. Mappen kommer med i serverens backup og «Tidligere versjoner».
          </p>
          <dl class="lg-fakta">
            <dt>Sist synkronisert</dt>
            <dd>{tid(m.sistSynk)}</dd>
            <dt>Daglig kopi</dt>
            <dd>{m.sisteKopi ? m.sisteKopi.replace('backup/', 'backup\\') : '—'}</dd>
          </dl>
          <div class="knapperad">
            <button class="btn" onClick={() => jobb('Henter endringer', sjekk)}>
              Hent endringer nå
            </button>
            {admin && (
              <button class="btn" onClick={() => confirm('Koble denne PC-en fra fellesmappen? Innholdet blir liggende i mappen.') && jobb('Kobler fra', kobleFra)}>
                Koble fra
              </button>
            )}
          </div>
        </>
      ) : m.status === 'mangler-tilgang' ? (
        <>
          <h2 class="lg-tittel">
            <span class="lg-prikk varsel" /> Fellesmappen «{m.navn}» venter på tilgang
          </h2>
          <p>Nettleseren spør om lov på nytt etter en omstart. Trykk på knappen og velg «Tillat ved hvert besøk» hvis du får spørsmålet.</p>
          <button class="btn btn-primary" onClick={() => jobb('Kobler til', gjenopptaTilgang)}>
            Gi tilgang til fellesmappen
          </button>
        </>
      ) : m.status === 'feil' ? (
        <>
          <h2 class="lg-tittel">
            <span class="lg-prikk fare" /> Problem med fellesmappen
          </h2>
          <p>{m.melding}</p>
          <button class="btn btn-primary" onClick={() => jobb('Prøver igjen', async () => (fsKoblet() ? sjekk() : gjenopptaTilgang()))}>
            Prøv igjen
          </button>
        </>
      ) : m.status === 'kobler' ? (
        <h2 class="lg-tittel">{m.melding ?? 'Kobler til …'}</h2>
      ) : (
        <>
          <h2 class="lg-tittel">
            <span class="lg-prikk varsel" /> Bare i denne nettleseren
          </h2>
          <p>
            Innholdet ligger nå bare på denne PC-en, i denne nettleseren. Det deles ikke med andre, og det forsvinner hvis nettleserdataene slettes. Koble til en fellesmappe på serveren, eller ta manuell backup jevnlig.
          </p>
          {m.status === 'ikke-stottet' ? (
            <p class="panel-hint">Fellesmappe krever Chrome eller Edge.</p>
          ) : admin ? (
            <>
              <ol class="lg-steg">
                <li>
                  Lag en tom mappe på serveren, f.eks. <code>M:\NT-Arkivet</code>.
                </li>
                <li>Trykk «Velg fellesmappe» og velg mappen. Godta at NT-Arkivet får redigere filene.</li>
                <li>Gjør det samme på de andre PC-ene. De velger den samme mappen.</li>
              </ol>
              <button
                class="btn btn-primary"
                onClick={() =>
                  jobb('Venter på valg av mappe', async () => {
                    const v = await velgMappe();
                    if (v) setValgt(v);
                  })
                }
              >
                Velg fellesmappe …
              </button>
            </>
          ) : (
            <p class="panel-hint">Lås opp redigering for å koble til en fellesmappe.</p>
          )}
        </>
      )}

      {valgt && (
        <Modal tittel={`Mappen «${valgt.handle.name}»`} etikett="Fellesmappe" onLukk={() => setValgt(null)}>
          {valgt.harData ? (
            <>
              <p>
                Mappen inneholder allerede NT-Arkivet med <strong>{valgt.prosjekter} prosjekter</strong> og <strong>{valgt.prosesser} prosesser</strong>. Innholdet i mappen tas i bruk på denne PC-en.
              </p>
              {lokalt.prosjekter > 0 && (
                <p class="lg-advarsel">
                  Det som ligger i denne nettleseren nå ({lokalt.prosjekter} prosjekter), blir erstattet. Ta en backup først hvis du vil ta vare på det.
                </p>
              )}
              <div class="modal-knapper">
                {lokalt.prosjekter > 0 && (
                  <button class="btn" onClick={() => jobb('Lager backup', lastNedBackup)}>
                    ⇩ Ta backup først
                  </button>
                )}
                <button
                  class="btn btn-primary"
                  onClick={() => {
                    const h = valgt.handle;
                    setValgt(null);
                    void jobb('Leser fellesmappen', () => kobleTil(h, 'bruk-mappen'));
                  }}
                >
                  Bruk mappen
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                Mappen er tom. Innholdet herfra kopieres dit: <strong>{lokalt.prosjekter} prosjekter</strong>, <strong>{lokalt.prosesser} prosesser</strong>, bilder og innleste dokumenter. Etter dette lagres alt i mappen.
              </p>
              <div class="modal-knapper">
                <button class="btn" onClick={() => setValgt(null)}>
                  Avbryt
                </button>
                <button
                  class="btn btn-primary"
                  onClick={() => {
                    const h = valgt.handle;
                    setValgt(null);
                    void jobb('Kopierer til fellesmappen', () => kobleTil(h, 'flytt-hit'));
                  }}
                >
                  Flytt innholdet til mappen
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </section>
  );
}

const fsKoblet = () => mappe.value.status === 'tilkoblet';

function DagligeKopier({ admin, jobb, onLest }: { admin: boolean; jobb: (t: string, fn: () => Promise<unknown>) => Promise<void>; onLest: (b: LestBackup, kilde: string) => void }) {
  const [liste, setListe] = useState<Kopi[] | null>(null);
  useEffect(() => {
    void kopier().then(setListe);
  }, [mappe.value.sisteKopi]);
  return (
    <section class="card lg-seksjon">
      <span class="label">Daglige kopier · backup\ i fellesmappen</span>
      <h2 class="lg-tittel">Én kopi per dag, i {KOPI_DAGER} dager</h2>
      <p>
        Den første som åpner appen hver dag lager dagens kopi av alle data (prosesser, prosjekter og logg). Bilder og dokumenter endres aldri etter at de er lagret, og ligger i <code>media\</code>.
      </p>
      {liste === null ? (
        <p class="panel-hint">Leser …</p>
      ) : liste.length === 0 ? (
        <p class="panel-hint">Ingen kopier ennå.</p>
      ) : (
        <ul class="lg-liste">
          {liste.map((k) => (
            <li key={k.navn}>
              <span class="lg-navn">{new Date(k.dato).toLocaleDateString('nb-NO', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              <span class="label">{mb(k.storrelse)}</span>
              {admin && (
                <button
                  class="btn liten"
                  onClick={() =>
                    jobb('Leser kopien', async () => {
                      const b = await lesKopi(k.navn);
                      if (b) onLest(await lesBackup(b), k.navn);
                    })
                  }
                >
                  Gjenopprett …
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Papirkurv({ admin }: { admin: boolean }) {
  const kurv = db.value.papirkurv;
  const navn = (id: string | null) => db.value.brukere.find((b) => b.id === id)?.initialer ?? '?';
  return (
    <section class="card lg-seksjon">
      <span class="label">Papirkurv · {kurv.length}</span>
      <h2 class="lg-tittel">Slettede prosjekter og prosesser</h2>
      <p>Det som slettes, ligger her i {PAPIRKURV_DAGER} dager før det fjernes for godt.</p>
      {kurv.length === 0 ? (
        <p class="panel-hint">Papirkurven er tom.</p>
      ) : (
        <ul class="lg-liste">
          {kurv.map((p) => (
            <li key={p.id}>
              <span class="lg-navn">
                <span class="chip">{p.type === 'prosjekt' ? 'Prosjekt' : 'Prosess'}</span> {p.navn}
              </span>
              <span class="label">
                Slettet {tid(p.slettet)} av {navn(p.brukerId)} · {dagerIgjen(p)} dager igjen
              </span>
              <span class="knapperad">
                <button class="btn liten" onClick={() => gjenopprett(p.id)}>
                  Gjenopprett
                </button>
                {admin && (
                  <button class="btn liten fare" onClick={() => confirm(`Slette «${p.navn}» for godt? Det kan bare hentes tilbake fra en backup.`) && slettForGodt(p.id)}>
                    Slett for godt
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GjenopprettDialog({ lest, kilde, onLukk, onGjenopprett }: { lest: LestBackup; kilde: string; onLukk: () => void; onGjenopprett: () => void }) {
  const [bekreft, setBekreft] = useState(false);
  const m = lest.manifest;
  return (
    <Modal tittel="Gjenopprett" etikett="Backup" onLukk={onLukk}>
      <p>
        <strong>{kilde}</strong>
      </p>
      <dl class="lg-fakta">
        <dt>Laget</dt>
        <dd>
          {tid(m.laget)}
          {m.av ? ` av ${m.av}` : ''}
        </dd>
        <dt>Innhold</dt>
        <dd>
          {lest.db.prosjekter.length} prosjekter · {lest.db.prosesser.length} prosesser · {lest.media.size} bilder/dokumenter
        </dd>
        <dt>Nå</dt>
        <dd>
          {db.value.prosjekter.length} prosjekter · {db.value.prosesser.length} prosesser
        </dd>
      </dl>
      <p class="lg-advarsel">
        Alt innhold erstattes med innholdet i backupen
        {mappe.value.status === 'tilkoblet' ? ', også i fellesmappen for alle PC-er' : ''}. Endringer gjort etter at backupen ble laget, går tapt. Bilder og dokumenter slettes ikke.
      </p>
      <label class="sjekk">
        <input type="checkbox" checked={bekreft} onChange={(e) => setBekreft((e.target as HTMLInputElement).checked)} /> Jeg forstår at nåværende innhold erstattes
      </label>
      <div class="modal-knapper">
        <button class="btn" onClick={() => void lastNedBackup()}>
          ⇩ Ta backup av det som er nå
        </button>
        <button class="btn btn-primary" disabled={!bekreft} onClick={onGjenopprett}>
          Gjenopprett
        </button>
      </div>
    </Modal>
  );
}
