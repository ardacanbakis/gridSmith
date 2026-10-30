import { beforeAll, describe, expect, it } from 'vitest';
import type { Manifold, ManifoldToplevel, Vec3 } from 'manifold-3d';
import { getManifold } from '@/lib/geometry/manifold';
import { buildSpec } from './spec';
import {
  buildBaseplate,
  buildBin,
  buildDrillBitHolder,
  buildLid,
  buildPartsTray,
  buildScrewOrganizer,
} from './primitives';
import {
  BaseplateParamsSchema,
  BinParamsSchema,
  DrillBitHolderParamsSchema,
  LidParamsSchema,
  PartsTrayParamsSchema,
  ScrewOrganizerParamsSchema,
} from '@/lib/params/schema';
import { bitsForSet } from './bitSets';

const spec = buildSpec(42, 7);
let m: ManifoldToplevel;

beforeAll(async () => {
  m = await getManifold();
});

/** Volume of `part` inside a small cube centred at `p` — > 0 means solid material there. */
function solidAt(part: Manifold, p: Vec3, size = 0.2): number {
  const probe = m.Manifold.cube([size, size, size], true).translate(p);
  return part.intersect(probe).volume();
}

/** Schema params carry label text as a string; the worker swaps in polygons. */
const noText = <T extends { labelText: string }>(p: T): Omit<T, 'labelText'> => {
  const { labelText: _, ...rest } = p;
  return rest;
};

function expectValid(part: Manifold) {
  expect(part.status()).toBe('NoError');
  expect(part.isEmpty()).toBe(false);
  expect(part.volume()).toBeGreaterThan(0);
  // One printable body: nothing floating or merely touching on a coplanar face.
  expect(part.decompose()).toHaveLength(1);
}

describe('every model kind builds a valid manifold with default params', () => {
  it('bin', () => expectValid(buildBin(m, spec, noText(BinParamsSchema.parse({ kind: 'bin' })))));
  it('baseplate (minimal)', () =>
    expectValid(buildBaseplate(m, spec, BaseplateParamsSchema.parse({ kind: 'baseplate' }))));
  it('baseplate (rigid)', () =>
    expectValid(buildBaseplate(m, spec, BaseplateParamsSchema.parse({ kind: 'baseplate', style: 'rigid' }))));
  it('screw organizer', () =>
    expectValid(buildScrewOrganizer(m, spec, noText(ScrewOrganizerParamsSchema.parse({ kind: 'screwOrganizer' })))));
  it('parts tray', () =>
    expectValid(buildPartsTray(m, spec, PartsTrayParamsSchema.parse({ kind: 'partsTray' }))));
  it('lid', () => expectValid(buildLid(m, spec, LidParamsSchema.parse({ kind: 'lid' }))));
  it('drill bit holder', () => {
    const p = DrillBitHolderParamsSchema.parse({ kind: 'drillBitHolder' });
    const { result, placed } = buildDrillBitHolder(m, spec, { ...p, bits: bitsForSet(p.bitSet, p.customBits) });
    expectValid(result);
    expect(placed).toBeGreaterThan(0);
  });
});

describe('every model kind stays one valid body with all options on', () => {
  const mounts = { magnetHoles: true, screwHoles: true, stackingLip: true };

  it.each(['paperPocket', 'clipTab'] as const)('bin with dividers, scoop, %s label', (labelStyle) =>
    expectValid(buildBin(m, spec, noText(BinParamsSchema.parse({
      kind: 'bin', cellsX: 2, cellsY: 3, heightUnits: 5, divX: 3, divY: 2, scoopRamp: true, labelStyle, ...mounts,
    })))));
  it('baseplate (rigid, magnets + screws)', () =>
    expectValid(buildBaseplate(m, spec, BaseplateParamsSchema.parse({
      kind: 'baseplate', cellsX: 3, cellsY: 2, style: 'rigid', magnetHoles: true, screwHoles: true,
    }))));
  it('screw organizer (max tilt)', () =>
    expectValid(buildScrewOrganizer(m, spec, noText(ScrewOrganizerParamsSchema.parse({
      kind: 'screwOrganizer', cols: 5, rows: 3, tiltDegrees: 20, ...mounts,
    })))));
  it.each(['circle', 'square'] as const)('parts tray (%s pockets)', (pocketShape) =>
    expectValid(buildPartsTray(m, spec, PartsTrayParamsSchema.parse({
      kind: 'partsTray', pocketShape, ...mounts,
    }))));
  it('lid (3×2)', () => expectValid(buildLid(m, spec, LidParamsSchema.parse({ kind: 'lid', cellsX: 3, cellsY: 2 }))));
  it('drill bit holder', () => {
    const p = DrillBitHolderParamsSchema.parse({ kind: 'drillBitHolder', bitSet: 'battery-mixed', cellsX: 3, ...mounts });
    expectValid(buildDrillBitHolder(m, spec, { ...p, bits: bitsForSet(p.bitSet, p.customBits) }).result);
  });
});

