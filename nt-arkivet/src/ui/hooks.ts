import { useRef, useState } from 'preact/hooks';

/**
 * Lokal tilstand for et skjemafelt som følger en verdi utenfra.
 * Feltet kan redigeres fritt, men oppdateres hvis verdien utenfra
 * ENDRES (f.eks. ved «Angre»). Overskriver aldri det brukeren skriver
 * bare fordi komponenten tegnes på nytt.
 */
export function useFeltVerdi<T>(utenfra: T): [T, (v: T) => void] {
  const [verdi, setVerdi] = useState(utenfra);
  const forrige = useRef(utenfra);
  if (forrige.current !== utenfra) {
    forrige.current = utenfra;
    setVerdi(utenfra);
  }
  return [verdi, setVerdi];
}
