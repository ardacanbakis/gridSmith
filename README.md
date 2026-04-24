# Gridsmith

> Custom bins, built your way.

Gridsmith is a parametric, browser-based studio for designing
[Gridfinity](https://gridfinity.xyz) bins, baseplates, and use-case-specific
organisers (drill-bit holders, screw organisers, router-bit racks…), with
first-class label support and STL / 3MF / STEP export.

This repo is in active early development. Phase 0 ships the core architecture:
the geometry kernel, viewport, parameter system, and STL export. Specialised
presets, labels, and 3MF / STEP exports follow in Phase 1+.

## Stack

- **React 18 + Vite + TypeScript** — UI
- **react-three-fiber + drei** — 3D viewport
- **Manifold (WASM)** — geometry kernel, runs in a Web Worker
- **Zustand + Zod** — state + parameter schemas
- **Tailwind CSS** — styling
- **Firebase** *(optional, off by default)* — auth + saved designs

All geometry runs client-side in a Web Worker; the app works without a server.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173.

> The dev server sends `Cross-Origin-Opener-Policy: same-origin` and
> `Cross-Origin-Embedder-Policy: require-corp` so Manifold's WASM can use
> SharedArrayBuffer for performance.

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Vite dev server                       |
| `npm run build`    | Type-check + production build         |
| `npm run preview`  | Serve production build locally        |
| `npm run typecheck`| `tsc --noEmit`                        |
| `npm test`         | Run Vitest                            |

## Enabling Firebase (optional)

Gridsmith works fully without Firebase. Designs are encoded in the URL, so
"share" = copy the link.

To unlock Google sign-in + cloud-saved designs:

1. Create a project at https://console.firebase.google.com.
2. Add a Web App and copy the config object.
3. `cp .env.example .env.local` and fill in the `VITE_FIREBASE_*` values.
4. Set `VITE_FIREBASE_ENABLED=true`.

The drop-in config lives in [`src/lib/firebase/config.ts`](./src/lib/firebase/config.ts).

## Project layout

```
src/
├── components/             React components (Header, Viewport, ParameterPanel)
├── lib/
│   ├── firebase/           Firebase drop-in config (off by default)
│   ├── geometry/           Manifold worker + STL exporter
│   ├── gridfinity/         Spec constants + bin/baseplate primitives
│   └── params/             Zod schemas + URL share encoding
└── store/                  Zustand design store
```

## Roadmap

- **Phase 0 (this branch):** scaffolding, Manifold worker, Gridfinity primitives, STL export, URL sharing.
- **Phase 1:** feature parity with [gridfinitygenerator.com](https://gridfinitygenerator.com), label studio (embossed / engraved / paper-pocket / clip-in tab), 3MF export.
- **Phase 2:** specialised presets — drill-bit holder, screw organiser, router-bit rack — plus a freeform Custom Designer. STEP export.
- **Phase 3:** Google auth, saved designs, public gallery, remix.
- **Phase 4:** PWA / offline, i18n, print-time and BOM estimator.

## License

[MIT](./LICENSE). The Gridfinity system itself is by Zack Freedman, also MIT-licensed.
