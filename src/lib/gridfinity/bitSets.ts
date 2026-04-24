/**
 * Standard drill-bit set presets. All diameters in millimetres.
 * Fractional, letter, and number sets are converted to mm so the geometry
 * kernel only deals in one unit.
 */

export type BitSetId =
  | 'metric-basic'
  | 'metric-fine'
  | 'fractional-inch'
  | 'letter'
  | 'number'
  | 'custom';

export type BitSet = {
  id: BitSetId;
  label: string;
  description: string;
  diameters: ReadonlyArray<{ mm: number; label: string }>;
};

const MM_PER_INCH = 25.4;

function mm(n: number, label: string) {
  return { mm: n, label };
}

function frac(num: number, den: number): { mm: number; label: string } {
  return { mm: (num / den) * MM_PER_INCH, label: `${num}/${den}"` };
}

const METRIC_BASIC: ReadonlyArray<{ mm: number; label: string }> = (() => {
  const out: Array<{ mm: number; label: string }> = [];
  for (let d = 1; d <= 13; d += 1) out.push(mm(d, `${d} mm`));
  return out;
})();

const METRIC_FINE: ReadonlyArray<{ mm: number; label: string }> = (() => {
  const out: Array<{ mm: number; label: string }> = [];
  for (let d = 1; d <= 13; d += 0.5) out.push(mm(d, `${d} mm`));
  return out;
})();

const FRACTIONAL: ReadonlyArray<{ mm: number; label: string }> = [
  frac(1, 16),
  frac(3, 32),
  frac(1, 8),
  frac(5, 32),
  frac(3, 16),
  frac(7, 32),
  frac(1, 4),
  frac(9, 32),
  frac(5, 16),
  frac(11, 32),
  frac(3, 8),
  frac(13, 32),
  frac(7, 16),
  frac(15, 32),
  frac(1, 2),
];

const LETTER_SIZES_IN: ReadonlyArray<[string, number]> = [
  ['A', 0.234], ['B', 0.238], ['C', 0.242], ['D', 0.246], ['E', 0.250],
  ['F', 0.257], ['G', 0.261], ['H', 0.266], ['I', 0.272], ['J', 0.277],
  ['K', 0.281], ['L', 0.290], ['M', 0.295], ['N', 0.302], ['O', 0.316],
  ['P', 0.323], ['Q', 0.332], ['R', 0.339], ['S', 0.348], ['T', 0.358],
  ['U', 0.368], ['V', 0.377], ['W', 0.386], ['X', 0.397], ['Y', 0.404],
  ['Z', 0.413],
];
const LETTER: ReadonlyArray<{ mm: number; label: string }> = LETTER_SIZES_IN.map(
  ([letter, inches]) => ({ mm: inches * MM_PER_INCH, label: letter }),
);

const NUMBER_SIZES_IN: ReadonlyArray<[number, number]> = [
  [1, 0.2280], [2, 0.2210], [3, 0.2130], [4, 0.2090], [5, 0.2055],
  [6, 0.2040], [7, 0.2010], [8, 0.1990], [9, 0.1960], [10, 0.1935],
  [11, 0.1910], [12, 0.1890], [13, 0.1850], [14, 0.1820], [15, 0.1800],
  [16, 0.1770], [17, 0.1730], [18, 0.1695], [19, 0.1660], [20, 0.1610],
  [21, 0.1590], [22, 0.1570], [23, 0.1540], [24, 0.1520], [25, 0.1495],
  [26, 0.1470], [27, 0.1440], [28, 0.1405], [29, 0.1360], [30, 0.1285],
];
const NUMBER: ReadonlyArray<{ mm: number; label: string }> = NUMBER_SIZES_IN.map(
  ([num, inches]) => ({ mm: inches * MM_PER_INCH, label: `#${num}` }),
);

export const BIT_SETS: Record<Exclude<BitSetId, 'custom'>, BitSet> = {
  'metric-basic': {
    id: 'metric-basic',
    label: 'Metric 1–13 mm',
    description: 'Whole-mm steps, 13 bits.',
    diameters: METRIC_BASIC,
  },
  'metric-fine': {
    id: 'metric-fine',
    label: 'Metric 1–13 mm, 0.5 step',
    description: 'Half-mm steps, 25 bits.',
    diameters: METRIC_FINE,
  },
  'fractional-inch': {
    id: 'fractional-inch',
    label: 'Fractional 1/16" – 1/2"',
    description: '32nds, 15 bits.',
    diameters: FRACTIONAL,
  },
  letter: {
    id: 'letter',
    label: 'Letter A – Z',
    description: 'US letter gauge, 26 bits.',
    diameters: LETTER,
  },
  number: {
    id: 'number',
    label: 'Number #1 – #30',
    description: 'Wire gauge, 30 bits.',
    diameters: NUMBER,
  },
};

export function bitsForSet(id: BitSetId, customMm: ReadonlyArray<number>): ReadonlyArray<{ mm: number; label: string }> {
  if (id === 'custom') {
    return customMm.map((d) => ({ mm: d, label: `${d.toFixed(2)} mm` }));
  }
  return BIT_SETS[id].diameters;
}
