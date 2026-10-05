import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { lagreFil } from '../data/media';
import { gjeldende } from '../prosess/arkiv';
import { hentProsjekt, lesInn, opprett, prosessFor, type InnlestVerdi } from '../prosess/prosjekter';
import type { DokType, Prosess, Prosjekt, ProsjektDokument, Svar } from '../prosess/types';
import { bruker } from '../ui/settings';
import type { LestDokument } from './les';
import { DOK_KORT, DOK_NAVN, gjettType, kontroller, like, tolk, type Linje, type Resultat, type Treff } from './tolk';
import './innlesing.css';

/* ─────────────────────────────────────────────────────────────
   «Les inn ordre»: dra inn ordrebekreftelse og/eller produksjonsordre.

   1. Dokumenter – hver fil leses lokalt (tekst eller OCR), typen gjettes.
   2. Kontroller – hvert felt vises med status, verdi og linjen det ble
      funnet i. Klikk på et felt for å se linjen markert i dokumentet.
      Alle felt må bekreftes (eller velges bort) før noe brukes.
   ───────────────────────────────────────────────────────────── */

interface Dok {
  id: string;
  fil: File;
  type: DokType;
  status: 'venter' | 'leser' | 'klar' | 'feil';
  melding: string;
  andel?: number;
  lest?: LestDokument;
  sider: string[];
}

interface Props {
  prosessId: string;
  /** Les inn i et eksisterende prosjekt i stedet for å lage et nytt. */
  prosjektId?: string;
  filer?: File[];
  onLukk: () => void;
  onFerdig: (prosjektId: string) => void;
}

let teller = 0;
const GODTATT = '.pdf,image/png,image/jpeg,image/webp';

function visVerdi(r: Pick<Resultat, 'alternativer'>, v: Svar | undefined): string {
  if (v === undefined) return '';
  const navn = (id: string) => r.alternativer?.find((a) => a.id === id)?.navn ?? id;
  return Array.isArray(v) ? v.map(navn).join(', ') || 'Ingen' : r.alternativer ? navn(v) : v;
}

function tom(r: Resultat, v: Svar | undefined) {
  if (r.art === 'flere') return v === undefined;
  return v === undefined || (typeof v === 'string' && !v.trim());
}

/** For et eksisterende prosjekt: sammenlign med det som står der fra før. */
function sammenlign(resultater: Resultat[], p: Prosjekt | undefined): Resultat[] {
  if (!p) return resultater;
  return resultater.flatMap((r) => {
    const fra = p.svar[r.nokkel] ?? p.felt[r.nokkel] ?? (r.nokkel === 'kalkylenr' ? p.kalkylenr : r.nokkel === 'kunde' ? p.kunde : undefined);
    if (fra === undefined || fra === '') return [r];
    if (r.verdi === undefined || !r.treff.length) return []; // står ikke i dokumentet → la prosjektet være
    const lik = Array.isArray(fra) || Array.isArray(r.verdi) ? JSON.stringify(fra) === JSON.stringify(r.verdi) : like(r.art, String(fra), String(r.verdi));
    if (lik) return [{ ...r, grunn: [r.grunn, 'Stemmer med prosjektet.'].filter(Boolean).join(' ') }];
    return [{ ...r, status: 'usikker' as const, grunn: [r.grunn, `Prosjektet har «${visVerdi(r, fra)}» fra før.`].filter(Boolean).join(' ') }];
  });
}

