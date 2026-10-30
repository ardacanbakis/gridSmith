# Gridsmith

**Parametric Gridfinity studio — design bins, baseplates, and organizers in your browser and export print-ready files in seconds.**

**[Live Demo →](https://ardacanbakis.github.io/gridSmith/)**

---

## What is Gridsmith?

Gridsmith is a fully browser-based 3D design tool for the [Gridfinity](https://gridfinity.xyz) modular storage system. Pick a model type, dial in your parameters, watch the 3D preview update live, and download a print-ready file — no software to install, no account required.

Every calculation and geometry operation runs inside your browser. Nothing is ever uploaded anywhere.

---

## Model Types

| Type | What you get |
|---|---|
| **Bin** | Standard Gridfinity bin — set width, depth, and height in grid cells and height units. Add internal dividers, a scoop ramp, labels, and mounting holes. |
| **Lid** | Friction-fit lid for any bin with a stacking lip — a flat plate that rests on the lip, with a grip ring that drops into the lip's straight section. Tune the fit clearance for your printer. |
| **Baseplate** | Plate with the Gridfinity base profile recessed in — minimal (open frame) or rigid (solid floor under the pockets). Rigid plates can take magnet and screw holes; magnets thicken the floor to fit 6 × 2 mm discs. |
| **Organizers** | Solid block with cylindrical holes drilled from the top. Built-in presets for metric drill bits, router shanks (metric and imperial), and batteries. Also accepts a custom diameter list. |
| **Screw Organizer** | Divided bin with optional back-tilt wedge per compartment — screws roll to the front by gravity. Per-column embossed or engraved labels. |
| **Parts Tray** | Solid block with a configurable grid of circular or square pockets — great for tokens, coins, small electronics, or foam-insert-style storage. |

---

## Features

### Live 3D Preview
Every parameter change rebuilds the mesh in real time using Manifold, a high-performance CSG kernel compiled to WebAssembly. The preview supports orbit, pan, and zoom, includes a build-plate overlay for scale, and shows exact dimensions and a PLA weight + print-time estimate in the corner.

### Three Export Formats
| Format | Best for |
|---|---|
| **STL** | Universal — drop it straight into any slicer. |
| **3MF** | Lossless, multi-material capable — better metadata than STL. |
| **STEP** | CAD-ready — import into Fusion 360, FreeCAD, or SolidWorks for further modification. |

### Labels (on Bins and Screw Organizers)
- **Paper pocket** — recessed slot on the front wall for a label-tape strip.
- **Clip tab** — slot at the stacking-lip level for community-standard swap labels.
- **Embossed text** — raised text in a recessed field on the front face, finishing flush with the wall so bins still sit tight against their neighbours.
- **Engraved text** — text cut into the front face.

Label depth is capped so at least 0.4 mm of wall always remains behind the text.

### Gridfinity Spec Compliance
The default grid is exactly 42 mm × 7 mm — compatible with any stock Gridfinity bin and baseplate. The grid unit and height unit are both adjustable; all dimensions (base profile, clearance, magnet inset, stacking lip) scale proportionally. A badge appears in the sidebar if you deviate from spec.

The three mating profiles follow the spec, each swept around a rounded outline so corner radii stay concentric:

- **Bin foot** — 0.8 mm chamfer, 1.8 mm straight, 2.15 mm chamfer, on a 41.5 mm outline with 3.75 mm corners.
- **Baseplate pocket** — 0.7 / 1.8 / 2.15 mm on the full 42 mm cell, leaving 0.25 mm of play per side around the foot.
- **Stacking lip** — 0.7 / 1.8 / 1.9 mm, mirroring the foot so a stacked bin nests on both chamfers. The knife edge at the top is trimmed to a 0.6 mm flat, a 45° shelf underneath lets it print without support, and internal dividers stop just short of the stacked bin's foot.

Bin walls follow the same outline: vertical corners are rounded to 3.75 mm, and compartment corners are rounded concentric with them so the wall stays the same thickness all the way round.

The geometry test suite checks these fits directly: bins stacked on bins (and on screw organizers), bins in baseplates, and lids on bins.

### Template Gallery
A full-screen gallery of 45+ ready-to-use starter designs, grouped into Quick Start, Bins, Lids, Organizers, Trays, and Baseplates. Each card shows a parametric schematic drawn from its actual geometry. Search by name or tag, then click any card to apply it — every parameter remains editable afterward. Open it from the header or press `T`.

### Organizer Templates
The Organizers panel includes a browsable template library grouped by category (Drill Bits, Router, Batteries) with live search. Imperial presets (fractional-inch, letter, number drill sets; ¼″ / ⅛″ router shanks) are automatically hidden when metric units are selected.

### Design Library
Save any design to a local library, grouped by model type. Export the whole library to a JSON file as a backup or to share, and import designs back in — every entry is validated on import. Open it from the header or press `L`.

### Share by URL
The entire design — every parameter — is encoded into the URL. Copying the address bar gives you a shareable link that reconstructs the exact design.

### Installable
Gridsmith ships a web app manifest, so it can be installed to your home screen or desktop. It needs a connection to load; once loaded, all design and export work happens locally.

### Undo / Redo
Full 50-step undo/redo history with `Ctrl+Z` / `Ctrl+Shift+Z` keyboard shortcuts. Rapid slider drags are coalesced into a single undo step.

### Keyboard Shortcuts
| Key | Action |
|---|---|
| `T` | Open the template gallery |
| `L` | Open the design library |
| `F` | Fit the model to the viewport |
| `R` | Recenter the camera |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `?` | Show the keyboard shortcut help |

### Dual Sidebar Mode
Toggle a second sidebar to show finishing options (labels, mounting holes) alongside the core size controls — useful on wide screens.

---

## How It Was Built

### Geometry Engine
All 3D geometry is generated by **[Manifold](https://github.com/elalish/manifold)**, a robust CSG (constructive solid geometry) library compiled to WebAssembly. Manifold runs inside a **Web Worker** via [Comlink](https://github.com/GoogleChromeLabs/comlink), so the UI never blocks during boolean operations — even complex organizers with dozens of holes rebuild in under a second.

The Gridfinity base profile (the four-layer chamfered foot every bin sits on) is built by lofting rounded rectangles at spec-exact Z heights, scaled linearly from the user's grid unit. All primitives are parametric — no hardcoded vertex data.

### STEP Export
STEP files are written as ISO 10303-21 AP203 `CONFIG_CONTROL_DESIGN` using a pure-JS writer (no OpenCASCADE). Each triangle face becomes a `POLY_LOOP` → `FACE_OUTER_BOUND` → `FACE_SURFACE` entity chain; a `CLOSED_SHELL` forward-references all face IDs. Normals are computed via cross-product with Gram-Schmidt orthogonalization for the reference direction.

### Text Labels
Font glyphs are loaded via **[opentype.js](https://opentype.js.org/)** and converted to 2D polygons using the cubic-Bézier tessellation built into opentype. The polygons are extruded by Manifold and either unioned onto (emboss) or subtracted from (engrave) the bin body — entirely in the worker.

### Frontend Stack
| Layer | Technology |
|---|---|
| UI framework | React 18 + TypeScript + Vite |
| 3D viewport | `@react-three/fiber` + `@react-three/drei` + Three.js |
| State | Zustand with `zundo` temporal plugin (undo/redo) |
| Schemas | Zod (runtime validation + TypeScript inference) |
| Styling | Tailwind CSS + CSS custom properties for theming |
| Fonts | Inter + JetBrains Mono via `@fontsource` |
| i18n | react-i18next (English baseline, ready for more languages) |
| URL sharing | `lz-string` compression into the query string |

### Cross-Origin Isolation
Manifold's WASM kernel uses `SharedArrayBuffer`, which requires the page to be cross-origin isolated (`COOP: same-origin` + `COEP: require-corp`). On GitHub Pages (where you can't set headers), `coi-serviceworker` intercepts every fetch and injects the headers via a service worker. On hosts that support custom headers it self-detects and no-ops.

### CI / CD
A GitHub Actions workflow builds the app with `VITE_BASE_PATH=/<repo-name>/` (derived automatically from the repository name) and deploys to GitHub Pages on every push. The base path is dynamic so the workflow survives repository renames.

---

## Live Demo

**[ardacanbakis.github.io/gridSmith](https://ardacanbakis.github.io/gridSmith/)**

No account. No install. Open and design.

---

## License

[MIT](./LICENSE) — Gridsmith is open source.

The Gridfinity system itself was created by [Zack Freedman](https://www.printables.com/model/274917-gridfinity-specification) and is also MIT-licensed.

---

*Created by [Arda Canbakis](https://ardacanbakis.com)*
