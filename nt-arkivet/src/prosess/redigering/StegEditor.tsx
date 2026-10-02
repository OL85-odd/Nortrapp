import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { db } from '../../data/store';
import type { Felt, Prosess, Steg, Valg } from '../types';
import { StegInnhold } from '../ui/StegInnhold';
import { BildeSone } from './BildeSone';
import { flyttI, RadKnapper, Tekst } from './Felter';
import * as op from './ops';
import { RegelBygger } from './RegelBygger';
import { arbeidskopi, endreProsess } from './state';

interface Props {
  prosessId: string;
  stegId: string;
  onVelg: (stegId: string | null) => void;
  onLukk?: () => void;
}

/** Byggeklossene et steg kan ha. Rekkefølgen her er rekkefølgen i visningen. */
type Kloss = 'husk' | 'valg' | 'felter' | 'verdier' | 'hurtigtaster' | 'bilder' | 'video' | 'dokument' | 'lenke' | 'hjelp' | 'farger';

const NYE: { navn: string; ikon: string; kloss: Kloss; lag: (s: Steg, p: Prosess) => Partial<Steg> }[] = [
  { navn: 'Husk!', ikon: '!', kloss: 'husk', lag: () => ({ husk: 'Viktig å huske …' }) },
  { navn: 'Ja / nei', ikon: 'J/N', kloss: 'valg', lag: (s) => ({ valg: { type: 'janei', sporsmal: s.tittel, ja: 'Hva skjer ved ja', nei: 'Hva skjer ved nei' } }) },
  { navn: 'Velg ett', ikon: '◉', kloss: 'valg', lag: (s) => ({ valg: { type: 'ett', sporsmal: s.tittel, alternativer: [{ id: op.nyId('a'), navn: 'Alternativ 1' }, { id: op.nyId('a'), navn: 'Alternativ 2' }] } }) },
  { navn: 'Huk av flere', ikon: '☑', kloss: 'valg', lag: (s) => ({ valg: { type: 'flere', sporsmal: s.tittel, alternativer: [{ id: op.nyId('a'), navn: 'Alternativ 1' }, { id: op.nyId('a'), navn: 'Alternativ 2' }] } }) },
  { navn: 'Tekstfelt', ikon: 'Aa', kloss: 'felter', lag: (s, p) => ({ felter: [...(s.felter ?? []), nyttFelt(p, 'Nytt felt', 'tekst')] }) },
  { navn: 'Tallfelt', ikon: '123', kloss: 'felter', lag: (s, p) => ({ felter: [...(s.felter ?? []), nyttFelt(p, 'Mål', 'tall')] }) },
  { navn: 'Verdier', ikon: '=', kloss: 'verdier', lag: () => ({ verdier: [{ navn: 'Navn', verdi: 'Verdi' }] }) },
  { navn: 'Hurtigtaster', ikon: '⌨', kloss: 'hurtigtaster', lag: () => ({ hurtigtaster: [] }) },
  { navn: 'Bilder', ikon: '🖼', kloss: 'bilder', lag: () => ({ bilder: [] }) },
  { navn: 'Video', ikon: '🎬', kloss: 'video', lag: () => ({ video: { kilde: '', tekst: '' } }) },
  { navn: 'Dokument / PDF', ikon: '📄', kloss: 'dokument', lag: () => ({ dokument: { fil: '', tekst: 'Åpne dokumentet' } }) },
  { navn: 'Lenke til prosess', ikon: '🔗', kloss: 'lenke', lag: () => ({ lenke: { prosessId: '' } }) },
  { navn: 'Hjelpetekst', ikon: '?', kloss: 'hjelp', lag: () => ({ hjelp: { kilde: 'Hjelp', tekst: '' } }) },
  { navn: 'Fargelapper', ikon: '■', kloss: 'farger', lag: () => ({ farger: [{ farge: 'Gul', hex: '#d6b855', tekst: '' }] }) },
];

