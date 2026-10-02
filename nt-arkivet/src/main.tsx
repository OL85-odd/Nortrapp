import { render } from 'preact';
import '@fontsource/doto/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './theme/tokens.css';
import './theme/base.css';
import { lastInn } from './data/store';
import { App } from './app';

lastInn().finally(() => render(<App />, document.getElementById('app')!));
