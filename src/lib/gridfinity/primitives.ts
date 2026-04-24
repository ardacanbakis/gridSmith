import type { ManifoldToplevel, Manifold } from 'manifold-3d';
import { BASE_PROFILE, GRID, MAGNET, SCREW, STACK_LIP } from './spec';

/**
 * Build a rounded square cross-section centred at origin.
 * Uses CrossSection.square + offset to get rounded corners cleanly.
 */
function roundedSquare(
  m: ManifoldToplevel,
  size: number,
  radius: number,
) {
  const inner = size - 2 * radius;
  return m.CrossSection.square([inner, inner], true).offset(radius, 'Round');
}

/**
 * The bin base — the chamfered foot that mates into a baseplate pocket.
 * Built as a stack of three lofted frustums; corner radii scale roughly
 * linearly with edge size, which is within fractions of a mm of spec.
 */
export function binBaseUnit(m: ManifoldToplevel): Manifold {
  const [l0, l1, l2, l3] = BASE_PROFILE.layers;

  const cs0 = roundedSquare(m, l0.size, l0.radius);
  const cs1 = roundedSquare(m, l1.size, l1.radius);
  const cs2 = roundedSquare(m, l2.size, l2.radius);
  const cs3 = roundedSquare(m, l3.size, l3.radius);

  const chamferLower = cs0.extrude(l1.z - l0.z, 0, 0, [l1.size / l0.size, l1.size / l0.size]);
  const middle = cs1.extrude(l2.z - l1.z).translate([0, 0, l1.z]);
  const chamferUpper = cs2
    .extrude(l3.z - l2.z, 0, 0, [l3.size / l2.size, l3.size / l2.size])
    .translate([0, 0, l2.z]);

  return chamferLower.add(middle).add(chamferUpper).add(
    cs3.extrude(0.0001).translate([0, 0, l3.z]),
  );
}

/**
 * The female pocket on a baseplate that receives a bin base.
 * Geometrically the inverse of the bin base — same profile carved into a block.
 */
export function baseplatePocket(m: ManifoldToplevel): Manifold {
  return binBaseUnit(m);
}

/**
 * Tile the unit base across an X×Y grid, each centre on a 42 mm spacing.
 */
function tileGrid(
  unit: Manifold,
  cellsX: number,
  cellsY: number,
): Manifold {
  const u = GRID.unit;
  const ox = -((cellsX - 1) * u) / 2;
  const oy = -((cellsY - 1) * u) / 2;
  let acc: Manifold | null = null;
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) {
      const piece = unit.translate([ox + x * u, oy + y * u, 0]);
      acc = acc ? acc.add(piece) : piece;
    }
  }
  return acc!;
}

export type BaseplateOptions = {
  cellsX: number;
  cellsY: number;
  style: 'minimal' | 'rigid';
  magnetHoles: boolean;
  screwHoles: boolean;
};

export function buildBaseplate(m: ManifoldToplevel, opts: BaseplateOptions): Manifold {
  const { cellsX, cellsY, style } = opts;
  const u = GRID.unit;
  const w = cellsX * u;
  const d = cellsY * u;

  const slabHeight = style === 'rigid' ? BASE_PROFILE.totalHeight + 1.2 : BASE_PROFILE.totalHeight;
  const slab = m.Manifold.cube([w, d, slabHeight], true).translate([0, 0, slabHeight / 2]);

  const pockets = tileGrid(baseplatePocket(m), cellsX, cellsY);
  let result = slab.subtract(pockets);

  if (opts.magnetHoles || opts.screwHoles) {
    const holes = magnetAndScrewHoles(m, cellsX, cellsY, opts.magnetHoles, opts.screwHoles, slabHeight);
    if (holes) result = result.subtract(holes);
  }

  return result;
}

function magnetAndScrewHoles(
  m: ManifoldToplevel,
  cellsX: number,
  cellsY: number,
  magnets: boolean,
  screws: boolean,
  slabHeight: number,
): Manifold | null {
  const u = GRID.unit;
  const ox = -((cellsX - 1) * u) / 2;
  const oy = -((cellsY - 1) * u) / 2;
  const offsets: Array<[number, number]> = [
    [-MAGNET.insetFromCenter, -MAGNET.insetFromCenter],
    [MAGNET.insetFromCenter, -MAGNET.insetFromCenter],
    [-MAGNET.insetFromCenter, MAGNET.insetFromCenter],
    [MAGNET.insetFromCenter, MAGNET.insetFromCenter],
  ];

  let acc: Manifold | null = null;
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) {
      const cx = ox + x * u;
      const cy = oy + y * u;
      for (const [dx, dy] of offsets) {
        if (magnets) {
          const cyl = m.Manifold.cylinder(MAGNET.depth + 0.01, MAGNET.diameter / 2, -1, 32, true)
            .translate([cx + dx, cy + dy, MAGNET.depth / 2]);
          acc = acc ? acc.add(cyl) : cyl;
        }
        if (screws) {
          const cyl = m.Manifold.cylinder(slabHeight + 0.01, SCREW.diameter / 2, -1, 24, true)
            .translate([cx + dx, cy + dy, slabHeight / 2]);
          acc = acc ? acc.add(cyl) : cyl;
        }
      }
    }
  }
  return acc;
}

export type BinOptions = {
  cellsX: number;
  cellsY: number;
  heightUnits: number;
  hollow: boolean;
  wallThickness: number;
  stackingLip: boolean;
  magnetHoles: boolean;
  screwHoles: boolean;
};

export function buildBin(m: ManifoldToplevel, opts: BinOptions): Manifold {
  const u = GRID.unit;
  const c = GRID.clearance;
  const outerW = opts.cellsX * u - c;
  const outerD = opts.cellsY * u - c;
  const totalH = opts.heightUnits * GRID.heightUnit;

  const baseUnit = binBaseUnit(m);
  const baseTiled = tileGrid(baseUnit, opts.cellsX, opts.cellsY);

  const bodyHeight = totalH - BASE_PROFILE.totalHeight;
  const body = m.Manifold.cube([outerW, outerD, bodyHeight], true)
    .translate([0, 0, BASE_PROFILE.totalHeight + bodyHeight / 2]);

  let bin = baseTiled.add(body);

  if (opts.hollow) {
    const innerW = outerW - 2 * opts.wallThickness;
    const innerD = outerD - 2 * opts.wallThickness;
    const cavityHeight = bodyHeight - opts.wallThickness;
    const cavity = m.Manifold.cube([innerW, innerD, cavityHeight + 0.1], true)
      .translate([0, 0, BASE_PROFILE.totalHeight + opts.wallThickness + cavityHeight / 2]);
    bin = bin.subtract(cavity);
  }

  if (opts.stackingLip) {
    const lipOuter = m.Manifold.cube([outerW, outerD, STACK_LIP.height], true)
      .translate([0, 0, totalH + STACK_LIP.height / 2]);
    const lipInner = m.Manifold.cube(
      [outerW - 2 * opts.wallThickness, outerD - 2 * opts.wallThickness, STACK_LIP.height + 0.1],
      true,
    ).translate([0, 0, totalH + STACK_LIP.height / 2]);
    bin = bin.add(lipOuter.subtract(lipInner));
  }

  if (opts.magnetHoles || opts.screwHoles) {
    const holes = magnetAndScrewHoles(
      m,
      opts.cellsX,
      opts.cellsY,
      opts.magnetHoles,
      opts.screwHoles,
      BASE_PROFILE.totalHeight,
    );
    if (holes) bin = bin.subtract(holes);
  }

  return bin;
}
