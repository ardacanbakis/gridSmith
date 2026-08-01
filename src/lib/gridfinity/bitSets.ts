/**
 * Round-pocket holder presets — drill bits, router shanks, batteries.
 * All diameters in millimetres; letter/number gauge sizes converted from inches.
 */

export type BitSetId =
  | 'metric-basic'
  | 'metric-fine'
  | 'letter'
  | 'number'
  | 'router-6mm'
  | 'router-8mm'
  | 'router-12mm'
  | 'battery-aa'
  | 'battery-aaa'
  | 'battery-18650-4'
  | 'battery-18650-8'
  | 'battery-cr2032'
  | 'battery-mixed'
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

function routerShank(id: Exclude<BitSetId, 'custom'>, label: string, mmDiameter: number, count: number, displayLabel: string): BitSet {
  const diameters: Array<{ mm: number; label: string }> = [];
  for (let i = 1; i <= count; i++) {
    diameters.push({ mm: mmDiameter, label: `${displayLabel} #${i}` });
  }
  return {
    id,
    label,
    description: `${count} pockets sized for a ${displayLabel} shank.`,
    diameters,
  };
}

function batterySet(
  id: Exclude<BitSetId, 'custom'>,
  label: string,
  mmDiameter: number,
  count: number,
  cellLabel: string,
  description: string,
): BitSet {
  const diameters: Array<{ mm: number; label: string }> = [];
  for (let i = 1; i <= count; i++) {
    diameters.push({ mm: mmDiameter, label: `${cellLabel} #${i}` });
  }
  return { id, label, description, diameters };
}

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
  'router-6mm': routerShank('router-6mm', 'Router 6 mm shank ×12', 6, 12, '6 mm'),
  'router-8mm': routerShank('router-8mm', 'Router 8 mm shank ×9', 8, 9, '8 mm'),
  'router-12mm': routerShank('router-12mm', 'Router 12 mm shank ×6', 12, 6, '12 mm'),
  'battery-aa': batterySet('battery-aa', 'Battery AA ×4', 14.7, 4, 'AA', 'AA cells (14.5 mm + 0.2 mm slip).'),
  'battery-aaa': batterySet('battery-aaa', 'Battery AAA ×4', 10.7, 4, 'AAA', 'AAA cells (10.5 mm + 0.2 mm slip).'),
  'battery-18650-4': batterySet('battery-18650-4', 'Battery 18650 ×4', 18.7, 4, '18650', '18650 Li-ion cells (18.5 mm + 0.2 mm slip).'),
  'battery-18650-8': batterySet('battery-18650-8', 'Battery 18650 ×8', 18.7, 8, '18650', '18650 Li-ion cells, 8-pack.'),
  'battery-cr2032': batterySet('battery-cr2032', 'Coin CR2032 ×8', 20.4, 8, 'CR2032', 'Coin cells, drop-in pockets.'),
  'battery-mixed': {
    id: 'battery-mixed',
    label: 'Battery Mixed (AA/AAA/18650)',
    description: '2× AA, 2× AAA, 2× 18650 in one bin.',
    diameters: [
      { mm: 18.7, label: '18650 #1' },
      { mm: 18.7, label: '18650 #2' },
      { mm: 14.7, label: 'AA #1' },
      { mm: 14.7, label: 'AA #2' },
      { mm: 10.7, label: 'AAA #1' },
      { mm: 10.7, label: 'AAA #2' },
    ],
  },
};

export function bitsForSet(id: BitSetId, customMm: ReadonlyArray<number>): ReadonlyArray<{ mm: number; label: string }> {
  if (id === 'custom') {
    return customMm.map((d) => ({ mm: d, label: `${d.toFixed(2)} mm` }));
  }
  return BIT_SETS[id].diameters;
}
