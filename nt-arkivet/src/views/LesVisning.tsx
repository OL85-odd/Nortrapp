import { redigerer } from '../edit/state';
import { hentPost, sisteVersjon } from '../prosess/arkiv';
import { KATEGORIER } from '../prosess/types';
import { HurtigtastPanel } from '../prosess/ui/HurtigtastPanel';
import { StegInnhold } from '../prosess/ui/StegInnhold';
import '../prosess/ui/prosess.css';

/** En instruks som bare skal leses: alle steg som ett dokument, uten avkrysning. */
export function LesVisning({ id, onTilbake }: { id: string; onTilbake: () => void }) {
  const post = hentPost(id);
  if (!post) return <main class="prosjekt">Fant ikke instruksen.</main>;
  const v = sisteVersjon(post);
  const p = v.prosess;
  let nr = 0;

  return (
    <main class="prosjekt">
      <header class="prosjekt-hode card">
        <div class="ph-venstre">
          <button class="velger-lenke" onClick={onTilbake}>
            ← NT-Arkivet
          </button>
          <span class="label">
            {post.nr} · {KATEGORIER[post.kategori]} · versjon {v.nr} · {new Date(v.dato).toLocaleDateString('nb-NO')}
          </span>
          <h1 class="dot ph-nummer">{p.navn}</h1>
          {p.beskrivelse && <p class="ph-kunde">{p.beskrivelse}</p>}
        </div>
        <div class="ph-hoyre">
          <a class="btn" href={`#/qr/${id}`}>
            QR-lapp
          </a>
          {redigerer.value && (
            <a class="btn btn-primary" href={`#/rediger/${id}`}>
              ✎ Rediger
            </a>
          )}
        </div>
      </header>
      <div class="prosjekt-grid">
        <div class="prosjekt-hoved">
          {p.faser.map((f) => (
            <section key={f.id} class="les-fase card">
              {p.faser.length > 1 && <h2 class="les-fase-tittel">{f.tittel}</h2>}
              {f.steg.map((s) => (
                <article key={s.id} class="les-steg">
                  <h3>
                    <span class="dot les-nr">{++nr}</span> {s.tittel}
                  </h3>
                  <StegInnhold steg={s} />
                </article>
              ))}
            </section>
          ))}
        </div>
        <HurtigtastPanel prosess={p} steg={null} />
      </div>
    </main>
  );
}
