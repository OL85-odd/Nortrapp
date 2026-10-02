import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Kort } from '../data/types';
import { fargeVar } from '../data/types';
import { brytTekst, lagLayout, type Layout } from './layout';
import './metro.css';

interface Props {
  linje: Kort;
  valgt?: string | null;
  onVelg?: (stasjonId: string) => void;
  /** Redigeringsmodus: viser +-punkter der nye stasjoner kan settes inn. */
  rediger?: boolean;
  onSettInn?: (indeks: number) => void;
}

/** Tegner én linje som et T-banekart. Tilpasser seg bredden den får. */
export function MetroMap({ linje, valgt, onVelg, rediger, onSettInn }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [bredde, setBredde] = useState(1000);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBredde(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lay = useMemo(() => lagLayout(linje, bredde), [linje, bredde]);
  const status = new Map(lay.noder.map((n) => [n.stasjon.id, n.stasjon.status]));
  const pluss = rediger ? plussPunkter(linje, lay) : [];

  return (
    <div class="metro" ref={ref} style={{ '--linje': fargeVar(linje.farge) }}>
      <svg
        viewBox={`0 0 ${lay.bredde} ${lay.hoyde}`}
        width={lay.bredde}
        height={lay.hoyde}
        role="group"
        aria-label={`${linje.navn}, ${lay.noder.length} stasjoner`}
      >
        <g class="spor">
          {lay.kanter.map((k) => (
            <path
              key={k.fra + k.til}
              d={k.d}
              class={status.get(k.til) === 'under_arbeid' ? 'spor-kant planlagt' : 'spor-kant'}
            />
          ))}
        </g>

        {lay.merke && (
          <g class="merke" transform={`translate(${lay.merke.x},${lay.merke.y})`} aria-hidden="true">
            <circle r="15" />
            <text dy="0.36em">
              {linje.kode}
            </text>
          </g>
        )}

        {lay.noder.map((n) => {
          const linjer = brytTekst(n.stasjon.navn, n.etikett === 'hoyre' ? (n.gren ? 10 : 26) : 13);
          const erValgt = valgt === n.stasjon.id;
          const velg = () => onVelg?.(n.stasjon.id);
          return (
            <g
              key={n.stasjon.id}
              class={`stasjon ${n.stasjon.status} ${erValgt ? 'valgt' : ''} ${n.gren ? 'gren' : ''}`}
              transform={`translate(${n.x},${n.y})`}
              role="button"
              tabIndex={0}
              aria-pressed={erValgt}
              aria-label={`${n.stasjon.navn}${n.stasjon.status === 'under_arbeid' ? ', under arbeid' : ''}`}
              onClick={velg}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  velg();
                }
              }}
            >
              <circle class="treff" r="22" />
              {erValgt && <circle class="puls" r="11" />}
              <circle class="punkt" r={n.gren ? 7 : 9} />
              <text
                class="etikett"
                x={n.etikett === 'hoyre' ? 18 : 0}
                y={n.etikett === 'hoyre' ? -((linjer.length - 1) * 13) / 2 : 26}
                text-anchor={n.etikett === 'hoyre' ? 'start' : 'middle'}
              >
                {linjer.map((l, i) => (
                  <tspan key={i} x={n.etikett === 'hoyre' ? 18 : 0} dy={i === 0 ? '0.35em' : 13}>
                    {l}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}

        {pluss.map((p) => (
          <g
            key={p.indeks}
            class="pluss"
            transform={`translate(${p.x},${p.y})`}
            role="button"
            tabIndex={0}
            aria-label={p.indeks === linje.stasjoner.length ? 'Ny stasjon på slutten' : 'Sett inn stasjon her'}
            onClick={() => onSettInn?.(p.indeks)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSettInn?.(p.indeks))}
          >
            <circle r="10" />
            <path d="M-4.5,0 H4.5 M0,-4.5 V4.5" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Plasserer +-punkter mellom stasjonene og etter den siste. `indeks` = hvor den nye settes inn. */
function plussPunkter(linje: Kort, lay: Layout) {
  const pos = new Map(lay.noder.map((n) => [n.stasjon.id, n]));
  const loddrett = lay.noder[0]?.etikett === 'hoyre';
  const st = linje.stasjoner;
  const ut: { indeks: number; x: number; y: number }[] = [];

  // Punktet en stasjon «forlater» fra — midterste gren hvis den har grener.
  const ut_ = (i: number) => {
    const s = st[i];
    const g = s.grener?.length ? s.grener[Math.floor(s.grener.length / 2)] : null;
    return pos.get(g ? g.id : s.id)!;
  };
  const retning = (i: number) => {
    if (i < 1) return 1;
    const dx = pos.get(st[i].id)!.x - ut_(i - 1).x;
    return dx < 0 ? -1 : 1;
  };

  for (let i = 1; i <= st.length; i++) {
    const a = ut_(i - 1);
    if (!a) continue;
    if (i === st.length) {
      ut.push(loddrett ? { indeks: i, x: a.x, y: a.y + 32 } : { indeks: i, x: a.x + retning(i - 1) * 56, y: a.y });
      continue;
    }
    const b = pos.get(st[i].id)!;
    const svingNed = !loddrett && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) > 30;
    ut.push(
      svingNed
        ? { indeks: i, x: a.x + retning(i - 1) * 46, y: (a.y + b.y) / 2 }
        : { indeks: i, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    );
  }
  return ut;
}
