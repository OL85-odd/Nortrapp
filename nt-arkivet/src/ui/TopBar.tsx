import { mappe } from '../data/lagring/mappe';
import { sisteBackup, trengerBackup } from '../data/lagring/backup';
import { useEffect, useState } from 'preact/hooks';
import { bruker, erMork, tema, type Tema } from './settings';
import { db } from '../data/store';
import { redigerer } from '../edit/state';
import logoHvit from '../assets/logo-hvit.png';
import logoFarge from '../assets/logo-farge.png';
import './topbar.css';

const TEMA: { id: Tema; navn: string }[] = [
  { id: 'lys', navn: 'Lys' },
  { id: 'auto', navn: 'Auto' },
  { id: 'mork', navn: 'Mørk' },
];

function useKlokke() {
  const [na, setNa] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNa(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return na;
}

function useMorkModus() {
  const [mork, setMork] = useState(erMork());
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const oppdater = () => setMork(erMork());
    mq.addEventListener('change', oppdater);
    return () => mq.removeEventListener('change', oppdater);
  }, []);
  useEffect(() => setMork(erMork()), [tema.value]);
  return mork;
}

export function TopBar({ onByttBruker, onRediger }: { onByttBruker: () => void; onRediger: () => void }) {
  const na = useKlokke();
  const mork = useMorkModus();
  const tid = na.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  const meg = db.value.brukere.find((b) => b.id === bruker.value);
  const dato = na.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header class="topbar">
      <a class="topbar-merke" href="#/" aria-label="NT-Arkivet, til oversikten">
        <img src={mork ? logoHvit : logoFarge} alt="Nortrapp" />
        <span class="label">NT-Arkivet</span>
      </a>

      <div class="topbar-tid" aria-label={`${dato}, klokken ${tid}`}>
        <span class="dot topbar-klokke">{tid}</span>
        <span class="topbar-dato">{dato}</span>
      </div>

      <div class="topbar-hoyre">
        <LagringMerke />
        <div class="segmented" role="group" aria-label="Fargetema">
          {TEMA.map((t) => (
            <button key={t.id} aria-pressed={tema.value === t.id} onClick={() => (tema.value = t.id)}>
              {t.navn}
            </button>
          ))}
        </div>
        <button
          class={`las-knapp ${redigerer.value ? 'apen' : ''}`}
          onClick={onRediger}
          aria-pressed={redigerer.value}
          title={redigerer.value ? 'Lås (avslutt redigering)' : 'Rediger kartet (krever PIN)'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d={redigerer.value ? 'M8 11V7a4 4 0 0 1 7.5-2' : 'M8 11V7a4 4 0 0 1 8 0v4'} />
          </svg>
          <span class="visually-hidden">{redigerer.value ? 'Lås' : 'Rediger'}</span>
        </button>
        <button class="bruker-knapp dot" onClick={onByttBruker} title={meg ? `${meg.navn} – bytt bruker` : 'Velg bruker'}>
          {meg?.initialer ?? '--'}
        </button>
      </div>
    </header>
  );
}

/** Viser hvor innholdet lagres, og varsler når noe trenger oppmerksomhet. */
function LagringMerke() {
  const m = mappe.value;
  const [klasse, tekst, tittel] =
    m.status === 'tilkoblet'
      ? ['ok', 'Fellesmappe', `Lagres i fellesmappen «${m.navn}»`]
      : m.status === 'feil'
        ? ['fare', 'Lagring feilet', m.melding ?? '']
        : m.status === 'mangler-tilgang'
          ? ['varsel', 'Koble til mappen', 'Fellesmappen trenger tilgang på nytt']
          : m.status === 'kobler'
            ? ['', 'Kobler til …', '']
            : trengerBackup(db.value, sisteBackup.value)
              ? ['varsel', 'Ta backup', 'Innholdet ligger bare i denne nettleseren. Ta en backup.']
              : ['', 'Lokal', 'Innholdet ligger bare i denne nettleseren'];
  return (
    <a class={`lagring-merke ${klasse}`} href="#/lagring" title={tittel}>
      <span>{tekst}</span>
    </a>
  );
}
