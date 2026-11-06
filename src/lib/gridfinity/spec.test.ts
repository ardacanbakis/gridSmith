import { describe, expect, it } from 'vitest';
import { buildSpec, isStandardSpec, STANDARD, STANDARD_SPEC, type SweptProfile } from './spec';

describe('buildSpec at standard 42mm/7mm', () => {
  const spec = buildSpec(42, 7);

  it('passes through grid and height units unchanged', () => {
    expect(spec.gridUnit).toBe(42);
    expect(spec.heightUnit).toBe(7);
  });

  it('clearance is 0.5 mm', () => {
    expect(spec.clearance).toBeCloseTo(0.5);
  });

  // Each profile is swept around an outline, so a layer's size and corner radius
  // follow from its inset: size = outline − 2·inset, radius = outline radius − inset.
  const at = (p: SweptProfile, outline: number, i: number) => ({
    z: p.layers[i].z,
    size: outline - 2 * p.layers[i].inset,
    radius: p.radius - p.layers[i].inset,
  });

  it.each([
    [0, 0, 35.6, 0.8],
    [1, 0.8, 37.2, 1.6],
    [2, 2.6, 37.2, 1.6],
    [3, 4.75, 41.5, 3.75],
  ])('bin foot layer %i: z=%f, size=%f, radius=%f', (i, z, size, radius) => {
    const l = at(spec.baseProfile, 41.5, i);
    expect(l.z).toBeCloseTo(z);
    expect(l.size).toBeCloseTo(size);
    expect(l.radius).toBeCloseTo(radius);
  });

  it.each([
    [0, 0, 36.3, 1.15],
    [1, 0.7, 37.7, 1.85],
    [2, 2.5, 37.7, 1.85],
    [3, 4.65, 42, 4],
  ])('baseplate pocket layer %i: z=%f, size=%f, radius=%f', (i, z, size, radius) => {
    const l = at(spec.baseplateProfile, 42, i);
    expect(l.z).toBeCloseTo(z);
    expect(l.size).toBeCloseTo(size);
    expect(l.radius).toBeCloseTo(radius);
  });

  it('baseplate pocket is 0.25 mm looser per side than the foot at the straight section', () => {
    expect(at(spec.baseplateProfile, 42, 1).size - at(spec.baseProfile, 41.5, 1).size).toBeCloseTo(0.5);
  });

  it.each([
    [0, 0, 36.3],
    [1, 0.7, 37.7],
    [2, 2.5, 37.7],
    [3, 4.4, 41.5],
  ])('stacking lip layer %i: z=%f, opening=%f', (i, z, size) => {
    const l = at(spec.stackLip, 41.5, i);
    expect(l.z).toBeCloseTo(z);
    expect(l.size).toBeCloseTo(size);
  });

  it('stacking lip chamfers line up with the foot (both chamfers coincide when seated)', () => {
    // Seated, the foot sits (foot height − lip height) below the lip's base.
    const sink = spec.baseProfile.totalHeight - spec.stackLip.height;
    const foot = spec.baseProfile.layers;
    const lip = spec.stackLip.layers;
    // Lower chamfer: foot inset at the lip's base equals the lip's bottom inset.
    expect(foot[0].inset - sink).toBeCloseTo(lip[0].inset);
    // Upper chamfer: both reach inset 0 at the same height.
    expect(foot[3].z - sink).toBeCloseTo(lip[3].z);
  });

  it('stacking lip tip is trimmed to a 0.6 mm flat', () => {
    expect(spec.stackLip.tip).toBeCloseTo(0.6);
  });

  it('base profile total height is 4.75 mm', () => {
    expect(spec.baseProfile.totalHeight).toBeCloseTo(4.75);
  });

  it('magnet hole diameter is 6.5 mm (6 mm magnet + press-fit clearance)', () => {
    expect(spec.magnet.diameter).toBeCloseTo(6.5);
  });

  it('magnet hole depth is 2.4 mm (2 mm magnet + clearance)', () => {
    expect(spec.magnet.depth).toBeCloseTo(2.4);
  });

  it('magnet inset from center is 13.0 mm', () => {
    expect(spec.magnet.insetFromCenter).toBeCloseTo(13.0);
  });

  it('screw diameter is 3.0 mm', () => {
    expect(spec.screw.diameter).toBeCloseTo(3.0);
  });

  it('stack lip height is 4.4 mm', () => {
    expect(spec.stackLip.height).toBeCloseTo(4.4);
  });
});

describe('buildSpec scaling — 84 mm grid (2× standard)', () => {
  const spec = buildSpec(84, 7);
  const s = 2;

  it('clearance scales linearly', () => {
    expect(spec.clearance).toBeCloseTo(0.5 * s);
  });

  it('profile insets, heights and radii scale linearly', () => {
    expect(spec.baseProfile.layers[0].inset).toBeCloseTo(2.95 * s);
    expect(spec.baseProfile.layers[3].z).toBeCloseTo(4.75 * s);
    expect(spec.baseProfile.radius).toBeCloseTo(3.75 * s);
    expect(spec.baseplateProfile.radius).toBeCloseTo(4 * s);
    expect(spec.stackLip.layers[0].inset).toBeCloseTo(2.6 * s);
    expect(spec.stackLip.tip).toBeCloseTo(0.6 * s);
  });

  it('base profile total height scales linearly', () => {
    expect(spec.baseProfile.totalHeight).toBeCloseTo(4.75 * s);
  });

  it('magnet inset scales linearly', () => {
    expect(spec.magnet.insetFromCenter).toBeCloseTo(13.0 * s);
  });

  it('stack lip height scales linearly', () => {
    expect(spec.stackLip.height).toBeCloseTo(4.4 * s);
  });

  it('magnet and screw diameters are absolute (not scaled)', () => {
    expect(spec.magnet.diameter).toBeCloseTo(6.5);
    expect(spec.magnet.depth).toBeCloseTo(2.4);
    expect(spec.screw.diameter).toBeCloseTo(3.0);
  });
});

describe('STANDARD_SPEC export matches buildSpec(42,7)', () => {
  it('is identical to a freshly built standard spec', () => {
    const fresh = buildSpec(42, 7);
    expect(STANDARD_SPEC.clearance).toBeCloseTo(fresh.clearance);
    expect(STANDARD_SPEC.baseProfile.totalHeight).toBeCloseTo(fresh.baseProfile.totalHeight);
    expect(STANDARD_SPEC.stackLip.height).toBeCloseTo(fresh.stackLip.height);
  });
});

describe('isStandardSpec', () => {
  it('returns true for exact standard values', () => {
    expect(isStandardSpec(STANDARD.gridUnit, STANDARD.heightUnit)).toBe(true);
  });

  it('returns false when grid unit differs', () => {
    expect(isStandardSpec(84, STANDARD.heightUnit)).toBe(false);
  });

  it('returns false when height unit differs', () => {
    expect(isStandardSpec(STANDARD.gridUnit, 14)).toBe(false);
  });

  it('returns false for both differing', () => {
    expect(isStandardSpec(21, 3.5)).toBe(false);
  });
});
