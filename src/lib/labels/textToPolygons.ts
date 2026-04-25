import type * as opentype from 'opentype.js';

export type Polygon = Array<[number, number]>;

const BEZIER_STEPS = 12;

function quadAt(t: number, p0: number, p1: number, p2: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

function cubicAt(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/**
 * Convert an opentype.js Path into a list of closed contours, flattening any
 * Béziers into short line segments. The returned polygons are in font-unit
 * coordinates (Y-up), centred horizontally on the supplied originX.
 */
function pathToPolygons(path: opentype.Path): Polygon[] {
  const polys: Polygon[] = [];
  let current: Polygon = [];
  let cx = 0;
  let cy = 0;

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M': {
        if (current.length > 0) polys.push(current);
        current = [[cmd.x, cmd.y]];
        cx = cmd.x;
        cy = cmd.y;
        break;
      }
      case 'L': {
        current.push([cmd.x, cmd.y]);
        cx = cmd.x;
        cy = cmd.y;
        break;
      }
      case 'Q': {
        for (let i = 1; i <= BEZIER_STEPS; i++) {
          const t = i / BEZIER_STEPS;
          current.push([quadAt(t, cx, cmd.x1, cmd.x), quadAt(t, cy, cmd.y1, cmd.y)]);
        }
        cx = cmd.x;
        cy = cmd.y;
        break;
      }
      case 'C': {
        for (let i = 1; i <= BEZIER_STEPS; i++) {
          const t = i / BEZIER_STEPS;
          current.push([
            cubicAt(t, cx, cmd.x1, cmd.x2, cmd.x),
            cubicAt(t, cy, cmd.y1, cmd.y2, cmd.y),
          ]);
        }
        cx = cmd.x;
        cy = cmd.y;
        break;
      }
      case 'Z': {
        if (current.length > 0) {
          if (
            current[0][0] !== current[current.length - 1][0] ||
            current[0][1] !== current[current.length - 1][1]
          ) {
            current.push([current[0][0], current[0][1]]);
          }
          polys.push(current);
          current = [];
        }
        break;
      }
    }
  }
  if (current.length > 0) polys.push(current);

  return polys;
}

/**
 * Render `text` to a list of polygons, sized so the cap-height equals
 * heightMm. Polygons are centred on (0, 0) in mm, ready to feed Manifold.
 */
export function textToPolygons(
  font: opentype.Font,
  text: string,
  heightMm: number,
): Polygon[] {
  if (!text || heightMm <= 0) return [];

  const unitsPerEm = font.unitsPerEm;
  const ascender = font.ascender;
  const descender = font.descender;
  const referenceHeight = ascender - descender;
  const fontSize = (heightMm / referenceHeight) * unitsPerEm;
  const scale = fontSize / unitsPerEm;

  const polys: Polygon[] = [];
  let cursorX = 0;

  const glyphs = font.stringToGlyphs(text);
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const path = glyph.getPath(cursorX, 0, fontSize);
    const glyphPolys = pathToPolygons(path);
    for (const p of glyphPolys) polys.push(p);

    cursorX += (glyph.advanceWidth ?? 0) * scale;
    if (i + 1 < glyphs.length) {
      const kerning = font.getKerningValue(glyph, glyphs[i + 1]);
      if (kerning) cursorX += kerning * scale;
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of polys) {
    for (const [x, y] of p) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) return [];

  const dx = -(minX + maxX) / 2;
  const dy = -(minY + maxY) / 2;

  return polys.map((p) => p.map(([x, y]): [number, number] => [x + dx, -(y + dy)]));
}