export function InnlesingDialog({ prosessId, prosjektId, filer, onLukk, onFerdig }: Props) {
  const prosjekt = prosjektId ? hentProsjekt(prosjektId) : undefined;
  const prosess: Prosess | undefined = prosjekt ? prosessFor(prosjekt) : gjeldende(prosessId);
  const oppsett = prosess?.innlesing;

  const [doks, setDoks] = useState<Dok[]>([]);
  const [steg, setSteg] = useState<'dok' | 'kontroll'>('dok');
  const [lagrer, setLagrer] = useState(false);
  const ko = useRef(Promise.resolve());

  const endre = (id: string, felt: Partial<Dok>) => setDoks((d) => d.map((x) => (x.id === id ? { ...x, ...felt } : x)));

  const leggTil = (liste: FileList | File[] | null) => {
    const nye: Dok[] = [...(liste ?? [])]
      .filter((f) => /pdf|image/.test(f.type) || /\.(pdf|png|jpe?g|webp)$/i.test(f.name))
      .map((fil) => ({ id: `d${++teller}`, fil, type: 'annet', status: 'venter', melding: 'Venter', sider: [] }));
    setDoks((d) => [...d, ...nye]);
    // Ett dokument om gangen: OCR bruker mye kraft.
    for (const d of nye) {
      ko.current = ko.current.then(async () => {
        endre(d.id, { status: 'leser', melding: 'Leser …' });
        try {
          // Lastes først når det trengs (pdf.js og OCR er store).
          const { lesDokument } = await import('./les');
          const lest = await lesDokument(d.fil, (melding, andel) => endre(d.id, { melding, andel }));
          endre(d.id, { status: 'klar', lest, type: gjettType(lest.linjer), melding: lest.ocr ? 'Skannet – lest med OCR' : 'Lest som tekst', sider: lest.sider.map((s) => URL.createObjectURL(s.bilde)) });
        } catch (e) {
          console.error(e);
          endre(d.id, { status: 'feil', melding: `Kunne ikke lese filen (${e instanceof Error ? e.message : String(e)})` });
        }
      });
    }
  };

  useEffect(() => {
    if (filer?.length) leggTil(filer);
    const lim = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])];
      if (f.length) leggTil(f);
    };
    window.addEventListener('paste', lim);
    return () => window.removeEventListener('paste', lim);
  }, []);

  if (!prosess || !oppsett) {
    return (
      <Ramme tittel="Les inn ordre" onLukk={onLukk}>
        <p>Denne prosessen har ikke noe regelbibliotek for innlesing ennå. Det legges inn under «Rediger prosess → Innlesing».</p>
      </Ramme>
    );
  }

  const klare = doks.filter((d) => d.status === 'klar');
  const leser = doks.some((d) => d.status === 'venter' || d.status === 'leser');

  return (
    <Ramme tittel={prosjekt ? `Les inn i ${prosjekt.nummer}` : 'Les inn ordre'} onLukk={onLukk} steg={steg}>
      {steg === 'dok' ? (
        <>
          <p class="ir-ingress">
            Dra inn <strong>ordrebekreftelsen</strong> og/eller <strong>produksjonsordren</strong> (PDF eller bilde). Alt leses her på maskinen. Ingenting sendes noe sted.
          </p>
          <Slippsone onFiler={leggTil} />
          {doks.length > 0 && (
            <ul class="ir-doks">
              {doks.map((d) => (
                <li key={d.id} class={`ir-dok card ${d.status}`}>
                  <span class="ir-dok-ikon" aria-hidden="true">
                    {d.fil.type.includes('pdf') ? 'PDF' : 'IMG'}
                  </span>
                  <span class="ir-dok-tekst">
                    <strong>{d.fil.name}</strong>
                    <span class="label">
                      {d.melding}
                      {d.lest ? ` · ${d.lest.sider.length} side${d.lest.sider.length > 1 ? 'r' : ''}` : ''}
                    </span>
                    {d.status === 'leser' && <span class="ir-bar" style={{ '--andel': d.andel ?? 0.05 }} />}
                  </span>
                  {d.status === 'klar' && (
                    <span class="segmented ir-type" role="group" aria-label="Dokumenttype">
                      {(['ob', 'po', 'planview', 'annet'] as DokType[]).map((t) => (
                        <button key={t} aria-pressed={d.type === t} onClick={() => endre(d.id, { type: t })} title={DOK_NAVN[t]}>
                          {t === 'annet' ? 'Annet' : t === 'planview' ? 'Planview' : DOK_NAVN[t]}
                        </button>
                      ))}
                    </span>
                  )}
                  <button class="panel-lukk" aria-label="Fjern" onClick={() => setDoks((x) => x.filter((y) => y.id !== d.id))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p class="panel-hint">Typen gjettes ut fra innholdet. «Annet» (f.eks. måleskisser) lagres med prosjektet, men tolkes ikke.</p>
          <div class="modal-knapper">
            <button class="btn" onClick={onLukk}>
              Avbryt
            </button>
            <button class="btn btn-primary" disabled={leser || !klare.some((d) => d.type !== 'annet')} onClick={() => setSteg('kontroll')}>
              {leser ? 'Leser …' : 'Kontroller feltene →'}
            </button>
          </div>
        </>
      ) : (
        <Kontroll
          prosess={prosess}
          prosjekt={prosjekt}
          doks={klare}
          lagrer={lagrer}
          onTilbake={() => setSteg('dok')}
          onBruk={async (verdier) => {
            setLagrer(true);
            try {
              const dokumenter: ProsjektDokument[] = [];
              for (const d of klare) {
                dokumenter.push({
                  id: d.id + Date.now().toString(36),
                  navn: d.fil.name,
                  type: d.type,
                  fil: await lagreFil(d.fil),
                  sider: await Promise.all(d.lest!.sider.map((s) => lagreFil(s.bilde))),
                  lest: new Date().toISOString(),
                  brukerId: bruker.value,
                  ocr: d.lest!.ocr,
                });
              }
              let id = prosjektId;
              if (!id) {
                const v = (k: string) => verdier.find((x) => x.nokkel === k)?.verdi as string | undefined;
                const nr = v('prosjektnr')?.toUpperCase() || (v('kalkylenr') ? `Kalkyle ${v('kalkylenr')}` : 'Nytt prosjekt');
                id = (await opprett({ prosessId, type: 'prosjekt', nummer: nr, kalkylenr: v('kalkylenr'), kunde: v('kunde') })).id;
              }
              await lesInn(id, verdier, dokumenter);
              onFerdig(id);
            } finally {
              setLagrer(false);
            }
          }}
        />
      )}
    </Ramme>
  );
}

/** Stor dialog (egen ramme — trenger mer plass enn den vanlige Modal). */
function Ramme({ tittel, onLukk, steg, children }: { tittel: string; onLukk: () => void; steg?: 'dok' | 'kontroll'; children: ComponentChildren }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target as HTMLElement).closest('input, textarea, select') && onLukk();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  return (
    <div class="modal-bakgrunn">
      <div class="modal card ir-modal" role="dialog" aria-modal="true" aria-labelledby="ir-tittel">
        <div class="modal-topp">
          <span class="label">
            Innlesing {steg && <>· {steg === 'dok' ? '1 Dokumenter' : '2 Kontroller og bekreft'}</>}
          </span>
          <button class="panel-lukk" onClick={onLukk} aria-label="Lukk">
            ×
          </button>
        </div>
        <h2 id="ir-tittel" class="dot modal-tittel">
          {tittel}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function Slippsone({ onFiler, kompakt }: { onFiler: (f: FileList | null) => void; kompakt?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      class={`ir-slipp ${over ? 'over' : ''} ${kompakt ? 'kompakt' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiler(e.dataTransfer?.files ?? null);
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
    >
      <span class="dot ir-slipp-pil" aria-hidden="true">
        ⇩
      </span>
      <span>
        <strong>Dra filene hit</strong>, lim inn (Ctrl+V) eller klikk for å velge
      </span>
      <span class="label">PDF · PNG · JPG — skannet eller lesbar</span>
      <input
        ref={input}
        type="file"
        multiple
        accept={GODTATT}
        hidden
        onChange={(e) => {
          onFiler((e.target as HTMLInputElement).files);
          (e.target as HTMLInputElement).value = '';
        }}
      />
    </div>
  );
}

/* ── Steg 2: kontroller og bekreft ─────────────────────────── */

interface KontrollProps {
  prosess: Prosess;
  prosjekt?: Prosjekt;
  doks: Dok[];
  lagrer: boolean;
  onTilbake: () => void;
  onBruk: (verdier: InnlestVerdi[]) => void;
}

interface Visning {
  dokId: string;
  side: number;
  linje?: Linje;
}

function Kontroll({ prosess, prosjekt, doks, lagrer, onTilbake, onBruk }: KontrollProps) {
  const resultater = useMemo(
    () =>
      sammenlign(
        tolk(
          doks.map((d) => ({ id: d.id, type: d.type, navn: d.fil.name, linjer: d.lest!.linjer })),
          prosess.innlesing!,
          prosess,
        ),
        prosjekt,
      ),
    [],
  );
  const [verdier, setVerdier] = useState<Record<string, Svar | undefined>>(() => Object.fromEntries(resultater.map((r) => [r.nokkel, r.verdi])));
  const [bekreftet, setBekreftet] = useState<Record<string, 'ja' | 'utelatt'>>({});
  const [valgt, setValgt] = useState<string | null>(resultater.find((r) => r.treff.length)?.nokkel ?? resultater[0]?.nokkel ?? null);
  const [visning, setVisning] = useState<Visning>(() => {
    const t = resultater.find((r) => r.treff.length)?.treff[0];
    return t ? { dokId: t.dokId, side: t.linje.side, linje: t.linje } : { dokId: doks.find((d) => d.type !== 'annet')?.id ?? doks[0].id, side: 1 };
  });
  const liste = useRef<HTMLOListElement>(null);

  const visTreff = (t: Treff) => setVisning({ dokId: t.dokId, side: t.linje.side, linje: t.linje });
  const velg = (r: Resultat) => {
    setValgt(r.nokkel);
    if (r.treff[0]) visTreff(r.treff[0]);
  };

  const ferdige = resultater.filter((r) => bekreftet[r.nokkel]).length;
  const alleFerdige = ferdige === resultater.length;
  const ktr = kontroller(verdier);

  const bekreft = (r: Resultat, hva: 'ja' | 'utelatt' = 'ja') => {
    if (hva === 'ja' && tom(r, verdier[r.nokkel])) return;
    const ny = { ...bekreftet, [r.nokkel]: hva };
    setBekreftet(ny);
    // Hopp til neste som ikke er bekreftet.
    const i = resultater.indexOf(r);
    const neste = [...resultater.slice(i + 1), ...resultater.slice(0, i)].find((x) => !ny[x.nokkel]);
    if (neste) {
      velg(neste);
      requestAnimationFrame(() => liste.current?.querySelector<HTMLElement>(`[data-nokkel="${neste.nokkel}"]`)?.focus());
    }
  };

  const settVerdi = (r: Resultat, v: Svar | undefined) => {
    setVerdier((x) => ({ ...x, [r.nokkel]: v }));
    setBekreftet((x) => {
      const { [r.nokkel]: _, ...rest } = x;
      return rest;
    });
  };

  const bruk = () => {
    const ut: InnlestVerdi[] = [];
    for (const r of resultater) {
      if (bekreftet[r.nokkel] !== 'ja') continue;
      const v = verdier[r.nokkel]!;
      const t = r.treff.find((x) => JSON.stringify(x.verdi) === JSON.stringify(v)) ?? r.treff[0];
      const egen = JSON.stringify(v) !== JSON.stringify(r.verdi);
      ut.push({
        nokkel: r.nokkel,
        etikett: r.etikett,
        verdi: v,
        tekst: visVerdi(r, v) + (r.enhet && r.art === 'tall' ? ` ${r.enhet}` : ''),
        kilde: egen ? 'skrevet inn' : t ? `${DOK_KORT[t.dokType]} s.${t.linje.side}: «${t.linje.tekst.slice(0, 70)}»` : 'foreslått',
      });
    }
    onBruk(ut);
  };

  const antall = { funnet: 0, usikker: 0, mangler: 0 };
  for (const r of resultater) antall[r.status]++;

  return (
    <>
      <div class="ir-oppsummering">
        <span class="chip ir-chip funnet">{antall.funnet} funnet</span>
        <span class="chip ir-chip usikker">{antall.usikker} usikre</span>
        <span class="chip ir-chip mangler">{antall.mangler} mangler</span>
        <span class="panel-hint">Klikk et felt for å se linjen i dokumentet. Enter bekrefter og går til neste.</span>
      </div>

      <div class="ir-kontroll">
        <ol class="ir-felter" ref={liste}>
          {resultater.map((r) => (
            <FeltRad
              key={r.nokkel}
              r={r}
              verdi={verdier[r.nokkel]}
              bekreftet={bekreftet[r.nokkel]}
              valgt={valgt === r.nokkel}
              onVelg={() => velg(r)}
              onVerdi={(v) => settVerdi(r, v)}
              onBekreft={(hva) => bekreft(r, hva)}
              onAngre={() => settVerdi(r, verdier[r.nokkel])}
              onVisTreff={visTreff}
            />
          ))}
        </ol>
        <DokVisning doks={doks} visning={visning} onVis={setVisning} />
      </div>

      {ktr.length > 0 && (
        <ul class="ir-kontroller">
          {ktr.map((k) => (
            <li key={k.tekst} class={k.ok ? 'ok' : 'avvik'}>
              {k.ok ? '✓' : '⚠'} {k.tekst}
            </li>
          ))}
        </ul>
      )}

      <div class="modal-knapper ir-bunn">
        <span class="ir-teller">
          <span class="dot">
            {ferdige}/{resultater.length}
          </span>{' '}
          <span class="label">bekreftet</span>
        </span>
        <button class="btn" onClick={onTilbake}>
          ← Dokumenter
        </button>
        <button class="btn btn-primary" disabled={!alleFerdige || lagrer} onClick={bruk} title={alleFerdige ? '' : 'Alle felt må bekreftes først'}>
          {lagrer ? 'Lagrer …' : prosjekt ? 'Oppdater prosjektet' : 'Opprett prosjekt'}
        </button>
      </div>
    </>
  );
}

interface RadProps {
  r: Resultat;
  verdi: Svar | undefined;
  bekreftet?: 'ja' | 'utelatt';
  valgt: boolean;
  onVelg: () => void;
  onVerdi: (v: Svar | undefined) => void;
  onBekreft: (hva?: 'ja' | 'utelatt') => void;
  onAngre: () => void;
  onVisTreff: (t: Treff) => void;
}

const STATUS_TEKST = { funnet: 'Funnet', usikker: 'Usikker', mangler: 'Mangler' };

function FeltRad({ r, verdi, bekreftet, valgt, onVelg, onVerdi, onBekreft, onAngre, onVisTreff }: RadProps) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (valgt) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [valgt]);
  const kanBekrefte = !tom(r, verdi);

  return (
    <li
      ref={ref}
      data-nokkel={r.nokkel}
      class={`ir-rad ${r.status} ${valgt ? 'valgt' : ''} ${bekreftet ? 'ferdig' : ''}`}
      tabIndex={0}
      onFocusIn={onVelg}
      onClick={onVelg}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
          e.preventDefault();
          if (!bekreftet) onBekreft();
        }
      }}
    >
      <span class={`ir-status ${bekreftet ? 'ferdig' : r.status}`} title={STATUS_TEKST[r.status]}>
        {bekreftet === 'ja' ? '✓' : bekreftet === 'utelatt' ? '–' : ''}
      </span>
      <div class="ir-innhold">
        <span class="ir-etikett">
          {r.etikett}
          <span class="label"> · {bekreftet === 'ja' ? 'Bekreftet' : bekreftet === 'utelatt' ? 'Brukes ikke' : STATUS_TEKST[r.status]}</span>
        </span>
        {bekreftet ? (
          <span class="ir-verdi-fast">
            {bekreftet === 'utelatt' ? <s>{visVerdi(r, verdi) || '—'}</s> : visVerdi(r, verdi)}
            {r.enhet && r.art === 'tall' && bekreftet === 'ja' ? ` ${r.enhet}` : ''}
          </span>
        ) : (
          <VerdiKontroll r={r} verdi={verdi} onVerdi={onVerdi} />
        )}
        {r.grunn && !bekreftet && <p class="ir-grunn">{r.grunn}</p>}
        {r.varsler.map((v) => (
          <p key={v.tekst} class="ir-varsel">
            ⚠ {v.tekst}
          </p>
        ))}
        {valgt &&
          [...r.treff, ...r.varsler.map((v) => v.treff)].slice(0, 4).map((t, i) => (
            <button
              key={i}
              class="ir-kilde"
              onClick={(e) => {
                e.stopPropagation();
                onVisTreff(t);
              }}
            >
              <span class="label">
                {DOK_KORT[t.dokType]} s.{t.linje.side}
                {t.linje.sikkerhet !== undefined ? ` · OCR ${Math.round(t.linje.sikkerhet)}%` : ''}
              </span>
              «{t.linje.tekst}»
            </button>
          ))}
      </div>
      <div class="ir-knapper">
        {bekreftet ? (
          <button
            class="btn liten"
            onClick={(e) => {
              e.stopPropagation();
              onAngre();
            }}
          >
            Endre
          </button>
        ) : (
          <>
            <button
              class={`btn liten ${valgt ? 'btn-primary' : ''}`}
              disabled={!kanBekrefte}
              onClick={(e) => {
                e.stopPropagation();
                onBekreft('ja');
              }}
            >
              Bekreft
            </button>
            {r.status !== 'mangler' && (
              <button
                class="btn liten ir-utelat"
                title="Ikke bruk denne verdien"
                onClick={(e) => {
                  e.stopPropagation();
                  onBekreft('utelatt');
                }}
              >
                Bruk ikke
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function VerdiKontroll({ r, verdi, onVerdi }: { r: Resultat; verdi: Svar | undefined; onVerdi: (v: Svar | undefined) => void }) {
  if (r.art === 'flere') {
    const valgte = new Set((verdi as string[] | undefined) ?? []);
    return (
      <span class="ir-flere">
        {r.alternativer!.map((a) => (
          <label key={a.id} class="sjekk">
            <input
              type="checkbox"
              checked={valgte.has(a.id)}
              onChange={(e) => {
                const ny = new Set(valgte);
                (e.target as HTMLInputElement).checked ? ny.add(a.id) : ny.delete(a.id);
                onVerdi(r.alternativer!.map((x) => x.id).filter((x) => ny.has(x)));
              }}
            />
            {a.navn}
          </label>
        ))}
      </span>
    );
  }
  if (r.alternativer) {
    return (
      <span class="segmented ir-valg" role="group" aria-label={r.etikett}>
        {r.alternativer.map((a) => (
          <button
            key={a.id}
            aria-pressed={verdi === a.id}
            onClick={() => onVerdi(a.id)}
          >
            {a.navn}
          </button>
        ))}
      </span>
    );
  }
  return (
    <span class="ir-input">
      <input
        value={(verdi as string | undefined) ?? ''}
        inputMode={r.art === 'tall' ? 'decimal' : undefined}
        placeholder={r.status === 'mangler' ? 'Fyll inn …' : ''}
        onInput={(e) => onVerdi((e.target as HTMLInputElement).value)}
      />
      {r.enhet && <span class="label">{r.enhet}</span>}
    </span>
  );
}

/** Dokumentet med linjen markert. Klikk på bildet for å forstørre. */
function DokVisning({ doks, visning, onVis }: { doks: Dok[]; visning: Visning; onVis: (v: Visning) => void }) {
  const [zoom, setZoom] = useState(false);
  const boks = useRef<HTMLDivElement>(null);
  const merke = useRef<HTMLSpanElement>(null);
  const dok = doks.find((d) => d.id === visning.dokId) ?? doks[0];
  const side = Math.min(visning.side, dok.sider.length);
  const b = visning.linje?.side === side ? visning.linje.boks : undefined;

  useEffect(() => {
    merke.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [visning, zoom]);

  return (
    <div class="ir-vis card">
      <div class="ir-vis-topp">
        <span class="segmented" role="group" aria-label="Dokument">
          {doks.map((d) => (
            <button key={d.id} aria-pressed={d.id === dok.id} onClick={() => onVis({ dokId: d.id, side: 1 })} title={d.fil.name}>
              {DOK_KORT[d.type]}
            </button>
          ))}
        </span>
        {dok.sider.length > 1 && (
          <span class="segmented" role="group" aria-label="Side">
            {dok.sider.map((_, i) => (
              <button key={i} aria-pressed={side === i + 1} onClick={() => onVis({ dokId: dok.id, side: i + 1 })}>
                s.{i + 1}
              </button>
            ))}
          </span>
        )}
        <button class="btn liten" onClick={() => setZoom(!zoom)}>
          {zoom ? '− Hele siden' : '+ Forstørr'}
        </button>
      </div>
      <div class={`ir-side ${zoom ? 'zoom' : ''}`} ref={boks}>
        <div class="ir-side-innhold">
          <img src={dok.sider[side - 1]} alt={`${dok.fil.name}, side ${side}`} onClick={() => setZoom(!zoom)} />
          {b && <span ref={merke} class="ir-merke" style={{ left: `${b[0] * 100}%`, top: `${b[1] * 100}%`, width: `${b[2] * 100}%`, height: `${b[3] * 100}%` }} />}
        </div>
      </div>
      <span class="label ir-vis-navn">
        {dok.fil.name} · {DOK_NAVN[dok.type]}
      </span>
    </div>
  );
}
