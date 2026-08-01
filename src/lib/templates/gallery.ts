import {
  BaseplateParamsSchema,
  BinParamsSchema,
  DrillBitHolderParamsSchema,
  LidParamsSchema,
  ScrewOrganizerParamsSchema,
  PartsTrayParamsSchema,
  type ModelParams,
} from '@/lib/params/schema';
import { BIT_SETS } from '@/lib/gridfinity/bitSets';

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
function organizer(o: Record<string, unknown> = {}): ModelParams {
  return DrillBitHolderParamsSchema.parse({ kind: 'drillBitHolder', ...o });
}
function screws(o: Record<string, unknown> = {}): ModelParams {
  return ScrewOrganizerParamsSchema.parse({ kind: 'screwOrganizer', ...o });
}
function tray(o: Record<string, unknown> = {}): ModelParams {
  return PartsTrayParamsSchema.parse({ kind: 'partsTray', ...o });
}
function lid(o: Record<string, unknown> = {}): ModelParams {
  return LidParamsSchema.parse({ kind: 'lid', ...o });
}

const IMPERIAL_ONLY_SETS = new Set([
  'fractional-inch', 'letter', 'number', 'router-quarter', 'router-eighth',
]);

export function isImperialOnly(model: ModelParams): boolean {
  return model.kind === 'drillBitHolder' && IMPERIAL_ONLY_SETS.has(model.bitSet);
}

