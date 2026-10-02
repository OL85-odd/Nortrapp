import qrcode from 'qrcode-generator';
import { useState } from 'preact/hooks';
import { db } from '../data/store';
import { redigerer } from '../edit/state';
import { hentPost, qrAdresse, settServerAdresse, sisteVersjon, stasjonerFor } from '../prosess/arkiv';
import { KATEGORIER } from '../prosess/types';
import '../prosess/redigering/redigering.css';

/** QR-koden som SVG-tekst. */
export function qrSvg(tekst: string, celle = 5): string {
  const q = qrcode(0, 'M');
  q.addData(tekst);
  q.make();
  return q.createSvgTag({ cellSize: celle, margin: 2, scalable: true });
}

/** Utskriftsark med QR-lapp for én prosess. Henges opp der jobben gjøres. */
export function QrSide({ id, onTilbake }: { id: string; onTilbake: () => void }) {
  const post = hentPost(id);
  const [antall, setAntall] = useState(1);
  if (!post) return <main class="prosjekt">Fant ikke prosessen.</main>;
  const p = sisteVersjon(post).prosess;
  const adresse = qrAdresse(post.nr);
  const sted = stasjonerFor(id)[0];
  const harServer = !!db.value.innstillinger.serverAdresse;

  return (
    <main class="qr-side">
      <div class="qr-styring card ikke-utskrift">
        <button class="velger-lenke" onClick={onTilbake}>
          ← Tilbake
        </button>
        <h1 class="dot">QR-lapp</h1>
        <p>
          Lappen peker på <code>{adresse}</code>
        </p>
        {!harServer && (
          <p class="husk">
            <span class="label">Merk</span> Serveradressen er ikke satt, så koden peker på filen du har åpen nå. Den virker ikke på telefon før appen ligger på serveren. Sett adressen i prosessarkivet.
          </p>
        )}
        <div class="knapperad">
          <label class="felt kort-felt">
            <span>Antall lapper</span>
            <input type="number" min={1} max={12} value={antall} onInput={(e) => setAntall(Math.max(1, Math.min(12, Number((e.target as HTMLInputElement).value) || 1)))} />
          </label>
          <button class="btn btn-primary" onClick={() => window.print()}>
            Skriv ut
          </button>
        </div>
      </div>

      <div class="qr-ark">
        {Array.from({ length: antall }, (_, i) => (
          <div key={i} class="qr-lapp">
            <span class="qr-merke">NORTRAPP · NT-ARKIVET</span>
            <strong class="qr-nr">{post.nr}</strong>
            <div class="qr-kode" dangerouslySetInnerHTML={{ __html: qrSvg(adresse) }} />
            <span class="qr-navn">{p.navn}</span>
            <span class="qr-sted">
              {KATEGORIER[post.kategori]}
              {sted ? ` · ${sted.stasjon.navn}` : ''}
            </span>
            <span class="qr-hint">Skann med kameraet</span>
          </div>
        ))}
      </div>
    </main>
  );
}

/** Feltet for serveradresse (vises i prosessarkivet i redigeringsmodus). */
export function ServerAdresse() {
  const [v, setV] = useState(db.value.innstillinger.serverAdresse ?? '');
  if (!redigerer.value) return null;
  return (
    <form
      class="server-adresse"
      onSubmit={(e) => {
        e.preventDefault();
        settServerAdresse(v);
      }}
    >
      <label class="felt">
        <span>Serveradresse for QR-koder</span>
        <input value={v} placeholder="F.eks. http://nt-arkivet/" onInput={(e) => setV((e.target as HTMLInputElement).value)} />
      </label>
      <button class="btn liten">Lagre</button>
      <p class="panel-hint">Tips: be IT lage et fast navn (f.eks. http://nt-arkivet/), så virker utskrevne QR-koder selv om serveren byttes.</p>
    </form>
  );
}
