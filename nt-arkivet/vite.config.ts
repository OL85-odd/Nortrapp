import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`     → mappe (dist/) for serveren.
// `npm run build:fil` → én HTML-fil (dist-fil/) som kan åpnes med dobbeltklikk,
//                       uten installasjon. Fonter og bilder bakes inn i filen.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'fil' ? [preact(), viteSingleFile()] : [preact()],
  build:
    mode === 'fil'
      ? { outDir: 'dist-fil', assetsInlineLimit: Number.MAX_SAFE_INTEGER }
      : { outDir: 'dist' },
}));
