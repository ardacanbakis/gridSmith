import type { CrossSection, ManifoldToplevel, Manifold, Vec3 } from 'manifold-3d';
import type { ProfileLayer, Spec } from './spec';
import type { HoleSet, HoleShape } from './bitSets';
import type { Polygon } from '@/lib/labels/textToPolygons';
import { buildTextManifold } from '@/lib/labels/emboss';

/** Embed added features this far into the surface they rest on, so unions fuse. */
const OVERLAP = 0.01;

/**
 * Segments per full circle for every rounded corner. Fixed rather than
 * radius-dependent so concentric outlines (foot vs. lip, plug vs. lip) put
 * their vertices at the same angles and nest without chord interference.
 */
const CORNER_SEGMENTS = 48;

/** w × d rectangle centred on the origin with corners rounded to `radius` (clamped to fit; ≤ 0 is sharp). */
function roundedRect(m: ManifoldToplevel, w: number, d: number, radius: number): CrossSection {
  const r = Math.min(radius, w / 2 - 0.001, d / 2 - 0.001);
  if (r <= 0.001) return m.CrossSection.square([w, d], true);
  return m.CrossSection.square([w - 2 * r, d - 2 * r], true).offset(r, 'Round', 2, CORNER_SEGMENTS);
}

/**
 * Solid bounded by a profile swept around a w × d outline with corner radius
 * `radius`. Each layer is that outline inset by `layer.inset`; consecutive
 * layers are joined by their convex hull, so chamfers are exactly 45° and the
 * corner radii shrink with the inset just as a true sweep would.
 */
function sweptSolid(
  m: ManifoldToplevel,
  w: number,
  d: number,
  radius: number,
  layers: ReadonlyArray<ProfileLayer>,
): Manifold {
  const ring = (l: ProfileLayer): Vec3[] =>
    roundedRect(m, w - 2 * l.inset, d - 2 * l.inset, radius - l.inset)
      .toPolygons()
      .flatMap((poly) => poly.map(([x, y]): Vec3 => [x, y, l.z]));
  let acc: Manifold | null = null;
  for (let i = 0; i + 1 < layers.length; i++) {
    const segment = m.Manifold.hull([...ring(layers[i]), ...ring(layers[i + 1])]);
    acc = acc ? acc.add(segment) : segment;
  }
  return acc!;
}

/** Copy of `layers` with an OVERLAP-long straight extension past the top (and optionally the bottom) layer. */
function extendLayers(layers: ReadonlyArray<ProfileLayer>, below: boolean): ProfileLayer[] {
  const first = layers[0];
  const last = layers[layers.length - 1];
  return [
    ...(below ? [{ z: first.z - OVERLAP, inset: first.inset }] : []),
    ...layers,
    { z: last.z + OVERLAP, inset: last.inset },
  ];
}

/**
 * Prism of a part's outline from z0 to z1. Vertical corners are rounded to the
 * radius of the foot's top, as on spec Gridfinity bins.
 */
function outlinePrism(m: ManifoldToplevel, spec: Spec, w: number, d: number, z0: number, z1: number): Manifold {
  return roundedRect(m, w, d, spec.baseProfile.radius).extrude(z1 - z0).translate([0, 0, z0]);
}

