/**
 * Gridfinity dimensional spec.
 * Source: Zack Freedman's Gridfinity (MIT) and the community-maintained spec
 * at https://github.com/Stu142/Gridfinity-Documentation.
 *
 * All values in millimetres.
 */
export const GRID = {
  /** Footprint of one cell on the baseplate, edge to edge. */
  unit: 42,
  /** Vertical height unit; bin Z is always a multiple of this. */
  heightUnit: 7,
  /** Tolerance subtracted from each cell so adjacent bins don't bind. */
  clearance: 0.5,
  /** Outer corner radius at the top of the bin/baseplate base profile. */
  outerCornerRadius: 4,
} as const;

/**
 * Bin base profile, bottom up.
 * Each layer is a rounded square cross-section; we loft between them.
 * This profile mates with the female pocket on the baseplate.
 */
export const BASE_PROFILE = {
  layers: [
    { z: 0.0, size: 35.6, radius: 1.6 },
    { z: 0.8, size: 37.2, radius: 2.4 },
    { z: 2.6, size: 37.2, radius: 2.4 },
    { z: 4.75, size: 41.5, radius: 4.0 },
  ],
  totalHeight: 4.75,
} as const;

/** Standard magnet pocket: 6 mm diameter × 2 mm deep, one per base corner. */
export const MAGNET = {
  diameter: 6.0,
  depth: 2.0,
  /** Distance from cell centre to magnet centre, on each axis. */
  insetFromCenter: 13.0,
} as const;

/** Optional M3 screw hole through the magnet pocket. */
export const SCREW = {
  diameter: 3.0,
} as const;

/** Stacking lip allows bins to nest on top of each other. */
export const STACK_LIP = {
  height: 4.4,
} as const;

export function cellsToMm(cells: number): number {
  return cells * GRID.unit;
}

export function heightUnitsToMm(units: number): number {
  return units * GRID.heightUnit;
}
