# Gridsmith

> Custom bins, built your way.

Gridsmith is a parametric, browser-based studio for designing
[Gridfinity](https://gridfinity.xyz) bins, baseplates, and use-case-specific
organisers — drill-bit holders, screw organisers, router-bit racks — with
first-class label support and STL / 3MF export.

## What's in the box today

**Models**
- **Baseplate** — minimal or rigid, optional magnet pockets, optional screw
  holes.
- **Bin** — X/Y/Z cells, configurable wall thickness, hollow/solid, stacking
  lip, optional internal compartment grid (`divX × divY`), optional scoop
  ramp on the front row, optional magnet/screw holes.
- **Drill-bit holder** — a solid bin with parameterised cylindrical pockets
  drilled from the top. Five built-in bit-set presets (metric whole-mm,
  metric 0.5 mm, fractional 1/16″–1/2″, US letter A–Z, US number #1–#30) plus
  five router-shank presets (1/4″, 1/8″, 6/8/12 mm) and a custom comma-
  separated list. Single-pass shelf packing fits as many bits as the bin
  allows; the UI warns when bits drop.
- **Screw organiser** — a divided bin where each compartment optionally gets a
  back-tilt wedge so loose screws roll forward by gravity.

**Labels (all four)**
- **Paper pocket** — recessed slot on the front wall sized for a 12 mm label
  tape or a hand-written strip.
- **Clip tab** — slot at the top of the front lip for community-standard swap
  labels.
- **Embossed text** — Inter Bold rendered as real geometry, raised from the
  front face.
- **Engraved text** — same, cut into the front face.

**Customisation that goes beyond stock Gridfinity**
- **Editable grid + height units** — global, defaults to spec (42 mm × 7 mm)
  but you can change either; everything (base profile, magnet inset, lip,
  clearance) scales proportionally. A "non-standard" badge warns when the
  output won't mate with stock parts.
- **Light + dark themes** — light is white/blue (clean studio), dark is
  charcoal/amber (workshop). Theme persists.
- **mm / inch toggle** — UI-side only; geometry is always mm internally.

**Export**
- **STL** — universal, slicer-ready.
- **3MF** — lossless, multi-material capable; what you want for multi-colour
  embossed labels.

**Sharing**
- The whole design (all parameters, including the spec) is encoded in the URL
  via lz-string, so a copy-pasted link is the design.

## Stack

- React 18 + Vite + TypeScript
- react-three-fiber + drei for the viewport
- **Manifold** (WASM) for robust CSG, running in a Web Worker via Comlink
- **opentype.js** for font glyph → polygon conversion, also in the worker
- **@jscadui/3mf-export + fflate** for the 3MF writer
- Zustand state, Zod schemas, Tailwind CSS, Inter + JetBrains Mono via
  @fontsource
- Firebase ready but **off by default**

Geometry runs entirely client-side in a worker so the UI never blocks during
booleans.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Vite dev server                       |
| `npm run build`    | Type-check + production build         |
| `npm run preview`  | Serve production build locally        |
| `npm run typecheck`| `tsc --noEmit`                        |
| `npm test`         | Run Vitest                            |

## Project layout

```
src/
├── components/             React components (Header, Viewport, ParameterPanel)
├── lib/
│   ├── firebase/           Firebase drop-in config (off by default)
│   ├── geometry/           Manifold worker + STL/3MF exporters
│   ├── gridfinity/         Spec, primitives, bit-set presets
│   ├── labels/             Font loader + text-to-polygons + emboss helper
│   ├── params/             Zod schemas + URL share encoding
│   └── units.ts            mm/in display helpers
├── store/                  Zustand stores (design, theme)
└── types/                  Ambient module declarations
```

## Enabling Firebase (optional)

Gridsmith works fully without Firebase. Designs are encoded in the URL, so
"share" = copy the link.

To unlock Google sign-in and cloud-saved designs:

1. Create a project at https://console.firebase.google.com.
2. Add a Web App and copy the config object.
3. `cp .env.example .env.local` and fill in the `VITE_FIREBASE_*` values.
4. Set `VITE_FIREBASE_ENABLED=true`.

## Roadmap

- ✅ **Phase 0** — scaffolding, Manifold worker, Gridfinity primitives, STL.
- ✅ **Phase 1** — feature parity with gridfinitygenerator.com, scoop ramp,
  internal dividers, paper-pocket and clip-tab labels, light/dark themes,
  editable grid spec.
- ✅ **Phase 2** — drill-bit holder + router-shank presets, screw organiser
  with tilt, embossed and engraved text labels, 3MF export, web fonts,
  imperial display.
- ⏳ **Phase 3** — STEP export (lazy-loaded opencascade.js), spec-perfect
  base-profile snapshot tests, freeform Custom Designer.
- ⏳ **Phase 4** — Google auth, saved designs, public gallery, remix.
- ⏳ **Phase 5** — PWA / offline, i18n, print-time + filament estimate.

## License

[MIT](./LICENSE). The Gridfinity system itself is by Zack Freedman, also
MIT-licensed.
