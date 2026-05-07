import type { ManifoldToplevel, Manifold } from 'manifold-3d';
import type { Spec } from './spec';
import type { Polygon } from '@/lib/labels/textToPolygons';
import { buildTextManifold } from '@/lib/labels/emboss';

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

export type LabelStyle = 'none' | 'paperPocket' | 'clipTab' | 'embossText' | 'engraveText';

export type LabelTextData = {
  polygons: ReadonlyArray<Polygon>;
  depth: number;
};

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
  /** Pre-tessellated text polygons (mm, centred on origin), passed in by the worker. */
  labelText?: LabelTextData;
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
    } else if ((opts.labelStyle === 'embossText' || opts.labelStyle === 'engraveText') && opts.labelText) {
      bin = applyTextLabel(m, bin, outerD, totalH, opts.labelStyle === 'engraveText', opts.labelText);
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

export type ScrewOrganizerOptions = {
  cellsX: number;
  cellsY: number;
  heightUnits: number;
  wallThickness: number;
  cols: number;
  rows: number;
  stackingLip: boolean;
  magnetHoles: boolean;
  screwHoles: boolean;
  labelStyle: LabelStyle;
  labelText?: LabelTextData;
  tiltDegrees: number;
  /** Per-column label polygons; index i belongs to column i. Empty arrays skipped. */
  compartmentLabelPolygons?: ReadonlyArray<ReadonlyArray<Polygon>>;
  compartmentLabelStyle: 'none' | 'emboss' | 'engrave';
  compartmentLabelDepth: number;
};

/**
 * Screw organiser: a divided bin where each compartment gets an optional
 * back-tilt wedge so loose screws roll to the front for easy scooping.
 */
export function buildScrewOrganizer(
  m: ManifoldToplevel,
  spec: Spec,
  opts: ScrewOrganizerOptions,
): Manifold {
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

  const wall = opts.wallThickness;
  const floorZ = baseH + wall;
  const cavityHeight = totalH - floorZ;
  const cavities = buildCavities(m, outerW, outerD, wall, floorZ, cavityHeight, opts.cols, opts.rows);
  bin = bin.subtract(cavities);

  if (opts.tiltDegrees > 0) {
    const wedges = buildBackTiltWedges(
      m,
      outerW,
      outerD,
      wall,
      floorZ,
      cavityHeight,
      opts.cols,
      opts.rows,
      opts.tiltDegrees,
    );
    if (wedges) bin = bin.add(wedges);
  }

  if (opts.labelStyle === 'paperPocket') {
    bin = addPaperPocket(m, bin, outerW, outerD, wall, totalH);
  } else if (opts.labelStyle === 'clipTab') {
    bin = addClipTabSlot(m, bin, outerW, outerD, wall, totalH);
  } else if ((opts.labelStyle === 'embossText' || opts.labelStyle === 'engraveText') && opts.labelText) {
    bin = applyTextLabel(m, bin, outerD, totalH, opts.labelStyle === 'engraveText', opts.labelText);
  }

  if (opts.compartmentLabelStyle !== 'none' && opts.compartmentLabelPolygons) {
    bin = applyCompartmentLabels(m, bin, {
      polygonsPerCol: opts.compartmentLabelPolygons,
      cols: opts.cols,
      outerW,
      outerD,
      wall,
      totalH,
      depth: opts.compartmentLabelDepth,
      engrave: opts.compartmentLabelStyle === 'engrave',
    });
  }

  if (opts.stackingLip) {
    const lipOuter = m.Manifold.cube([outerW, outerD, stackLip.height], true)
      .translate([0, 0, totalH + stackLip.height / 2]);
    const lipInner = m.Manifold.cube(
      [outerW - 2 * wall, outerD - 2 * wall, stackLip.height + 0.1],
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
 * Place embossed (added) or engraved (subtracted) text on the front (-Y) wall
 * of a bin. Text is built in XY then rotated so its plane normal points -Y,
 * then translated to sit on the front face, vertically centred.
 */
function applyTextLabel(
  m: ManifoldToplevel,
  bin: Manifold,
  outerD: number,
  totalH: number,
  engrave: boolean,
  text: LabelTextData,
): Manifold {
  const block = buildTextManifold(m, text);
  if (!block) return bin;

  const oriented = block
    .rotate([90, 0, 0])
    .translate([0, -outerD / 2 + (engrave ? text.depth / 2 : -text.depth / 2), totalH / 2]);

  return engrave ? bin.subtract(oriented) : bin.add(oriented);
}

/**
 * Place one text label per column on the front (-Y) wall, centred on each
 * column's X position. Labels are sized by the worker; here we just orient
 * and union/subtract them.
 */
function applyCompartmentLabels(
  m: ManifoldToplevel,
  bin: Manifold,
  args: {
    polygonsPerCol: ReadonlyArray<ReadonlyArray<Polygon>>;
    cols: number;
    outerW: number;
    outerD: number;
    wall: number;
    totalH: number;
    depth: number;
    engrave: boolean;
  },
): Manifold {
  const { polygonsPerCol, cols, outerW, outerD, wall, totalH, depth, engrave } = args;
  const innerW = outerW - 2 * wall;
  const cellW = (innerW - (cols - 1) * wall) / cols;
  const startX = -innerW / 2 + cellW / 2;
  const z = totalH * 0.55;

  let result = bin;
  for (let i = 0; i < cols; i++) {
    const polys = polygonsPerCol[i];
    if (!polys || polys.length === 0) continue;
    const block = buildTextManifold(m, { polygons: polys, depth });
    if (!block) continue;
    const cx = startX + i * (cellW + wall);
    const oriented = block
      .rotate([90, 0, 0])
      .translate([cx, -outerD / 2 + (engrave ? depth / 2 : -depth / 2), z]);
    result = engrave ? result.subtract(oriented) : result.add(oriented);
  }
  return result;
}

/**
 * Triangular prism at the +Y wall of each compartment, tapering from a thin
 * edge at the front (-Y) to a wedge of `tan(tiltDegrees) * cellD` at the back.
 * Items roll forward by gravity.
 */
function buildBackTiltWedges(
  m: ManifoldToplevel,
  outerW: number,
  outerD: number,
  wall: number,
  floorZ: number,
  cavityH: number,
  divX: number,
  divY: number,
  tiltDegrees: number,
): Manifold | null {
  const innerW = outerW - 2 * wall;
  const innerD = outerD - 2 * wall;
  const cellW = (innerW - (divX - 1) * wall) / divX;
  const cellD = (innerD - (divY - 1) * wall) / divY;
  const startX = -innerW / 2 + cellW / 2;
  const startY = -innerD / 2 + cellD / 2;

  const tilt = (tiltDegrees * Math.PI) / 180;
  const rise = Math.min(Math.tan(tilt) * cellD, cavityH - 0.5);
  if (rise <= 0.2) return null;

  const polys: [number, number][][] = [[
    [0, 0],
    [cellD, 0],
    [cellD, rise],
  ]];
  const triCross = m.CrossSection.ofPolygons(polys);
  const wedge = triCross
    .extrude(cellW)
    .rotate([90, 0, 90]);

  let acc: Manifold | null = null;
  for (let j = 0; j < divY; j++) {
    for (let i = 0; i < divX; i++) {
      const cx = startX + i * (cellW + wall);
      const cy = startY + j * (cellD + wall);
      const piece = wedge.translate([cx - cellW / 2, cy - cellD / 2, floorZ]);
      acc = acc ? acc.add(piece) : piece;
    }
  }
  return acc;
}

export type PartsTrayOptions = {
  cellsX: number;
  cellsY: number;
  heightUnits: number;
  pocketShape: 'circle' | 'square';
  pocketSize: number;
  pocketDepth: number;
  pocketCols: number;
  pocketRows: number;
  pocketSpacing: number;
  edgeClearance: number;
  stackingLip: boolean;
  magnetHoles: boolean;
  screwHoles: boolean;
};

export function buildPartsTray(
  m: ManifoldToplevel,
  spec: Spec,
  opts: PartsTrayOptions,
): Manifold {
  const { gridUnit, clearance: binClearance, heightUnit, baseProfile, stackLip } = spec;
  const outerW = opts.cellsX * gridUnit - binClearance;
  const outerD = opts.cellsY * gridUnit - binClearance;
  const totalH = opts.heightUnits * heightUnit;
  const baseH = baseProfile.totalHeight;

  const baseTiled = tileGrid(binBaseUnit(m, spec), opts.cellsX, opts.cellsY, gridUnit);
  const bodyHeight = totalH - baseH;
  const body = m.Manifold.cube([outerW, outerD, bodyHeight], true)
    .translate([0, 0, baseH + bodyHeight / 2]);

  let result = baseTiled.add(body);

  // Pocket centres, evenly distributed across usable footprint
  const usableW = outerW - 2 * opts.edgeClearance;
  const usableD = outerD - 2 * opts.edgeClearance;
  const cols = opts.pocketCols;
  const rows = opts.pocketRows;
  const stepX = cols > 1 ? (usableW - opts.pocketSize) / (cols - 1) : 0;
  const stepY = rows > 1 ? (usableD - opts.pocketSize) / (rows - 1) : 0;
  const startX = cols > 1 ? -(usableW - opts.pocketSize) / 2 : 0;
  const startY = rows > 1 ? -(usableD - opts.pocketSize) / 2 : 0;

  // Only punch pockets if they physically fit
  const halfSize = opts.pocketSize / 2;
  if (
    opts.pocketSize > 0.5 &&
    opts.pocketDepth > 0.2 &&
    halfSize <= usableW / 2 + 0.001 &&
    halfSize <= usableD / 2 + 0.001
  ) {
    const pocketDepth = Math.min(opts.pocketDepth, totalH - 0.8);
    let pockets: Manifold | null = null;

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const cx = startX + i * stepX;
        const cy = startY + j * stepY;
        let pocket: Manifold;
        if (opts.pocketShape === 'circle') {
          pocket = m.Manifold.cylinder(pocketDepth + 0.1, halfSize, -1, 48, true)
            .translate([cx, cy, totalH - pocketDepth / 2 + 0.05]);
        } else {
          pocket = m.Manifold.cube([opts.pocketSize, opts.pocketSize, pocketDepth + 0.1], true)
            .translate([cx, cy, totalH - pocketDepth / 2 + 0.05]);
        }
        pockets = pockets ? pockets.add(pocket) : pocket;
      }
    }
    if (pockets) result = result.subtract(pockets);
  }

  if (opts.stackingLip) {
    const lipOuter = m.Manifold.cube([outerW, outerD, stackLip.height], true)
      .translate([0, 0, totalH + stackLip.height / 2]);
    const lipInner = m.Manifold.cube(
      [outerW - 2.4, outerD - 2.4, stackLip.height + 0.1],
      true,
    ).translate([0, 0, totalH + stackLip.height / 2]);
    result = result.add(lipOuter.subtract(lipInner));
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
    if (holes) result = result.subtract(holes);
  }

  return result;
}

export type DrillHole = {
  /** Hole centre X, in bin-local coordinates (bin is centred on origin). */
  x: number;
  /** Hole centre Y. */
  y: number;
  /** Bit diameter in mm — we grow the hole by clearance radially. */
  diameter: number;
  /** Text label to record alongside the hole (used by later emboss feature). */
  label: string;
};

export type DrillBitHolderOptions = {
  cellsX: number;
  cellsY: number;
  heightUnits: number;
  bits: ReadonlyArray<{ mm: number; label: string }>;
  holeDepth: number;
  clearance: number;
  spacing: number;
  edgeClearance: number;
  stackingLip: boolean;
  magnetHoles: boolean;
  screwHoles: boolean;
};

/**
 * Single-pass shelf packing: sort bits largest-first, flow left-to-right top-to-bottom.
 * Good enough for typical drill sets; a real bin-packer is overkill.
 */
export function layoutBits(
  bits: ReadonlyArray<{ mm: number; label: string }>,
  innerW: number,
  innerD: number,
  clearance: number,
  spacing: number,
): { placed: DrillHole[]; dropped: number } {
  const sorted = [...bits].sort((a, b) => b.mm - a.mm);
  const placed: DrillHole[] = [];

  let cursorX = -innerW / 2;
  let rowTopY = innerD / 2;
  let rowMaxDia = 0;

  for (const bit of sorted) {
    const holeRadius = bit.mm / 2 + clearance;
    const holeDia = holeRadius * 2;

    if (cursorX + holeDia > innerW / 2 + 0.001) {
      cursorX = -innerW / 2;
      rowTopY -= rowMaxDia + spacing;
      rowMaxDia = 0;
    }

    if (rowTopY - holeDia < -innerD / 2 - 0.001) {
      return { placed, dropped: sorted.length - placed.length };
    }

    placed.push({
      x: cursorX + holeRadius,
      y: rowTopY - holeRadius,
      diameter: bit.mm,
      label: bit.label,
    });
    cursorX += holeDia + spacing;
    if (holeDia > rowMaxDia) rowMaxDia = holeDia;
  }

  return { placed, dropped: 0 };
}

export function buildDrillBitHolder(
  m: ManifoldToplevel,
  spec: Spec,
  opts: DrillBitHolderOptions,
): { result: Manifold; dropped: number; placed: number } {
  const { gridUnit, clearance: binClearance, heightUnit, baseProfile, stackLip } = spec;
  const outerW = opts.cellsX * gridUnit - binClearance;
  const outerD = opts.cellsY * gridUnit - binClearance;
  const totalH = opts.heightUnits * heightUnit;
  const baseH = baseProfile.totalHeight;

  const baseTiled = tileGrid(binBaseUnit(m, spec), opts.cellsX, opts.cellsY, gridUnit);
  const bodyHeight = totalH - baseH;
  const body = m.Manifold.cube([outerW, outerD, bodyHeight], true)
    .translate([0, 0, baseH + bodyHeight / 2]);

  let result = baseTiled.add(body);

  const usableW = outerW - 2 * opts.edgeClearance;
  const usableD = outerD - 2 * opts.edgeClearance;
  const { placed, dropped } = layoutBits(opts.bits, usableW, usableD, opts.clearance, opts.spacing);

  if (placed.length > 0) {
    const holeDepth = Math.min(opts.holeDepth, totalH - 1.0);
    let holes: Manifold | null = null;
    for (const p of placed) {
      const holeRadius = p.diameter / 2 + opts.clearance;
      const cyl = m.Manifold.cylinder(holeDepth + 0.1, holeRadius, -1, 48, true)
        .translate([p.x, p.y, totalH - holeDepth / 2 + 0.05]);
      holes = holes ? holes.add(cyl) : cyl;
    }
    if (holes) result = result.subtract(holes);
  }

  if (opts.stackingLip) {
    const lipOuter = m.Manifold.cube([outerW, outerD, stackLip.height], true)
      .translate([0, 0, totalH + stackLip.height / 2]);
    const lipInner = m.Manifold.cube(
      [outerW - 2.4, outerD - 2.4, stackLip.height + 0.1],
      true,
    ).translate([0, 0, totalH + stackLip.height / 2]);
    result = result.add(lipOuter.subtract(lipInner));
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
    if (holes) result = result.subtract(holes);
  }

  return { result, placed: placed.length, dropped };
}