describe('baseplate', () => {
  const baseH = spec.baseplateProfile.totalHeight;

  it('rigid style has a solid floor and pockets open at the top', () => {
    const plate = buildBaseplate(m, spec, BaseplateParamsSchema.parse({ kind: 'baseplate', cellsX: 1, cellsY: 1, style: 'rigid' }));
    const top = plate.boundingBox().max[2];
    // Cell centre just below the top surface must be open so a bin can drop in.
    expect(solidAt(plate, [0, 0, top - 0.3])).toBe(0);
    // Cell centre at the very bottom must be solid floor.
    expect(solidAt(plate, [0, 0, 0.3])).toBeGreaterThan(0);
    // Pocket depth above the floor matches the bin foot height.
    expect(top).toBeGreaterThan(baseH);
  });

  it('rigid magnet holes cut into the floor from above', () => {
    const p = BaseplateParamsSchema.parse({ kind: 'baseplate', cellsX: 1, cellsY: 1, style: 'rigid' });
    const withMagnets = buildBaseplate(m, spec, { ...p, magnetHoles: true });
    const inset = spec.magnet.insetFromCenter;
    const floorTop = withMagnets.boundingBox().max[2] - baseH;
    // The floor is thickened to take the magnet with a skin underneath.
    expect(floorTop).toBeGreaterThan(spec.magnet.depth);
    // Just under the floor surface at a magnet position: open (the hole).
    expect(solidAt(withMagnets, [inset, inset, floorTop - 0.3])).toBe(0);
    // Underneath the magnet hole: still solid skin.
    expect(solidAt(withMagnets, [inset, inset, 0.15], 0.1)).toBeGreaterThan(0);
    // Away from the magnets the floor is solid.
    expect(solidAt(withMagnets, [0, 0, floorTop - 0.3])).toBeGreaterThan(0);
  });

  it('screw holes go through a rigid floor', () => {
    const p = BaseplateParamsSchema.parse({ kind: 'baseplate', cellsX: 1, cellsY: 1, style: 'rigid', screwHoles: true });
    const plate = buildBaseplate(m, spec, p);
    const inset = spec.magnet.insetFromCenter;
    expect(solidAt(plate, [inset, inset, 0.3])).toBe(0);
  });

  it('minimal style stays an open frame and ignores hole options', () => {
    const p = BaseplateParamsSchema.parse({ kind: 'baseplate', cellsX: 1, cellsY: 1 });
    const plain = buildBaseplate(m, spec, p);
    const withHoles = buildBaseplate(m, spec, { ...p, magnetHoles: true, screwHoles: true });
    expect(withHoles.volume()).toBeCloseTo(plain.volume(), 6);
    expect(solidAt(plain, [0, 0, 0.3])).toBe(0);
  });
});

describe('rounded vertical corners', () => {
  const R = spec.baseProfile.radius;
  const outer = 42 - spec.clearance;
  // Points on the corner's diagonal, `r` from the centre of the corner arc.
  const arc = outer / 2 - R;
  const onDiagonal = (r: number, z: number): Vec3 => [arc + r / Math.SQRT2, arc + r / Math.SQRT2, z];

  it('bins are rounded like the foot, with the wall thickness kept round the corner', () => {
    const wall = 1.2;
    const bin = buildBin(m, spec, noText(BinParamsSchema.parse({ kind: 'bin', heightUnits: 3, wallThickness: wall })));
    expect(solidAt(bin, onDiagonal(R + 0.15, 12), 0.1)).toBe(0);
    expect(solidAt(bin, onDiagonal(R - wall / 2, 12), 0.1)).toBeGreaterThan(0);
    expect(solidAt(bin, onDiagonal(R - wall - 0.15, 12), 0.1)).toBe(0);
  });

  it('lowering the dividers under the lip does not thin the corner walls', () => {
    // A thick wall leaves no shelf under the lip, so nothing would refill a sharp cut.
    const wall = 3;
    const bin = buildBin(m, spec, noText(BinParamsSchema.parse({
      kind: 'bin', heightUnits: 3, wallThickness: wall, divX: 2, divY: 2,
    })));
    expect(solidAt(bin, onDiagonal(R - wall / 2, 3 * spec.heightUnit - 0.3), 0.1)).toBeGreaterThan(0);
  });

  it('the lid plate follows the same outline', () => {
    const lid = buildLid(m, spec, LidParamsSchema.parse({ kind: 'lid' }));
    expect(solidAt(lid, onDiagonal(R + 0.15, 0.6), 0.1)).toBe(0);
    expect(solidAt(lid, onDiagonal(R - 0.3, 0.6), 0.1)).toBeGreaterThan(0);
  });
});