function nyttFelt(p: Prosess, etikett: string, type: 'tekst' | 'tall'): Felt {
  const brukt = new Set(p.faser.flatMap((f) => f.steg.flatMap((s) => s.felter?.map((x) => x.nokkel) ?? [])));
  let nokkel = op.slug(etikett);
  for (let i = 2; brukt.has(nokkel); i++) nokkel = `${op.slug(etikett)}_${i}`;
  return { nokkel, etikett, type, ...(type === 'tall' ? { enhet: 'mm' } : {}) };
}

export function StegEditor({ prosessId, stegId, onVelg, onLukk }: Props) {
  const prosess = arbeidskopi(prosessId);
  const plass = prosess && op.finnSteg(prosess, stegId);
  const [forhand, setForhand] = useState(false);
  if (!prosess || !plass) return <p class="panel-hint">Steget finnes ikke i utkastet.</p>;
  const { steg, fase, indeks } = plass;

  const lagre = (felt: Partial<Steg>) => endreProsess(prosessId, (p) => op.oppdaterSteg(p, stegId, felt));
  const fjern = (k: Kloss) => lagre({ [k]: undefined } as Partial<Steg>);
  const har = (k: Kloss) => steg[k] !== undefined;

  const nyttSteg = () => {
    const ny: Steg = { id: op.nyId('s'), tittel: 'Nytt steg' };
    endreProsess(prosessId, (p) => op.settInnSteg(p, fase.id, indeks + 1, ny));
    onVelg(ny.id);
  };

  const slett = () => {
    const bruk = op.brukesAv(prosess, stegId);
    const advarsel = bruk.length ? `\n\nSvaret brukes i regler for: ${bruk.join(', ')}. De reglene slutter å virke.` : '';
    if (!confirm(`Slette steget «${steg.tittel}»?${advarsel}\n\nDu kan angre, eller la være å publisere.`)) return;
    endreProsess(prosessId, (p) => op.slettSteg(p, stegId));
    onVelg(null);
  };

  return (
    <aside class="steg-editor card" aria-label="Rediger steg">
      <div class="panel-topp">
        <span class="label">
          {fase.tittel} · steg {indeks + 1} av {fase.steg.length}
        </span>
        <div class="knapperad">
          <button class={`btn liten ${forhand ? 'btn-primary' : ''}`} onClick={() => setForhand(!forhand)}>
            {forhand ? 'Rediger' : 'Forhåndsvis'}
          </button>
          {onLukk && (
            <button class="panel-lukk" onClick={onLukk} aria-label="Lukk">
              ×
            </button>
          )}
        </div>
      </div>

      {forhand ? (
        <div class="forhand">
          <h2 class="steg-tittel">{steg.tittel}</h2>
          <StegInnhold steg={steg} />
        </div>
      ) : (
        <>
          <Tekst klasse="tittel-felt" etikett="Tittel (én kort handling)" verdi={steg.tittel} onLagre={(v) => v.trim() && lagre({ tittel: v.trim() })} />
          <Tekst etikett="Forklaring" flerlinjer verdi={steg.tekst ?? ''} plassholder="Utdypende tekst …" onLagre={(v) => lagre({ tekst: v.trim() || undefined })} />

          {steg.merknad && (
            <div class={`merknad ${steg.merknad.type}`}>
              <span class="label">{steg.merknad.type === 'ny' ? 'Nytt i v3.0' : 'Endret i v3.0'}</span> {steg.merknad.tekst}
              <button class="btn liten" onClick={() => lagre({ merknad: undefined })}>
                Kontrollert – fjern merknaden
              </button>
            </div>
          )}

          <details class="ed-blokk" open={!!steg.gjelder}>
            <summary>Vis bare når … {steg.gjelder ? '· har regel' : ''}</summary>
            <RegelBygger prosess={prosess} forStegId={stegId} betingelse={steg.gjelder} onEndre={(b) => lagre({ gjelder: b })} />
          </details>

          {har('husk') && (
            <Blokk navn="Husk!" onFjern={() => fjern('husk')}>
              <Tekst flerlinjer verdi={steg.husk!} onLagre={(v) => lagre({ husk: v })} />
            </Blokk>
          )}
          {har('valg') && (
            <Blokk navn={{ janei: 'Ja / nei', ett: 'Velg ett', flere: 'Huk av flere' }[steg.valg!.type]} onFjern={() => {
              const bruk = op.brukesAv(prosess, stegId);
              if (bruk.length && !confirm(`Svaret brukes i regler for: ${bruk.join(', ')}. Fjerne valget likevel?`)) return;
              fjern('valg');
            }}>
              <ValgEditor valg={steg.valg!} onEndre={(valg) => lagre({ valg })} />
            </Blokk>
          )}
          {har('felter') && (
            <Blokk navn="Felter" onFjern={() => fjern('felter')}>
              <FeltEditor felter={steg.felter!} onEndre={(felter) => lagre({ felter: felter.length ? felter : undefined })} />
            </Blokk>
          )}
          {har('verdier') && (
            <Blokk navn="Verdier" onFjern={() => fjern('verdier')}>
              {steg.verdier!.map((v, i, a) => (
                <div key={i} class="ed-rad">
                  <Tekst verdi={v.navn} plassholder="Navn" onLagre={(x) => lagre({ verdier: a.map((y, j) => (j === i ? { ...y, navn: x } : y)) })} />
                  <Tekst verdi={v.verdi} plassholder="Verdi" onLagre={(x) => lagre({ verdier: a.map((y, j) => (j === i ? { ...y, verdi: x } : y)) })} />
                  <RadKnapper
                    onOpp={i > 0 ? () => lagre({ verdier: flyttI(a, i, -1) }) : undefined}
                    onNed={i < a.length - 1 ? () => lagre({ verdier: flyttI(a, i, 1) }) : undefined}
                    onFjern={() => lagre({ verdier: a.filter((_, j) => j !== i) })}
                  />
                </div>
              ))}
              <button class="btn liten" onClick={() => lagre({ verdier: [...steg.verdier!, { navn: '', verdi: '' }] })}>
                + Verdi
              </button>
            </Blokk>
          )}
          {har('hurtigtaster') && (
            <Blokk navn="Hurtigtaster" onFjern={() => fjern('hurtigtaster')}>
              <TastEditor prosessId={prosessId} prosess={prosess} valgte={steg.hurtigtaster!} onEndre={(t) => lagre({ hurtigtaster: t })} />
            </Blokk>
          )}
          {har('bilder') && (
            <Blokk navn="Bilder" onFjern={() => fjern('bilder')}>
              <BildeSone bilder={steg.bilder!} onEndre={(bilder) => lagre({ bilder })} />
            </Blokk>
          )}
          {har('video') && (
            <Blokk navn="Video" onFjern={() => fjern('video')}>
              <Tekst etikett="Fil på serveren eller lenke" verdi={steg.video!.kilde} plassholder="\\server\NT-Arkivet\media\video.mp4 eller https://…" onLagre={(v) => lagre({ video: { ...steg.video!, kilde: v.trim() } })} />
              <Tekst etikett="Tekst" verdi={steg.video!.tekst} onLagre={(v) => lagre({ video: { ...steg.video!, tekst: v } })} />
              <p class="panel-hint">Når appen ligger på serveren, kan videoen dras rett inn her.</p>
            </Blokk>
          )}
          {har('dokument') && (
            <Blokk navn="Dokument / PDF" onFjern={() => fjern('dokument')}>
              <Tekst etikett="Fil eller lenke" verdi={steg.dokument!.fil} onLagre={(v) => lagre({ dokument: { ...steg.dokument!, fil: v.trim() } })} />
              <Tekst etikett="Knappetekst" verdi={steg.dokument!.tekst} onLagre={(v) => lagre({ dokument: { ...steg.dokument!, tekst: v } })} />
            </Blokk>
          )}
          {har('lenke') && (
            <Blokk navn="Lenke til prosess" onFjern={() => fjern('lenke')}>
              <label class="felt">
                <span>Prosess</span>
                <select value={steg.lenke!.prosessId} onChange={(e) => lagre({ lenke: { ...steg.lenke!, prosessId: (e.target as HTMLSelectElement).value } })}>
                  <option value="">Velg …</option>
                  {db.value.prosesser
                    .filter((p) => p.id !== prosessId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nr} · {p.versjoner[p.versjoner.length - 1].prosess.navn}
                      </option>
                    ))}
                </select>
              </label>
              <Tekst etikett="Tekst (valgfritt)" verdi={steg.lenke!.tekst ?? ''} plassholder="Følg …" onLagre={(v) => lagre({ lenke: { ...steg.lenke!, tekst: v || undefined } })} />
            </Blokk>
          )}
          {har('hjelp') && (
            <Blokk navn="Hjelpetekst" onFjern={() => fjern('hjelp')}>
              <Tekst etikett="Kilde" verdi={steg.hjelp!.kilde} onLagre={(v) => lagre({ hjelp: { ...steg.hjelp!, kilde: v } })} />
              <Tekst flerlinjer verdi={steg.hjelp!.tekst} onLagre={(v) => lagre({ hjelp: { ...steg.hjelp!, tekst: v } })} />
            </Blokk>
          )}
          {har('farger') && (
            <Blokk navn="Fargelapper" onFjern={() => fjern('farger')}>
              {steg.farger!.map((c, i, a) => (
                <div key={i} class="ed-rad farge-rad">
                  <input type="color" value={c.hex} aria-label="Farge" onChange={(e) => lagre({ farger: a.map((y, j) => (j === i ? { ...y, hex: (e.target as HTMLInputElement).value } : y)) })} />
                  <Tekst verdi={c.farge} plassholder="Navn" onLagre={(x) => lagre({ farger: a.map((y, j) => (j === i ? { ...y, farge: x } : y)) })} />
                  <Tekst verdi={c.tekst} plassholder="Brukes til …" onLagre={(x) => lagre({ farger: a.map((y, j) => (j === i ? { ...y, tekst: x } : y)) })} />
                  <RadKnapper
                    onOpp={i > 0 ? () => lagre({ farger: flyttI(a, i, -1) }) : undefined}
                    onNed={i < a.length - 1 ? () => lagre({ farger: flyttI(a, i, 1) }) : undefined}
                    onFjern={() => lagre({ farger: a.filter((_, j) => j !== i) })}
                  />
                </div>
              ))}
              <button class="btn liten" onClick={() => lagre({ farger: [...steg.farger!, { farge: '', hex: '#cccccc', tekst: '' }] })}>
                + Farge
              </button>
            </Blokk>
          )}

          <div class="ed-ny">
            <span class="label">+ Legg til byggekloss</span>
            <div class="ed-ny-knapper">
              {NYE.filter((n) => (n.kloss === 'felter' ? true : !har(n.kloss)))
                .filter((n) => n.kloss !== 'hurtigtaster' || prosess.type === 'programvare')
                .map((n) => (
                  <button key={n.navn} class="ny-kloss" onClick={() => lagre(n.lag(steg, prosess))}>
                    <span class="ny-ikon">{n.ikon}</span>
                    {n.navn}
                  </button>
                ))}
            </div>
          </div>
        </>
      )}

      <div class="panel-fot ed-fot">
        <div class="knapperad">
          <button class="btn liten" onClick={() => endreProsess(prosessId, (p) => op.flyttSteg(p, stegId, -1))}>
            ▲ Opp
          </button>
          <button class="btn liten" onClick={() => endreProsess(prosessId, (p) => op.flyttSteg(p, stegId, 1))}>
            ▼ Ned
          </button>
          <button class="btn liten" onClick={nyttSteg}>
            + Nytt steg etter
          </button>
          <button
            class="btn liten"
            onClick={() => {
              let ny = '';
              endreProsess(prosessId, (p) => {
                const r = op.dupliserSteg(p, stegId);
                ny = r.nyId;
                return r.prosess;
              });
              if (ny) onVelg(ny);
            }}
          >
            Dupliser
          </button>
          <button class="btn liten fare" onClick={slett}>
            Slett steg
          </button>
        </div>
      </div>
    </aside>
  );
}