/** Bin foot for one cell, extended OVERLAP into the body above so the two fuse. */
export function binBaseUnit(m: ManifoldToplevel, spec: Spec): Manifold {
  const { baseProfile: p, gridUnit, clearance } = spec;
  const size = gridUnit - clearance;
  return sweptSolid(m, size, size, p.radius, extendLayers(p.layers, false));
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

/** Solid floor under the pockets of a rigid baseplate. */
const RIGID_FLOOR = 1.2;
/** Material left between a magnet hole and the opposite face. */
const MAGNET_SKIN = 0.6;

/**
 * Floor thickness under the pockets. Minimal plates are an open frame (no
 * floor); rigid plates get a floor, thickened so magnet holes leave a skin.
 */
function baseplateFloorHeight(spec: Spec, opts: Pick<BaseplateOptions, 'style' | 'magnetHoles'>): number {
  if (opts.style !== 'rigid') return 0;
  return Math.max(RIGID_FLOOR, opts.magnetHoles ? spec.magnet.depth + MAGNET_SKIN : 0);
}

export function buildBaseplate(m: ManifoldToplevel, spec: Spec, opts: BaseplateOptions): Manifold {
  const { gridUnit, magnet, baseplateProfile: p } = spec;
  const w = opts.cellsX * gridUnit;
  const d = opts.cellsY * gridUnit;

  const floorH = baseplateFloorHeight(spec, opts);
  const slabHeight = floorH + p.totalHeight;
  // Rounded like the pockets, so the outer rim finishes as the same ridge as between cells.
  const slab = roundedRect(m, w, d, p.radius).extrude(slabHeight);

  // Pockets use the baseplate profile (looser than the foot) swept around the
  // full cell. They overshoot the top, and the bottom too when there's no floor.
  const pocket = sweptSolid(m, gridUnit, gridUnit, p.radius, extendLayers(p.layers, floorH === 0));
  const pockets = tileGrid(pocket, opts.cellsX, opts.cellsY, gridUnit).translate([0, 0, floorH]);
  let result = slab.subtract(pockets);

  // Holes need a floor to cut into — a minimal plate's pockets go straight through.
  if (floorH > 0 && (opts.magnetHoles || opts.screwHoles)) {
    const holes = magnetAndScrewHoles(m, spec, opts.cellsX, opts.cellsY, {
      magnets: opts.magnetHoles,
      screws: opts.screwHoles,
      // Opened from the floor's top face, where the bin's magnets sit.
      magnetZ: [floorH - magnet.depth, floorH + 0.01],
      screwZ: [-0.01, floorH + 0.01],
    });
    if (holes) result = result.subtract(holes);
  }

  return result;
}

/** Magnet and screw holes at the four corner positions of every cell, spanning the given Z ranges. */
function magnetAndScrewHoles(
  m: ManifoldToplevel,
  spec: Spec,
  cellsX: number,
  cellsY: number,
  opts: {
    magnets: boolean;
    screws: boolean;
    magnetZ: [number, number];
    screwZ: [number, number];
  },
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
  const cylinder = (radius: number, [z0, z1]: [number, number], segments: number) =>
    m.Manifold.cylinder(z1 - z0, radius, -1, segments, false).translate([0, 0, z0]);
  const magnetCyl = opts.magnets ? cylinder(magnet.diameter / 2, opts.magnetZ, 32) : null;
  const screwCyl = opts.screws ? cylinder(screw.diameter / 2, opts.screwZ, 24) : null;

  let acc: Manifold | null = null;
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) {
      const cx = ox + x * gridUnit;
      const cy = oy + y * gridUnit;
      for (const [dx, dy] of offsets) {
        for (const cyl of [magnetCyl, screwCyl]) {
          if (!cyl) continue;
          const piece = cyl.translate([cx + dx, cy + dy, 0]);
          acc = acc ? acc.add(piece) : piece;
        }
      }
    }
  }
  return acc;
}

/** Holes opened from a part's underside, through the bin foot. */
function footHoles(
  m: ManifoldToplevel,
  spec: Spec,
  opts: { cellsX: number; cellsY: number; magnetHoles: boolean; screwHoles: boolean },
): Manifold | null {
  if (!opts.magnetHoles && !opts.screwHoles) return null;
  return magnetAndScrewHoles(m, spec, opts.cellsX, opts.cellsY, {
    magnets: opts.magnetHoles,
    screws: opts.screwHoles,
    magnetZ: [-0.01, spec.magnet.depth],
    screwZ: [-0.01, spec.baseProfile.totalHeight],
  });
}

/**
 * Stacking lip for a part whose body ends at z = topZ. Its inner face follows
 * the spec lip profile, so the foot of the bin stacked above nests on both
 * chamfers. On hollow parts (`wall` given) a 45° shelf under the lip carries
 * its overhang back out to the wall, so it prints without support.
 */
function buildStackingLip(
  m: ManifoldToplevel,
  spec: Spec,
  outerW: number,
  outerD: number,
  topZ: number,
  wall: number | null,
): Manifold {
  const lip = spec.stackLip;
  // The top chamfer is 45°, so trimming the knife edge to a `tip`-wide flat lowers it by `tip`.
  const lipH = lip.height - lip.tip;
  const bottomInset = lip.layers[0].inset;

  const block = outlinePrism(m, spec, outerW, outerD, topZ - OVERLAP, topZ + lipH);
  // Overshoots below the block's sunk base and above its trimmed top for a clean cut.
  const cavity = sweptSolid(m, outerW, outerD, lip.radius, [
    { z: -2 * OVERLAP, inset: bottomInset },
    ...lip.layers,
    { z: lip.height + OVERLAP, inset: 0 },
  ]).translate([0, 0, topZ]);
  let result = block.subtract(cavity);

  const shelfH = wall === null ? 0 : bottomInset - wall;
  if (wall !== null && shelfH > 0) {
    const shelfBlock = outlinePrism(m, spec, outerW, outerD, topZ - shelfH, topZ);
    const shelfVoid = sweptSolid(m, outerW, outerD, lip.radius, [
      { z: -shelfH - OVERLAP, inset: wall },
      { z: -shelfH, inset: wall },
      { z: 0, inset: bottomInset },
      { z: OVERLAP, inset: bottomInset },
    ]).translate([0, 0, topZ]);
    result = result.add(shelfBlock.subtract(shelfVoid));
  }
  return result;
}

