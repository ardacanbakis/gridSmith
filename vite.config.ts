import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    // The lazily loaded Viewport chunk is ~850 kB, nearly all three.js, which can't
    // be split further. Warn only if something grows well past that.
    chunkSizeWarningLimit: 900,
  },
  optimizeDeps: {
    exclude: ['manifold-3d'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
