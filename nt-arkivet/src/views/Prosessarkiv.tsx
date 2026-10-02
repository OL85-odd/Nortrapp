import { useState } from 'preact/hooks';
import { db } from '../data/store';
import { redigerer } from '../edit/state';
import { kobleIKort, opprettProsess, sisteVersjon, stasjonerFor } from '../prosess/arkiv';
import { speilIUtkast } from '../edit/state';
import { MALER } from '../prosess/maler';
import { KATEGORIER, type Kategori } from '../prosess/types';
import { Modal } from '../ui/Modal';
import { forfall } from './Arbeidsflate';
import { ServerAdresse } from './QrSide';
import '../prosess/redigering/redigering.css';

/** Oversikt over alle prosesser i arkivet, med ID, kategori, versjon og QR. */
export function Prosessarkiv({ onTilbake }: { onTilbake: () => void }) {
  const [ny, setNy] = useState(false);
  const [filter, setFilter] = useState<Kategori | 'alle'>('alle');
  const alle = db.value.prosesser.filter((p) => filter === 'alle' || p.kategori === filter);

  return (
    <main class="arbeidsflate">
      <header class="af-hode card">
        <div>
          <button class="velger-lenke" onClick={onTilbake}>
            ← NT-Arkivet
          </button>
          <span class="label">Alle prosesser og prosedyrer</span>
          <h1 class="dot af-tittel">Prosessarkiv</h1>
          <p class="af-tekst">Hver prosess har en fast ID som QR-koden peker på. Flytt den gjerne mellom kort — ID-en følger med.</p>
        </div>
        <div class="af-knapper">
          {redigerer.value ? (
            <button class="btn btn-primary" onClick={() => setNy(true)}>
              + Ny prosess
            </button>
          ) : (
            <span class="panel-hint">Lås opp redigering for å lage nye prosesser.</span>
          )}
        </div>
      </header>

      <div class="segmented arkiv-filter" role="group" aria-label="Kategori">
        <button aria-pressed={filter === 'alle'} onClick={() => setFilter('alle')}>
          Alle
        </button>
        {(Object.keys(KATEGORIER) as Kategori[]).map((k) => (
          <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k}
          </button>
        ))}
      </div>

      <ul class="af-liste">
        {alle.map((post) => {
          const v = sisteVersjon(post);
          const p = v.prosess;
          const steder = stasjonerFor(post.id);
          const f = forfall(post.id);
          return (
            <li key={post.id}>
              <div class="pk card arkiv-kort">
                <span class="pk-topp">
                  <span class="label">{post.nr}</span>
                  <span class="chip">{p.kunLesing ? 'Les' : p.type === 'programvare' ? 'Programvare' : p.type === 'maskin' ? 'Maskin' : 'Rutine'}</span>
                </span>
                <strong class="arkiv-navn">{p.navn}</strong>
                <span class="pk-oppsett">
                  {KATEGORIER[post.kategori]} · versjon {v.nr} · {p.faser.reduce((n, x) => n + x.steg.length, 0)} steg
                </span>
                <span class="pk-oppsett">{steder.length ? `På kartet: ${steder.map((s) => s.stasjon.navn).join(', ')}` : 'Ikke på kartet'}</span>
                {f && <span class={`chip ${f.forfalt ? 'fare' : 'aktiv'}`}>{f.tekst}</span>}
                <span class="knapperad">
                  <a class="btn liten" href={p.kunLesing ? `#/les/${post.id}` : `#/p/${post.id}`}>
                    Åpne
                  </a>
                  <a class="btn liten" href={`#/qr/${post.id}`}>
                    QR
                  </a>
                  {redigerer.value && (
                    <a class="btn liten btn-primary" href={`#/rediger/${post.id}`}>
                      ✎ Rediger
                    </a>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <ServerAdresse />
      {ny && <NyProsessDialog onLukk={() => setNy(false)} />}
    </main>
  );
}

/** Lag en ny prosess fra en mal, og koble den eventuelt til en stasjon. */
export function NyProsessDialog({ stasjonId, standardNavn, onLukk }: { stasjonId?: string; standardNavn?: string; onLukk: () => void }) {
  const [malId, setMalId] = useState(MALER[1].id);
  const mal = MALER.find((m) => m.id === malId)!;
  const [navn, setNavn] = useState(standardNavn ?? '');
  const [kategori, setKategori] = useState<Kategori>(mal.kategori);

  return (
    <Modal tittel="Ny prosess" etikett="Prosessarkiv" onLukk={onLukk} bred>
      <div class="mal-valg">
        {MALER.map((m) => (
          <button
            key={m.id}
            class="valg-alt"
            aria-pressed={m.id === malId}
            onClick={() => {
              setMalId(m.id);
              setKategori(m.kategori);
            }}
          >
            <span class="valg-alt-tekst">
              <strong>{m.navn}</strong>
              <span>{m.beskrivelse}</span>
            </span>
          </button>
        ))}
      </div>
      <form
        class="ny-skjema"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!navn.trim()) return;
          const innhold = mal.lag(navn.trim());
          const post = await opprettProsess(innhold, kategori, stasjonId);
          if (stasjonId) speilIUtkast((k) => kobleIKort(k, stasjonId, post.id));
          onLukk();
          location.hash = `#/rediger/${post.id}`;
        }}
      >
        <label class="felt">
          <span>Navn</span>
          <input value={navn} placeholder="F.eks. Rengjøring av kaffemaskin" onInput={(e) => setNavn((e.target as HTMLInputElement).value)} />
        </label>
        <label class="felt">
          <span>Kategori (gir ID-en, f.eks. NT-{kategori}-001)</span>
          <select value={kategori} onChange={(e) => setKategori((e.target as HTMLSelectElement).value as Kategori)}>
            {(Object.entries(KATEGORIER) as [Kategori, string][]).map(([k, n]) => (
              <option key={k} value={k}>
                {k} — {n}
              </option>
            ))}
          </select>
        </label>
        <div class="modal-knapper">
          <button type="button" class="btn" onClick={onLukk}>
            Avbryt
          </button>
          <button class="btn btn-primary" disabled={!navn.trim()}>
            Lag og rediger
          </button>
        </div>
      </form>
    </Modal>
  );
}
