/**
 * Printer build-plate presets, in mm.
 * Numbers are physical bed dimensions, X (width) × Y (depth).
 */

export type Printer = {
  id: string;
  brand: string;
  model: string;
  /** Width of the bed (X axis), in mm. */
  x: number;
  /** Depth of the bed (Y axis), in mm. */
  y: number;
};

export const PRINTERS: ReadonlyArray<Printer> = [
  { id: 'bambu-h2d', brand: 'Bambu Lab', model: 'H2D', x: 320, y: 325 },
  { id: 'bambu-x1c', brand: 'Bambu Lab', model: 'X1C / X1 / P1S / P1P', x: 256, y: 256 },
  { id: 'bambu-a1', brand: 'Bambu Lab', model: 'A1', x: 256, y: 256 },
  { id: 'bambu-a1-mini', brand: 'Bambu Lab', model: 'A1 Mini', x: 180, y: 180 },

  { id: 'prusa-mk4', brand: 'Prusa', model: 'MK4 / MK3.5', x: 250, y: 210 },
  { id: 'prusa-mini', brand: 'Prusa', model: 'Mini+', x: 180, y: 180 },
  { id: 'prusa-xl', brand: 'Prusa', model: 'XL', x: 360, y: 360 },
  { id: 'prusa-core-one', brand: 'Prusa', model: 'Core One', x: 250, y: 220 },

  { id: 'creality-k1', brand: 'Creality', model: 'K1 / Ender-3 V3', x: 220, y: 220 },
  { id: 'creality-k1-max', brand: 'Creality', model: 'K1 Max', x: 300, y: 300 },
  { id: 'creality-k2-plus', brand: 'Creality', model: 'K2 Plus', x: 350, y: 350 },

  { id: 'voron-2.4-350', brand: 'Voron', model: '2.4 (350)', x: 350, y: 350 },
  { id: 'voron-2.4-250', brand: 'Voron', model: '2.4 (250)', x: 250, y: 250 },

  { id: 'anycubic-kobra-3', brand: 'Anycubic', model: 'Kobra 3', x: 250, y: 250 },
  { id: 'anycubic-kobra-max', brand: 'Anycubic', model: 'Kobra 2 Max', x: 420, y: 420 },

  { id: 'elegoo-centauri', brand: 'Elegoo', model: 'Centauri Carbon', x: 256, y: 256 },

  { id: 'qidi-q1-pro', brand: 'QIDI', model: 'Q1 Pro', x: 245, y: 245 },
  { id: 'qidi-x-max-3', brand: 'QIDI', model: 'X-Max 3', x: 325, y: 325 },

  { id: 'custom', brand: 'Custom', model: 'Custom size', x: 256, y: 256 },
];

export const DEFAULT_PRINTER_ID = 'bambu-h2d';

export function findPrinter(id: string): Printer {
  return PRINTERS.find((p) => p.id === id) ?? PRINTERS[0];
}

export function printerLabel(p: Printer): string {
  return `${p.brand} ${p.model}`;
}
