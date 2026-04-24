import * as Comlink from 'comlink';
import { getManifold } from './manifold';
import { buildBaseplate, buildBin } from '@/lib/gridfinity/primitives';
import { buildSpec } from '@/lib/gridfinity/spec';
import { meshToBinaryStl } from './stl';
import type { GeometryRequest, GeometryResponse, GeometryWorkerApi, MeshData } from './types';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';

async function buildManifold(request: GeometryRequest): Promise<{ m: ManifoldToplevel; result: Manifold }> {
  const m = await getManifold();
  const spec = buildSpec(request.spec.gridUnit, request.spec.heightUnit);
  const result = request.model.kind === 'baseplate'
    ? buildBaseplate(m, spec, request.model)
    : buildBin(m, spec, request.model);
  return { m, result };
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
      const { result } = await buildManifold(request);
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
