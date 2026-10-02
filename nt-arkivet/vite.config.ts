import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// base: './' gjør at bygget fungerer fra hvilken som helst mappe på serveren.
export default defineConfig({
  base: './',
  plugins: [preact()],
});
