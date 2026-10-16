// Jason's Revenge physics: point masses joined by links, solved by projection.
// Bodies, severed parts, entrails, dropped weapons and debris all live here.
// The ground follows the terrain (the lake floor is lower than the shore) and
// static boxes (walls, trunks, the car) are bucketed in a grid.

export const STEP = 1 / 90;
const CELL = 4, NONE = [];

export class Point {
  constructor(x, y, z, r = 0.05, mass = 1) {
    this.x = x; this.y = y; this.z = z;     // position
    this.px = x; this.py = y; this.pz = z;  // last position (velocity is the difference)
    this.r = r; this.w = mass > 0 ? 1 / mass : 0;
    this.locked = false;                     // driven from outside (animation, a hand)
    this.grounded = false;
    this.grip = 0.6;                         // how much it drags on the ground
    this.owner = null; this.tag = '';
    this.dead = false;
  }
  vel(out) { out.x = (this.x - this.px) / STEP; out.y = (this.y - this.py) / STEP; out.z = (this.z - this.pz) / STEP; return out; }
  setVel(vx, vy, vz) { this.px = this.x - vx * STEP; this.py = this.y - vy * STEP; this.pz = this.z - vz * STEP; }
  addVel(vx, vy, vz) { this.px -= vx * STEP; this.py -= vy * STEP; this.pz -= vz * STEP; }
  moveTo(x, y, z, keepVel = false) {
    if (keepVel) { this.px += x - this.x; this.py += y - this.y; this.pz += z - this.z; }
    else { this.px = x; this.py = y; this.pz = z; }
    this.x = x; this.y = y; this.z = z;
  }
  copyTo(v) { return v.set(this.x, this.y, this.z); }
  dist(o) { return Math.hypot(this.x - o.x, this.y - o.y, this.z - o.z); }
}

// kinds: 'rod' holds its length, 'min' only stops things getting closer, 'max' only stops them parting
export class Link {
  constructor(a, b, len, kind = 'rod', k = 1) { this.a = a; this.b = b; this.len = len; this.kind = kind; this.k = k; this.cut = false; this.owner = null; }
}

export class Sim {
  constructor() {
    this.points = []; this.links = [];
    this.grid = new Map(); this.boxes = [];
    this.floorAt = () => 0;
    this.gravity = -9.81;
    this.iterations = 8;
  }
  point(x, y, z, r, mass, owner = null, tag = '') { const p = new Point(x, y, z, r, mass); p.owner = owner; p.tag = tag; this.points.push(p); return p; }
  link(a, b, kind = 'rod', k = 1, len = null, owner = null) { const l = new Link(a, b, len ?? a.dist(b), kind, k); l.owner = owner; this.links.push(l); return l; }
  addBox(min, max, opaque = true) {
    const b = { min, max, opaque };
    this.boxes.push(b);
    for (let i = Math.floor(min.x / CELL); i <= Math.floor(max.x / CELL); i++)
      for (let j = Math.floor(min.z / CELL); j <= Math.floor(max.z / CELL); j++) {
        const key = i * 8192 + j; let a = this.grid.get(key); if (!a) this.grid.set(key, a = []); a.push(b);
      }
    return b;
  }
  near(x, z) { return this.grid.get(Math.floor(x / CELL) * 8192 + Math.floor(z / CELL)) ?? NONE; }
  remove(owner) {
    this.points = this.points.filter(p => p.owner !== owner);
    this.links = this.links.filter(l => l.owner !== owner);
  }
  prune() { this.points = this.points.filter(p => !p.dead); this.links = this.links.filter(l => !l.cut && !l.a.dead && !l.b.dead); }

  step() {
    const h = STEP, g = this.gravity * h * h;
    for (const p of this.points) {
      if (p.locked || p.w === 0) continue;
      const damp = p.grounded ? 1 - 0.06 * p.grip : 0.998;
      const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * 0.998, vz = (p.z - p.pz) * damp;
      p.px = p.x; p.py = p.y; p.pz = p.z;
      p.x += vx; p.y += vy + g; p.z += vz;
      p.grounded = false;
    }
    for (let it = 0; it < this.iterations; it++) {
      for (const l of this.links) {
        if (l.cut) continue;
        const a = l.a, b = l.b;
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        if ((l.kind === 'min' && d >= l.len) || (l.kind === 'max' && d <= l.len)) continue;
        const wa = a.locked ? 0 : a.w, wb = b.locked ? 0 : b.w, w = wa + wb;
        if (w === 0) continue;
        const s = (d - l.len) / d / w * l.k;
        a.x += dx * s * wa; a.y += dy * s * wa; a.z += dz * s * wa;
        b.x -= dx * s * wb; b.y -= dy * s * wb; b.z -= dz * s * wb;
      }
      if (it % 3 === 2) this.collide();
    }
    this.collide();
  }

  collide() {
    for (const p of this.points) {
      if (p.locked || p.w === 0) continue;
      const fy = this.floorAt(p.x, p.z) + p.r;
      if (p.y < fy) {
        p.y = fy; if (p.py < fy - 0.0001) p.py = fy + (fy - p.py) * 0.05;
        p.grounded = true;
        // friction: bleed off sliding along the ground
        p.px += (p.x - p.px) * 0.35 * p.grip; p.pz += (p.z - p.pz) * 0.35 * p.grip;
      }
      for (const b of this.near(p.x, p.z)) {
        const r = p.r;
        const ox1 = p.x - (b.min.x - r), ox2 = b.max.x + r - p.x, oy1 = p.y - (b.min.y - r), oy2 = b.max.y + r - p.y, oz1 = p.z - (b.min.z - r), oz2 = b.max.z + r - p.z;
        if (ox1 <= 0 || ox2 <= 0 || oy1 <= 0 || oy2 <= 0 || oz1 <= 0 || oz2 <= 0) continue;
        const m = Math.min(ox1, ox2, oy1, oy2, oz1, oz2);
        if (m === oy2) { p.y += oy2; p.grounded = true; p.px += (p.x - p.px) * 0.3; p.pz += (p.z - p.pz) * 0.3; }
        else if (m === oy1) p.y -= oy1;
        else if (m === ox1) p.x -= ox1; else if (m === ox2) p.x += ox2;
        else if (m === oz1) p.z -= oz1; else p.z += oz2;
      }
    }
  }
}

// closest approach of segments p1-q1 and p2-q2 (anything with x, y, z); squared
// distance, with the parameters left in segDist.s and segDist.t
export function segDist(p1, q1, p2, q2) {
  const d1x = q1.x - p1.x, d1y = q1.y - p1.y, d1z = q1.z - p1.z, d2x = q2.x - p2.x, d2y = q2.y - p2.y, d2z = q2.z - p2.z;
  const rx = p1.x - p2.x, ry = p1.y - p2.y, rz = p1.z - p2.z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z, f = d2x * rx + d2y * ry + d2z * rz;
  const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
  let s = 0, t = 0;
  if (a < 1e-9 && e < 1e-9) { s = t = 0; }
  else if (a < 1e-9) t = cl(f / e);
  else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e < 1e-9) s = cl(-c / a);
    else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z, den = a * e - b * b;
      s = den > 1e-9 ? cl((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); }
    }
  }
  segDist.s = s; segDist.t = t;
  const x = rx + d1x * s - d2x * t, y = ry + d1y * s - d2y * t, z = rz + d1z * s - d2z * t;
  return x * x + y * y + z * z;
}
