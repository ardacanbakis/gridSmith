import * as Comlink from 'comlink';
import GeometryWorker from './worker?worker';
import type { GeometryWorkerApi } from './types';

let cached: Comlink.Remote<GeometryWorkerApi> | null = null;

export function getWorker(): Comlink.Remote<GeometryWorkerApi> {
  if (!cached) {
    const worker = new GeometryWorker();
    cached = Comlink.wrap<GeometryWorkerApi>(worker);
  }
  return cached;
}