/**
 * Removes the top of the internal dividers so the foot of a bin stacked on
 * top — which dips below the lip by (foot height − lip height) — clears them,
 * with half the usual bin clearance to spare.
 */
function lowerDividers(
  m: ManifoldToplevel,
  spec: Spec,
  part: Manifold,
  outerW: number,
  outerD: number,
  wall: number,
  topZ: number,
): Manifold {
  const drop = spec.baseProfile.totalHeight - spec.stackLip.height + spec.clearance / 2;
  // Follows the cavity's rounded corners so it never thins the walls there.
  const zone = roundedRect(m, outerW - 2 * wall, outerD - 2 * wall, spec.baseProfile.radius - wall)
    .extrude(drop + 0.1)
    .translate([0, 0, topZ - drop]);
  return part.subtract(zone);
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
  const { gridUnit, clearance, heightUnit, baseProfile } = spec;
  const outerW = opts.cellsX * gridUnit - clearance;
  const outerD = opts.cellsY * gridUnit - clearance;
  const totalH = opts.heightUnits * heightUnit;
  const baseH = baseProfile.totalHeight;

  const baseTiled = tileGrid(binBaseUnit(m, spec), opts.cellsX, opts.cellsY, gridUnit);

  const body = outlinePrism(m, spec, outerW, outerD, baseH, totalH);

  let bin = baseTiled.add(body);

  if (opts.hollow) {
    const floorThickness = opts.wallThickness;
    const cavityFloorZ = baseH + floorThickness;
    const cavityHeight = totalH - cavityFloorZ;

    const cavities = buildCavities(
      m,
      spec,
      outerW,
      outerD,
      opts.wallThickness,
      cavityFloorZ,
      cavityHeight,
      opts.divX,
      opts.divY,
    );
    bin = bin.subtract(cavities);
    if (opts.stackingLip && (opts.divX > 1 || opts.divY > 1)) {
      bin = lowerDividers(m, spec, bin, outerW, outerD, opts.wallThickness, totalH);
    }

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
  }

  // A solid bin has no cavity to break into, so labels may cut a little deeper.
  const labelWall = opts.hollow ? opts.wallThickness : Math.max(opts.wallThickness, SOLID_LABEL_WALL);
  if (opts.labelStyle === 'paperPocket') {
    bin = addPaperPocket(m, bin, outerW, outerD, labelWall, totalH);
  } else if (opts.labelStyle === 'clipTab') {
    bin = addClipTabSlot(m, bin, outerW, outerD, labelWall, totalH);
  } else if ((opts.labelStyle === 'embossText' || opts.labelStyle === 'engraveText') && opts.labelText) {
    const face = { outerW, outerD, wall: labelWall, baseH, totalH };
    bin = applyTextLabel(m, bin, face, opts.labelStyle === 'engraveText', opts.labelText);
  }

  if (opts.stackingLip) {
    bin = bin.add(buildStackingLip(m, spec, outerW, outerD, totalH, opts.hollow ? opts.wallThickness : null));
  }

  const mountHoles = footHoles(m, spec, opts);
  if (mountHoles) bin = bin.subtract(mountHoles);

  return bin;
}

/**
 * A grid of cavities separated by wall-thickness dividers.
 * divX/divY = 1 means a single cavity (no internal dividers).
 * Compartment corners are rounded concentric with the bin's outer corners, so
 * the wall keeps its thickness all the way round.
 */
function buildCavities(
  m: ManifoldToplevel,
  spec: Spec,
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
  // Floor exactly at floorZ; overshoots the top by 0.1 for a clean cut.
  const compartment = roundedRect(m, cellW, cellD, spec.baseProfile.radius - wall)
    .extrude(cavityH + 0.1)
    .translate([0, 0, floorZ]);

  let acc: Manifold | null = null;
  for (let j = 0; j < divY; j++) {
    for (let i = 0; i < divX; i++) {
      const cx = startX + i * (cellW + wall);
      const cy = startY + j * (cellD + wall);
      const cavity = compartment.translate([cx, cy, 0]);
      acc = acc ? acc.add(cavity) : cavity;
    }
  }
  return acc!;
}

