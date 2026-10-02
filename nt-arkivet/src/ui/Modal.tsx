import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import './modal.css';

interface Props {
  tittel: string;
  etikett?: string;
  onLukk?: () => void;
  bred?: boolean;
  children: ComponentChildren;
}

/** Felles dialogvindu. Esc og klikk utenfor lukker (hvis onLukk er satt). */
export function Modal({ tittel, etikett = 'NT-Arkivet', onLukk, bred, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const forrige = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, textarea, button:not(.panel-lukk)')?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onLukk?.();
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
      forrige?.focus?.();
    };
  }, []);

  return (
    <div class="modal-bakgrunn" onMouseDown={(e) => e.target === e.currentTarget && onLukk?.()}>
      <div class={`modal card ${bred ? 'bred' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-tittel" ref={ref}>
        <div class="modal-topp">
          <span class="label">{etikett}</span>
          {onLukk && (
            <button class="panel-lukk" onClick={onLukk} aria-label="Lukk">
              ×
            </button>
          )}
        </div>
        <h2 id="modal-tittel" class="dot modal-tittel">
          {tittel}
        </h2>
        {children}
      </div>
    </div>
  );
}
