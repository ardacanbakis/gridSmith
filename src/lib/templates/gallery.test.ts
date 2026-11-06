import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as opentype from 'opentype.js';
import type { ManifoldToplevel } from 'manifold-3d';
import { getManifold } from '@/lib/geometry/manifold';
import { buildModel } from '@/lib/geometry/buildModel';
import { holeSetFor } from '@/lib/gridfinity/bitSets';
import { GALLERY_TEMPLATES, templateSpec } from './gallery';

let m: ManifoldToplevel;
let font: opentype.Font;

beforeAll(async () => {
  m = await getManifold();
  const buf = readFileSync('node_modules/@fontsource/inter/files/inter-latin-700-normal.woff');
  font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
});

/** Templates whose description promises a count; the geometry must deliver exactly that many. */
const PROMISED: Record<string, number> = {
  'qs-hex-bits': 30,
  'org-hex-bits': 30,
  'qs-sd-cards': 24,
  'tray-sd-card': 24,
  'tray-microsd': 18,
  'tray-coin-cell': 15,
  'tray-usb': 20,
  'tray-9v': 6,
  'tray-dice': 16,
  'tray-coin': 16,
  'tray-scoop-cups': 9,
  'tray-small-parts': 25,
  'qs-scoop-cups': 25,
};

describe('every gallery template builds through the app path', () => {
  it.each(GALLERY_TEMPLATES.map((t) => [t.id, t] as const))('%s', async (_, t) => {
    const { result, stats } = await buildModel(m, { model: t.model, spec: { gridUnit: 42, heightUnit: 7 } }, async () => font);
    expect(result.status()).toBe('NoError');
    expect(result.decompose()).toHaveLength(1);

    if (t.model.kind === 'drillBitHolder' || t.model.kind === 'partsTray') {
      // Nothing left out, nothing silently skipped for lack of height.
      expect(stats?.droppedHoles).toBe(0);
      expect(stats?.placedHoles).toBeGreaterThan(0);
      if (t.model.kind === 'drillBitHolder') {
        const set = holeSetFor(t.model.bitSet, t.model.customBits);
        if (set.mode === 'set') expect(stats?.placedHoles).toBe(set.items.length);
      }
      if (t.id in PROMISED) expect(stats?.placedHoles).toBe(PROMISED[t.id]);
      // The card's spec line agrees with the real geometry.
      expect(templateSpec(t.model)).toContain(String(stats?.placedHoles));
    }
    result.delete();
  });

  it('template ids are unique', () => {
    const ids = GALLERY_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