/**
 * Triangular ramp against the front (-Y) wall of each front-row compartment —
 * easier to scoop small parts out. Ramp height = min(cavity height, 15 mm);
 * ramp depth = 20 mm or 70% of the compartment.
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

  // Sunk OVERLAP into the floor and front wall so the union always fuses.
  const polys: [number, number][][] = [[
    [-OVERLAP, -OVERLAP],
    [rampDepth, -OVERLAP],
    [rampDepth, 0],
    [0, rampHeight],
    [-OVERLAP, rampHeight],
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
  const { gridUnit, clearance, heightUnit, baseProfile } = spec;
  const outerW = opts.cellsX * gridUnit - clearance;
  const outerD = opts.cellsY * gridUnit - clearance;
  const totalH = opts.heightUnits * heightUnit;
  const baseH = baseProfile.totalHeight;

  const baseTiled = tileGrid(binBaseUnit(m, spec), opts.cellsX, opts.cellsY, gridUnit);
  const body = outlinePrism(m, spec, outerW, outerD, baseH, totalH);

  let bin = baseTiled.add(body);

  const wall = opts.wallThickness;
  const floorZ = baseH + wall;
  const cavityHeight = totalH - floorZ;
  const cavities = buildCavities(m, spec, outerW, outerD, wall, floorZ, cavityHeight, opts.cols, opts.rows);
  bin = bin.subtract(cavities);
  if (opts.stackingLip && (opts.cols > 1 || opts.rows > 1)) {
    bin = lowerDividers(m, spec, bin, outerW, outerD, wall, totalH);
  }

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

  const face = { outerW, outerD, wall, baseH, totalH };
  if (opts.labelStyle === 'paperPocket') {
    bin = addPaperPocket(m, bin, outerW, outerD, wall, totalH);
  } else if (opts.labelStyle === 'clipTab') {
    bin = addClipTabSlot(m, bin, outerW, outerD, wall, totalH);
  } else if ((opts.labelStyle === 'embossText' || opts.labelStyle === 'engraveText') && opts.labelText) {
    bin = applyTextLabel(m, bin, face, opts.labelStyle === 'engraveText', opts.labelText);
  }

  if (opts.compartmentLabelStyle !== 'none' && opts.compartmentLabelPolygons) {
    bin = applyCompartmentLabels(m, bin, face, {
      polygonsPerCol: opts.compartmentLabelPolygons,
      cols: opts.cols,
      depth: opts.compartmentLabelDepth,
      engrave: opts.compartmentLabelStyle === 'engrave',
    });
  }

  if (opts.stackingLip) {
    bin = bin.add(buildStackingLip(m, spec, outerW, outerD, totalH, wall));
  }

  const mountHoles = footHoles(m, spec, opts);
  if (mountHoles) bin = bin.subtract(mountHoles);

  return bin;
}

/** Wall left behind engraved text, or behind the recessed field of embossed text. */
export const LABEL_SKIN = 0.4;
/** Effective wall depth used to size labels on solid (non-hollow) bins. */
const SOLID_LABEL_WALL = 3;
/** Border of the recessed field around embossed text. */
const EMBOSS_FIELD_MARGIN = 1.0;

/**
 * Put text on the front (-Y) face of a part, centred at (cx, cz).
 *
 * Engraved text is cut `depth` into the wall. Embossed text stands up from a
 * recessed field of the same depth, so its face ends flush with the wall: the
 * part keeps its Gridfinity footprint and still fits against the bin in front.
 * Depth is capped so a skin always remains between the text and the cavity.
 */
function applyFrontText(
  m: ManifoldToplevel,
  part: Manifold,
  args: {
    polygons: ReadonlyArray<Polygon>;
    depth: number;
    engrave: boolean;
    wall: number;
    frontY: number;
    cx: number;
    cz: number;
    /** Limits of the emboss field, so it never cuts into side walls, dividers, or the lip. */
    field: { maxW: number; zMin: number; zMax: number };
  },
): Manifold {
  const depth = Math.min(args.depth, args.wall - LABEL_SKIN);
  if (depth <= 0.05) return part;
  const eps = 0.01;
  const block = buildTextManifold(m, { polygons: args.polygons, depth: depth + eps });
  if (!block) return part;

  // +90° about X keeps the text readable from the front and turns its
  // extrusion toward -Y; the translate puts it at y ∈ [frontY − eps, frontY + depth].
  const text = block.rotate([90, 0, 0]).translate([args.cx, args.frontY + depth, args.cz]);
  if (args.engrave) return part.subtract(text);

  const bb = text.boundingBox();
  const fieldW = Math.min(bb.max[0] - bb.min[0] + 2 * EMBOSS_FIELD_MARGIN, args.field.maxW);
  const z0 = Math.max(bb.min[2] - EMBOSS_FIELD_MARGIN, args.field.zMin);
  const z1 = Math.min(bb.max[2] + EMBOSS_FIELD_MARGIN, args.field.zMax);
  if (fieldW <= 0 || z1 <= z0) return part;
  const field = m.Manifold.cube([fieldW, depth + eps, z1 - z0], true)
    .translate([args.cx, args.frontY + (depth - eps) / 2, (z0 + z1) / 2]);
  // Shift the text back by eps so its face lands exactly on the original wall plane.
  return part.subtract(field).add(text.translate([0, eps, 0]));
}

type FrontFace = { outerW: number; outerD: number; wall: number; baseH: number; totalH: number };

