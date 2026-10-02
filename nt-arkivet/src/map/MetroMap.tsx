import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Linje } from '../data/types';
import { brytTekst, lagLayout } from './layout';
import './metro.css';

interface Props {
  linje: Linje;
  valgt?: string | null;
  onVelg?: (stasjonId: string) => void;
}

/** Tegner én linje som et T-banekart. Tilpasser seg bredden den får. */
export function MetroMap({ linje, valgt, onVelg }: Props) {
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

  return (
    <div class="metro" ref={ref} style={{ '--linje': linje.farge }}>
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
            <text class="dot" dy="0.36em">
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
      </svg>
    </div>
  );
}