describe('bin foot holes', () => {
  it('magnet holes open from the underside and leave the floor intact', () => {
    const p = noText(BinParamsSchema.parse({ kind: 'bin', magnetHoles: true }));
    const bin = buildBin(m, spec, p);
    const inset = spec.magnet.insetFromCenter;
    expect(solidAt(bin, [inset, inset, 0.3])).toBe(0);
    expect(solidAt(bin, [inset, inset, spec.magnet.depth + 0.3])).toBeGreaterThan(0);
  });
});

describe('bin labels', () => {
  const square: [number, number][] = [[-5, -2], [5, -2], [5, 2], [-5, 2]];
  const base = noText(BinParamsSchema.parse({ kind: 'bin', cellsX: 1, cellsY: 1, heightUnits: 3 }));
  const outerD = 42 - spec.clearance;

  const totalH = base.heightUnits * spec.heightUnit;
  const frontY = -outerD / 2;

  it('embossed text never protrudes past the bin footprint', () => {
    const bin = buildBin(m, spec, {
      ...base,
      labelStyle: 'embossText',
      labelText: { polygons: [square], depth: 0.6 },
    });
    expect(bin.boundingBox().min[1]).toBeGreaterThanOrEqual(frontY - 1e-6);
  });

  it('embossed text is attached to the bin and raised above a recessed field', () => {
    const bin = buildBin(m, spec, {
      ...base,
      labelStyle: 'embossText',
      labelText: { polygons: [square], depth: 0.6 },
    });
    // One connected body — no free-floating text shell.
    expect(bin.decompose()).toHaveLength(1);
    // The text itself reaches the wall's face…
    expect(solidAt(bin, [0, frontY + 0.1, totalH / 2], 0.1)).toBeGreaterThan(0);
    // …while the field just outside the glyph is recessed.
    expect(solidAt(bin, [5.5, frontY + 0.1, totalH / 2], 0.1)).toBe(0);
  });

  it('engraving deeper than the wall does not punch through into the cavity', () => {
    const bin = buildBin(m, spec, {
      ...base,
      wallThickness: 1.2,
      labelStyle: 'engraveText',
      labelText: { polygons: [square], depth: 2.5 },
    });
    // Inner face of the front wall, behind the text, must keep a skin.
    expect(solidAt(bin, [0, frontY + 1.2 - 0.1, totalH / 2], 0.1)).toBeGreaterThan(0);
    // The engraving still goes in as deep as the wall allows.
    expect(solidAt(bin, [0, frontY + 0.7, totalH / 2], 0.1)).toBe(0);
  });

  it.each(['paperPocket', 'clipTab', 'engraveText'] as const)('solid bins still get a %s label', (labelStyle) => {
    const solid = { ...base, hollow: false };
    const plain = buildBin(m, spec, solid);
    const labelled = buildBin(m, spec, { ...solid, labelStyle, labelText: { polygons: [square], depth: 0.6 } });
    expect(labelled.volume()).toBeLessThan(plain.volume());
  });

  it('screw organizer column labels are attached and inside the footprint', () => {
    const p = noText(ScrewOrganizerParamsSchema.parse({ kind: 'screwOrganizer', cols: 2, labelStyle: 'none' }));
    const glyph: [number, number][] = [[-3, -2], [3, -2], [3, 2], [-3, 2]];
    const org = buildScrewOrganizer(m, spec, {
      ...p,
      compartmentLabelStyle: 'emboss',
      compartmentLabelPolygons: [[glyph], [glyph]],
    });
    expect(org.decompose()).toHaveLength(1);
    expect(org.boundingBox().min[1]).toBeGreaterThanOrEqual(-(p.cellsY * 42 - spec.clearance) / 2 - 1e-6);
  });
});

/** Volume where two parts collide; effectively 0 when they only touch or clear. */
function overlap(a: Manifold, b: Manifold): number {
  return a.intersect(b).volume();
}
const CLEAR = 1e-3;

