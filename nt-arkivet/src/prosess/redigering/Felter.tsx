import { useFeltVerdi } from '../../ui/hooks';

/* Små skjemafelt som lagrer når du går ut av feltet (ikke for hvert tastetrykk),
   så «Angre» angrer hele ord og ikke enkeltbokstaver. */

interface TekstProps {
  etikett?: string;
  verdi: string;
  onLagre: (v: string) => void;
  plassholder?: string;
  flerlinjer?: boolean;
  klasse?: string;
}

export function Tekst({ etikett, verdi, onLagre, plassholder, flerlinjer, klasse }: TekstProps) {
  const [v, setV] = useFeltVerdi(verdi);
  const lagre = () => v !== verdi && onLagre(v);
  const felt = flerlinjer ? (
    <textarea value={v} placeholder={plassholder} onInput={(e) => setV((e.target as HTMLTextAreaElement).value)} onBlur={lagre} />
  ) : (
    <input
      value={v}
      placeholder={plassholder}
      onInput={(e) => setV((e.target as HTMLInputElement).value)}
      onBlur={lagre}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
  if (!etikett) return <span class={`felt ${klasse ?? ''}`}>{felt}</span>;
  return (
    <label class={`felt ${klasse ?? ''}`}>
      <span>{etikett}</span>
      {felt}
    </label>
  );
}

/** Liten verktøylinje for rader i lister: ▲ ▼ ×. */
export function RadKnapper({ onOpp, onNed, onFjern }: { onOpp?: () => void; onNed?: () => void; onFjern: () => void }) {
  return (
    <span class="mini-knapper">
      <button type="button" onClick={onOpp} disabled={!onOpp} aria-label="Flytt opp">
        ▲
      </button>
      <button type="button" onClick={onNed} disabled={!onNed} aria-label="Flytt ned">
        ▼
      </button>
      <button type="button" onClick={onFjern} aria-label="Fjern">
        ×
      </button>
    </span>
  );
}

export function flyttI<T>(liste: T[], i: number, r: -1 | 1): T[] {
  const j = i + r;
  if (j < 0 || j >= liste.length) return liste;
  const ny = [...liste];
  [ny[i], ny[j]] = [ny[j], ny[i]];
  return ny;
}
