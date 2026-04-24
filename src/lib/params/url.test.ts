import { describe, expect, it } from 'vitest';
import { encodeDesign, decodeDesign } from './url';
import { DEFAULT_DESIGN, BinParamsSchema } from './schema';

describe('design url round-trip', () => {
  it('encodes and decodes the default design', () => {
    const enc = encodeDesign(DEFAULT_DESIGN);
    const dec = decodeDesign(enc);
    expect(dec).toEqual(DEFAULT_DESIGN);
  });

  it('preserves bin parameters with edits', () => {
    const design = {
      ...DEFAULT_DESIGN,
      model: BinParamsSchema.parse({
        kind: 'bin',
        cellsX: 3,
        cellsY: 2,
        heightUnits: 6,
        magnetHoles: true,
      }),
    };
    const dec = decodeDesign(encodeDesign(design));
    expect(dec).toEqual(design);
  });

  it('returns null for garbage input', () => {
    expect(decodeDesign('not-a-real-encoded-string')).toBeNull();
  });
});
