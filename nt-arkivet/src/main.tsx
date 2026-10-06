import { render } from 'preact';
// Bare latinske tegn (inkl. æøå) — holder filen liten.
import '@fontsource/doto/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import './theme/tokens.css';
import './theme/base.css';
import { db, lastInn, oppdater } from './data/store';
import { startMappe } from './data/lagring/mappe';
import { tomUtlopte } from './data/papirkurv';
import { App } from './app';

// Vis det som er lagret på PC-en med en gang, og hent deretter fra fellesmappen (hvis valgt).
lastInn()
  .finally(() => render(<App />, document.getElementById('app')!))
  .then(() => startMappe())
  .then(() => {
    const ryddet = tomUtlopte(db.value);
    if (ryddet !== db.value) return oppdater(() => ryddet);
  });
