import * as Comlink from 'comlink';
import { getManifold } from './manifold';
import { buildBaseplate, buildBin, buildDrillBitHolder } from '@/lib/gridfinity/primitives';
import { buildSpec } from '@/lib/gridfinity/spec';
import { bitsForSet } from '@/lib/gridfinity/bitSets';
import { meshToBinaryStl } from './stl';
import type { GeometryRequest, GeometryResponse, GeometryWorkerApi, MeshData, BuildStats } from './types';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';

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
    return { m, result: buildBin(m, spec, request.model) };
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
      result.delete();
      return {
        ok: true,
        mesh,
        bbox: {
          min: [box.min[0], box.min[1], box.min[2]],
          max: [box.max[0], box.max[1], box.max[2]],
        },
        stats,
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
};

Comlink.expose(api);
