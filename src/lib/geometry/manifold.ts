import Module from 'manifold-3d';
import type { ManifoldToplevel } from 'manifold-3d';

let modulePromise: Promise<ManifoldToplevel> | null = null;

export async function getManifold(): Promise<ManifoldToplevel> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const wasm = await Module();
      wasm.setup();
      return wasm;
    })();
  }
  return modulePromise;
}
