import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import type { Polygon } from './textToPolygons';

export type TextLabelOptions = {
  /** Polygons in mm, centred on (0, 0). */
  polygons: ReadonlyArray<Polygon>;
  /** How much the text protrudes from / cuts into the surface. */
  depth: number;
};

/**
 * Build a Manifold of the embossed/engraved text, centred at the origin in
 * the XY plane and extruded along +Z. Caller is responsible for rotating
 * and translating it onto the target surface.
 */
export function buildTextManifold(
  m: ManifoldToplevel,
  opts: TextLabelOptions,
): Manifold | null {
  if (opts.polygons.length === 0 || opts.depth <= 0) return null;

  const contours = opts.polygons.map((p) => p.map(([x, y]): [number, number] => [x, y]));
  const cs = m.CrossSection.ofPolygons(contours, 'EvenOdd');
  return cs.extrude(opts.depth);
}
