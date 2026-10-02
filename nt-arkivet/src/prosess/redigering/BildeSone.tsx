import { useEffect, useRef, useState } from 'preact/hooks';
import { lagreMedia } from '../../data/media';
import type { Bilde } from '../types';
import { BildeVisning } from '../ui/BildeVisning';

interface Props {
  bilder: Bilde[];
  onEndre: (bilder: Bilde[]) => void;
}

/**
 * Plassholder for bilder i et steg: dra inn filer, lim inn skjermbilde
 * (Ctrl + V mens ruten er markert eller musen er over den), eller klikk for å velge.
 */
export function BildeSone({ bilder, onEndre }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const filvalg = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [jobber, setJobber] = useState(false);
  const aktiv = useRef(false);

  const leggTil = async (filer: File[]) => {
    const bildefiler = filer.filter((f) => f.type.startsWith('image/'));
    if (!bildefiler.length) return;
    setJobber(true);
    const nye: Bilde[] = [];
    for (const f of bildefiler) nye.push({ fil: await lagreMedia(f), tekst: f.name.replace(/\.[^.]+$/, '').replace(/^image$/, '') });
    setJobber(false);
    onEndre([...bilder, ...nye]);
  };

  // Lim inn fra utklippstavlen når ruten er i fokus eller musen er over den.
  useEffect(() => {
    const lim = (e: ClipboardEvent) => {
      if (!aktiv.current && document.activeElement !== ref.current) return;
      const filer = [...(e.clipboardData?.files ?? [])];
      if (filer.length) {
        e.preventDefault();
        leggTil(filer);
      }
    };
    window.addEventListener('paste', lim);
    return () => window.removeEventListener('paste', lim);
  });

  const flytt = (i: number, r: -1 | 1) => {
    const j = i + r;
    if (j < 0 || j >= bilder.length) return;
    const ny = [...bilder];
    [ny[i], ny[j]] = [ny[j], ny[i]];
    onEndre(ny);
  };

  return (
    <div class="bildesone-blokk">
      {bilder.length > 0 && (
        <ul class="bildeliste">
          {bilder.map((b, i) => (
            <li key={b.fil + i}>
              <div class="bilde-mini">
                <BildeVisning fil={b.fil} alt={b.tekst} />
              </div>
              <input
                value={b.tekst}
                placeholder="Bildetekst"
                onChange={(e) => onEndre(bilder.map((x, j) => (j === i ? { ...x, tekst: (e.target as HTMLInputElement).value } : x)))}
              />
              <div class="mini-knapper">
                <button onClick={() => flytt(i, -1)} disabled={i === 0} aria-label="Flytt opp">
                  ▲
                </button>
                <button onClick={() => flytt(i, 1)} disabled={i === bilder.length - 1} aria-label="Flytt ned">
                  ▼
                </button>
                <button onClick={() => onEndre(bilder.filter((_, j) => j !== i))} aria-label="Fjern bildet">
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div
        ref={ref}
        tabIndex={0}
        role="button"
        class={`bildesone ${over ? 'over' : ''}`}
        onMouseEnter={() => (aktiv.current = true)}
        onMouseLeave={() => (aktiv.current = false)}
        onClick={() => filvalg.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && filvalg.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          leggTil([...(e.dataTransfer?.files ?? [])]);
        }}
      >
        {jobber ? (
          <span class="label">Lagrer …</span>
        ) : (
          <>
            <strong>Dra bilder hit</strong>
            <span>
              eller lim inn skjermbilde med <kbd>Ctrl</kbd> <kbd>V</kbd> · klikk for å velge fil
            </span>
          </>
        )}
        <input
          ref={filvalg}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            leggTil([...((e.target as HTMLInputElement).files ?? [])]);
            (e.target as HTMLInputElement).value = '';
          }}
        />
      </div>
    </div>
  );
}
