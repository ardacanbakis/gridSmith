import type { ManifoldToplevel, Manifold } from 'manifold-3d';
import type { Spec } from './spec';

function roundedSquare(m: ManifoldToplevel, size: number, radius: number) {
  const inner = Math.max(0.01, size - 2 * radius);
  return m.CrossSection.square([inner, inner], true).offset(radius, 'Round');
}

/**
 * Bin base foot — three lofted frustums forming the chamfered Gridfinity profile.
 * Corner radii scale linearly with edge size (sub-mm deviation from spec).
 */
export function binBaseUnit(m: ManifoldToplevel, spec: Spec): Manifold {
  const [l0, l1, l2, l3] = spec.baseProfile.layers;

  const cs0 = roundedSquare(m, l0.size, l0.radius);
  const cs1 = roundedSquare(m, l1.size, l1.radius);
  const cs2 = roundedSquare(m, l2.size, l2.radius);
  const cs3 = roundedSquare(m, l3.size, l3.radius);

  const chamferLower = cs0.extrude(l1.z - l0.z, 0, 0, [l1.size / l0.size, l1.size / l0.size]);
  const middle = cs1.extrude(l2.z - l1.z).translate([0, 0, l1.z]);
  const chamferUpper = cs2
    .extrude(l3.z - l2.z, 0, 0, [l3.size / l2.size, l3.size / l2.size])
    .translate([0, 0, l2.z]);
  const capSkin = cs3.extrude(0.0001).translate([0, 0, l3.z]);

  return chamferLower.add(middle).add(chamferUpper).add(capSkin);
}

function tileGrid(unit: Manifold, cellsX: number, cellsY: number, gridUnit: number): Manifold {
  const ox = -((cellsX - 1) * gridUnit) / 2;
  const oy = -((cellsY - 1) * gridUnit) / 2;
  let acc: Manifold | null = null;
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) {
      const piece = unit.translate([ox + x * gridUnit, oy + y * gridUnit, 0]);
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

export function buildBaseplate(m: ManifoldToplevel, spec: Spec, opts: BaseplateOptions): Manifold {
  const { gridUnit } = spec;
  const baseH = spec.baseProfile.totalHeight;
  const w = opts.cellsX * gridUnit;
  const d = opts.cellsY * gridUnit;

  const slabHeight = opts.style === 'rigid' ? baseH + 1.2 : baseH;
  const slab = m.Manifold.cube([w, d, slabHeight], true).translate([0, 0, slabHeight / 2]);

  const pockets = tileGrid(binBaseUnit(m, spec), opts.cellsX, opts.cellsY, gridUnit);
  let result = slab.subtract(pockets);

  if (opts.magnetHoles || opts.screwHoles) {
    const holes = magnetAndScrewHoles(
      m,
      spec,
      opts.cellsX,
      opts.cellsY,
      opts.magnetHoles,
      opts.screwHoles,
      slabHeight,
    );
    if (holes) result = result.subtract(holes);
  }

  return result;
}

function magnetAndScrewHoles(
  m: ManifoldToplevel,
  spec: Spec,
  cellsX: number,
  cellsY: number,
  magnets: boolean,
  screws: boolean,
  slabHeight: number,
): Manifold | null {
  const { gridUnit, magnet, screw } = spec;
  const ox = -((cellsX - 1) * gridUnit) / 2;
  const oy = -((cellsY - 1) * gridUnit) / 2;
  const offsets: Array<[number, number]> = [
    [-magnet.insetFromCenter, -magnet.insetFromCenter],
    [magnet.insetFromCenter, -magnet.insetFromCenter],
    [-magnet.insetFromCenter, magnet.insetFromCenter],
    [magnet.insetFromCenter, magnet.insetFromCenter],
  ];

  let acc: Manifold | null = null;
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) {
      const cx = ox + x * gridUnit;
      const cy = oy + y * gridUnit;
      for (const [dx, dy] of offsets) {
        if (magnets) {
          const cyl = m.Manifold.cylinder(magnet.depth + 0.01, magnet.diameter / 2, -1, 32, true)
            .translate([cx + dx, cy + dy, magnet.depth / 2]);
          acc = acc ? acc.add(cyl) : cyl;
        }
        if (screws) {
          const cyl = m.Manifold.cylinder(slabHeight + 0.01, screw.diameter / 2, -1, 24, true)
            .translate([cx + dx, cy + dy, slabHeight / 2]);
          acc = acc ? acc.add(cyl) : cyl;
        }
      }
    }
  }
  return acc;
}

