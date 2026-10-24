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
  const baseH = spec.baseProfile.totalHeight;

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

describe('lid', () => {
  it('grip ring slides inside the bin stacking lip with the requested clearance', () => {
    const lidP = LidParamsSchema.parse({ kind: 'lid', cellsX: 2, cellsY: 1, lidClearance: 0.2 });
    const lid = buildLid(m, spec, lidP);
    const plateTop = 1.2;
    const grip = lid.trimByPlane([0, 0, 1], plateTop + 0.01);
    const gb = grip.boundingBox();
    const gripW = gb.max[0] - gb.min[0];

    const bin = buildBin(m, spec, noText(BinParamsSchema.parse({ kind: 'bin', cellsX: 2, cellsY: 1, wallThickness: lidP.wallThickness })));
    const binTop = bin.boundingBox().max[2];
    // Width of the opening at the top of the lip, measured by slicing just below the rim.
    const rim = bin.trimByPlane([0, 0, 1], binTop - 0.5).trimByPlane([0, 0, -1], -(binTop - 0.4));
    const slice = rim.slice(binTop - 0.45);
    const bounds = slice.bounds();
    const outerW = bounds.max[0] - bounds.min[0];
    const lipInnerW = outerW - 2 * lidP.wallThickness;
    expect(gripW).toBeCloseTo(lipInnerW - 2 * lidP.lidClearance, 2);
  });
});
