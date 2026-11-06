import * as Comlink from 'comlink';
import { getManifold } from './manifold';
import { buildModel } from './buildModel';
import { getLabelFont } from '@/lib/labels/font';
import { meshToBinaryStl } from './stl';
import { meshTo3mf } from './threeMf';
import { meshToStep } from './step';
import type { GeometryRequest, GeometryResponse, GeometryWorkerApi, MeshData } from './types';
import type { Manifold } from 'manifold-3d';

async function buildManifold(request: GeometryRequest) {
  return buildModel(await getManifold(), request, getLabelFont);
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
