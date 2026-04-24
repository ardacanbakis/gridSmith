import * as Comlink from 'comlink';
import { getManifold } from './manifold';
import { buildBaseplate, buildBin } from '@/lib/gridfinity/primitives';
import type { ModelParams } from '@/lib/params/schema';
import { meshToBinaryStl } from './stl';
import type { GeometryRequest, GeometryResponse, GeometryWorkerApi, MeshData } from './types';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';

async function buildManifold(model: ModelParams): Promise<{ m: ManifoldToplevel; result: Manifold }> {
  const m = await getManifold();
  const result = model.kind === 'baseplate' ? buildBaseplate(m, model) : buildBin(m, model);
  return { m, result };
}

function toMeshData(manifold: Manifold): MeshData {
  const mesh = manifold.getMesh();
  return {
    vertices: new Float32Array(mesh.vertProperties),
    indices: new Uint32Array(mesh.triVerts),
    triangleCount: mesh.triVerts.length / 3,
  };
}

const api: GeometryWorkerApi = {
  async build(request: GeometryRequest): Promise<GeometryResponse> {
    try {
      const { result } = await buildManifold(request.model);
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
    const { result } = await buildManifold(request.model);
    const mesh = toMeshData(result);
    result.delete();
    return meshToBinaryStl(mesh);
  },
};

Comlink.expose(api);
