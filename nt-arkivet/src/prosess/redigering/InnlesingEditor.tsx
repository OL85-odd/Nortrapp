import { useState } from 'preact/hooks';
import { kompiler, fangerVerdi } from '../../import/monster';
import { Slippsone } from '../../import/InnlesingDialog';
import { DOK_KORT, feltInfo, gjettType, tolk, type Linje, type Resultat } from '../../import/tolk';
import type { ImportFelt, ImportRegel, Innlesing, Prosess } from '../types';
import { flyttI, RadKnapper, Tekst } from './Felter';
import { nyId } from './ops';
import { arbeidskopi, endreProsess } from './state';
import '../../import/innlesing.css';

/**
 * Regelbiblioteket for innlesing: hvilke felt som hentes fra ordrebekreftelse
 * og produksjonsordre, og hvilke mønstre som finner dem. Kan testes direkte
 * mot et dokument eller innlimt tekst.
 */
export function InnlesingEditor({ prosessId }: { prosessId: string }) {
  const p = arbeidskopi(prosessId);
  const [apen, setApen] = useState<string | null>(null);
  if (!p) return null;
  const oppsett = p.innlesing;
  const lagre = (fn: (o: Innlesing) => Innlesing) => endreProsess(prosessId, (x) => ({ ...x, innlesing: fn(x.innlesing ?? { felter: [], regler: [] }) }));

  if (!oppsett) {
    return (
      <aside class="steg-editor card" aria-label="Innlesing">
        <span class="label">Innlesing av dokumenter</span>
        <h2 class="dot panel-tittel">Innlesing</h2>
        <p class="panel-hint">
          Med et regelbibliotek kan prosjekter startes ved å dra inn ordrebekreftelse og produksjonsordre. Appen leser dokumentene og fyller ut valg og felt, som brukeren bekrefter.
        </p>
        <button class="btn btn-primary" onClick={() => lagre((o) => o)}>
          Slå på innlesing
        </button>
      </aside>
    );
  }

  const settFelt = (i: number, f: Partial<ImportFelt>) => lagre((o) => ({ ...o, felter: o.felter.map((x, j) => (j === i ? rens({ ...x, ...f }) : x)) }));
  const settRegel = (id: string, r: Partial<ImportRegel>) => lagre((o) => ({ ...o, regler: o.regler.map((x) => (x.id === id ? rens({ ...x, ...r }) : x)) }));

  const ledige = mulige(p).filter((m) => !oppsett.felter.some((f) => f.nokkel === m.nokkel));

  return (
    <aside class="steg-editor card ie" aria-label="Innlesing">
      <span class="label">
        Innlesing · {oppsett.felter.length} felt · {oppsett.regler.length} regler
      </span>
      <h2 class="dot panel-tittel">Innlesing</h2>
      <details class="ed-blokk">
        <summary>Slik skriver du et mønster</summary>
        <ul class="ie-hjelp">
          <li>
            <code>Reg.nr.: {'{tall}'}</code> — finner tallet etter «Reg.nr.:»
          </li>
          <li>
            <code>fargekoder: {'{tekst}'}</code> — tar med resten av kolonnen
          </li>
          <li>
            <code>RETT TRAPP</code> + fast verdi «Rett trapp» — treffer bare, og gir verdien du velger
          </li>
          <li>
            <code>Returgelender{'{*}'}mm</code> — <code>{'{*}'}</code> hopper over hva som helst
          </li>
          <li>Store/små bokstaver og mellomrom spiller ingen rolle. «regex:» foran gir et vanlig regulært uttrykk.</li>
          <li>«Usikker» betyr at treffet bare er et hint (gult). «Varsel» gir en rød melding, f.eks. «Ikke avklart».</li>
        </ul>
      </details>

      <ol class="ie-felter">
        {oppsett.felter.map((f, i) => {
          const info = feltInfo(p, f);
          const regler = oppsett.regler.filter((r) => r.felt === f.nokkel);
          const erApen = apen === f.nokkel;
          return (
            <li key={f.nokkel} class={`ie-felt ${erApen ? 'apen' : ''}`}>
              <div class="ie-felt-hode">
                <button class="ie-felt-navn" onClick={() => setApen(erApen ? null : f.nokkel)} aria-expanded={erApen}>
                  <span>{erApen ? '▾' : '▸'}</span>
                  <strong>{info.etikett}</strong>
                  <span class="label">
                    {f.nokkel} · {regler.length} {regler.length === 1 ? 'regel' : 'regler'}
                    {f.pakrevd ? ' · påkrevd' : ''}
                  </span>
                </button>
                <RadKnapper
                  onOpp={i > 0 ? () => lagre((o) => ({ ...o, felter: flyttI(o.felter, i, -1) })) : undefined}
                  onNed={i < oppsett.felter.length - 1 ? () => lagre((o) => ({ ...o, felter: flyttI(o.felter, i, 1) })) : undefined}
                  onFjern={() =>
                    confirm(`Fjerne feltet «${info.etikett}» og reglene for det?`) &&
                    lagre((o) => ({ felter: o.felter.filter((x) => x.nokkel !== f.nokkel), regler: o.regler.filter((r) => r.felt !== f.nokkel) }))
                  }
                />
              </div>
              {erApen && (
                <div class="ie-felt-innhold">
                  {!info.stegId && <Tekst etikett="Navn på feltet" verdi={f.etikett ?? ''} onLagre={(v) => settFelt(i, { etikett: v.trim() || undefined })} />}
                  <div class="ie-rad">
                    <label class="sjekk">
                      <input type="checkbox" checked={!!f.pakrevd} onChange={(e) => settFelt(i, { pakrevd: (e.target as HTMLInputElement).checked || undefined })} />
                      Påkrevd (spør hvis ikke funnet)
                    </label>
                    {f.pakrevd && (
                      <label class="sjekk">
                        <input type="checkbox" checked={f.kreverDok === 'po'} onChange={(e) => settFelt(i, { kreverDok: (e.target as HTMLInputElement).checked ? 'po' : undefined })} />
                        Bare når produksjonsordren er med
                      </label>
                    )}
                    {(info.art === 'tekst' || info.art === 'tall') && (
                      <label class="sjekk">
                        <input type="checkbox" checked={!!f.tall} onChange={(e) => settFelt(i, { tall: (e.target as HTMLInputElement).checked || undefined })} />
                        Tall
                      </label>
                    )}
                  </div>
                  {f.pakrevd && <Tekst etikett="Spørsmål når feltet mangler" verdi={f.sporsmal ?? ''} plassholder={`Fant ikke «${info.etikett}» i dokumentene. Fyll inn.`} onLagre={(v) => settFelt(i, { sporsmal: v.trim() || undefined })} />}
                  <label class="felt">
                    <span>Foreslått verdi hvis dokumentene ikke nevner feltet</span>
                    <VerdiVelger info={info} verdi={f.standard ?? ''} tom="(ingen)" onEndre={(v) => settFelt(i, { standard: v || undefined })} />
                  </label>
                  {(f.tall || info.art === 'tall') && (
                    <div class="ie-rad">
                      <Tekst etikett="Rimelig fra" verdi={f.omrade ? String(f.omrade[0]) : ''} onLagre={(v) => settFelt(i, { omrade: tilOmrade(v, f.omrade?.[1]) })} />
                      <Tekst etikett="til" verdi={f.omrade ? String(f.omrade[1]) : ''} onLagre={(v) => settFelt(i, { omrade: tilOmrade(f.omrade?.[0], v) })} />
                      <Tekst etikett="Enhet" verdi={f.enhet ?? ''} onLagre={(v) => settFelt(i, { enhet: v.trim() || undefined })} />
                    </div>
                  )}

                  <span class="label">Regler</span>
                  <ul class="ie-regler">
                    {regler.map((r) => (
                      <RegelRad key={r.id} r={r} info={info} onEndre={(x) => settRegel(r.id, x)} onFjern={() => lagre((o) => ({ ...o, regler: o.regler.filter((x) => x.id !== r.id) }))} />
                    ))}
                  </ul>
                  <button class="btn liten" onClick={() => lagre((o) => ({ ...o, regler: [...o.regler, { id: nyId('r'), felt: f.nokkel, monster: '' }] }))}>
                    + Ny regel
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <NyttFelt
        ledige={ledige}
        onLegg={(nokkel, etikett) => {
          lagre((o) => ({ ...o, felter: [...o.felter, rens({ nokkel, etikett })] }));
          setApen(nokkel);
        }}
      />

      <Test prosess={p} />
    </aside>
  );
}

/** Fjern tomme egenskaper, så lagret data holder seg ryddig. */
function rens<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;
}

function tilOmrade(a: string | number | undefined, b: string | number | undefined): [number, number] | undefined {
  const x = Number(a);
  const y = Number(b);
  return a !== '' && b !== '' && Number.isFinite(x) && Number.isFinite(y) && a !== undefined && b !== undefined ? [x, y] : undefined;
}

/** Valg-steg og skrivefelt i prosessen som kan fylles fra dokumentene. */
function mulige(p: Prosess): { nokkel: string; navn: string }[] {
  const steg = p.faser.flatMap((f) => f.steg);
  return [
    ...steg.filter((s) => s.valg).map((s) => ({ nokkel: s.id, navn: `Valg: ${s.valg!.sporsmal}` })),
    ...steg.flatMap((s) => (s.felter ?? []).map((f) => ({ nokkel: f.nokkel, navn: `Felt: ${f.etikett}` }))),
  ];
}

function VerdiVelger({ info, verdi, tom, onEndre }: { info: ReturnType<typeof feltInfo>; verdi: string; tom: string; onEndre: (v: string) => void }) {
  if (info.alternativer) {
    return (
      <select value={verdi} onChange={(e) => onEndre((e.target as HTMLSelectElement).value)}>
        <option value="">{tom}</option>
        {info.alternativer.map((a) => (
          <option key={a.id} value={a.id}>
            {a.navn}
          </option>
        ))}
      </select>
    );
  }
  return <Tekst verdi={verdi} plassholder={tom} onLagre={onEndre} />;
}

function RegelRad({ r, info, onEndre, onFjern }: { r: ImportRegel; info: ReturnType<typeof feltInfo>; onEndre: (r: Partial<ImportRegel>) => void; onFjern: () => void }) {
  const gyldig = !r.monster.trim() || !!kompiler(r.monster);
  const fanger = fangerVerdi(r.monster);
  const mangler = r.monster.trim() && !fanger && !r.verdi && !r.varsel;
  return (
    <li class="ie-regel">
      <div class="ie-rad">
        <Tekst klasse={`ie-monster ${gyldig ? '' : 'ugyldig'}`} verdi={r.monster} plassholder="F.eks. Reg.nr.: {tall}" onLagre={(v) => onEndre({ monster: v })} />
        <button class="regel-fjern" onClick={onFjern} aria-label="Fjern regelen">
          ×
        </button>
      </div>
      {!gyldig && <p class="feil">Mønsteret er ugyldig.</p>}
      <div class="ie-rad ie-valg">
        <label class="felt">
          <span>Gir verdien</span>
          {info.alternativer ? (
            <VerdiVelger info={info} verdi={r.verdi ?? ''} tom={fanger ? '(den fangede teksten)' : '(velg …)'} onEndre={(v) => onEndre({ verdi: v || undefined })} />
          ) : (
            <Tekst verdi={r.verdi ?? ''} plassholder={fanger ? '(den fangede verdien)' : 'Fast verdi'} onLagre={(v) => onEndre({ verdi: v.trim() || undefined })} />
          )}
        </label>
        <label class="felt">
          <span>Dokument</span>
          <select value={r.dok ?? ''} onChange={(e) => onEndre({ dok: ((e.target as HTMLSelectElement).value || undefined) as ImportRegel['dok'] })}>
            <option value="">Begge</option>
            <option value="ob">Ordrebekreftelse</option>
            <option value="po">Produksjonsordre</option>
            <option value="planview">Planview</option>
          </select>
        </label>
      </div>
      {mangler && <p class="feil">Regelen trenger {'{tall}'}/{'{tekst}'} i mønsteret, en fast verdi eller et varsel.</p>}
      <div class="ie-rad">
        <label class="sjekk">
          <input type="checkbox" checked={!!r.usikker} onChange={(e) => onEndre({ usikker: (e.target as HTMLInputElement).checked || undefined })} />
          Usikker (bare hint)
        </label>
      </div>
      <details class="ie-mer" open={!!(r.unntak || r.varsel)}>
        <summary>Unntak og varsel</summary>
        <Tekst etikett="Ikke når linjen også inneholder" verdi={r.unntak ?? ''} plassholder="F.eks. ikke medregnet" onLagre={(v) => onEndre({ unntak: v.trim() || undefined })} />
        <Tekst etikett="Rødt varsel når regelen slår til" verdi={r.varsel ?? ''} plassholder="F.eks. Overflaten må avklares før produksjon." onLagre={(v) => onEndre({ varsel: v.trim() || undefined })} />
      </details>
    </li>
  );
}

function NyttFelt({ ledige, onLegg }: { ledige: { nokkel: string; navn: string }[]; onLegg: (nokkel: string, etikett?: string) => void }) {
  const [valg, setValg] = useState('');
  const [navn, setNavn] = useState('');
  return (
    <div class="ie-nytt">
      <span class="label">Nytt felt</span>
      <div class="ie-rad">
        <select value={valg} onChange={(e) => setValg((e.target as HTMLSelectElement).value)}>
          <option value="">Velg et valg eller felt i prosessen …</option>
          {ledige.map((m) => (
            <option key={m.nokkel} value={m.nokkel}>
              {m.navn}
            </option>
          ))}
          <option value="__eget">Eget felt (bare til informasjon) …</option>
        </select>
        {valg === '__eget' && <input value={navn} placeholder="Navn, f.eks. Etasjehøyde" onInput={(e) => setNavn((e.target as HTMLInputElement).value)} />}
        <button
          class="btn liten"
          disabled={!valg || (valg === '__eget' && !navn.trim())}
          onClick={() => {
            if (valg === '__eget') onLegg(slugg(navn), navn.trim());
            else onLegg(valg);
            setValg('');
            setNavn('');
          }}
        >
          Legg til
        </button>
      </div>
    </div>
  );
}

function slugg(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || nyId('felt')
  );
}

/** Test reglene mot et dokument eller innlimt tekst — uten å lage et prosjekt. */
function Test({ prosess }: { prosess: Prosess }) {
  const [tekst, setTekst] = useState('');
  const [melding, setMelding] = useState('');
  const [linjer, setLinjer] = useState<Linje[] | null>(null);
  const kilde: Linje[] | null = linjer ?? (tekst.trim() ? tekst.split('\n').map((t) => ({ tekst: t, side: 1 })) : null);
  const type = kilde ? gjettType(kilde) : 'annet';
  const res: Resultat[] = kilde ? tolk([{ id: 'test', type: type === 'annet' ? 'po' : type, navn: 'test', linjer: kilde }], prosess.innlesing!, prosess) : [];

  return (
    <details class="ed-blokk ie-test">
      <summary>Test reglene</summary>
      <Slippsone
        kompakt
        onFiler={async (filer) => {
          const f = filer?.[0];
          if (!f) return;
          setMelding('Leser …');
          try {
            const { lesDokument } = await import('../../import/les');
            const d = await lesDokument(f, (t) => setMelding(t));
            setLinjer(d.linjer);
            setMelding(`${f.name}: ${d.linjer.length} linjer${d.ocr ? ' (OCR)' : ''}`);
          } catch (e) {
            setMelding('Kunne ikke lese filen: ' + String(e));
          }
        }}
      />
      <textarea
        class="ie-testtekst"
        value={linjer ? linjer.map((l) => l.tekst).join('\n') : tekst}
        placeholder="… eller lim inn tekst her, én linje per linje i dokumentet"
        onInput={(e) => {
          setLinjer(null);
          setTekst((e.target as HTMLTextAreaElement).value);
        }}
      />
      {melding && <p class="panel-hint">{melding}</p>}
      {kilde && (
        <>
          <span class="label">Tolket som {type === 'annet' ? 'produksjonsordre (ukjent type)' : type === 'ob' ? 'ordrebekreftelse' : 'produksjonsordre'}</span>
          <table class="ie-resultat">
            <tbody>
              {res.map((r) => (
                <tr key={r.nokkel} class={r.status}>
                  <td>{r.etikett}</td>
                  <td>
                    <strong>{Array.isArray(r.verdi) ? r.verdi.map((v) => r.alternativer?.find((a) => a.id === v)?.navn ?? v).join(', ') : r.alternativer?.find((a) => a.id === r.verdi)?.navn ?? r.verdi ?? '—'}</strong>
                    {r.grunn && <div class="panel-hint">{r.grunn}</div>}
                    {r.treff[0] && (
                      <div class="ie-kilde">
                        {DOK_KORT[r.treff[0].dokType]}: «{r.treff[0].linje.tekst}»
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </details>
  );
}
