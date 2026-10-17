// Sculpting from scratch: bodies are described as solid shapes (signed distance
// fields: blobs, tapered limbs, muscles blended smoothly into each other) and
// turned into a smooth triangle surface with naive surface nets.
import * as THREE from '../vendor/three.module.js';

// ---------------------------------------------------------------- shape kit (all return signed distance; < 0 inside)
export const sd = {
  sphere: (px, py, pz, cx, cy, cz, r) => Math.hypot(px - cx, py - cy, pz - cz) - r,
  // an ellipsoid (approximate distance, good enough for blending)
  ell: (px, py, pz, cx, cy, cz, rx, ry, rz) => {
    const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz, k0 = Math.hypot(x, y, z);
    const k1 = Math.hypot(x / rx, y / ry, z / rz);
    return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
  },
  // a capsule whose radius runs from ra at a to rb at b (a "round cone")
  cone: (px, py, pz, ax, ay, az, bx, by, bz, ra, rb) => {
    const bax = bx - ax, bay = by - ay, baz = bz - az, pax = px - ax, pay = py - ay, paz = pz - az;
    const l2 = bax * bax + bay * bay + baz * baz;
    let t = l2 > 0 ? (pax * bax + pay * bay + paz * baz) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(pax - bax * t, pay - bay * t, paz - baz * t) - (ra + (rb - ra) * t);
  },
  box: (px, py, pz, cx, cy, cz, hx, hy, hz, r) => {
    const qx = Math.abs(px - cx) - hx + r, qy = Math.abs(py - cy) - hy + r, qz = Math.abs(pz - cz) - hz + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  },
};
// smooth union / subtraction: k is how wide the blend is
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const ssub = (a, b, k) => -smin(-a, b, k);

// ---------------------------------------------------------------- surface nets
// f(x, y, z) -> distance. Returns a non-indexed BufferGeometry with smooth normals.
export function mesh(f, min, max, cell) {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const val = new Float32Array(nx * ny * nz), I = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[I(i, j, k)] = f(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);
  // one vertex per cell the surface passes through, at the average of its edge crossings
  const vid = new Int32Array(nx * ny * nz).fill(-1), vp = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) { v[c] = val[I(i + C[c][0], j + C[c][1], k + C[c][2])]; if (v[c] < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; n++;
    }
    vid[I(i, j, k)] = vp.length / 3;
    vp.push(min[0] + (i + sx / n) * cell, min[1] + (j + sy / n) * cell, min[2] + (k + sz / n) * cell);
  }
  // a quad across every grid edge the surface crosses
  const tris = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) tris.push(a, c, b, a, d, c); else tris.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {   // x edges
    const a = val[I(i, j, k)], b = val[I(i + 1, j, k)]; if ((a < 0) === (b < 0)) continue;
    quad(vid[I(i, j - 1, k - 1)], vid[I(i, j, k - 1)], vid[I(i, j, k)], vid[I(i, j - 1, k)], a < 0);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {   // y edges
    const a = val[I(i, j, k)], b = val[I(i, j + 1, k)]; if ((a < 0) === (b < 0)) continue;
    quad(vid[I(i - 1, j, k - 1)], vid[I(i - 1, j, k)], vid[I(i, j, k)], vid[I(i, j, k - 1)], a < 0);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {   // z edges
    const a = val[I(i, j, k)], b = val[I(i, j, k + 1)]; if ((a < 0) === (b < 0)) continue;
    quad(vid[I(i - 1, j - 1, k)], vid[I(i, j - 1, k)], vid[I(i, j, k)], vid[I(i - 1, j, k)], a < 0);
  }
  // normals from the field's gradient (smooth), then make every triangle face outward
  const nv = vp.length / 3, nrm = new Float32Array(nv * 3), e = cell * 0.5;
  for (let q = 0; q < nv; q++) {
    const x = vp[q * 3], y = vp[q * 3 + 1], z = vp[q * 3 + 2];
    let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1; nrm[q * 3] = gx / l; nrm[q * 3 + 1] = gy / l; nrm[q * 3 + 2] = gz / l;
  }
  const pos = new Float32Array(tris.length * 3), nor = new Float32Array(tris.length * 3);
  for (let t = 0; t < tris.length; t += 3) {
    let [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    const ux = vp[b * 3] - vp[a * 3], uy = vp[b * 3 + 1] - vp[a * 3 + 1], uz = vp[b * 3 + 2] - vp[a * 3 + 2];
    const wx = vp[c * 3] - vp[a * 3], wy = vp[c * 3 + 1] - vp[a * 3 + 1], wz = vp[c * 3 + 2] - vp[a * 3 + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    if (fx * (nrm[a * 3] + nrm[b * 3] + nrm[c * 3]) + fy * (nrm[a * 3 + 1] + nrm[b * 3 + 1] + nrm[c * 3 + 1]) + fz * (nrm[a * 3 + 2] + nrm[b * 3 + 2] + nrm[c * 3 + 2]) < 0) [b, c] = [c, b];
    for (const [o, q] of [[0, a], [1, b], [2, c]]) for (let d = 0; d < 3; d++) { pos[(t + o) * 3 + d] = vp[q * 3 + d]; nor[(t + o) * 3 + d] = nrm[q * 3 + d]; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}

// Texture coordinates. Cylindrical round a limb's length (front of the body at
// u = 0.5), or spherical for a head (face at u = 0.25, matching the painted faces).
export function uvCylinder(g, len) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = Math.atan2(p.getX(i), p.getZ(i)) / (Math.PI * 2) + 0.5; uv[i * 2 + 1] = p.getY(i) / len; }
  fixSeam(uv); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
export function uvSphere(g, cy = 0) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) - cy, z = p.getZ(i), r = Math.hypot(x, y, z) || 1;
    let phi = Math.atan2(z, -x); if (phi < 0) phi += Math.PI * 2;
    uv[i * 2] = phi / (Math.PI * 2); uv[i * 2 + 1] = 1 - Math.acos(Math.max(-1, Math.min(1, y / r))) / Math.PI;
  }
  fixSeam(uv); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
// a triangle straddling the u = 0/1 seam would smear the whole texture across it
function fixSeam(uv) {
  for (let t = 0; t < uv.length; t += 6) {
    const a = uv[t], b = uv[t + 2], c = uv[t + 4];
    if (Math.max(a, b, c) - Math.min(a, b, c) > 0.5) for (const o of [0, 2, 4]) if (uv[t + o] < 0.5) uv[t + o] += 1;
  }
}
