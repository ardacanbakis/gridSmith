import {
  BaseplateParamsSchema,
  BinParamsSchema,
  DrillBitHolderParamsSchema,
  LidParamsSchema,
  ScrewOrganizerParamsSchema,
  PartsTrayParamsSchema,
  type BitSetId,
  type ModelParams,
} from '@/lib/params/schema';
import { BIT_SETS, holeSetFor } from '@/lib/gridfinity/bitSets';
import { STANDARD_SPEC, type Spec } from '@/lib/gridfinity/spec';
import {
  estimateLabelWidth,
  heightUnitsForDepth,
  holeWidth,
  layoutHoles,
  trayCapacity,
} from '@/lib/gridfinity/primitives';

export type TemplateCategory = 'all' | 'quick-start' | 'bins' | 'lids' | 'organizers' | 'trays' | 'baseplates';

export type GalleryTemplate = {
  id: string;
  category: Exclude<TemplateCategory, 'all'>;
  name: string;
  description: string;
  tags: string[];
  model: ModelParams;
};

function bin(o: Record<string, unknown> = {}): ModelParams {
  return BinParamsSchema.parse({ kind: 'bin', ...o });
}
function base(o: Record<string, unknown> = {}): ModelParams {
  return BaseplateParamsSchema.parse({ kind: 'baseplate', ...o });
}
/** A holder for a set, with the set's suggested hole depth and the height that depth needs. */
function holder(bitSet: Exclude<BitSetId, 'custom'>, o: Record<string, unknown> = {}): ModelParams {
  const depth = BIT_SETS[bitSet].depth;
  return DrillBitHolderParamsSchema.parse({
    kind: 'drillBitHolder',
    bitSet,
    holeDepth: depth,
    heightUnits: Math.max(2, heightUnitsForDepth(STANDARD_SPEC, depth)),
    ...o,
  });
}
function screws(o: Record<string, unknown> = {}): ModelParams {
  return ScrewOrganizerParamsSchema.parse({ kind: 'screwOrganizer', ...o });
}
/** A pocket tray just tall enough for its pocket depth. */
function tray(o: Record<string, unknown> & { pocketDepth: number }): ModelParams {
  return PartsTrayParamsSchema.parse({
    kind: 'partsTray',
    heightUnits: Math.max(1, heightUnitsForDepth(STANDARD_SPEC, o.pocketDepth)),
    ...o,
  });
}
function lid(o: Record<string, unknown> = {}): ModelParams {
  return LidParamsSchema.parse({ kind: 'lid', ...o });
}

export function isImperialOnly(model: ModelParams): boolean {
  return model.kind === 'drillBitHolder' && model.bitSet !== 'custom' && !!BIT_SETS[model.bitSet].imperial;
}

/**
 * Hole positions for a holder, with label widths estimated (no font here).
 * Exact for fills; for labelled sets, close to what the build will measure.
 */
export function previewHolderLayout(
  model: Extract<ModelParams, { kind: 'drillBitHolder' }>,
  spec: Spec = STANDARD_SPEC,
) {
  const set = holeSetFor(model.bitSet, model.customBits);
  const labelled = model.holeLabels && set.mode === 'set';
  const w = model.cellsX * spec.gridUnit - spec.clearance - 2 * model.edgeClearance;
  const d = model.cellsY * spec.gridUnit - spec.clearance - 2 * model.edgeClearance;
  const layout = layoutHoles(
    {
      mode: set.mode,
      widths: set.items.map((it) => holeWidth(set.shape, it.mm, model.clearance)),
      labelWidths: labelled ? set.items.map((it) => estimateLabelWidth(it.label)) : undefined,
    },
    w,
    d,
    model.spacing,
  );
  return { set, ...layout };
}

