import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
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
      },
    },
  },
});
