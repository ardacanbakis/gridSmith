/**
 * Hole sets for the Holder model. All sizes in millimetres; inch-based sets
 * are converted so the geometry kernel only deals in one unit.
 *
 * A 'set' places each item once, in catalogue order, with its size engraved
 * underneath (drill indexes, hex keys). A 'fill' repeats a single item to fill
 * whatever block it's given (batteries, bits, router shanks).
 */
import type { BitSetId } from '@/lib/params/schema';

export type { BitSetId };

/** 'hex' holes are sized across flats, for hex keys and hex-shank bits. */
export type HoleShape = 'round' | 'hex';

/** `label` is the short text engraved next to the hole. */
export type HoleItem = { mm: number; label: string };

export type HoleSet = {
  shape: HoleShape;
  mode: 'set' | 'fill';
  items: ReadonlyArray<HoleItem>;
};

export type BitSetGroup = 'drill' | 'hex' | 'router' | 'battery';

export type BitSet = HoleSet & {
  id: Exclude<BitSetId, 'custom'>;
  label: string;
  description: string;
  group: BitSetGroup;
  /** Suggested hole depth, applied when the set is picked. */
  depth: number;
  /** Sizes are inch-based; hidden while working in millimetres. */
  imperial?: true;
  /** Kept only so old links and saved designs still load; not offered in the UI. */
  legacy?: true;
};

const MM_PER_INCH = 25.4;

function fraction(num: number, den: number): HoleItem {
  return { mm: (num / den) * MM_PER_INCH, label: `${num}/${den}` };
}

function metricRange(from: number, to: number, step: number): HoleItem[] {
  const out: HoleItem[] = [];
  for (let d = from; d <= to + 1e-9; d += step) out.push({ mm: d, label: `${d}` });
  return out;
}

const LETTER_SIZES_IN: ReadonlyArray<[string, number]> = [
  ['A', 0.234], ['B', 0.238], ['C', 0.242], ['D', 0.246], ['E', 0.250],
  ['F', 0.257], ['G', 0.261], ['H', 0.266], ['I', 0.272], ['J', 0.277],
  ['K', 0.281], ['L', 0.290], ['M', 0.295], ['N', 0.302], ['O', 0.316],
  ['P', 0.323], ['Q', 0.332], ['R', 0.339], ['S', 0.348], ['T', 0.358],
  ['U', 0.368], ['V', 0.377], ['W', 0.386], ['X', 0.397], ['Y', 0.404],
  ['Z', 0.413],
];

const NUMBER_SIZES_IN: ReadonlyArray<[number, number]> = [
  [1, 0.2280], [2, 0.2210], [3, 0.2130], [4, 0.2090], [5, 0.2055],
  [6, 0.2040], [7, 0.2010], [8, 0.1990], [9, 0.1960], [10, 0.1935],
  [11, 0.1910], [12, 0.1890], [13, 0.1850], [14, 0.1820], [15, 0.1800],
  [16, 0.1770], [17, 0.1730], [18, 0.1695], [19, 0.1660], [20, 0.1610],
  [21, 0.1590], [22, 0.1570], [23, 0.1540], [24, 0.1520], [25, 0.1495],
  [26, 0.1470], [27, 0.1440], [28, 0.1405], [29, 0.1360], [30, 0.1285],
];

function fill(
  id: Exclude<BitSetId, 'custom'>,
  group: BitSetGroup,
  label: string,
  description: string,
  shape: HoleShape,
  item: HoleItem,
  depth: number,
  extra: { imperial?: true; legacy?: true } = {},
): BitSet {
  return { id, group, label, description, shape, mode: 'fill', items: [item], depth, ...extra };
}

