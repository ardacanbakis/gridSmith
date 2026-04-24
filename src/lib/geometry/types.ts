import type { GridSpec, ModelParams } from '@/lib/params/schema';

export type MeshData = {
  vertices: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
};

export type GeometryRequest = {
  model: ModelParams;
  spec: GridSpec;
};

export type GeometryResponse =
  | { ok: true; mesh: MeshData; bbox: { min: [number, number, number]; max: [number, number, number] } }
  | { ok: false; error: string };

export interface GeometryWorkerApi {
  build(request: GeometryRequest): Promise<GeometryResponse>;
  exportStl(request: GeometryRequest): Promise<ArrayBuffer>;
}