function Blokk({ navn, onFjern, children }: { navn: string; onFjern: () => void; children: ComponentChildren }) {
  return (
    <section class="ed-blokk aktiv">
      <header>
        <span class="label">{navn}</span>
        <button class="regel-fjern" onClick={onFjern} aria-label={`Fjern ${navn}`} title="Fjern byggeklossen">
          ×
        </button>
      </header>
      {children}
    </section>
  );
}

/* ── Valg ──────────────────────────────────────────────────── */

function ValgEditor({ valg, onEndre }: { valg: Valg; onEndre: (v: Valg) => void }) {
  if (valg.type === 'janei') {
    return (
      <>
        <Tekst etikett="Spørsmål" verdi={valg.sporsmal} onLagre={(v) => onEndre({ ...valg, sporsmal: v })} />
        <div class="ed-rad">
          <Tekst etikett="Knapp «ja»" verdi={valg.knapper?.ja ?? 'Ja'} onLagre={(v) => onEndre({ ...valg, knapper: { ja: v || 'Ja', nei: valg.knapper?.nei ?? 'Nei' } })} />
          <Tekst etikett="Knapp «nei»" verdi={valg.knapper?.nei ?? 'Nei'} onLagre={(v) => onEndre({ ...valg, knapper: { ja: valg.knapper?.ja ?? 'Ja', nei: v || 'Nei' } })} />
        </div>
        <Tekst etikett="Hva betyr «ja»?" flerlinjer verdi={valg.ja} onLagre={(v) => onEndre({ ...valg, ja: v })} />
        <Tekst etikett="Hva betyr «nei»?" flerlinjer verdi={valg.nei} onLagre={(v) => onEndre({ ...valg, nei: v })} />
      </>
    );
  }
  const alt = valg.alternativer;
  const sett = (a: typeof alt) => onEndre({ ...valg, alternativer: a });
  return (
    <>
      <Tekst etikett="Spørsmål" verdi={valg.sporsmal} onLagre={(v) => onEndre({ ...valg, sporsmal: v })} />
      <div class="segmented liten-seg" role="group" aria-label="Type valg">
        <button aria-pressed={valg.type === 'ett'} onClick={() => onEndre({ ...valg, type: 'ett' })}>
          Velg ett
        </button>
        <button aria-pressed={valg.type === 'flere'} onClick={() => onEndre({ ...valg, type: 'flere' })}>
          Huk av flere
        </button>
      </div>
      {alt.map((a, i) => (
        <div key={a.id} class="ed-rad alt-rad">
          <span class="alt-nr">{i + 1}</span>
          <Tekst verdi={a.navn} plassholder="Alternativ" onLagre={(v) => sett(alt.map((x) => (x.id === a.id ? { ...x, navn: v } : x)))} />
          <Tekst verdi={a.beskrivelse ?? ''} plassholder="Beskrivelse (valgfritt)" onLagre={(v) => sett(alt.map((x) => (x.id === a.id ? { ...x, beskrivelse: v || undefined } : x)))} />
          <RadKnapper
            onOpp={i > 0 ? () => sett(flyttI(alt, i, -1)) : undefined}
            onNed={i < alt.length - 1 ? () => sett(flyttI(alt, i, 1)) : undefined}
            onFjern={() => sett(alt.filter((x) => x.id !== a.id))}
          />
        </div>
      ))}
      <button class="btn liten" onClick={() => sett([...alt, { id: op.nyId('a'), navn: `Alternativ ${alt.length + 1}` }])}>
        + Alternativ
      </button>
    </>
  );
}