export const BIT_SETS: Record<Exclude<BitSetId, 'custom'>, BitSet> = {
  // ── Drill indexes: every size once, in order, labelled ──────────────────
  'metric-basic': {
    id: 'metric-basic', group: 'drill', shape: 'round', mode: 'set', depth: 15,
    label: 'Metric 1–13 mm',
    description: 'Whole-mm steps, 13 bits.',
    items: metricRange(1, 13, 1),
  },
  'metric-fine': {
    id: 'metric-fine', group: 'drill', shape: 'round', mode: 'set', depth: 15,
    label: 'Metric 1–13 mm, 0.5 step',
    description: 'Half-mm steps, 25 bits.',
    items: metricRange(1, 13, 0.5),
  },
  'fractional-inch': {
    id: 'fractional-inch', group: 'drill', shape: 'round', mode: 'set', depth: 15, imperial: true,
    label: 'Fractional 1/16"–1/2"',
    description: '32nds, 15 bits.',
    items: [
      fraction(1, 16), fraction(3, 32), fraction(1, 8), fraction(5, 32), fraction(3, 16),
      fraction(7, 32), fraction(1, 4), fraction(9, 32), fraction(5, 16), fraction(11, 32),
      fraction(3, 8), fraction(13, 32), fraction(7, 16), fraction(15, 32), fraction(1, 2),
    ],
  },
  letter: {
    id: 'letter', group: 'drill', shape: 'round', mode: 'set', depth: 15, imperial: true,
    label: 'Letter A–Z',
    description: 'US letter gauge, 26 bits.',
    items: LETTER_SIZES_IN.map(([letter, inches]) => ({ mm: inches * MM_PER_INCH, label: letter })),
  },
  number: {
    id: 'number', group: 'drill', shape: 'round', mode: 'set', depth: 15, imperial: true,
    label: 'Number #1–#30',
    description: 'Wire gauge, 30 bits.',
    items: NUMBER_SIZES_IN.map(([num, inches]) => ({ mm: inches * MM_PER_INCH, label: `#${num}` })),
  },

  // ── Hex keys and hex-shank bits ─────────────────────────────────────────
  'hex-metric': {
    id: 'hex-metric', group: 'hex', shape: 'hex', mode: 'set', depth: 15,
    label: 'Hex keys 1.5–10 mm',
    description: 'Metric Allen keys stand in hex holes, 9 sizes.',
    items: [1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((d) => ({ mm: d, label: `${d}` })),
  },
  'hex-imperial': {
    id: 'hex-imperial', group: 'hex', shape: 'hex', mode: 'set', depth: 15, imperial: true,
    label: 'Hex keys 5/64"–3/8"',
    description: 'SAE Allen keys stand in hex holes, 11 sizes.',
    items: [
      fraction(5, 64), fraction(3, 32), fraction(7, 64), fraction(1, 8), fraction(9, 64),
      fraction(5, 32), fraction(3, 16), fraction(7, 32), fraction(1, 4), fraction(5, 16), fraction(3, 8),
    ],
  },
  'hex-bit-quarter': fill(
    'hex-bit-quarter', 'hex', '1/4" hex bits', 'Screwdriver bits stand in hex holes; fills the block.',
    'hex', { mm: 6.35, label: '1/4' }, 10,
  ),
  'hex-bit-4mm': fill(
    'hex-bit-4mm', 'hex', '4 mm precision bits', 'Electronics-kit bits stand in hex holes; fills the block.',
    'hex', { mm: 4, label: '4' }, 8,
  ),

  // ── Router shanks ───────────────────────────────────────────────────────
  'router-eighth': fill('router-eighth', 'router', 'Router 1/8" shank', 'Fills the block.', 'round', { mm: 3.175, label: '1/8' }, 15, { imperial: true }),
  'router-quarter': fill('router-quarter', 'router', 'Router 1/4" shank', 'Fills the block.', 'round', { mm: 6.35, label: '1/4' }, 20, { imperial: true }),
  'router-half': fill('router-half', 'router', 'Router 1/2" shank', 'Fills the block.', 'round', { mm: 12.7, label: '1/2' }, 25, { imperial: true }),
  'router-6mm': fill('router-6mm', 'router', 'Router 6 mm shank', 'Fills the block.', 'round', { mm: 6, label: '6' }, 20),
  'router-8mm': fill('router-8mm', 'router', 'Router 8 mm shank', 'Fills the block.', 'round', { mm: 8, label: '8' }, 20),
  'router-12mm': fill('router-12mm', 'router', 'Router 12 mm shank', 'Fills the block.', 'round', { mm: 12, label: '12' }, 25),

  // ── Batteries (sizes include ~0.2 mm slip) ──────────────────────────────
  'battery-aa': fill('battery-aa', 'battery', 'AA cells', 'Stand upright; fills the block.', 'round', { mm: 14.7, label: 'AA' }, 20),
  'battery-aaa': fill('battery-aaa', 'battery', 'AAA cells', 'Stand upright; fills the block.', 'round', { mm: 10.7, label: 'AAA' }, 18),
  'battery-18650-4': fill('battery-18650-4', 'battery', '18650 cells', 'Li-ion cells stand upright; fills the block.', 'round', { mm: 18.7, label: '18650' }, 25),
  'battery-21700': fill('battery-21700', 'battery', '21700 cells', 'Li-ion cells stand upright; fills the block.', 'round', { mm: 21.4, label: '21700' }, 25),
  'battery-cr2032': fill('battery-cr2032', 'battery', 'CR2032 coin cells', 'Stacked flat; fills the block. For upright slots, use a Pockets rack.', 'round', { mm: 20.4, label: 'CR2032' }, 6),
  'battery-mixed': {
    id: 'battery-mixed', group: 'battery', shape: 'round', mode: 'set', depth: 20,
    label: 'Mixed: 18650, AA, AAA',
    description: 'Two of each, labelled.',
    items: [
      { mm: 18.7, label: '18650' }, { mm: 18.7, label: '18650' },
      { mm: 14.7, label: 'AA' }, { mm: 14.7, label: 'AA' },
      { mm: 10.7, label: 'AAA' }, { mm: 10.7, label: 'AAA' },
    ],
  },
  'battery-18650-8': fill('battery-18650-8', 'battery', '18650 cells', 'Li-ion cells stand upright; fills the block.', 'round', { mm: 18.7, label: '18650' }, 25, { legacy: true }),
};

/** The holes to cut for a set id, or for a custom list of round diameters. */
export function holeSetFor(id: BitSetId, customMm: ReadonlyArray<number>): HoleSet {
  if (id === 'custom') {
    return {
      shape: 'round',
      mode: 'set',
      items: customMm.map((d) => ({ mm: d, label: `${Number(d.toFixed(2))}` })),
    };
  }
  return BIT_SETS[id];
}
