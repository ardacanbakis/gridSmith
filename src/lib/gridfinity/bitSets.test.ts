import { describe, expect, it } from 'vitest';
import { BIT_SETS, holeSetFor } from './bitSets';
import { layoutHoles } from './primitives';

describe('holeSetFor', () => {
  it('returns a drill index in catalogue order with short engraving labels', () => {
    const set = holeSetFor('metric-basic', []);
    expect(set.mode).toBe('set');
    expect(set.items.map((i) => i.mm)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(set.items[0].label).toBe('1');
  });

  it('returns custom diameters as a labelled round set', () => {
    const set = holeSetFor('custom', [2.5, 3, 4]);
    expect(set).toMatchObject({ shape: 'round', mode: 'set' });
    expect(set.items.map((i) => i.mm)).toEqual([2.5, 3, 4]);
    expect(set.items.map((i) => i.label)).toEqual(['2.5', '3', '4']);
  });

  it('sizes hex sets across flats', () => {
    expect(BIT_SETS['hex-metric']).toMatchObject({ shape: 'hex', mode: 'set' });
    expect(BIT_SETS['hex-bit-quarter'].items[0].mm).toBeCloseTo(6.35, 5);
  });
});

describe('BIT_SETS', () => {
  const sets = Object.values(BIT_SETS);

  it('fill sets repeat exactly one item', () => {
    for (const s of sets.filter((s) => s.mode === 'fill')) expect(s.items).toHaveLength(1);
  });

  it('every set suggests a positive hole depth and has items', () => {
    for (const s of sets) {
      expect(s.depth).toBeGreaterThan(0);
      expect(s.items.length).toBeGreaterThan(0);
    }
  });

  it('keeps the legacy 18650 ×8 id loadable, as the same cell as 18650', () => {
    expect(BIT_SETS['battery-18650-8'].legacy).toBe(true);
    expect(BIT_SETS['battery-18650-8'].items).toEqual(BIT_SETS['battery-18650-4'].items);
  });
});

describe('layoutHoles', () => {
  const within = (p: { x: number; y: number }, half: number, w: number, d: number) =>
    Math.abs(p.x) + half <= w / 2 + 1e-6 && Math.abs(p.y) + half <= d / 2 + 1e-6;

  it('places a set in reading order: left to right, then the next row toward the front', () => {
    const widths = Array(8).fill(10);
    const { placed, dropped } = layoutHoles({ mode: 'set', widths }, 50, 40, 2);
    expect(dropped).toBe(0);
    expect(placed.map((p) => p.item)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(placed[1].x).toBeGreaterThan(placed[0].x);
    expect(placed[4].y).toBeLessThan(placed[3].y);
    for (const p of placed) expect(within(p, 5, 50, 40)).toBe(true);
  });

  it('puts each label under its hole and widens cells to fit long labels', () => {
    const { placed } = layoutHoles({ mode: 'set', widths: [2, 2], labelWidths: [9, 9] }, 60, 30, 2);
    expect(placed[0].label!.y).toBeLessThan(placed[0].y);
    expect(placed[0].label!.x).toBeCloseTo(placed[0].x);
    expect(placed[1].x - placed[0].x).toBeCloseTo(9 + 2);
  });

  it('drops whole rows that do not fit, and reports them', () => {
    const { placed, dropped } = layoutHoles({ mode: 'set', widths: Array(20).fill(10) }, 50, 22, 2);
    expect(placed).toHaveLength(8);
    expect(dropped).toBe(12);
  });

  it('fills with staggered rows when that holds more than a square grid', () => {
    // 77.5 × 77.5 with 15 mm holes: a 4 × 4 grid holds 16; staggered rows hold more.
    const { placed } = layoutHoles({ mode: 'fill', widths: [15] }, 77.5, 77.5, 2);
    expect(placed.length).toBeGreaterThan(16);
    for (const p of placed) expect(within(p, 7.5, 77.5, 77.5)).toBe(true);
  });
});
