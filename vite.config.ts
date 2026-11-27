import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { linksFor, linksInPages } from './src/links.ts';

const root = import.meta.dirname;

export default defineConfig(({ mode }) => ({
  // %LINK_SITE%, %LINK_APP%… in the pages become the addresses in src/links.ts.
  plugins: [react(), linksInPages(linksFor(loadEnv(mode, root, 'VITE_')))],
  // Relative asset URLs, so the built folder can be served from any path or opened from a USB stick.
  base: './',
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      input: {
        site: resolve(root, 'index.html'),
        ask: resolve(root, 'ask.html'),
        survey: resolve(root, 'survey.html'),
      },
    },
  },
}));
