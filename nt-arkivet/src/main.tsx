import { render } from 'preact';
// Bare latinske tegn (inkl. æøå) — holder filen liten.
import '@fontsource/doto/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import './theme/tokens.css';
import './theme/base.css';
import { lastInn } from './data/store';
import { App } from './app';

lastInn().finally(() => render(<App />, document.getElementById('app')!));
