import type { MeshData } from './types';

/**
 * Write a mesh to a binary STL ArrayBuffer.
 * Format: 80-byte header, uint32 triangle count, then per-triangle:
 *   3 floats normal + 9 floats vertices + uint16 attribute byte count.
 */
export function meshToBinaryStl(mesh: MeshData): ArrayBuffer {
  const triCount = mesh.triangleCount;
  const bufferSize = 84 + triCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  const header = new TextEncoder().encode('Gridsmith STL export');
  new Uint8Array(buffer, 0, 80).set(header.subarray(0, Math.min(80, header.length)));
  view.setUint32(80, triCount, true);

  let offset = 84;
  const v = mesh.vertices;
  const i = mesh.indices;

  for (let t = 0; t < triCount; t++) {
    const a = i[t * 3] * 3;
    const b = i[t * 3 + 1] * 3;
    const c = i[t * 3 + 2] * 3;

    const ax = v[a], ay = v[a + 1], az = v[a + 2];
    const bx = v[b], by = v[b + 1], bz = v[b + 2];
    const cx = v[c], cy = v[c + 1], cz = v[c + 2];

    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const wx = cx - ax, wy = cy - ay, wz = cz - az;
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    view.setFloat32(offset, ax, true); offset += 4;
    view.setFloat32(offset, ay, true); offset += 4;
    view.setFloat32(offset, az, true); offset += 4;

    view.setFloat32(offset, bx, true); offset += 4;
    view.setFloat32(offset, by, true); offset += 4;
    view.setFloat32(offset, bz, true); offset += 4;

    view.setFloat32(offset, cx, true); offset += 4;
    view.setFloat32(offset, cy, true); offset += 4;
    view.setFloat32(offset, cz, true); offset += 4;

    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}

export function downloadBlob(data: BlobPart, filename: string, mime = 'application/octet-stream') {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
