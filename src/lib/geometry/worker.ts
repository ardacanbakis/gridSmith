import * as Comlink from 'comlink';
import { getManifold } from './manifold';
import {
  buildBaseplate,
  buildBin,
  buildDrillBitHolder,
  buildLid,
  buildScrewOrganizer,
  buildPartsTray,
  type LabelTextData,
} from '@/lib/gridfinity/primitives';
import { getLabelFont } from '@/lib/labels/font';
import { textToPolygons } from '@/lib/labels/textToPolygons';
import type { LabelStyle } from '@/lib/params/schema';
import { buildSpec } from '@/lib/gridfinity/spec';
import { bitsForSet } from '@/lib/gridfinity/bitSets';
import { meshToBinaryStl } from './stl';
import { meshTo3mf } from './threeMf';
import { meshToStep } from './step';
import type { GeometryRequest, GeometryResponse, GeometryWorkerApi, MeshData, BuildStats } from './types';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';

async function maybeBuildLabelText(
  style: LabelStyle,
  text: string,
  heightMm: number,
  depth: number,
): Promise<LabelTextData | undefined> {
  if (style !== 'embossText' && style !== 'engraveText') return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const font = await getLabelFont();
  const polygons = textToPolygons(font, trimmed, heightMm);
  if (polygons.length === 0) return undefined;
  return { polygons, depth };
}

async function maybeBuildCompartmentLabels(
  style: 'none' | 'emboss' | 'engrave',
  labels: ReadonlyArray<string>,
  cols: number,
  heightMm: number,
): Promise<ReadonlyArray<ReadonlyArray<import('@/lib/labels/textToPolygons').Polygon>> | undefined> {
  if (style === 'none') return undefined;
  if (labels.every((s) => !s.trim())) return undefined;
  const font = await getLabelFont();
  const out: Array<ReadonlyArray<import('@/lib/labels/textToPolygons').Polygon>> = [];
  for (let i = 0; i < cols; i++) {
    const text = (labels[i] ?? '').trim();
    out.push(text ? textToPolygons(font, text, heightMm) : []);
  }
  return out;
}

async function buildManifold(request: GeometryRequest): Promise<{
  m: ManifoldToplevel;
  result: Manifold;
  stats?: BuildStats;
}> {
  const m = await getManifold();
  const spec = buildSpec(request.spec.gridUnit, request.spec.heightUnit);

  if (request.model.kind === 'baseplate') {
    return { m, result: buildBaseplate(m, spec, request.model) };
  }
  if (request.model.kind === 'bin') {
    const labelText = await maybeBuildLabelText(
      request.model.labelStyle,
      request.model.labelText,
      request.model.labelHeight,
      request.model.labelDepth,
    );
    return { m, result: buildBin(m, spec, { ...request.model, labelText }) };
  }
  if (request.model.kind === 'screwOrganizer') {
    const labelText = await maybeBuildLabelText(
      request.model.labelStyle,
      request.model.labelText,
      request.model.labelHeight,
      request.model.labelDepth,
    );
    const compartmentLabelPolygons = await maybeBuildCompartmentLabels(
      request.model.compartmentLabelStyle,
      request.model.compartmentLabels,
      request.model.cols,
      request.model.compartmentLabelHeight,
    );
    return {
      m,
      result: buildScrewOrganizer(m, spec, {
        ...request.model,
        labelText,
        compartmentLabelPolygons,
      }),
    };
  }

  if (request.model.kind === 'partsTray') {
    return { m, result: buildPartsTray(m, spec, request.model) };
  }

  if (request.model.kind === 'lid') {
    return { m, result: buildLid(m, spec, request.model) };
  }

  const bits = bitsForSet(request.model.bitSet, request.model.customBits);
  const { result, placed, dropped } = buildDrillBitHolder(m, spec, {
    ...request.model,
    bits,
  });
  return {
    m,
    result,
    stats: { placedHoles: placed, droppedHoles: dropped },
  };
}

function toMeshData(manifold: Manifold): MeshData {
  const mesh = manifold.getMesh();
  const numProp = mesh.numProp;

  let vertices: Float32Array;
  if (numProp === 3) {
    vertices = new Float32Array(mesh.vertProperties);
  } else {
    const vertCount = mesh.vertProperties.length / numProp;
    vertices = new Float32Array(vertCount * 3);
    for (let i = 0; i < vertCount; i++) {
      vertices[i * 3] = mesh.vertProperties[i * numProp];
      vertices[i * 3 + 1] = mesh.vertProperties[i * numProp + 1];
      vertices[i * 3 + 2] = mesh.vertProperties[i * numProp + 2];
    }
  }

  return {
    vertices,
    indices: new Uint32Array(mesh.triVerts),
    triangleCount: mesh.triVerts.length / 3,
  };
}

const api: GeometryWorkerApi = {
  async build(request: GeometryRequest): Promise<GeometryResponse> {
    try {
      const { result, stats } = await buildManifold(request);
      const mesh = toMeshData(result);
      const box = result.boundingBox();
      const volumeMm3 = result.volume();
      const surfaceMm2 = result.surfaceArea();
      result.delete();
      return {
        ok: true,
        mesh,
        bbox: {
          min: [box.min[0], box.min[1], box.min[2]],
          max: [box.max[0], box.max[1], box.max[2]],
        },
        stats: { ...stats, volumeMm3, surfaceMm2 },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async exportStl(request: GeometryRequest): Promise<ArrayBuffer> {
    const { result } = await buildManifold(request);
    const mesh = toMeshData(result);
    result.delete();
    return meshToBinaryStl(mesh);
  },

  async exportThreeMf(request: GeometryRequest): Promise<ArrayBuffer> {
    const { result } = await buildManifold(request);
    const mesh = toMeshData(result);
    result.delete();
    return meshTo3mf(mesh, `gridsmith-${request.model.kind}`);
  },

  async exportStep(request: GeometryRequest): Promise<ArrayBuffer> {
    const { result } = await buildManifold(request);
    const mesh = toMeshData(result);
    result.delete();
    return meshToStep(mesh, `gridsmith-${request.model.kind}`);
  },
};

Comlink.expose(api);