/** Embossed or engraved text centred on the front (-Y) wall of a bin. */
function applyTextLabel(
  m: ManifoldToplevel,
  bin: Manifold,
  face: FrontFace,
  engrave: boolean,
  text: LabelTextData,
): Manifold {
  return applyFrontText(m, bin, {
    polygons: text.polygons,
    depth: text.depth,
    engrave,
    wall: face.wall,
    frontY: -face.outerD / 2,
    cx: 0,
    cz: face.totalH / 2,
    field: { maxW: face.outerW - 2 * face.wall, zMin: face.baseH, zMax: face.totalH },
  });
}

/**
 * Place one text label per column on the front (-Y) wall, centred on each
 * column's X position. Labels are sized by the worker; here we just place them.
 */
function applyCompartmentLabels(
  m: ManifoldToplevel,
  bin: Manifold,
  face: FrontFace,
  args: {
    polygonsPerCol: ReadonlyArray<ReadonlyArray<Polygon>>;
    cols: number;
    depth: number;
    engrave: boolean;
  },
): Manifold {
  const { outerW, outerD, wall, baseH, totalH } = face;
  const innerW = outerW - 2 * wall;
  const cellW = (innerW - (args.cols - 1) * wall) / args.cols;
  const startX = -innerW / 2 + cellW / 2;

  let result = bin;
  for (let i = 0; i < args.cols; i++) {
    const polys = args.polygonsPerCol[i];
    if (!polys || polys.length === 0) continue;
    result = applyFrontText(m, result, {
      polygons: polys,
      depth: args.depth,
      engrave: args.engrave,
      wall,
      frontY: -outerD / 2,
      cx: startX + i * (cellW + wall),
      cz: totalH * 0.55,
      field: { maxW: cellW, zMin: baseH, zMax: totalH },
    });
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

  // Sunk OVERLAP below the floor so the union fuses instead of leaving a
  // separate shell resting on a coplanar face.
  const polys: [number, number][][] = [[
    [0, -OVERLAP],
    [cellD, -OVERLAP],
    [cellD, rise],
    [0, 0],
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

/** Material kept under any hole or pocket cut into a solid part, above the foot. */
const POCKET_FLOOR = 1;

/**
 * Deepest a hole or pocket can go from the top of a solid part while keeping a
 * floor above the foot. Any deeper would cut into the feet and open the
 * bottom where cells meet.
 */
export function maxPocketDepth(spec: Spec, heightUnits: number): number {
  return Math.max(0, heightUnits * spec.heightUnit - spec.baseProfile.totalHeight - POCKET_FLOOR);
}

/** Fewest height units whose solid top can take a hole or pocket `depth` deep. */
export function heightUnitsForDepth(spec: Spec, depth: number): number {
  return Math.ceil((depth + spec.baseProfile.totalHeight + POCKET_FLOOR) / spec.heightUnit - 1e-9);
}

/** Solid top area of a part, inside its edge margin. */
function usableArea(spec: Spec, cellsX: number, cellsY: number, edge: number): { w: number; d: number } {
  return {
    w: cellsX * spec.gridUnit - spec.clearance - 2 * edge,
    d: cellsY * spec.gridUnit - spec.clearance - 2 * edge,
  };
}

export type PartsTrayOptions = {
  cellsX: number;
  cellsY: number;
  heightUnits: number;
  /** 'square' is any rectangle: pocketSize (X) by pocketLength (Y). */
  pocketShape: 'circle' | 'square';
  pocketSize: number;
  pocketLength?: number;
  cornerRadius: number;
  roundedBottom: boolean;
  pocketDepth: number;
  pocketCols: number;
  pocketRows: number;
  pocketSpacing: number;
  edgeClearance: number;
  stackingLip: boolean;
  magnetHoles: boolean;
  screwHoles: boolean;
};

type TrayLayoutOptions = Pick<
  PartsTrayOptions,
  'cellsX' | 'cellsY' | 'pocketShape' | 'pocketSize' | 'pocketLength' | 'pocketSpacing' | 'edgeClearance'
>;

/** Pocket footprint: width across (X) and length front-to-back (Y). */
export function trayPocketFootprint(opts: Pick<PartsTrayOptions, 'pocketShape' | 'pocketSize' | 'pocketLength'>): {
  w: number;
  l: number;
} {
  if (opts.pocketShape === 'circle') return { w: opts.pocketSize, l: opts.pocketSize };
  return { w: opts.pocketSize, l: opts.pocketLength ?? opts.pocketSize };
}

/** Most pockets that fit across and along the tray at the current size and spacing. */
export function trayCapacity(spec: Spec, opts: TrayLayoutOptions): { cols: number; rows: number } {
  const { w, l } = trayPocketFootprint(opts);
  const area = usableArea(spec, opts.cellsX, opts.cellsY, opts.edgeClearance);
  const fit = (span: number, size: number) =>
    Math.max(0, Math.floor((span + opts.pocketSpacing + 1e-6) / (size + opts.pocketSpacing)));
  return { cols: fit(area.w, w), rows: fit(area.d, l) };
}

/**
 * One pocket, floor at z = 0 and overshooting z = depth. With `rounded`, the
 * floor is filleted into a bowl: the hull of the straight walls and spheres
 * swept round the outline inset by the fillet radius.
 */
function trayPocket(
  m: ManifoldToplevel,
  shape: 'circle' | 'square',
  w: number,
  l: number,
  cornerRadius: number,
  depth: number,
  rounded: boolean,
): Manifold {
  const top = depth + 0.1;
  const outline = shape === 'circle'
    ? m.CrossSection.circle(w / 2, CORNER_SEGMENTS)
    : roundedRect(m, w, l, cornerRadius);
  const fillet = rounded ? Math.min(w / 2, l / 2, depth) * 0.999 : 0;
  if (fillet <= 0.05) return outline.extrude(top);

  const walls = outline.extrude(top - fillet).translate([0, 0, fillet]);
  const inset = shape === 'circle'
    ? m.CrossSection.circle(Math.max(w / 2 - fillet, 0.001), CORNER_SEGMENTS)
    : roundedRect(m, Math.max(w - 2 * fillet, 0.002), Math.max(l - 2 * fillet, 0.002), cornerRadius - fillet);
  const ball = m.Manifold.sphere(fillet, 24);
  const balls = inset.toPolygons().flat().map(([x, y]) => ball.translate([x, y, fillet]));
  return m.Manifold.hull([walls, ...balls]);
}

/**
 * Solid tray with a grid of cups or slots. Pockets are laid out on a pitch of
 * size + spacing, centred, and only as many as fit are cut — the rest are
 * reported as dropped. Depth is capped so a floor always remains above the foot.
 */
export function buildPartsTray(
  m: ManifoldToplevel,
  spec: Spec,
  opts: PartsTrayOptions,
): { result: Manifold; placed: number; dropped: number } {
  const { gridUnit, clearance: binClearance, heightUnit, baseProfile } = spec;
  const outerW = opts.cellsX * gridUnit - binClearance;
  const outerD = opts.cellsY * gridUnit - binClearance;
  const totalH = opts.heightUnits * heightUnit;
  const baseH = baseProfile.totalHeight;

  const baseTiled = tileGrid(binBaseUnit(m, spec), opts.cellsX, opts.cellsY, gridUnit);
  const body = outlinePrism(m, spec, outerW, outerD, baseH, totalH);
  let result = baseTiled.add(body);

  const { w, l } = trayPocketFootprint(opts);
  const capacity = trayCapacity(spec, opts);
  const cols = Math.min(opts.pocketCols, capacity.cols);
  const rows = Math.min(opts.pocketRows, capacity.rows);
  const depth = Math.min(opts.pocketDepth, maxPocketDepth(spec, opts.heightUnits));

  if (cols > 0 && rows > 0 && depth > 0.2) {
    const pitchX = w + opts.pocketSpacing;
    const pitchY = l + opts.pocketSpacing;
    const pocket = trayPocket(m, opts.pocketShape, w, l, opts.cornerRadius, depth, opts.roundedBottom)
      .translate([0, 0, totalH - depth]);
    let pockets: Manifold | null = null;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const piece = pocket.translate([(i - (cols - 1) / 2) * pitchX, ((rows - 1) / 2 - j) * pitchY, 0]);
        pockets = pockets ? pockets.add(piece) : piece;
      }
    }
    if (pockets) result = result.subtract(pockets);
  }

  if (opts.stackingLip) {
    result = result.add(buildStackingLip(m, spec, outerW, outerD, totalH, null));
  }

  const mountHoles = footHoles(m, spec, opts);
  if (mountHoles) result = result.subtract(mountHoles);

  const placed = depth > 0.2 ? cols * rows : 0;
  return { result, placed, dropped: opts.pocketCols * opts.pocketRows - placed };
}

export type LidOptions = {
  cellsX: number;
  cellsY: number;
  /** Wall of the grip ring. */
  wallThickness: number;
  lidClearance: number;
};

/** Thickness of the lid's flat plate. */
const LID_PLATE = 1.2;

/**
 * Flat friction-fit lid for any bin with a stacking lip. Printed plate-down;
 * flipped over, the plate rests on the lip's top and the grip ring drops into
 * the lip's straight section, `lidClearance` smaller all round.
 */
export function buildLid(m: ManifoldToplevel, spec: Spec, opts: LidOptions): Manifold {
  const { gridUnit, clearance: binClearance, stackLip: lip } = spec;
  const outerW = opts.cellsX * gridUnit - binClearance;
  const outerD = opts.cellsY * gridUnit - binClearance;

  const plate = outlinePrism(m, spec, outerW, outerD, 0, LID_PLATE);

  // layers[1] is where the lip's straight section starts, above its lower chamfer.
  const straight = lip.layers[1];
  const ringH = lip.height - lip.tip - straight.z;
  const outerInset = straight.inset + opts.lidClearance;
  const innerInset = outerInset + opts.wallThickness;
  if (ringH <= 0.1 || outerW - 2 * innerInset <= 0.1 || outerD - 2 * innerInset <= 0.1) return plate;

  const ring = roundedRect(m, outerW - 2 * outerInset, outerD - 2 * outerInset, lip.radius - outerInset)
    .subtract(roundedRect(m, outerW - 2 * innerInset, outerD - 2 * innerInset, lip.radius - innerInset));
  // Rooted OVERLAP into the plate so the ring fuses with it.
  const grip = ring.extrude(ringH + OVERLAP).translate([0, 0, LID_PLATE - OVERLAP]);
  return plate.add(grip);
}

/** Cap height of the size labels engraved on holders. */
export const HOLE_LABEL_HEIGHT = 3.5;
const HOLE_LABEL_DEPTH = 0.6;
/** Gap between a row's holes and the labels under them. */
const HOLE_LABEL_GAP = 1.2;

/** Footprint width of a hole: across corners for hex holes, which are sized across flats. */
export function holeWidth(shape: HoleShape, size: number, clearance: number): number {
  const flats = size + 2 * clearance;
  return shape === 'hex' ? flats / Math.cos(Math.PI / 6) : flats;
}

/** Rough engraved width of a label, for previews that have no font to measure with. */
export function estimateLabelWidth(label: string): number {
  return label.length * HOLE_LABEL_HEIGHT * 0.62;
}

export type HolePlacement = {
  /** Index into the set's items. */
  item: number;
  x: number;
  y: number;
  /** Centre of the engraved label, when the hole has one. */
  label?: { x: number; y: number };
};

/**
 * Where the holes go on a usable area of w × d centred on the origin.
 *
 * A 'set' keeps catalogue order, reading left to right and back to front,
 * each row centred, with an optional strip of labels under each row. Anything
 * that doesn't fit is dropped. A 'fill' repeats one hole as many times as fit,
 * in a square grid or staggered rows — whichever holds more.
 */
export function layoutHoles(
  input: {
    mode: 'set' | 'fill';
    /** Hole footprint widths, one per item (a fill uses the first). */
    widths: ReadonlyArray<number>;
    /** Label widths per item; omit for no labels. */
    labelWidths?: ReadonlyArray<number>;
  },
  w: number,
  d: number,
  spacing: number,
): { placed: HolePlacement[]; dropped: number } {
  if (input.mode === 'fill') return { placed: fillLayout(input.widths[0] ?? 0, w, d, spacing), dropped: 0 };

  const labelled = input.labelWidths !== undefined;
  const cellW = input.widths.map((hw, i) => Math.max(hw, input.labelWidths?.[i] ?? 0));
  const rows: number[][] = [];
  let row: number[] = [];
  let rowW = 0;
  input.widths.forEach((_, i) => {
    const add = (row.length ? spacing : 0) + cellW[i];
    if (row.length && rowW + add > w + 1e-6) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    rowW += row.length ? spacing + cellW[i] : cellW[i];
    row.push(i);
  });
  if (row.length) rows.push(row);

  const labelBand = labelled ? HOLE_LABEL_GAP + HOLE_LABEL_HEIGHT : 0;
  const rowHeight = (r: number[]) => Math.max(...r.map((i) => input.widths[i])) + labelBand;
  // Keep whole rows, back to front, while they fit.
  const kept: number[][] = [];
  let used = 0;
  for (const r of rows) {
    const add = (kept.length ? spacing : 0) + rowHeight(r);
    if (used + add > d + 1e-6) break;
    kept.push(r);
    used += add;
  }

  const placed: HolePlacement[] = [];
  let top = used / 2;
  for (const r of kept) {
    const holeBand = Math.max(...r.map((i) => input.widths[i]));
    const span = r.reduce((sum, i) => sum + cellW[i], 0) + spacing * (r.length - 1);
    let x = -span / 2;
    for (const i of r) {
      const cx = x + cellW[i] / 2;
      const cy = top - holeBand / 2;
      placed.push({
        item: i,
        x: cx,
        y: cy,
        label: labelled ? { x: cx, y: top - holeBand - HOLE_LABEL_GAP - HOLE_LABEL_HEIGHT / 2 } : undefined,
      });
      x += cellW[i] + spacing;
    }
    top -= rowHeight(r) + spacing;
  }
  return { placed, dropped: input.widths.length - placed.length };
}

/** Centres for repeating one hole of footprint `size` over w × d. */
function fillLayout(size: number, w: number, d: number, spacing: number): HolePlacement[] {
  if (size <= 0 || size > w || size > d) return [];
  const pitch = size + spacing;
  const fit = (span: number, step: number) => Math.floor((span - size) / step + 1e-6) + 1;

  const square: Array<[number, number]> = [];
  for (let j = 0; j < fit(d, pitch); j++) {
    for (let i = 0; i < fit(w, pitch); i++) square.push([i * pitch, -j * pitch]);
  }
  // Staggered rows sit closer together; odd rows shift half a pitch.
  const staggered: Array<[number, number]> = [];
  const rowPitch = pitch * Math.sin(Math.PI / 3);
  for (let j = 0; j < fit(d, rowPitch); j++) {
    const shift = j % 2 ? pitch / 2 : 0;
    for (let i = 0; i < fit(w - shift, pitch); i++) staggered.push([shift + i * pitch, -j * rowPitch]);
  }
  const pts = staggered.length > square.length ? staggered : square;

  // Centre the pattern on the origin.
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const dx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map(([x, y]) => ({ item: 0, x: x - dx, y: y - dy }));
}

export type DrillBitHolderOptions = {
  cellsX: number;
  cellsY: number;
  heightUnits: number;
  holes: HoleSet;
  holeDepth: number;
  clearance: number;
  spacing: number;
  edgeClearance: number;
  stackingLip: boolean;
  magnetHoles: boolean;
  screwHoles: boolean;
  /** Engraving outlines per item, in the same order as `holes.items`; present when labels are wanted. */
  labelPolygons?: ReadonlyArray<ReadonlyArray<Polygon>>;
};

function polygonsWidth(polys: ReadonlyArray<Polygon>): number {
  let min = Infinity;
  let max = -Infinity;
  for (const p of polys) for (const [x] of p) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return Number.isFinite(min) ? max - min : 0;
}

/**
 * Solid block with holes for a set of tools or cells (see bitSets). Holes are
 * round or hex, cut no deeper than keeps a floor above the foot, and labelled
 * sets get each size engraved under its hole.
 */
export function buildDrillBitHolder(
  m: ManifoldToplevel,
  spec: Spec,
  opts: DrillBitHolderOptions,
): { result: Manifold; dropped: number; placed: number } {
  const { gridUnit, clearance: binClearance, heightUnit, baseProfile } = spec;
  const outerW = opts.cellsX * gridUnit - binClearance;
  const outerD = opts.cellsY * gridUnit - binClearance;
  const totalH = opts.heightUnits * heightUnit;
  const baseH = baseProfile.totalHeight;

  const baseTiled = tileGrid(binBaseUnit(m, spec), opts.cellsX, opts.cellsY, gridUnit);
  const body = outlinePrism(m, spec, outerW, outerD, baseH, totalH);
  let result = baseTiled.add(body);

  const { shape, mode, items } = opts.holes;
  const labels = mode === 'set' ? opts.labelPolygons : undefined;
  const area = usableArea(spec, opts.cellsX, opts.cellsY, opts.edgeClearance);
  const { placed, dropped } = layoutHoles(
    {
      mode,
      widths: items.map((it) => holeWidth(shape, it.mm, opts.clearance)),
      labelWidths: labels?.map(polygonsWidth),
    },
    area.w,
    area.d,
    opts.spacing,
  );

  const depth = Math.min(opts.holeDepth, maxPocketDepth(spec, opts.heightUnits));
  if (placed.length > 0 && depth > 0.2) {
    const pieces: Manifold[] = [];
    for (const p of placed) {
      // Hex holes: a 6-sided cylinder with a vertex on +X, so its flats face front and back.
      const radius = holeWidth(shape, items[p.item].mm, opts.clearance) / 2;
      pieces.push(
        m.Manifold.cylinder(depth + 0.1, radius, -1, shape === 'hex' ? 6 : 48)
          .translate([p.x, p.y, totalH - depth]),
      );
      const text = labels?.[p.item];
      if (p.label && text && text.length) {
        const block = buildTextManifold(m, { polygons: text, depth: HOLE_LABEL_DEPTH + 0.1 });
        if (block) pieces.push(block.translate([p.label.x, p.label.y, totalH - HOLE_LABEL_DEPTH]));
      }
    }
    result = result.subtract(m.Manifold.union(pieces));
  }

  if (opts.stackingLip) {
    result = result.add(buildStackingLip(m, spec, outerW, outerD, totalH, null));
  }

  const mountHoles = footHoles(m, spec, opts);
  if (mountHoles) result = result.subtract(mountHoles);

  const cut = depth > 0.2 ? placed.length : 0;
  return { result, placed: cut, dropped: dropped + placed.length - cut };
}