export type LabelStyle = 'none' | 'paperPocket' | 'clipTab';

export type BinOptions = {
  cellsX: number;
  cellsY: number;
  heightUnits: number;
  hollow: boolean;
  wallThickness: number;
  stackingLip: boolean;
  magnetHoles: boolean;
  screwHoles: boolean;
  scoopRamp: boolean;
  divX: number;
  divY: number;
  labelStyle: LabelStyle;
};

export function buildBin(m: ManifoldToplevel, spec: Spec, opts: BinOptions): Manifold {
  const { gridUnit, clearance, heightUnit, baseProfile, stackLip } = spec;
  const outerW = opts.cellsX * gridUnit - clearance;
  const outerD = opts.cellsY * gridUnit - clearance;
  const totalH = opts.heightUnits * heightUnit;
  const baseH = baseProfile.totalHeight;

  const baseTiled = tileGrid(binBaseUnit(m, spec), opts.cellsX, opts.cellsY, gridUnit);

  const bodyHeight = totalH - baseH;
  const body = m.Manifold.cube([outerW, outerD, bodyHeight], true)
    .translate([0, 0, baseH + bodyHeight / 2]);

  let bin = baseTiled.add(body);

  if (opts.hollow) {
    const floorThickness = opts.wallThickness;
    const cavityFloorZ = baseH + floorThickness;
    const cavityHeight = totalH - cavityFloorZ;

    const cavities = buildCavities(
      m,
      outerW,
      outerD,
      opts.wallThickness,
      cavityFloorZ,
      cavityHeight,
      opts.divX,
      opts.divY,
    );
    bin = bin.subtract(cavities);

    if (opts.scoopRamp) {
      const ramp = buildScoopRamp(
        m,
        outerW,
        outerD,
        opts.wallThickness,
        cavityFloorZ,
        cavityHeight,
        opts.divX,
        opts.divY,
      );
      if (ramp) bin = bin.add(ramp);
    }

    if (opts.labelStyle === 'paperPocket') {
      bin = addPaperPocket(m, bin, outerW, outerD, opts.wallThickness, totalH);
    } else if (opts.labelStyle === 'clipTab') {
      bin = addClipTabSlot(m, bin, outerW, outerD, opts.wallThickness, totalH);
    }
  }

  if (opts.stackingLip) {
    const lipOuter = m.Manifold.cube([outerW, outerD, stackLip.height], true)
      .translate([0, 0, totalH + stackLip.height / 2]);
    const lipInner = m.Manifold.cube(
      [outerW - 2 * opts.wallThickness, outerD - 2 * opts.wallThickness, stackLip.height + 0.1],
      true,
    ).translate([0, 0, totalH + stackLip.height / 2]);
    bin = bin.add(lipOuter.subtract(lipInner));
  }

  if (opts.magnetHoles || opts.screwHoles) {
    const holes = magnetAndScrewHoles(
      m,
      spec,
      opts.cellsX,
      opts.cellsY,
      opts.magnetHoles,
      opts.screwHoles,
      baseH,
    );
    if (holes) bin = bin.subtract(holes);
  }

  return bin;
}

/**
 * A grid of rectangular cavities separated by wall-thickness dividers.
 * divX/divY = 1 means a single cavity (no internal dividers).
 */
