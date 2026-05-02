import { describe, expect, it } from 'vitest';
import { BIT_SETS, bitsForSet } from './bitSets';
import { layoutBits } from './primitives';

describe('bitsForSet', () => {
  it('returns the requested preset', () => {
    const bits = bitsForSet('metric-basic', []);
    expect(bits.length).toBe(13);
    expect(bits[0].mm).toBe(1);
    expect(bits[12].mm).toBe(13);
  });

  it('returns custom bits when asked', () => {
    const bits = bitsForSet('custom', [2.5, 3, 4]);
    expect(bits.map((b) => b.mm)).toEqual([2.5, 3, 4]);
  });

  it('exposes sixteen non-custom presets', () => {
    expect(Object.keys(BIT_SETS)).toHaveLength(16);
  });

  it('battery presets list six options', () => {
    const ids = Object.keys(BIT_SETS).filter((k) => k.startsWith('battery-'));
    expect(ids).toHaveLength(6);
  });

  it('router shank set has uniform diameters', () => {
    const set = BIT_SETS['router-quarter'];
    const unique = new Set(set.diameters.map((d) => d.mm));
    expect(unique.size).toBe(1);
    expect([...unique][0]).toBeCloseTo(6.35, 5);
  });
});

describe('layoutBits', () => {
  it('packs every bit when there is room', () => {
    const bits = Array.from({ length: 5 }, (_, i) => ({ mm: 3 + i * 0.5, label: `${i}` }));
    const { placed, dropped } = layoutBits(bits, 80, 40, 0.15, 2);
    expect(placed.length).toBe(5);
    expect(dropped).toBe(0);
  });

  it('drops bits that do not fit', () => {
    const bits = Array.from({ length: 50 }, (_, i) => ({ mm: 8, label: `${i}` }));
    const { placed, dropped } = layoutBits(bits, 40, 40, 0.15, 2);
    expect(placed.length).toBeGreaterThan(0);
    expect(placed.length).toBeLessThan(50);
    expect(dropped).toBe(50 - placed.length);
  });

  it('sorts largest-first so big bits are packed together', () => {
    const bits = [
      { mm: 2, label: 'a' },
      { mm: 10, label: 'b' },
      { mm: 5, label: 'c' },
    ];
    const { placed } = layoutBits(bits, 80, 40, 0.15, 2);
    expect(placed[0].label).toBe('b');
  });
});
