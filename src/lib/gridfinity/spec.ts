/**
 * Gridfinity dimensional spec, scaled to any grid size.
 *
 * Source: Zack Freedman's Gridfinity (MIT) + community-maintained spec at
 * https://github.com/Stu142/Gridfinity-Documentation. All base-profile
 * dimensions are scaled linearly off a standard 42 mm cell and 7 mm height unit;
 * if the user changes either, parts won't mate with stock Gridfinity but will be
 * self-consistent across everything generated here.
 *
 * All values in millimetres.
 */
export const STANDARD = {
  gridUnit: 42,
  heightUnit: 7,
  clearance: 0.5,
  outerCornerRadius: 4,
} as const;

export type Spec = {
  gridUnit: number;
  heightUnit: number;
  clearance: number;
  baseProfile: {
    layers: ReadonlyArray<{ z: number; size: number; radius: number }>;
    totalHeight: number;
  };
  magnet: { diameter: number; depth: number; insetFromCenter: number };
  screw: { diameter: number };
  stackLip: { height: number };
};

const STANDARD_PROFILE_LAYERS = [
  { z: 0.0, size: 35.6, radius: 1.6 },
  { z: 0.8, size: 37.2, radius: 2.4 },
  { z: 2.6, size: 37.2, radius: 2.4 },
  { z: 4.75, size: 41.5, radius: 4.0 },
] as const;

const STANDARD_PROFILE_HEIGHT = 4.75;

export function buildSpec(gridUnit: number, heightUnit: number): Spec {
  const s = gridUnit / STANDARD.gridUnit;
  return {
    gridUnit,
    heightUnit,
    clearance: STANDARD.clearance * s,
    baseProfile: {
      layers: STANDARD_PROFILE_LAYERS.map((l) => ({
        z: l.z * s,
        size: l.size * s,
        radius: l.radius * s,
      })),
      totalHeight: STANDARD_PROFILE_HEIGHT * s,
    },
    magnet: { diameter: 6.0, depth: 2.0, insetFromCenter: 13.0 * s },
    screw: { diameter: 3.0 },
    stackLip: { height: 4.4 * s },
  };
}

export const STANDARD_SPEC = buildSpec(STANDARD.gridUnit, STANDARD.heightUnit);

export function isStandardSpec(gridUnit: number, heightUnit: number): boolean {
  return gridUnit === STANDARD.gridUnit && heightUnit === STANDARD.heightUnit;
}
