import type { MeshData } from './types';

/**
 * Exports a triangle mesh as an ISO 10303-21 (STEP AP203) file using
 * FACETED_BREP — a compact, universally supported tessellated solid format.
 *
 * Entity layout:
 *   #1–#16              fixed header / product / context entities
 *   #BASE … +V-1        CARTESIAN_POINT per vertex  (V = vertCount)
 *   #BASE+V … +2V-1     VERTEX_POINT per vertex
 *   #BASE+2V + t*7 + 0  POLY_LOOP        for triangle t
 *   #BASE+2V + t*7 + 1  FACE_OUTER_BOUND for triangle t
 *   #BASE+2V + t*7 + 2  DIRECTION (normal)
 *   #BASE+2V + t*7 + 3  DIRECTION (reference)
 *   #BASE+2V + t*7 + 4  AXIS2_PLACEMENT_3D
 *   #BASE+2V + t*7 + 5  PLANE
 *   #BASE+2V + t*7 + 6  FACE_SURFACE
 */
export function meshToStep(mesh: MeshData, partName: string): ArrayBuffer {
  const { vertices, indices, triangleCount } = mesh;
  const vertCount = vertices.length / 3;

  const BASE = 17;
  const cpId = (i: number) => BASE + i;
  const vpId = (i: number) => BASE + vertCount + i;
  const tb   = (t: number) => BASE + 2 * vertCount + t * 7;

  const lines: string[] = [];
  const w = (s: string) => lines.push(s);
  const f = (n: number) => n.toFixed(6);

  const now  = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const safe = partName.replace(/['"\\]/g, '');

  // ── FILE HEADER ──────────────────────────────────────────────────────────
  w('ISO-10303-21;');
  w('HEADER;');
  w(`FILE_DESCRIPTION(('Gridsmith STEP export'),'2;1');`);
  w(`FILE_NAME('${safe}.step','${now}',(''),(''),'Gridsmith','','');`);
  w(`FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));`);
  w('ENDSEC;');
  w('DATA;');

  // ── PRODUCT / CONTEXT ENTITIES (#1–#14) ──────────────────────────────────
  w(`#1=APPLICATION_CONTEXT('configuration control design');`);
  w(`#2=APPLICATION_PROTOCOL_DEFINITION('draft international standard','configuration_control_design',1994,#1);`);
  w(`#3=PRODUCT_CONTEXT('',#1,'mechanical');`);
  w(`#4=PRODUCT('${safe}','${safe}','',(#3));`);
  w(`#5=PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',#4,.NOT_KNOWN.);`);
  w(`#6=DESIGN_CONTEXT('',#1,'design');`);
  w(`#7=PRODUCT_DEFINITION('design','',#5,#6);`);
  w(`#8=PRODUCT_DEFINITION_SHAPE('','',#7);`);
  w(`#9=(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNIT_ASSIGNED_CONTEXT((#10,#11,#12)) REPRESENTATION_CONTEXT('Context #1','3D Context'));`);
  w(`#10=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.));`);
  w(`#11=(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.));`);
  w(`#12=(NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT());`);
  w(`#13=SHAPE_DEFINITION_REPRESENTATION(#8,#14);`);
  w(`#14=SHAPE_REPRESENTATION('',(#15),#9);`);

  // ── BREP SHELL (#15, #16) — forward-references face surfaces ─────────────
  const faceSurfRefs = Array.from({ length: triangleCount }, (_, t) => `#${tb(t) + 6}`).join(',');
  w(`#15=FACETED_BREP('',#16);`);
  w(`#16=CLOSED_SHELL('',(${faceSurfRefs}));`);

  // ── VERTICES ─────────────────────────────────────────────────────────────
  for (let i = 0; i < vertCount; i++) {
    w(`#${cpId(i)}=CARTESIAN_POINT('',(${f(vertices[i*3])},${f(vertices[i*3+1])},${f(vertices[i*3+2])}));`);
  }
  for (let i = 0; i < vertCount; i++) {
    w(`#${vpId(i)}=VERTEX_POINT('',#${cpId(i)});`);
  }

  // ── TRIANGLES ─────────────────────────────────────────────────────────────
  for (let t = 0; t < triangleCount; t++) {
    const b  = tb(t);
    const i0 = indices[t * 3];
    const i1 = indices[t * 3 + 1];
    const i2 = indices[t * 3 + 2];

    // Edge vectors
    const x0 = vertices[i0*3], y0 = vertices[i0*3+1], z0 = vertices[i0*3+2];
    const ex  = vertices[i1*3] - x0, ey = vertices[i1*3+1] - y0, ez = vertices[i1*3+2] - z0;
    const fx  = vertices[i2*3] - x0, fy = vertices[i2*3+1] - y0, fz = vertices[i2*3+2] - z0;

    // Outward normal via cross product
    let nx = ey*fz - ez*fy, ny = ez*fx - ex*fz, nz = ex*fy - ey*fx;
    const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz);
    if (nlen > 1e-10) { nx /= nlen; ny /= nlen; nz /= nlen; } else { nz = 1; }

    // Reference direction perpendicular to normal (Gram-Schmidt)
    let rx = Math.abs(nx) < 0.9 ? 1 : 0;
    let ry = Math.abs(nx) < 0.9 ? 0 : 1;
    let rz = 0;
    const dot = rx*nx + ry*ny; // rz=0 so dot is rx*nx+ry*ny+0
    rx -= dot*nx; ry -= dot*ny; rz = -dot*nz;
    const rlen = Math.sqrt(rx*rx + ry*ry + rz*rz);
    if (rlen > 1e-10) { rx /= rlen; ry /= rlen; rz /= rlen; }

    w(`#${b  }=POLY_LOOP('',(#${vpId(i0)},#${vpId(i1)},#${vpId(i2)}));`);
    w(`#${b+1}=FACE_OUTER_BOUND('',#${b},.T.);`);
    w(`#${b+2}=DIRECTION('',(${f(nx)},${f(ny)},${f(nz)}));`);
    w(`#${b+3}=DIRECTION('',(${f(rx)},${f(ry)},${f(rz)}));`);
    w(`#${b+4}=AXIS2_PLACEMENT_3D('',#${cpId(i0)},#${b+2},#${b+3});`);
    w(`#${b+5}=PLANE('',#${b+4});`);
    w(`#${b+6}=FACE_SURFACE('',(#${b+1}),#${b+5},.T.);`);
  }

  w('ENDSEC;');
  w('END-ISO-10303-21;');

  return new TextEncoder().encode(lines.join('\n') + '\n').buffer;
}
