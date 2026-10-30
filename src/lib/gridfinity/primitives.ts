import type { CrossSection, ManifoldToplevel, Manifold, Vec3 } from 'manifold-3d';
import type { ProfileLayer, Spec } from './spec';
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

  const block = m.Manifold.cube([outerW, outerD, lipH + OVERLAP], true)
    .translate([0, 0, topZ - OVERLAP + (lipH + OVERLAP) / 2]);
  // Overshoots below the block's sunk base and above its trimmed top for a clean cut.
  const cavity = sweptSolid(m, outerW, outerD, lip.radius, [
    { z: -2 * OVERLAP, inset: bottomInset },
    ...lip.layers,
    { z: lip.height + OVERLAP, inset: 0 },
  ]).translate([0, 0, topZ]);
  let result = block.subtract(cavity);

  const shelfH = wall === null ? 0 : bottomInset - wall;
  if (wall !== null && shelfH > 0) {
    const shelfBlock = m.Manifold.cube([outerW, outerD, shelfH], true)
      .translate([0, 0, topZ - shelfH / 2]);
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
  const zone = m.Manifold.cube([outerW - 2 * wall, outerD - 2 * wall, drop + 0.1], true)
    .translate([0, 0, topZ - drop + (drop + 0.1) / 2]);
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
      // Floor exactly at floorZ; overshoots the top by 0.1 for a clean cut.
      const cavity = m.Manifold.cube([cellW, cellD, cavityH + 0.1], true)
        .translate([cx, cy, floorZ + (cavityH + 0.1) / 2]);
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
  const bodyHeight = totalH - baseH;
  const body = m.Manifold.cube([outerW, outerD, bodyHeight], true)
    .translate([0, 0, baseH + bodyHeight / 2]);

  let bin = baseTiled.add(body);

  const wall = opts.wallThickness;
  const floorZ = baseH + wall;
  const cavityHeight = totalH - floorZ;
  const cavities = buildCavities(m, outerW, outerD, wall, floorZ, cavityHeight, opts.cols, opts.rows);
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
  const { gridUnit, clearance: binClearance, heightUnit, baseProfile } = spec;
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
    result = result.add(buildStackingLip(m, spec, outerW, outerD, totalH, null));
  }

  const mountHoles = footHoles(m, spec, opts);
  if (mountHoles) result = result.subtract(mountHoles);

  return result;
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

  const plate = m.Manifold.cube([outerW, outerD, LID_PLATE], true)
    .translate([0, 0, LID_PLATE / 2]);

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
  const { gridUnit, clearance: binClearance, heightUnit, baseProfile } = spec;
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
    result = result.add(buildStackingLip(m, spec, outerW, outerD, totalH, null));
  }

  const mountHoles = footHoles(m, spec, opts);
  if (mountHoles) result = result.subtract(mountHoles);

  return { result, placed: placed.length, dropped };
}
