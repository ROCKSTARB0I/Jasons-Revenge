// Mesh cutting: split a mesh along a plane wherever the blade went. Every
// triangle the plane crosses is cut in two, the open edges are chained into
// loops, and each loop is capped with a cross-section (skin, fat, muscle, bone).
import * as THREE from '../vendor/three.module.js';

const EPS = 1e-6;
// g: non-indexed geometry (position, normal, uv; may already have a cap group).
// plane in the geometry's own space: n (unit), d -> side = n·p - d.
// Returns { front, back } geometries (front: n·p > d); either may be null.
// Each has two groups: 0 = surface, 1 = cap. cap: add caps (false for cloth).
export function sliceGeometry(g, n, d, cap = true) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv?.array;
  // remember which triangles were already cap (from an earlier cut)
  const capStart = g.groups.length > 1 ? g.groups[1].start : Infinity;
  const out = [mk(), mk()];   // 0 front, 1 back
  const segs = [];            // cut edges, for the cap
  const side = i => n.x * P[i * 3] + n.y * P[i * 3 + 1] + n.z * P[i * 3 + 2] - d;
  const vert = (i) => ({ p: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], n: [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], u: U ? [U[i * 2], U[i * 2 + 1]] : [0, 0] });
  const lerp = (a, b, t) => ({ p: a.p.map((v, k) => v + (b.p[k] - v) * t), n: a.n.map((v, k) => v + (b.n[k] - v) * t), u: a.u.map((v, k) => v + (b.u[k] - v) * t) });
  const count = P.length / 3;
  for (let t = 0; t < count; t += 3) {
    const isCap = t >= capStart;
    const vs = [vert(t), vert(t + 1), vert(t + 2)], s = [side(t), side(t + 1), side(t + 2)];
    const pos = s.map(x => x > EPS), neg = s.map(x => x < -EPS);
    if (!neg[0] && !neg[1] && !neg[2]) { push(out[0], vs, isCap); continue; }
    if (!pos[0] && !pos[1] && !pos[2]) { push(out[1], vs, isCap); continue; }
    // the lone vertex on one side, the other two on the other
    let lone = -1;
    for (let k = 0; k < 3; k++) { const o1 = (k + 1) % 3, o2 = (k + 2) % 3; if ((s[k] > 0) !== (s[o1] > 0) && (s[k] > 0) !== (s[o2] > 0)) lone = k; }
    if (lone < 0) { push(out[s[0] + s[1] + s[2] > 0 ? 0 : 1], vs, isCap); continue; }
    const a = vs[lone], b = vs[(lone + 1) % 3], c = vs[(lone + 2) % 3], sa = s[lone], sb = s[(lone + 1) % 3], sc = s[(lone + 2) % 3];
    const ab = lerp(a, b, sa / (sa - sb)), ac = lerp(a, c, sa / (sa - sc));
    const loneOut = out[sa > 0 ? 0 : 1], pairOut = out[sa > 0 ? 1 : 0];
    push(loneOut, [a, ab, ac], isCap);
    push(pairOut, [ab, b, c], isCap); push(pairOut, [ab, c, ac], isCap);
    if (!isCap) segs.push([ab.p, ac.p]);
  }
  if (cap && segs.length) for (const loop of loops(segs)) capLoop(loop, n, out);
  return { front: build(out[0]), back: build(out[1]) };
}
function mk() { return { surf: { p: [], n: [], u: [] }, cap: { p: [], n: [], u: [] } }; }
function push(o, vs, isCap) { const t = isCap ? o.cap : o.surf; for (const v of vs) { t.p.push(...v.p); t.n.push(...v.n); t.u.push(...v.u); } }
function build(o) {
  const ns = o.surf.p.length / 3, nc = o.cap.p.length / 3;
  if (ns + nc === 0) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...o.surf.p, ...o.cap.p], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([...o.surf.n, ...o.cap.n], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([...o.surf.u, ...o.cap.u], 2));
  g.addGroup(0, ns, 0); g.addGroup(ns, nc, 1);
  g.computeBoundingSphere();
  return g;
}
// chain cut edges into closed loops (endpoints matched by distance)
function loops(segs) {
  const key = p => p.map(v => Math.round(v * 2000)).join(',');
  const adj = new Map();
  segs.forEach((s, i) => { for (const e of [0, 1]) { const k = key(s[e]); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(i); } });
  const used = new Uint8Array(segs.length), out = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const loop = [segs[i][0], segs[i][1]];
    for (let guard = 0; guard < segs.length; guard++) {
      const k = key(loop.at(-1)), next = (adj.get(k) || []).find(j => !used[j]);
      if (next === undefined) break;
      used[next] = 1;
      const s = segs[next];
      loop.push(key(s[0]) === k ? s[1] : s[0]);
    }
    if (loop.length >= 3) out.push(loop);
  }
  return out;
}
// fan-triangulate a loop from its middle; both pieces get the cap, facing out of each
function capLoop(loop, n, out) {
  const c = [0, 0, 0]; for (const p of loop) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  c[0] /= loop.length; c[1] /= loop.length; c[2] /= loop.length;
  // a frame in the plane for texture coordinates: the cross-section texture is centred at 0.5, 0.5
  const ax = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const t1 = ax.clone().cross(n).normalize(), t2 = n.clone().cross(t1);
  let r = 0; for (const p of loop) r = Math.max(r, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]));
  r = r || 1;
  const uvOf = p => { const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2]; return [0.5 + (dx * t1.x + dy * t1.y + dz * t1.z) / r * 0.5, 0.5 + (dx * t2.x + dy * t2.y + dz * t2.z) / r * 0.5]; };
  const cu = [0.5, 0.5];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    // winding: front piece's cap faces -n, back piece's faces +n
    const fx = (a[1] - c[1]) * (b[2] - c[2]) - (a[2] - c[2]) * (b[1] - c[1]), fy = (a[2] - c[2]) * (b[0] - c[0]) - (a[0] - c[0]) * (b[2] - c[2]), fz = (a[0] - c[0]) * (b[1] - c[1]) - (a[1] - c[1]) * (b[0] - c[0]);
    const facesN = fx * n.x + fy * n.y + fz * n.z > 0;
    const tri = (o, p0, p1, p2, nn) => { o.cap.p.push(...p0, ...p1, ...p2); for (let k = 0; k < 3; k++) o.cap.n.push(nn.x, nn.y, nn.z); o.cap.u.push(...uvOf(p0), ...uvOf(p1), ...uvOf(p2)); };
    const neg = new THREE.Vector3(-n.x, -n.y, -n.z);
    if (facesN) { tri(out[1], c, a, b, n); tri(out[0], c, b, a, neg); }
    else { tri(out[1], c, b, a, n); tri(out[0], c, a, b, neg); }
  }
}
// move a geometry by an offset (used to put a cut-off piece's origin at its new end)
export function shift(g, x, y, z) { g.translate(x, y, z); return g; }
