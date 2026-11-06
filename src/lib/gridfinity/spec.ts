/**
 * Gridfinity dimensional spec, scaled to any grid size.
 *
 * Source: Zack Freedman's Gridfinity (MIT) + community-maintained spec at
 * https://github.com/Stu142/Gridfinity-Documentation, cross-checked against
 * gridfinity-rebuilt-openscad. All dimensions are scaled linearly off a
 * standard 42 mm cell and 7 mm height unit; if the user changes either, parts
 * won't mate with stock Gridfinity but will be self-consistent across
 * everything generated here.
 *
 * All values in millimetres.
 */
export const STANDARD = {
  gridUnit: 42,
  heightUnit: 7,
  clearance: 0.5,
} as const;

/** One step of a profile; `inset` is measured inward from the outline the profile is swept around. */
export type ProfileLayer = { z: number; inset: number };

/**
 * A cross-section swept around a rounded-rectangle outline. Every layer is
 * that outline offset inward, so corner radii shrink with the inset and the
 * 45° chamfers stay 45° all the way round the corners.
 */
export type SweptProfile = {
  /** Corner radius of the outline itself (inset 0). */
  radius: number;
  /** Bottom-up. */
  layers: ReadonlyArray<ProfileLayer>;
};

export type Spec = {
  gridUnit: number;
  heightUnit: number;
  clearance: number;
  /** Bin foot, swept around the bin outline (one cell minus clearance). */
  baseProfile: SweptProfile & { totalHeight: number };
  /** Baseplate pocket, swept around the full cell — 0.25 mm looser per side than the foot. */
  baseplateProfile: SweptProfile & { totalHeight: number };
  magnet: { diameter: number; depth: number; insetFromCenter: number };
  screw: { diameter: number };
  /**
   * Inner face of the stacking lip, swept around the part outline. It mirrors
   * the foot, so the bin above nests on both chamfers. The knife edge at the
   * top is trimmed to a flat `tip` wide, which lowers the lip by the same amount.
   */
  stackLip: SweptProfile & { height: number; tip: number };
};

const STANDARD_BASE = {
  radius: 3.75,
  layers: [
    { z: 0, inset: 2.95 },
    { z: 0.8, inset: 2.15 },
    { z: 2.6, inset: 2.15 },
    { z: 4.75, inset: 0 },
  ],
  totalHeight: 4.75,
};

const STANDARD_BASEPLATE = {
  radius: 4,
  layers: [
    { z: 0, inset: 2.85 },
    { z: 0.7, inset: 2.15 },
    { z: 2.5, inset: 2.15 },
    { z: 4.65, inset: 0 },
  ],
  totalHeight: 4.65,
};

const STANDARD_STACK_LIP = {
  radius: 3.75,
  layers: [
    { z: 0, inset: 2.6 },
    { z: 0.7, inset: 1.9 },
    { z: 2.5, inset: 1.9 },
    { z: 4.4, inset: 0 },
  ],
  height: 4.4,
  tip: 0.6,
};

function scaleProfile<P extends SweptProfile>(p: P, s: number): P {
  return { ...p, radius: p.radius * s, layers: p.layers.map((l) => ({ z: l.z * s, inset: l.inset * s })) };
}

export function buildSpec(gridUnit: number, heightUnit: number): Spec {
  const s = gridUnit / STANDARD.gridUnit;
  return {
    gridUnit,
    heightUnit,
    clearance: STANDARD.clearance * s,
    baseProfile: { ...scaleProfile(STANDARD_BASE, s), totalHeight: STANDARD_BASE.totalHeight * s },
    baseplateProfile: { ...scaleProfile(STANDARD_BASEPLATE, s), totalHeight: STANDARD_BASEPLATE.totalHeight * s },
    // Hole for a standard 6 × 2 mm disc magnet, with press-fit clearance.
    magnet: { diameter: 6.5, depth: 2.4, insetFromCenter: 13.0 * s },
    screw: { diameter: 3.0 },
    stackLip: {
      ...scaleProfile(STANDARD_STACK_LIP, s),
      height: STANDARD_STACK_LIP.height * s,
      tip: STANDARD_STACK_LIP.tip * s,
    },
  };
}

export const STANDARD_SPEC = buildSpec(STANDARD.gridUnit, STANDARD.heightUnit);

export function isStandardSpec(gridUnit: number, heightUnit: number): boolean {
  return gridUnit === STANDARD.gridUnit && heightUnit === STANDARD.heightUnit;
}
