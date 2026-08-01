import type { GridSpec, ModelParams } from '@/lib/params/schema';

export type MeshData = {
  vertices: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
};

export type BuildStats = {
  placedHoles?: number;
  droppedHoles?: number;
  /** Volume of the part in cubic mm. */
  volumeMm3?: number;
  /** Surface area of the part in square mm. */
  surfaceMm2?: number;
};

export type GeometryRequest = {
  model: ModelParams;
  spec: GridSpec;
};

export type Bbox = {
  min: [number, number, number];
  max: [number, number, number];
};

export type GeometryResponse =
  | {
      ok: true;
      mesh: MeshData;
      bbox: Bbox;
      stats?: BuildStats;
    }
  | { ok: false; error: string };

export type ExportFormat = 'stl' | '3mf' | 'step';

export interface GeometryWorkerApi {
  build(request: GeometryRequest): Promise<GeometryResponse>;
  exportStl(request: GeometryRequest): Promise<ArrayBuffer>;
  exportThreeMf(request: GeometryRequest): Promise<ArrayBuffer>;
  exportStep(request: GeometryRequest): Promise<ArrayBuffer>;
}
