import { hentPost, stasjonerFor } from '../arkiv';
import { KATEGORIER, type Hurtigtast, type ProsessType } from '../types';
import { flyttI, RadKnapper, Tekst } from './Felter';
import { arbeidskopi, endreProsess } from './state';

const TYPER: { id: ProsessType; navn: string; tekst: string }[] = [
  { id: 'programvare', navn: 'Programvare', tekst: 'Hurtigtastpanel ved siden av stegene.' },
  { id: 'maskin', navn: 'Maskin', tekst: '«Kjekt å vite»-boks ved siden av stegene.' },
  { id: 'annet', navn: 'Annet', tekst: '«Kjekt å vite»-boks ved siden av stegene.' },
];

/** Innstillinger for hele prosessen: navn, type, kun lesing, intervall, hurtigtaster / kjekt å vite. */
export function ProsessInnstillinger({ prosessId }: { prosessId: string }) {
  const p = arbeidskopi(prosessId);
  const post = hentPost(prosessId);
  if (!p || !post) return null;
  const lagre = (felt: Partial<typeof p>) => endreProsess(prosessId, (x) => ({ ...x, ...felt }));
  const taster = p.hurtigtaster ?? [];
  const alltid = new Set(p.alltidTaster ?? []);
  const settTaster = (t: Hurtigtast[]) => lagre({ hurtigtaster: t });
  const koblet = stasjonerFor(prosessId);

  return (
    <aside class="steg-editor card" aria-label="Innstillinger for prosessen">
      <span class="label">
        {post.nr} · {KATEGORIER[post.kategori]}
      </span>
      <h2 class="dot panel-tittel">Innstillinger</h2>
      <p class="panel-hint">
        ID-en {post.nr} endres aldri, så QR-koder som er skrevet ut fortsetter å virke.
        {koblet.length ? ` Koblet til: ${koblet.map((k) => `${k.stasjon.navn} (${k.kort.navn})`).join(', ')}.` : ' Ikke koblet til noen stasjon ennå.'}
      </p>

      <Tekst etikett="Navn" verdi={p.navn} onLagre={(v) => v.trim() && lagre({ navn: v.trim() })} />
      <Tekst etikett="Beskrivelse" flerlinjer verdi={p.beskrivelse ?? ''} onLagre={(v) => lagre({ beskrivelse: v.trim() || undefined })} />

      <div class="felt">
        <span>Type</span>
        <div class="segmented" role="group" aria-label="Type prosess">
          {TYPER.map((t) => (
            <button key={t.id} aria-pressed={(p.type ?? 'annet') === t.id} onClick={() => lagre({ type: t.id })}>
              {t.navn}
            </button>
          ))}
        </div>
        <p class="panel-hint">{TYPER.find((t) => t.id === (p.type ?? 'annet'))?.tekst}</p>
      </div>

      <label class="sjekk stor">
        <input type="checkbox" checked={!!p.kunLesing} onChange={(e) => lagre({ kunLesing: (e.target as HTMLInputElement).checked || undefined })} />
        <span>
          <strong>Kun lesing</strong> — instruks uten avkrysning og logg (f.eks. fylle papir i printeren)
        </span>
      </label>
      {!p.kunLesing && (
        <label class="sjekk stor">
          <input type="checkbox" checked={!!p.prosjekter} onChange={(e) => lagre({ prosjekter: (e.target as HTMLInputElement).checked || undefined })} />
          <span>
            <strong>Kjøres som prosjekter</strong> — med prosjektnummer, kunde og tilbud (som Staircon). Ellers som enkle gjennomføringer.
          </span>
        </label>
      )}
      {!p.kunLesing && (
        <label class="felt">
          <span>Gjentas hver … dag (tomt = ikke gjentakende)</span>
          <input
            type="number"
            min={1}
            value={p.intervallDager ?? ''}
            placeholder="F.eks. 7"
            onChange={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              lagre({ intervallDager: n > 0 ? n : undefined });
            }}
          />
        </label>
      )}

      {p.type === 'programvare' ? (
        <details class="ed-blokk" open>
          <summary>Hurtigtaster ({taster.length})</summary>
          <p class="panel-hint">«Alltid» = vises i panelet uansett steg. Taster per steg velges i hvert steg.</p>
          {taster.map((t, i) => (
            <div key={t.tast + i} class="ed-rad tast-rad">
              <Tekst klasse="tast" verdi={t.tast} onLagre={(v) => settTaster(taster.map((x, j) => (j === i ? { ...x, tast: v.trim() } : x)))} />
              <Tekst verdi={t.tekst} plassholder="Hva tasten gjør" onLagre={(v) => settTaster(taster.map((x, j) => (j === i ? { ...x, tekst: v } : x)))} />
              <label class="sjekk" title="Vis alltid i panelet">
                <input
                  type="checkbox"
                  checked={alltid.has(t.tast)}
                  onChange={(e) => {
                    const ny = new Set(alltid);
                    (e.target as HTMLInputElement).checked ? ny.add(t.tast) : ny.delete(t.tast);
                    lagre({ alltidTaster: [...ny] });
                  }}
                />
                Alltid
              </label>
              {t.kontroller && (
                <button class="btn liten" title={t.kontroller} onClick={() => settTaster(taster.map((x, j) => (j === i ? { tast: x.tast, tekst: x.tekst } : x)))}>
                  Kontrollert ✓
                </button>
              )}
              <RadKnapper
                onOpp={i > 0 ? () => settTaster(flyttI(taster, i, -1)) : undefined}
                onNed={i < taster.length - 1 ? () => settTaster(flyttI(taster, i, 1)) : undefined}
                onFjern={() => settTaster(taster.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          <button class="btn liten" onClick={() => settTaster([...taster, { tast: 'Ctrl + ?', tekst: '' }])}>
            + Hurtigtast
          </button>
        </details>
      ) : (
        <Tekst
          etikett="Kjekt å vite (én linje per punkt)"
          flerlinjer
          verdi={p.kjektAVite ?? ''}
          plassholder={'Nødstopp sitter …\nKontaktperson ved feil: …'}
          onLagre={(v) => lagre({ kjektAVite: v.trim() || undefined })}
        />
      )}
    </aside>
  );
}
