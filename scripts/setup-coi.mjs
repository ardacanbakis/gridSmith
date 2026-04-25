/**
 * Copy coi-serviceworker.min.js into public/ at build time so it ends up at
 * the deployed root. The shim adds Cross-Origin-Opener-Policy /
 * Cross-Origin-Embedder-Policy headers in environments (like GitHub Pages)
 * where you can't configure server headers, unblocking SharedArrayBuffer
 * for Manifold's WASM kernel.
 *
 * On platforms that DO send the headers (Firebase, Cloudflare Pages), the
 * shim self-detects and no-ops.
 */
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('public', { recursive: true });
copyFileSync(
  'node_modules/coi-serviceworker/coi-serviceworker.min.js',
  'public/coi-serviceworker.js',
);
console.log('public/coi-serviceworker.js refreshed');
