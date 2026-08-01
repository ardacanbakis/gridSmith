import { describe, expect, it } from 'vitest';
import { buildSpec, isStandardSpec, STANDARD, STANDARD_SPEC } from './spec';

describe('buildSpec at standard 42mm/7mm', () => {
  const spec = buildSpec(42, 7);

  it('passes through grid and height units unchanged', () => {
    expect(spec.gridUnit).toBe(42);
    expect(spec.heightUnit).toBe(7);
  });

  it('clearance is 0.5 mm', () => {
    expect(spec.clearance).toBeCloseTo(0.5);
  });

  it('base profile has exactly four layers', () => {
    expect(spec.baseProfile.layers).toHaveLength(4);
  });

  it('layer 0 — floor: z=0.0, size=35.6, radius=1.6', () => {
    const l = spec.baseProfile.layers[0];
    expect(l.z).toBeCloseTo(0.0);
    expect(l.size).toBeCloseTo(35.6);
    expect(l.radius).toBeCloseTo(1.6);
  });

  it('layer 1 — first ramp: z=0.8, size=37.2, radius=2.4', () => {
    const l = spec.baseProfile.layers[1];
    expect(l.z).toBeCloseTo(0.8);
    expect(l.size).toBeCloseTo(37.2);
    expect(l.radius).toBeCloseTo(2.4);
  });

  it('layer 2 — vertical: z=2.6, size=37.2, radius=2.4', () => {
    const l = spec.baseProfile.layers[2];
    expect(l.z).toBeCloseTo(2.6);
    expect(l.size).toBeCloseTo(37.2);
    expect(l.radius).toBeCloseTo(2.4);
  });

  it('layer 3 — top chamfer: z=4.75, size=41.5, radius=4.0', () => {
    const l = spec.baseProfile.layers[3];
    expect(l.z).toBeCloseTo(4.75);
    expect(l.size).toBeCloseTo(41.5);
    expect(l.radius).toBeCloseTo(4.0);
  });

  it('base profile total height is 4.75 mm', () => {
    expect(spec.baseProfile.totalHeight).toBeCloseTo(4.75);
  });

  it('magnet diameter is 6.0 mm', () => {
    expect(spec.magnet.diameter).toBeCloseTo(6.0);
  });

  it('magnet depth is 2.0 mm', () => {
    expect(spec.magnet.depth).toBeCloseTo(2.0);
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

  it('layer sizes scale linearly', () => {
    expect(spec.baseProfile.layers[0].size).toBeCloseTo(35.6 * s);
    expect(spec.baseProfile.layers[3].size).toBeCloseTo(41.5 * s);
  });

  it('layer z-heights scale linearly', () => {
    expect(spec.baseProfile.layers[3].z).toBeCloseTo(4.75 * s);
  });

  it('layer radii scale linearly', () => {
    expect(spec.baseProfile.layers[0].radius).toBeCloseTo(1.6 * s);
    expect(spec.baseProfile.layers[3].radius).toBeCloseTo(4.0 * s);
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
    expect(spec.magnet.diameter).toBeCloseTo(6.0);
    expect(spec.magnet.depth).toBeCloseTo(2.0);
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