export function templateSpec(model: ModelParams): string {
  if (model.kind === 'bin') {
    const comps = model.divX * model.divY;
    return `${model.cellsX}×${model.cellsY} · ${model.heightUnits}u${comps > 1 ? ` · ${comps} comp.` : ''}`;
  }
  if (model.kind === 'baseplate') return `${model.cellsX}×${model.cellsY} · ${model.style}`;
  if (model.kind === 'drillBitHolder') {
    if (model.bitSet !== 'custom') {
      return `${model.cellsX}×${model.cellsY} · ${BIT_SETS[model.bitSet].diameters.length} pockets`;
    }
    return `${model.cellsX}×${model.cellsY} · custom`;
  }
  if (model.kind === 'screwOrganizer') return `${model.cellsX}×${model.cellsY} · ${model.cols}×${model.rows}`;
  if (model.kind === 'lid') return `${model.cellsX}×${model.cellsY} · ${model.lidClearance}mm clearance`;
  return `${model.cellsX}×${model.cellsY} · ${model.pocketCols}×${model.pocketRows} pockets`;
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
    id: 'qs-battery-aa',
    category: 'quick-start',
    name: 'AA battery tray',
    description: 'Holds 4 AA cells with a snug drop-in fit.',
    tags: ['battery', 'aa', 'organizer', 'cells'],
    model: organizer({ cellsX: 2, cellsY: 1, heightUnits: 3, bitSet: 'battery-aa' }),
  },
  {
    id: 'qs-drill-metric',
    category: 'quick-start',
    name: 'Metric drill bits',
    description: '13 pockets for 1–13 mm whole-mm drill bits.',
    tags: ['drill', 'metric', 'organizer', 'tools'],
    model: organizer({ cellsX: 5, cellsY: 1, heightUnits: 3, bitSet: 'metric-basic' }),
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
    id: 'qs-parts-tray',
    category: 'quick-start',
    name: 'Small parts tray',
    description: '5×5 grid of 14 mm pockets for resistors, caps, or hardware.',
    tags: ['tray', 'parts', 'circle', 'electronics', 'small'],
    model: tray({ cellsX: 2, cellsY: 2, heightUnits: 2, pocketSize: 14, pocketDepth: 8, pocketCols: 5, pocketRows: 5 }),
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

  // ── Organizers ─────────────────────────────────────────────────────────────
  {
    id: 'org-drill-metric-basic',
    category: 'organizers',
    name: 'Metric drill bits',
    description: '13 holes for 1–13 mm bits in 1 mm steps.',
    tags: ['drill', 'metric', 'bits', '13', 'tools'],
    model: organizer({ cellsX: 5, cellsY: 1, heightUnits: 3, bitSet: 'metric-basic' }),
  },
  {
    id: 'org-drill-metric-fine',
    category: 'organizers',
    name: 'Metric drill bits (fine)',
    description: '25 holes, 1–13 mm in 0.5 mm steps.',
    tags: ['drill', 'metric', 'bits', '25', 'fine', 'tools'],
    model: organizer({ cellsX: 7, cellsY: 1, heightUnits: 3, bitSet: 'metric-fine' }),
  },
  {
    id: 'org-drill-fractional',
    category: 'organizers',
    name: 'Fractional drill bits',
    description: '15 holes, 1/16″ – 1/2″ in 32nds (imperial).',
    tags: ['drill', 'imperial', 'fractional', 'inch', 'bits'],
    model: organizer({ cellsX: 5, cellsY: 1, heightUnits: 3, bitSet: 'fractional-inch' }),
  },
  {
    id: 'org-drill-letter',
    category: 'organizers',
    name: 'Letter drill bits (A–Z)',
    description: '26 US letter-gauge holes.',
    tags: ['drill', 'letter', 'imperial', 'bits', 'tools'],
    model: organizer({ cellsX: 7, cellsY: 1, heightUnits: 3, bitSet: 'letter' }),
  },
  {
    id: 'org-drill-number',
    category: 'organizers',
    name: 'Number drill bits (#1–#30)',
    description: '30 wire-gauge holes (imperial).',
    tags: ['drill', 'number', 'imperial', 'bits', 'wire gauge'],
    model: organizer({ cellsX: 8, cellsY: 1, heightUnits: 3, bitSet: 'number' }),
  },
  {
    id: 'org-router-quarter',
    category: 'organizers',
    name: 'Router ¼″ shank',
    description: '12 pockets for ¼″ shank router bits.',
    tags: ['router', 'quarter', 'imperial', 'woodworking'],
    model: organizer({ cellsX: 4, cellsY: 1, heightUnits: 4, bitSet: 'router-quarter' }),
  },
  {
    id: 'org-router-6mm',
    category: 'organizers',
    name: 'Router 6 mm shank',
    description: '12 pockets for 6 mm metric router bits.',
    tags: ['router', '6mm', 'metric', 'woodworking'],
    model: organizer({ cellsX: 4, cellsY: 1, heightUnits: 4, bitSet: 'router-6mm' }),
  },
  {
    id: 'org-router-8mm',
    category: 'organizers',
    name: 'Router 8 mm shank',
    description: '9 pockets for 8 mm metric router bits.',
    tags: ['router', '8mm', 'metric', 'woodworking'],
    model: organizer({ cellsX: 3, cellsY: 1, heightUnits: 4, bitSet: 'router-8mm' }),
  },
  {
    id: 'org-battery-aa',
    category: 'organizers',
    name: 'AA batteries ×4',
    description: 'Drop-in pockets for 4 AA cells (14.5 mm).',
    tags: ['battery', 'aa', 'cells', '4'],
    model: organizer({ cellsX: 2, cellsY: 1, heightUnits: 3, bitSet: 'battery-aa' }),
  },
  {
    id: 'org-battery-aaa',
    category: 'organizers',
    name: 'AAA batteries ×4',
    description: 'Drop-in pockets for 4 AAA cells (10.5 mm).',
    tags: ['battery', 'aaa', 'cells', '4'],
    model: organizer({ cellsX: 1, cellsY: 1, heightUnits: 3, bitSet: 'battery-aaa' }),
  },
  {
    id: 'org-battery-18650',
    category: 'organizers',
    name: '18650 batteries ×8',
    description: '8 pockets for 18650 Li-ion cells.',
    tags: ['battery', '18650', 'liion', 'cells', '8'],
    model: organizer({ cellsX: 3, cellsY: 1, heightUnits: 4, bitSet: 'battery-18650-8' }),
  },
  {
    id: 'org-battery-mixed',
    category: 'organizers',
    name: 'Mixed battery tray',
    description: 'AA, AAA, and 18650 cells in one bin.',
    tags: ['battery', 'mixed', 'aa', 'aaa', '18650'],
    model: organizer({ cellsX: 2, cellsY: 1, heightUnits: 4, bitSet: 'battery-mixed' }),
  },
  {
    id: 'org-battery-cr2032',
    category: 'organizers',
    name: 'CR2032 coin cells ×8',
    description: '8 drop-in pockets for CR2032 coin batteries.',
    tags: ['battery', 'cr2032', 'coin', 'cells'],
    model: organizer({ cellsX: 2, cellsY: 1, heightUnits: 2, bitSet: 'battery-cr2032' }),
  },

  // ── Lids ───────────────────────────────────────────────────────────────────
  {
    id: 'lid-1x1',
    category: 'lids',
    name: '1×1 Snap lid',
    description: 'Slim snap-on lid for a standard 1×1 bin.',
    tags: ['lid', '1x1', 'snap', 'cover'],
    model: lid({ cellsX: 1, cellsY: 1 }),
  },
  {
    id: 'lid-2x1',
    category: 'lids',
    name: '2×1 Snap lid',
    description: 'Snap-on lid for a 2×1 wide bin.',
    tags: ['lid', '2x1', 'snap', 'cover'],
    model: lid({ cellsX: 2, cellsY: 1 }),
  },
  {
    id: 'lid-2x2',
    category: 'lids',
    name: '2×2 Snap lid',
    description: 'Snap-on lid for a 2×2 bin — common desk organizer cover.',
    tags: ['lid', '2x2', 'snap', 'cover'],
    model: lid({ cellsX: 2, cellsY: 2 }),
  },
  {
    id: 'lid-3x2',
    category: 'lids',
    name: '3×2 Snap lid',
    description: 'Snap-on lid for a 3×2 medium storage bin.',
    tags: ['lid', '3x2', 'snap', 'cover'],
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

  // ── Trays ──────────────────────────────────────────────────────────────────
  {
    id: 'tray-coin',
    category: 'trays',
    name: 'Coin / token tray',
    description: '3×3 circular pockets at 22 mm — coins, tokens, or badges.',
    tags: ['tray', 'coins', 'tokens', 'circle', 'games'],
    model: tray({ cellsX: 2, cellsY: 2, heightUnits: 2, pocketShape: 'circle', pocketSize: 22, pocketDepth: 4, pocketCols: 3, pocketRows: 3 }),
  },
  {
    id: 'tray-small-parts',
    category: 'trays',
    name: 'Small parts tray',
    description: '5×5 grid of 14 mm pockets for resistors, caps, or hardware.',
    tags: ['tray', 'parts', 'electronics', 'circle', 'small'],
    model: tray({ cellsX: 2, cellsY: 2, heightUnits: 2, pocketShape: 'circle', pocketSize: 14, pocketDepth: 8, pocketCols: 5, pocketRows: 5 }),
  },
  {
    id: 'tray-electronics',
    category: 'trays',
    name: 'Electronics tray',
    description: '4×4 pockets at 18 mm for ICs, modules, and connectors.',
    tags: ['tray', 'electronics', 'ics', 'modules', 'circle'],
    model: tray({ cellsX: 2, cellsY: 2, heightUnits: 2, pocketShape: 'circle', pocketSize: 18, pocketDepth: 10, pocketCols: 4, pocketRows: 4 }),
  },
  {
    id: 'tray-sd-card',
    category: 'trays',
    name: 'SD / microSD card tray',
    description: '4×2 square pockets for memory cards.',
    tags: ['tray', 'sd', 'card', 'square', 'memory', 'microsd'],
    model: tray({ cellsX: 2, cellsY: 1, heightUnits: 1, pocketShape: 'square', pocketSize: 26, pocketDepth: 3, pocketCols: 4, pocketRows: 2 }),
  },
  {
    id: 'tray-dice',
    category: 'trays',
    name: 'D6 dice tray',
    description: '4×4 square pockets for standard 16 mm six-sided dice.',
    tags: ['tray', 'dice', 'd6', 'square', 'games', 'tabletop'],
    model: tray({ cellsX: 2, cellsY: 2, heightUnits: 2, pocketShape: 'square', pocketSize: 17, pocketDepth: 10, pocketCols: 4, pocketRows: 4 }),
  },
  {
    id: 'tray-foam-insert',
    category: 'trays',
    name: 'Foam-insert style',
    description: '6×4 shallow pockets at 12 mm — like a foam insert tray.',
    tags: ['tray', 'foam', 'insert', 'shallow', 'circle'],
    model: tray({ cellsX: 3, cellsY: 2, heightUnits: 2, pocketShape: 'circle', pocketSize: 12, pocketDepth: 6, pocketCols: 6, pocketRows: 4 }),
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
    description: '3×3 baseplate with +1.2 mm structural slab underneath.',
    tags: ['baseplate', 'rigid', 'thick', '3x3', 'slab'],
    model: base({ cellsX: 3, cellsY: 3, style: 'rigid' }),
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
  all:           { label: 'All',         emoji: '' },
  'quick-start': { label: 'Quick Start', emoji: '⚡' },
  bins:          { label: 'Bins',        emoji: '' },
  lids:          { label: 'Lids',        emoji: '' },
  organizers:    { label: 'Organizers',  emoji: '' },
  trays:         { label: 'Trays',       emoji: '' },
  baseplates:    { label: 'Baseplates',  emoji: '' },
};

export const CATEGORIES: TemplateCategory[] = [
  'all', 'quick-start', 'bins', 'lids', 'organizers', 'trays', 'baseplates',
];