function buildCavities(
  m: ManifoldToplevel,
  outerW: number,
  outerD: number,
  wall: number,
  floorZ: number,
  cavityH: number,
  divX: number,
  divY: number,
): Manifold {
  const innerW = outerW - 2 * wall;
  const innerD = outerD - 2 * wall;
  const cellW = (innerW - (divX - 1) * wall) / divX;
  const cellD = (innerD - (divY - 1) * wall) / divY;
  const startX = -innerW / 2 + cellW / 2;
  const startY = -innerD / 2 + cellD / 2;

  let acc: Manifold | null = null;
  for (let j = 0; j < divY; j++) {
    for (let i = 0; i < divX; i++) {
      const cx = startX + i * (cellW + wall);
      const cy = startY + j * (cellD + wall);
      const cavity = m.Manifold.cube([cellW, cellD, cavityH + 0.1], true)
        .translate([cx, cy, floorZ + cavityH / 2]);
      acc = acc ? acc.add(cavity) : cavity;
    }
  }
  return acc!;
}

/**
 * Triangular ramp at the +Y wall of each compartment — easier to scoop small
 * parts out. Ramp height = min(cavity height, 15 mm); ramp depth = 20 mm or
 * until it hits the back wall.
 */
function buildScoopRamp(
  m: ManifoldToplevel,
  outerW: number,
  outerD: number,
  wall: number,
  floorZ: number,
  cavityH: number,
  divX: number,
  divY: number,
): Manifold | null {
  const innerW = outerW - 2 * wall;
  const innerD = outerD - 2 * wall;
  const cellW = (innerW - (divX - 1) * wall) / divX;
  const cellD = (innerD - (divY - 1) * wall) / divY;
  const startX = -innerW / 2 + cellW / 2;

  const rampHeight = Math.min(cavityH - 0.5, 15);
  const rampDepth = Math.min(cellD * 0.7, 20);
  if (rampHeight <= 0.5 || rampDepth <= 0.5) return null;

  const frontCellY = -innerD / 2 + cellD / 2;

  const polys: [number, number][][] = [[
    [0, 0],
    [rampDepth, 0],
    [0, rampHeight],
  ]];
  const triCross = m.CrossSection.ofPolygons(polys);
  const ramp = triCross.extrude(cellW);

  let acc: Manifold | null = null;
  for (let i = 0; i < divX; i++) {
    const cx = startX + i * (cellW + wall);
    const piece = ramp
      .rotate([90, 0, 90])
      .translate([cx - cellW / 2, frontCellY - cellD / 2, floorZ]);
    acc = acc ? acc.add(piece) : piece;
  }
  return acc;
}

/**
 * Recessed pocket on the -Y wall exterior, sized for a 12 mm label tape or a
 * hand-written paper strip. Pocket is 3 mm deep, leaves 0.8 mm skin to the
 * cavity.
 */
function addPaperPocket(
  m: ManifoldToplevel,
  bin: Manifold,
  outerW: number,
  outerD: number,
  wall: number,
  totalH: number,
): Manifold {
  const pocketW = Math.min(outerW - 6, outerW * 0.75);
  const pocketH = Math.min(14, totalH * 0.4);
  const pocketDepth = Math.min(wall * 0.75, 2.5);
  const pocket = m.Manifold.cube([pocketW, pocketDepth + 0.1, pocketH], true)
    .translate([0, -outerD / 2 + pocketDepth / 2, totalH - pocketH / 2 - 1.5]);
  return bin.subtract(pocket);
}

/**
 * Slot on the front of the stacking lip area for clip-in printed labels
 * (community standard: 36.4 mm × 12 mm per cell width).
 */
function addClipTabSlot(
  m: ManifoldToplevel,
  bin: Manifold,
  outerW: number,
  outerD: number,
  wall: number,
  totalH: number,
): Manifold {
  const slotW = Math.max(outerW - 4, 10);
  const slotH = 1.2;
  const slotDepth = wall * 0.8;
  const slot = m.Manifold.cube([slotW, slotDepth + 0.1, slotH], true)
    .translate([0, -outerD / 2 + slotDepth / 2, totalH - slotH / 2 - 0.4]);
  return bin.subtract(slot);
}
