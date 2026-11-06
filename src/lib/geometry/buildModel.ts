import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import type * as opentype from 'opentype.js';
import {
  buildBaseplate,
  buildBin,
  buildDrillBitHolder,
  buildLid,
  buildScrewOrganizer,
  buildPartsTray,
  HOLE_LABEL_HEIGHT,
  type LabelTextData,
} from '@/lib/gridfinity/primitives';
import { textToPolygons, type Polygon } from '@/lib/labels/textToPolygons';
import type { LabelStyle } from '@/lib/params/schema';
import { buildSpec } from '@/lib/gridfinity/spec';
import { holeSetFor } from '@/lib/gridfinity/bitSets';
import type { BuildStats, GeometryRequest } from './types';

/** Supplies the label font; the worker fetches it, tests read it from disk. */
export type FontLoader = () => Promise<opentype.Font>;

async function maybeBuildLabelText(
  loadFont: FontLoader,
  style: LabelStyle,
  text: string,
  heightMm: number,
  depth: number,
): Promise<LabelTextData | undefined> {
  if (style !== 'embossText' && style !== 'engraveText') return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const polygons = textToPolygons(await loadFont(), trimmed, heightMm);
  if (polygons.length === 0) return undefined;
  return { polygons, depth };
}

async function maybeBuildCompartmentLabels(
  loadFont: FontLoader,
  style: 'none' | 'emboss' | 'engrave',
  labels: ReadonlyArray<string>,
  cols: number,
  heightMm: number,
): Promise<ReadonlyArray<ReadonlyArray<Polygon>> | undefined> {
  if (style === 'none') return undefined;
  if (labels.every((s) => !s.trim())) return undefined;
  const font = await loadFont();
  const out: Array<ReadonlyArray<Polygon>> = [];
  for (let i = 0; i < cols; i++) {
    const text = (labels[i] ?? '').trim();
    out.push(text ? textToPolygons(font, text, heightMm) : []);
  }
  return out;
}

/** Build the solid for a design. The caller owns (and must delete) the returned manifold. */
export async function buildModel(
  m: ManifoldToplevel,
  request: GeometryRequest,
  loadFont: FontLoader,
): Promise<{ result: Manifold; stats?: BuildStats }> {
  const spec = buildSpec(request.spec.gridUnit, request.spec.heightUnit);
  const model = request.model;

  if (model.kind === 'baseplate') {
    return { result: buildBaseplate(m, spec, model) };
  }
  if (model.kind === 'bin') {
    const labelText = await maybeBuildLabelText(
      loadFont, model.labelStyle, model.labelText, model.labelHeight, model.labelDepth,
    );
    return { result: buildBin(m, spec, { ...model, labelText }) };
  }
  if (model.kind === 'screwOrganizer') {
    const labelText = await maybeBuildLabelText(
      loadFont, model.labelStyle, model.labelText, model.labelHeight, model.labelDepth,
    );
    const compartmentLabelPolygons = await maybeBuildCompartmentLabels(
      loadFont, model.compartmentLabelStyle, model.compartmentLabels, model.cols, model.compartmentLabelHeight,
    );
    return { result: buildScrewOrganizer(m, spec, { ...model, labelText, compartmentLabelPolygons }) };
  }
  if (model.kind === 'partsTray') {
    const { result, placed, dropped } = buildPartsTray(m, spec, model);
    return { result, stats: { placedHoles: placed, droppedHoles: dropped } };
  }
  if (model.kind === 'lid') {
    return { result: buildLid(m, spec, model) };
  }

  const holes = holeSetFor(model.bitSet, model.customBits);
  let labelPolygons: Polygon[][] | undefined;
  if (model.holeLabels && holes.mode === 'set') {
    const font = await loadFont();
    labelPolygons = holes.items.map((it) => textToPolygons(font, it.label, HOLE_LABEL_HEIGHT));
  }
  const { result, placed, dropped } = buildDrillBitHolder(m, spec, { ...model, holes, labelPolygons });
  return { result, stats: { placedHoles: placed, droppedHoles: dropped } };
}