export function templateSpec(model: ModelParams): string {
  const size = `${model.cellsX}×${model.cellsY}`;
  if (model.kind === 'bin') {
    const comps = model.divX * model.divY;
    return `${size} · ${model.heightUnits}u${comps > 1 ? ` · ${comps} comp.` : ''}`;
  }
  if (model.kind === 'baseplate') return `${size} · ${model.style}`;
  if (model.kind === 'drillBitHolder') {
    const { set, placed } = previewHolderLayout(model);
    return set.mode === 'fill' ? `${size} · holds ${placed.length}` : `${size} · ${placed.length} labelled holes`;
  }
  if (model.kind === 'screwOrganizer') return `${size} · ${model.cols}×${model.rows}`;
  if (model.kind === 'lid') return `${size} · ${model.lidClearance}mm clearance`;
  const cap = trayCapacity(STANDARD_SPEC, model);
  const n = Math.min(model.pocketCols, cap.cols) * Math.min(model.pocketRows, cap.rows);
  return `${size} · ${n} ${model.pocketShape === 'square' && (model.pocketLength ?? model.pocketSize) < 6 ? 'slots' : 'pockets'}`;
}

export const GALLERY_TEMPLATES: GalleryTemplate[] = [
  // ── Quick Start ────────────────────────────────────────────────────────────
  {
    id: 'qs-general-bin',
    category: 'quick-start',
    name: 'General bin',
    description: 'Standard 1×1 hollow bin — a great starting point.',
    tags: ['bin', 'basic', 'general', 'storage'],
    model: bin({ cellsX: 1, cellsY: 1, heightUnits: 3 }),
  },
  {
    id: 'qs-drawer-organizer',
    category: 'quick-start',
    name: 'Drawer organizer',
    description: '2×2 bin divided into 4 compartments for mixed small parts.',
    tags: ['bin', 'divided', 'drawer', 'organizer', '4 compartments'],
    model: bin({ cellsX: 2, cellsY: 2, heightUnits: 5, divX: 2, divY: 2 }),
  },
  {
    id: 'qs-drill-metric',
    category: 'quick-start',
    name: 'Drill index 1–13 mm',
    description: 'Every whole-mm drill bit in order, size engraved under each hole.',
    tags: ['drill', 'metric', 'index', 'holder', 'tools', 'labelled'],
    model: holder('metric-basic', { cellsX: 4, cellsY: 1 }),
  },
  {
    id: 'qs-hex-bits',
    category: 'quick-start',
    name: '1/4" hex bit holder',
    description: 'Screwdriver bits stand in hex holes — 30 in a 2×1.',
    tags: ['hex', 'bits', 'screwdriver', 'holder', 'tools'],
    model: holder('hex-bit-quarter', { cellsX: 2, cellsY: 1 }),
  },
  {
    id: 'qs-battery-aa',
    category: 'quick-start',
    name: 'AA battery holder',
    description: 'AA cells stand upright, packed as tightly as the block allows.',
    tags: ['battery', 'aa', 'holder', 'cells'],
    model: holder('battery-aa', { cellsX: 2, cellsY: 1 }),
  },
  {
    id: 'qs-screw-m2-m8',
    category: 'quick-start',
    name: 'Metric screw organizer',
    description: 'Divided tray for M2–M8 screws with embossed labels.',
    tags: ['screws', 'metric', 'dividers', 'labels', 'm2', 'm8'],
    model: screws({
      cellsX: 3, cellsY: 2, heightUnits: 4, cols: 6, rows: 2,
      compartmentLabelStyle: 'emboss',
      compartmentLabels: ['M2', 'M3', 'M4', 'M5', 'M6', 'M8'],
    }),
  },
  {
    id: 'qs-sd-cards',
    category: 'quick-start',
    name: 'SD card rack',
    description: 'Cards stand upright in slots, faces to the front — 24 in a 3×1.',
    tags: ['sd', 'card', 'memory', 'slots', 'rack', 'camera'],
    model: tray({
      cellsX: 3, cellsY: 1, pocketShape: 'square', pocketSize: 24.8, pocketLength: 2.8,
      cornerRadius: 0.5, roundedBottom: true, pocketDepth: 20, pocketCols: 4, pocketRows: 6, pocketSpacing: 3,
    }),
  },
  {
    id: 'qs-scoop-cups',
    category: 'quick-start',
    name: 'Small parts cups',
    description: '25 round-bottomed cups — screws and parts slide out with a fingertip.',
    tags: ['parts', 'cups', 'scoop', 'small', 'electronics', 'hardware'],
    model: tray({
      cellsX: 2, cellsY: 2, pocketShape: 'circle', pocketSize: 14, roundedBottom: true,
      pocketDepth: 8, pocketCols: 5, pocketRows: 5, pocketSpacing: 1.5,
    }),
  },

  // ── Bins ───────────────────────────────────────────────────────────────────
  {
    id: 'bin-1x1-shallow',
    category: 'bins',
    name: '1×1 Shallow',
    description: 'Compact single-cell bin, 3u height.',
    tags: ['bin', 'small', 'compact', '1x1'],
    model: bin({ cellsX: 1, cellsY: 1, heightUnits: 3 }),
  },
  {
    id: 'bin-1x1-deep',
    category: 'bins',
    name: '1×1 Deep',
    description: 'Tall single-cell bin for pens, markers, or upright tools.',
    tags: ['bin', 'tall', 'deep', 'pens', 'markers'],
    model: bin({ cellsX: 1, cellsY: 1, heightUnits: 7 }),
  },
  {
    id: 'bin-2x1-shallow',
    category: 'bins',
    name: '2×1 Shallow tray',
    description: 'Wide shallow tray — good for screwdrivers or paintbrushes.',
    tags: ['bin', 'wide', 'shallow', 'tools'],
    model: bin({ cellsX: 2, cellsY: 1, heightUnits: 3, scoopRamp: true }),
  },
  {
    id: 'bin-1x2-slot',
    category: 'bins',
    name: '1×2 Slot',
    description: 'Narrow two-cell bin — useful for rulers, cables, or wires.',
    tags: ['bin', 'narrow', 'ruler', 'cable', 'wire'],
    model: bin({ cellsX: 1, cellsY: 2, heightUnits: 3 }),
  },
  {
    id: 'bin-2x2-4comp',
    category: 'bins',
    name: '2×2 Divided (4)',
    description: '4-compartment bin, one per quadrant.',
    tags: ['bin', 'divided', '4', 'compartments', '2x2'],
    model: bin({ cellsX: 2, cellsY: 2, heightUnits: 4, divX: 2, divY: 2 }),
  },
  {
    id: 'bin-2x2-9comp',
    category: 'bins',
    name: '2×2 Divided (9)',
    description: '9-compartment grid bin — ideal for small parts sorting.',
    tags: ['bin', 'divided', '9', 'compartments', 'parts'],
    model: bin({ cellsX: 2, cellsY: 2, heightUnits: 4, divX: 3, divY: 3 }),
  },
  {
    id: 'bin-3x1-strip',
    category: 'bins',
    name: '3×1 Tool strip',
    description: 'Long narrow tray for tools, rulers, or cable ties.',
    tags: ['bin', 'tools', 'strip', 'long', '3x1'],
    model: bin({ cellsX: 3, cellsY: 1, heightUnits: 3 }),
  },
  {
    id: 'bin-4x2-letter',
    category: 'bins',
    name: '4×2 Desk tray',
    description: 'Large desk tray for documents, folders, or big items.',
    tags: ['bin', 'desk', 'large', 'letter', 'paper', '4x2'],
    model: bin({ cellsX: 4, cellsY: 2, heightUnits: 3 }),
  },
  {
    id: 'bin-scoop',
    category: 'bins',
    name: '2×2 Scoop bin',
    description: 'Bin with scoop ramp so contents roll to the front edge.',
    tags: ['bin', 'scoop', 'ramp', 'ergonomic'],
    model: bin({ cellsX: 2, cellsY: 2, heightUnits: 4, scoopRamp: true }),
  },
  {
    id: 'bin-3x2-general',
    category: 'bins',
    name: '3×2 General storage',
    description: 'Versatile medium bin for bulkier items.',
    tags: ['bin', 'medium', 'general', 'storage', '3x2'],
    model: bin({ cellsX: 3, cellsY: 2, heightUnits: 4 }),
  },

  // ── Lids ───────────────────────────────────────────────────────────────────
  {
    id: 'lid-1x1',
    category: 'lids',
    name: '1×1 Lid',
    description: 'Slim friction-fit lid for a standard 1×1 bin.',
    tags: ['lid', '1x1', 'snap', 'friction', 'cover'],
    model: lid({ cellsX: 1, cellsY: 1 }),
  },
  {
    id: 'lid-2x1',
    category: 'lids',
    name: '2×1 Lid',
    description: 'Friction-fit lid for a 2×1 wide bin.',
    tags: ['lid', '2x1', 'snap', 'friction', 'cover'],
    model: lid({ cellsX: 2, cellsY: 1 }),
  },
  {
    id: 'lid-2x2',
    category: 'lids',
    name: '2×2 Lid',
    description: 'Friction-fit lid for a 2×2 bin — common desk organizer cover.',
    tags: ['lid', '2x2', 'snap', 'friction', 'cover'],
    model: lid({ cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'lid-3x2',
    category: 'lids',
    name: '3×2 Lid',
    description: 'Friction-fit lid for a 3×2 medium storage bin.',
    tags: ['lid', '3x2', 'snap', 'friction', 'cover'],
    model: lid({ cellsX: 3, cellsY: 2 }),
  },
  {
    id: 'lid-tight',
    category: 'lids',
    name: '1×1 Tight fit lid',
    description: '1×1 lid with 0.05 mm clearance for a snug friction fit.',
    tags: ['lid', 'tight', 'friction', 'snug'],
    model: lid({ cellsX: 1, cellsY: 1, lidClearance: 0.05 }),
  },

  // ── Holders: labelled sets ─────────────────────────────────────────────────
  {
    id: 'org-drill-metric-basic',
    category: 'organizers',
    name: 'Drill index 1–13 mm',
    description: '13 metric bits in order, each size engraved under its hole.',
    tags: ['drill', 'metric', 'index', 'bits', 'labelled'],
    model: holder('metric-basic', { cellsX: 4, cellsY: 1 }),
  },
  {
    id: 'org-drill-metric-fine',
    category: 'organizers',
    name: 'Drill index 1–13 mm, half sizes',
    description: '25 bits in 0.5 mm steps, labelled.',
    tags: ['drill', 'metric', 'index', 'bits', 'fine', 'labelled'],
    model: holder('metric-fine', { cellsX: 4, cellsY: 2 }),
  },
  {
    id: 'org-drill-fractional',
    category: 'organizers',
    name: 'Drill index 1/16"–1/2"',
    description: '15 fractional bits in 32nds, labelled.',
    tags: ['drill', 'imperial', 'fractional', 'inch', 'index', 'labelled'],
    model: holder('fractional-inch', { cellsX: 3, cellsY: 2 }),
  },
  {
    id: 'org-drill-letter',
    category: 'organizers',
    name: 'Letter drill index A–Z',
    description: '26 letter-gauge bits, labelled.',
    tags: ['drill', 'letter', 'imperial', 'index', 'labelled'],
    model: holder('letter', { cellsX: 4, cellsY: 1 }),
  },
  {
    id: 'org-drill-number',
    category: 'organizers',
    name: 'Number drill index #1–#30',
    description: '30 wire-gauge bits, labelled.',
    tags: ['drill', 'number', 'imperial', 'wire gauge', 'index', 'labelled'],
    model: holder('number', { cellsX: 4, cellsY: 1 }),
  },
  {
    id: 'org-hex-metric',
    category: 'organizers',
    name: 'Hex key stand 1.5–10 mm',
    description: 'Metric Allen keys stand in labelled hex holes.',
    tags: ['hex', 'allen', 'keys', 'metric', 'labelled'],
    model: holder('hex-metric', { cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'org-hex-imperial',
    category: 'organizers',
    name: 'Hex key stand 5/64"–3/8"',
    description: 'SAE Allen keys stand in labelled hex holes.',
    tags: ['hex', 'allen', 'keys', 'imperial', 'sae', 'labelled'],
    model: holder('hex-imperial', { cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'org-battery-mixed',
    category: 'organizers',
    name: 'Mixed battery holder',
    description: 'Two each of 18650, AA and AAA, labelled.',
    tags: ['battery', 'mixed', 'aa', 'aaa', '18650', 'labelled'],
    model: holder('battery-mixed', { cellsX: 3, cellsY: 1 }),
  },

  // ── Holders: filled with one size ──────────────────────────────────────────
  {
    id: 'org-hex-bits',
    category: 'organizers',
    name: '1/4" hex bit holder',
    description: 'Screwdriver bits in staggered hex holes — 30 in a 2×1.',
    tags: ['hex', 'bits', 'screwdriver', 'driver'],
    model: holder('hex-bit-quarter', { cellsX: 2, cellsY: 1 }),
  },
  {
    id: 'org-precision-bits',
    category: 'organizers',
    name: '4 mm precision bit holder',
    description: 'Electronics-kit bits in hex holes, packed into a 1×1.',
    tags: ['hex', 'bits', 'precision', 'electronics', 'ifixit'],
    model: holder('hex-bit-4mm', { cellsX: 1, cellsY: 1 }),
  },
  {
    id: 'org-battery-aa',
    category: 'organizers',
    name: 'AA battery holder',
    description: 'AA cells stand upright in a 2×1.',
    tags: ['battery', 'aa', 'cells'],
    model: holder('battery-aa', { cellsX: 2, cellsY: 1 }),
  },
  {
    id: 'org-battery-aaa',
    category: 'organizers',
    name: 'AAA battery holder',
    description: 'AAA cells stand upright in a 1×1.',
    tags: ['battery', 'aaa', 'cells'],
    model: holder('battery-aaa', { cellsX: 1, cellsY: 1 }),
  },
  {
    id: 'org-battery-18650',
    category: 'organizers',
    name: '18650 cell holder',
    description: 'Li-ion cells stand upright in a 2×2.',
    tags: ['battery', '18650', 'liion', 'cells'],
    model: holder('battery-18650-4', { cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'org-battery-21700',
    category: 'organizers',
    name: '21700 cell holder',
    description: 'Li-ion cells stand upright in a 2×2.',
    tags: ['battery', '21700', 'liion', 'cells'],
    model: holder('battery-21700', { cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'org-router-quarter',
    category: 'organizers',
    name: 'Router bits, 1/4" shank',
    description: 'Shanks stand in deep holes in a 2×2.',
    tags: ['router', 'quarter', 'imperial', 'woodworking'],
    model: holder('router-quarter', { cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'org-router-half',
    category: 'organizers',
    name: 'Router bits, 1/2" shank',
    description: 'Shanks stand in deep holes in a 2×2.',
    tags: ['router', 'half', 'imperial', 'woodworking'],
    model: holder('router-half', { cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'org-router-6mm',
    category: 'organizers',
    name: 'Router bits, 6 mm shank',
    description: 'Shanks stand in deep holes in a 2×2.',
    tags: ['router', '6mm', 'metric', 'woodworking'],
    model: holder('router-6mm', { cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'org-router-8mm',
    category: 'organizers',
    name: 'Router bits, 8 mm shank',
    description: 'Shanks stand in deep holes in a 2×2.',
    tags: ['router', '8mm', 'metric', 'woodworking'],
    model: holder('router-8mm', { cellsX: 2, cellsY: 2 }),
  },

  // ── Pocket trays ───────────────────────────────────────────────────────────
  {
    id: 'tray-sd-card',
    category: 'trays',
    name: 'SD card rack',
    description: 'Full-size SD cards stand upright in slots, 24 in a 3×1.',
    tags: ['sd', 'card', 'memory', 'slots', 'rack', 'camera'],
    model: tray({
      cellsX: 3, cellsY: 1, pocketShape: 'square', pocketSize: 24.8, pocketLength: 2.8,
      cornerRadius: 0.5, roundedBottom: true, pocketDepth: 20, pocketCols: 4, pocketRows: 6, pocketSpacing: 3,
    }),
  },
  {
    id: 'tray-microsd',
    category: 'trays',
    name: 'microSD card rack',
    description: 'microSD cards stand upright in slots, 18 in a 1×1.',
    tags: ['microsd', 'card', 'memory', 'slots', 'rack'],
    model: tray({
      cellsX: 1, cellsY: 1, pocketShape: 'square', pocketSize: 11.6, pocketLength: 1.6,
      cornerRadius: 0.3, roundedBottom: true, pocketDepth: 10, pocketCols: 2, pocketRows: 9, pocketSpacing: 2.5,
    }),
  },
  {
    id: 'tray-coin-cell',
    category: 'trays',
    name: 'Coin cell rack (CR2032)',
    description: 'Coin cells stand on edge in slots, 15 in a 2×1.',
    tags: ['battery', 'coin', 'cr2032', 'cells', 'slots', 'rack'],
    model: tray({
      cellsX: 2, cellsY: 1, pocketShape: 'square', pocketSize: 20.6, pocketLength: 3.6,
      cornerRadius: 0.5, roundedBottom: true, pocketDepth: 12, pocketCols: 3, pocketRows: 5, pocketSpacing: 3,
    }),
  },
  {
    id: 'tray-usb',
    category: 'trays',
    name: 'USB stick rack',
    description: 'USB-A sticks stand plug-down in slots, 20 in a 2×1.',
    tags: ['usb', 'stick', 'flash', 'drive', 'slots', 'rack'],
    model: tray({
      cellsX: 2, cellsY: 1, pocketShape: 'square', pocketSize: 12.8, pocketLength: 5.2,
      cornerRadius: 0.5, pocketDepth: 12, pocketCols: 5, pocketRows: 4, pocketSpacing: 3,
    }),
  },
  {
    id: 'tray-9v',
    category: 'trays',
    name: '9V battery tray',
    description: 'Six 9V batteries stand upright in a 2×2.',
    tags: ['battery', '9v', 'pp3', 'cells'],
    model: tray({
      cellsX: 2, cellsY: 2, pocketShape: 'square', pocketSize: 27.2, pocketLength: 18.2,
      cornerRadius: 1, pocketDepth: 20, pocketCols: 2, pocketRows: 3, pocketSpacing: 2,
    }),
  },
  {
    id: 'tray-dice',
    category: 'trays',
    name: 'D6 dice tray',
    description: '16 square cups for standard 16 mm six-sided dice.',
    tags: ['dice', 'd6', 'games', 'tabletop', 'square'],
    model: tray({
      cellsX: 2, cellsY: 2, pocketShape: 'square', pocketSize: 16.8, cornerRadius: 1.5,
      pocketDepth: 10, pocketCols: 4, pocketRows: 4, pocketSpacing: 2,
    }),
  },
  {
    id: 'tray-coin',
    category: 'trays',
    name: 'Coin & token tray',
    description: '16 round pockets for stacks of coins or game tokens up to 26 mm.',
    tags: ['coins', 'tokens', 'games', 'round'],
    model: tray({
      cellsX: 3, cellsY: 3, pocketShape: 'circle', pocketSize: 26, pocketDepth: 6,
      pocketCols: 4, pocketRows: 4, pocketSpacing: 2,
    }),
  },
  {
    id: 'tray-scoop-cups',
    category: 'trays',
    name: 'Scoop cups',
    description: '9 deep bowl-bottomed cups for screws, nuts and parts.',
    tags: ['parts', 'cups', 'scoop', 'bowl', 'hardware', 'screws'],
    model: tray({
      cellsX: 2, cellsY: 2, pocketShape: 'circle', pocketSize: 24, roundedBottom: true,
      pocketDepth: 14, pocketCols: 3, pocketRows: 3, pocketSpacing: 2,
    }),
  },
  {
    id: 'tray-small-parts',
    category: 'trays',
    name: 'Small parts cups',
    description: '25 small round-bottomed cups for resistors, LEDs and hardware.',
    tags: ['parts', 'electronics', 'cups', 'small', 'smd'],
    model: tray({
      cellsX: 2, cellsY: 2, pocketShape: 'circle', pocketSize: 14, roundedBottom: true,
      pocketDepth: 8, pocketCols: 5, pocketRows: 5, pocketSpacing: 1.5,
    }),
  },

  // ── Baseplates ─────────────────────────────────────────────────────────────
  {
    id: 'base-3x3-minimal',
    category: 'baseplates',
    name: '3×3 Minimal',
    description: 'Thin 3×3 baseplate with standard Gridfinity profile.',
    tags: ['baseplate', 'minimal', 'thin', '3x3'],
    model: base({ cellsX: 3, cellsY: 3, style: 'minimal' }),
  },
  {
    id: 'base-5x5-minimal',
    category: 'baseplates',
    name: '5×5 Minimal',
    description: 'Larger 5×5 thin baseplate — desk or drawer mat.',
    tags: ['baseplate', 'minimal', 'thin', '5x5'],
    model: base({ cellsX: 5, cellsY: 5, style: 'minimal' }),
  },
  {
    id: 'base-3x3-rigid',
    category: 'baseplates',
    name: '3×3 Rigid',
    description: '3×3 baseplate with a solid floor under the pockets.',
    tags: ['baseplate', 'rigid', 'thick', '3x3', 'slab'],
    model: base({ cellsX: 3, cellsY: 3, style: 'rigid' }),
  },
  {
    id: 'base-3x3-magnets',
    category: 'baseplates',
    name: '3×3 Magnet baseplate',
    description: 'Rigid plate with 6×2 mm magnet holes under every pocket.',
    tags: ['baseplate', 'rigid', 'magnets', '3x3'],
    model: base({ cellsX: 3, cellsY: 3, style: 'rigid', magnetHoles: true }),
  },
  {
    id: 'base-5x5-rigid',
    category: 'baseplates',
    name: '5×5 Rigid',
    description: '5×5 rigid baseplate — sturdy platform for heavy bins.',
    tags: ['baseplate', 'rigid', 'thick', '5x5', 'slab'],
    model: base({ cellsX: 5, cellsY: 5, style: 'rigid' }),
  },
  {
    id: 'base-7x3-minimal',
    category: 'baseplates',
    name: '7×3 Drawer strip',
    description: 'Long thin baseplate for a standard drawer width.',
    tags: ['baseplate', 'minimal', 'drawer', 'strip', 'long'],
    model: base({ cellsX: 7, cellsY: 3, style: 'minimal' }),
  },
];

export const CATEGORY_META: Record<
  TemplateCategory,
  { label: string; emoji: string }
> = {
  all:           { label: 'All',          emoji: '' },
  'quick-start': { label: 'Quick Start',  emoji: '' },
  bins:          { label: 'Bins',         emoji: '' },
  lids:          { label: 'Lids',         emoji: '' },
  organizers:    { label: 'Holders',      emoji: '' },
  trays:         { label: 'Pocket trays', emoji: '' },
  baseplates:    { label: 'Baseplates',   emoji: '' },
};

export const CATEGORIES: TemplateCategory[] = [
  'all', 'quick-start', 'bins', 'lids', 'organizers', 'trays', 'baseplates',
];
