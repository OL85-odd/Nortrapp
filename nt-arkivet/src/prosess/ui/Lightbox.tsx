import { useEffect, useState } from 'preact/hooks';
import type { Bilde } from '../types';
import { bildeUrl } from '../bilder';

/** Viser et bilde i full størrelse. ← → blar, Esc lukker. */
export function Lightbox({ bilder, start, onLukk }: { bilder: Bilde[]; start: number; onLukk: () => void }) {
  const [i, setI] = useState(start);
  const b = bilder[i];

  useEffect(() => {
    const tast = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') onLukk();
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, bilder.length - 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', tast, true);
    return () => window.removeEventListener('keydown', tast, true);
  }, [bilder.length, onLukk]);

  return (
    <div class="lightbox" role="dialog" aria-modal="true" aria-label={b.tekst} onClick={onLukk}>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={bildeUrl(b.fil)} alt={b.tekst} />
        <figcaption>
          {b.tekst}
          {bilder.length > 1 && (
            <span class="label">
              {' '}
              · {i + 1}/{bilder.length}
            </span>
          )}
        </figcaption>
      </figure>
      <button class="panel-lukk lightbox-lukk" onClick={onLukk} aria-label="Lukk">
        ×
      </button>
    </div>
  );
}