describe('fit: parts mate the way Gridfinity parts do', () => {
  const H = 3;
  const totalH = H * spec.heightUnit;
  // Seated, a foot sits this far below the base of the lip it nests in.
  const sink = spec.baseProfile.totalHeight - spec.stackLip.height;
  const bin1 = () => buildBin(m, spec, noText(BinParamsSchema.parse({ kind: 'bin', heightUnits: H })));

  it('the lip is trimmed to a flat, 0.6 mm below the nominal 4.4 mm', () => {
    expect(bin1().boundingBox().max[2]).toBeCloseTo(totalH + 4.4 - 0.6, 4);
  });

  it.each([
    ['plain bin', () => bin1()],
    ['divided bin with a scoop', () =>
      buildBin(m, spec, noText(BinParamsSchema.parse({ kind: 'bin', heightUnits: H, divX: 3, divY: 2, scoopRamp: true })))],
    ['thick-walled bin', () =>
      buildBin(m, spec, noText(BinParamsSchema.parse({ kind: 'bin', heightUnits: H, wallThickness: 2 })))],
    ['screw organizer at max tilt', () =>
      buildScrewOrganizer(m, spec, noText(ScrewOrganizerParamsSchema.parse({
        kind: 'screwOrganizer', cellsX: 1, cellsY: 1, heightUnits: H, cols: 2, rows: 2, tiltDegrees: 20, labelStyle: 'none',
      })))],
  ])('a bin seats on both chamfers of a %s', (_, makeLower) => {
    const lower = makeLower();
    const upper = bin1();
    const seat = (dz: number, dx = 0) => upper.translate([dx, 0, totalH - sink + dz]);
    // Clears everything — lip, shelf, dividers, ramps, wedges — with a hair of air…
    expect(overlap(lower, seat(0.02))).toBeLessThan(CLEAR);
    // …and it's the chamfers that carry it: any lower and it collides.
    expect(overlap(lower, seat(-0.05))).toBeGreaterThan(CLEAR);
    // Located sideways.
    expect(overlap(lower, seat(0.02, 0.3))).toBeGreaterThan(CLEAR);
  });

  it('stacking still nests at a non-standard 30 mm grid', () => {
    const small = buildSpec(30, 5);
    const make = () => buildBin(m, small, noText(BinParamsSchema.parse({ kind: 'bin', heightUnits: 4 })));
    const h = 4 * small.heightUnit;
    const smallSink = small.baseProfile.totalHeight - small.stackLip.height;
    const seat = (dz: number) => make().translate([0, 0, h - smallSink + dz]);
    expect(overlap(make(), seat(0.02))).toBeLessThan(CLEAR);
    expect(overlap(make(), seat(-0.05))).toBeGreaterThan(CLEAR);
  });

  it('a bin rests on the solid top of a parts tray, located by its lip', () => {
    const tray = buildPartsTray(m, spec, PartsTrayParamsSchema.parse({
      kind: 'partsTray', cellsX: 1, cellsY: 1, heightUnits: H, pocketCols: 1, pocketRows: 1, stackingLip: true,
    }));
    const upper = bin1();
    const rest = (dz: number, dx = 0) => upper.translate([dx, 0, totalH + dz]);
    expect(overlap(tray, rest(0.02))).toBeLessThan(CLEAR);
    expect(overlap(tray, rest(0.02, 0.3))).toBeGreaterThan(CLEAR);
  });

  it.each([[1, 1], [2, 2]])('a %i×%i bin drops into a rigid baseplate with 0.25 mm of play', (cx, cy) => {
    const plate = buildBaseplate(m, spec, BaseplateParamsSchema.parse({
      kind: 'baseplate', cellsX: cx, cellsY: cy, style: 'rigid',
    }));
    const floorTop = plate.boundingBox().max[2] - spec.baseplateProfile.totalHeight;
    const bin = buildBin(m, spec, noText(BinParamsSchema.parse({ kind: 'bin', cellsX: cx, cellsY: cy, heightUnits: H })));
    const place = (dx: number) => bin.translate([dx, 0, floorTop + 0.01]);
    expect(overlap(plate, place(0))).toBeLessThan(CLEAR);
    expect(overlap(plate, place(0.2))).toBeLessThan(CLEAR);
    expect(overlap(plate, place(0.35))).toBeGreaterThan(CLEAR);
  });

  it('a lid rests on the lip and its grip ring holds it with the requested clearance', () => {
    const clearance = 0.2;
    const lid = buildLid(m, spec, LidParamsSchema.parse({ kind: 'lid', cellsX: 2, cellsY: 1, lidClearance: clearance }))
      .rotate([180, 0, 0]); // printed plate-down; flipped, the plate spans z ∈ [-1.2, 0]
    const bin = buildBin(m, spec, noText(BinParamsSchema.parse({ kind: 'bin', cellsX: 2, cellsY: 1, heightUnits: H })));
    const lipTop = bin.boundingBox().max[2];
    const place = (dx: number) => lid.translate([dx, 0, lipTop + 1.2 + 0.01]);
    expect(overlap(bin, place(0))).toBeLessThan(CLEAR);
    expect(overlap(bin, place(clearance - 0.05))).toBeLessThan(CLEAR);
    expect(overlap(bin, place(clearance + 0.1))).toBeGreaterThan(CLEAR);
  });
});
