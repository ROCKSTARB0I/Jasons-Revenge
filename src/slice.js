// Mesh cutting: split a mesh along a plane wherever the blade went. Every
// triangle the plane crosses is cut in two, the open edges are chained into
// loops, and the loops are capped with a cross-section (skin, fat, muscle, bone).
// A hollow body gives an outer loop with the cavity's loop inside it: the cap is
// a ring of body wall and the hole in the middle shows what's inside.
import * as THREE from '../vendor/three.module.js';

const EPS = 1e-6;
// g: non-indexed geometry (position, normal, uv), optionally with groups whose
// materialIndex says what each triangle is: 0 = surface, 1 = cap, 2+ = anything else (a cavity's lining).
// plane in the geometry's own space: n (unit), d -> side = n·p - d.
// Returns { front, back } geometries (front: n·p > d); either may be null.
// Each keeps one group per material index; new caps go in group 1. cap: add caps (false for cloth).
export function sliceGeometry(g, n, d, cap = true) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv?.array;
  const count = P.length / 3;
  // what each triangle is, from the groups
  const kindOf = new Uint8Array(count / 3);
  for (const gr of g.groups) for (let v = gr.start; v < Math.min(count, gr.start + gr.count); v += 3) kindOf[v / 3] = gr.materialIndex ?? 0;
  const out = [new Map(), new Map()];   // 0 front, 1 back: kind -> { p, n, u }
  const segs = [];                      // cut edges, for the cap
  const side = i => n.x * P[i * 3] + n.y * P[i * 3 + 1] + n.z * P[i * 3 + 2] - d;
  const vert = (i) => ({ p: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], n: [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], u: U ? [U[i * 2], U[i * 2 + 1]] : [0, 0] });
  const lerp = (a, b, t) => ({ p: a.p.map((v, k) => v + (b.p[k] - v) * t), n: a.n.map((v, k) => v + (b.n[k] - v) * t), u: a.u.map((v, k) => v + (b.u[k] - v) * t) });
  for (let t = 0; t < count; t += 3) {
    const kind = kindOf[t / 3];
    const vs = [vert(t), vert(t + 1), vert(t + 2)], s = [side(t), side(t + 1), side(t + 2)];
    const pos = s.map(x => x > EPS), neg = s.map(x => x < -EPS);
    if (!neg[0] && !neg[1] && !neg[2]) { push(out[0], kind, vs); continue; }
    if (!pos[0] && !pos[1] && !pos[2]) { push(out[1], kind, vs); continue; }
    // the lone vertex on one side, the other two on the other
    let lone = -1;
    for (let k = 0; k < 3; k++) { const o1 = (k + 1) % 3, o2 = (k + 2) % 3; if ((s[k] > 0) !== (s[o1] > 0) && (s[k] > 0) !== (s[o2] > 0)) lone = k; }
    if (lone < 0) { push(out[s[0] + s[1] + s[2] > 0 ? 0 : 1], kind, vs); continue; }
    const a = vs[lone], b = vs[(lone + 1) % 3], c = vs[(lone + 2) % 3], sa = s[lone], sb = s[(lone + 1) % 3], sc = s[(lone + 2) % 3];
    const ab = lerp(a, b, sa / (sa - sb)), ac = lerp(a, c, sa / (sa - sc));
    const loneOut = out[sa > 0 ? 0 : 1], pairOut = out[sa > 0 ? 1 : 0];
    push(loneOut, kind, [a, ab, ac]);
    push(pairOut, kind, [ab, b, c]); push(pairOut, kind, [ab, c, ac]);
    if (kind !== 1) segs.push([ab.p, ac.p]);   // an old cap crossing the plane is already inside the new one
  }
  if (cap && segs.length) capLoops(loops(segs), n, out);
  return { front: build(out[0]), back: build(out[1]) };
}
function push(o, kind, vs) {
  let t = o.get(kind); if (!t) o.set(kind, t = { p: [], n: [], u: [] });
  for (const v of vs) { t.p.push(...v.p); t.n.push(...v.n); t.u.push(...v.u); }
}
function build(o) {
  if (!o.size) return null;
  const kinds = [...new Set([0, 1, ...o.keys()])].sort((a, b) => a - b);
  const p = [], nn = [], u = [];
  const g = new THREE.BufferGeometry();
  for (const k of kinds) { const t = o.get(k); const start = p.length / 3; if (t) { p.push(...t.p); nn.push(...t.n); u.push(...t.u); } g.addGroup(start, p.length / 3 - start, k); }
  if (!p.length) return null;
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
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
    if (key(loop[0]) === key(loop.at(-1))) loop.pop();
    if (loop.length >= 3) out.push(loop);
  }
  return out;
}
// Cap the cut. Loops are flattened into the plane; a loop inside another is a
// hole in it (the cavity of a hollow body), so the cap becomes a ring.
// Both pieces get the cap, each facing out of its own side.
function capLoops(all, n, out) {
  const ax = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const t1 = ax.clone().cross(n).normalize(), t2 = n.clone().cross(t1);
  const flat = all.map(loop => loop.map(p => new THREE.Vector2(p[0] * t1.x + p[1] * t1.y + p[2] * t1.z, p[0] * t2.x + p[1] * t2.y + p[2] * t2.z)));
  const area = flat.map(f => { let a = 0; for (let i = 0; i < f.length; i++) { const p = f[i], q = f[(i + 1) % f.length]; a += p.x * q.y - q.x * p.y; } return Math.abs(a / 2); });
  const inside = (pt, f) => { let c = false; for (let i = 0, j = f.length - 1; i < f.length; j = i++) { const a = f[i], b = f[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
  // who contains whom
  const parents = flat.map((f, i) => flat.map((g, j) => j !== i && area[j] > area[i] && inside(f[0], g) ? j : -1).filter(j => j >= 0));
  const depth = parents.map(p => p.length);
  for (let i = 0; i < all.length; i++) {
    if (depth[i] % 2) continue;   // a hole: capped as part of the loop around it
    const holes = [];
    for (let j = 0; j < all.length; j++) if (depth[j] === depth[i] + 1 && parents[j].includes(i)) holes.push(j);
    capPolygon(all[i], holes.map(j => all[j]), flat[i], holes.map(j => flat[j]), n, t1, t2, out);
  }
}
function capPolygon(loop, holeLoops, f, holeFlat, n, t1, t2, out) {
  const c = [0, 0, 0]; for (const p of loop) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  c[0] /= loop.length; c[1] /= loop.length; c[2] /= loop.length;
  let r = 0; for (const p of loop) r = Math.max(r, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]));
  r = r || 1;
  // the cross-section texture is centred at 0.5, 0.5 on the outer loop's middle
  const uvOf = p => { const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2]; return [0.5 + (dx * t1.x + dy * t1.y + dz * t1.z) / r * 0.5, 0.5 + (dx * t2.x + dy * t2.y + dz * t2.z) / r * 0.5]; };
  const pts = [...loop, ...holeLoops.flat()];
  let faces = [];
  try { faces = THREE.ShapeUtils.triangulateShape(f.slice(), holeFlat.map(h => h.slice())); } catch (e) { faces = []; }
  if (!faces.length && !holeLoops.length) for (let i = 1; i < loop.length - 1; i++) faces.push([0, i, i + 1]);   // fall back to a fan
  const neg = new THREE.Vector3(-n.x, -n.y, -n.z);
  const tri = (o, p0, p1, p2, nn) => {
    let t = o.get(1); if (!t) o.set(1, t = { p: [], n: [], u: [] });
    t.p.push(...p0, ...p1, ...p2); for (let k = 0; k < 3; k++) t.n.push(nn.x, nn.y, nn.z); t.u.push(...uvOf(p0), ...uvOf(p1), ...uvOf(p2));
  };
  for (const [i0, i1, i2] of faces) {
    const a = pts[i0], b = pts[i1], d = pts[i2];
    if (!a || !b || !d) continue;
    const fx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]), fy = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]), fz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    // front piece's cap faces -n, back piece's faces +n
    if (fx * n.x + fy * n.y + fz * n.z > 0) { tri(out[1], a, b, d, n); tri(out[0], a, d, b, neg); }
    else { tri(out[1], a, d, b, n); tri(out[0], a, b, d, neg); }
  }
}
// move a geometry by an offset (used to put a cut-off piece's origin at its new end)
export function shift(g, x, y, z) { g.translate(x, y, z); return g; }