/* ── Felter ────────────────────────────────────────────────── */

function FeltEditor({ felter, onEndre }: { felter: Felt[]; onEndre: (f: Felt[]) => void }) {
  const sett = (i: number, felt: Partial<Felt>) => onEndre(felter.map((f, j) => (j === i ? { ...f, ...felt } : f)));
  return (
    <>
      {felter.map((f, i) => (
        <div key={f.nokkel} class="felt-edit">
          <div class="ed-rad">
            <Tekst verdi={f.etikett} plassholder="Etikett" onLagre={(v) => sett(i, { etikett: v })} />
            <select value={f.type ?? 'tekst'} aria-label="Type felt" onChange={(e) => sett(i, { type: (e.target as HTMLSelectElement).value as 'tekst' | 'tall' })}>
              <option value="tekst">Tekst</option>
              <option value="tall">Tall</option>
            </select>
            <RadKnapper
              onOpp={i > 0 ? () => onEndre(flyttI(felter, i, -1)) : undefined}
              onNed={i < felter.length - 1 ? () => onEndre(flyttI(felter, i, 1)) : undefined}
              onFjern={() => onEndre(felter.filter((_, j) => j !== i))}
            />
          </div>
          <div class="ed-rad">
            <Tekst verdi={f.plassholder ?? ''} plassholder="Eksempel i feltet" onLagre={(v) => sett(i, { plassholder: v || undefined })} />
            {f.type === 'tall' && <Tekst klasse="enhet" verdi={f.enhet ?? ''} plassholder="Enhet" onLagre={(v) => sett(i, { enhet: v || undefined })} />}
            <label class="sjekk">
              <input type="checkbox" checked={!!f.viktig} onChange={(e) => sett(i, { viktig: (e.target as HTMLInputElement).checked || undefined })} />
              Vis i prosjekthodet
            </label>
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Hurtigtaster ──────────────────────────────────────────── */

function TastEditor({ prosessId, prosess, valgte, onEndre }: { prosessId: string; prosess: Prosess; valgte: string[]; onEndre: (t: string[]) => void }) {
  const [ny, setNy] = useState('');
  const kjente = prosess.hurtigtaster ?? [];
  const leggTil = (tast: string) => {
    const t = tast.trim().replace(/\s*\+\s*/g, ' + ');
    if (!t || valgte.includes(t)) return;
    if (!kjente.some((k) => k.tast === t)) {
      const tekst = prompt(`Hva gjør ${t}?`) ?? '';
      endreProsess(prosessId, (p) => ({ ...p, hurtigtaster: [...(p.hurtigtaster ?? []), { tast: t, tekst }] }));
    }
    onEndre([...valgte, t]);
    setNy('');
  };
  return (
    <>
      <div class="tast-valgte">
        {valgte.map((t) => (
          <span key={t} class="chip tast-chip">
            {t}
            <button onClick={() => onEndre(valgte.filter((x) => x !== t))} aria-label={`Fjern ${t}`}>
              ×
            </button>
          </span>
        ))}
        {!valgte.length && <span class="panel-hint">Ingen valgt ennå.</span>}
      </div>
      <div class="ed-rad">
        <input
          list={`taster-${prosessId}`}
          value={ny}
          placeholder="Velg eller skriv, f.eks. Ctrl + E"
          onInput={(e) => setNy((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && leggTil(ny)}
        />
        <button class="btn liten" onClick={() => leggTil(ny)}>
          Legg til
        </button>
        <datalist id={`taster-${prosessId}`}>
          {kjente.map((k) => (
            <option key={k.tast} value={k.tast}>
              {k.tekst}
            </option>
          ))}
        </datalist>
      </div>
    </>
  );
}
