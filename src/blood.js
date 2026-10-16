// Blood: drops that fly and stretch with their speed, splats where they land,
// pools that spread under a body, arterial spurts that pulse from a wound,
// and chunks (bone, meat, brain) that bounce and roll. Also fire and smoke.
import * as THREE from '../vendor/three.module.js';

const R = Math.random;
function tex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a splat: a dense centre, satellite droplets and a few streaks thrown outward
const SPLATS = [0, 1, 2, 3].map(k => tex(128, (g, s) => {
  const c = s / 2;
  g.fillStyle = 'rgba(70,2,2,1)';
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = s * (0.16 + R() * 0.08 + (R() < 0.2 ? R() * 0.12 : 0)); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
  g.fill();
  for (let i = 0; i < 18 + k * 4; i++) { const a = R() * 6.28, d = s * (0.22 + R() * 0.26), r = 1 + R() * s * 0.035; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, r, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(70,2,2,1)'; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) { const a = R() * 6.28; g.lineWidth = 1 + R() * 3; g.beginPath(); g.moveTo(c + Math.cos(a) * s * 0.15, c + Math.sin(a) * s * 0.15); g.lineTo(c + Math.cos(a) * s * (0.3 + R() * 0.18), c + Math.sin(a) * s * (0.3 + R() * 0.18)); g.stroke(); }
  // darker where it's thick
  const gr = g.createRadialGradient(c, c, 0, c, c, s * 0.2); gr.addColorStop(0, 'rgba(25,0,0,0.6)'); gr.addColorStop(1, 'rgba(25,0,0,0)');
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, s, s);
}));
const POOL = tex(128, (g, s) => {
  const c = s / 2; g.fillStyle = 'rgba(52,0,0,1)'; g.beginPath();
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, r = s * (0.4 + Math.sin(a * 3 + 1) * 0.04 + Math.sin(a * 7) * 0.025 + R() * 0.015); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
  g.fill();
});
const FLAME = tex(64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s * 0.62, 0, s / 2, s * 0.6, s * 0.48);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, 'rgba(255,170,60,0.9)'); gr.addColorStop(0.6, 'rgba(200,60,10,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(s / 2, s * 0.6, s * 0.3, s * 0.42, 0, 0, 7); g.fill();
});
const SMOKE = tex(64, (g, s) => {
  for (let i = 0; i < 6; i++) { const gr = g.createRadialGradient(s / 2 + (R() - 0.5) * 16, s / 2 + (R() - 0.5) * 16, 0, s / 2, s / 2, s * 0.45); gr.addColorStop(0, 'rgba(60,58,56,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
});

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
const DOWN_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const N_DROP = 900, N_SPLAT = 600, N_POOL = 40, N_CHUNK = 80, N_FIRE = 260;

export class Blood {
  constructor(scene, sim) {
    this.sim = sim;
    // drops: a stretched sphere, lit, glossy
    this.d = { p: new Float32Array(N_DROP * 3), v: new Float32Array(N_DROP * 3), s: new Float32Array(N_DROP), life: new Float32Array(N_DROP), n: 0 };
    this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0x5a0303, roughness: 0.2, metalness: 0.1 }), N_DROP);
    this.drops.frustumCulled = false; for (let i = 0; i < N_DROP; i++) this.drops.setMatrixAt(i, ZERO); scene.add(this.drops);
    // splats on the ground and on walls: a few textures, each its own instanced set
    this.splats = SPLATS.map(t => {
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), N_SPLAT / 4);
      m.frustumCulled = false; for (let i = 0; i < N_SPLAT / 4; i++) m.setMatrixAt(i, ZERO); m.n = 0; scene.add(m); return m;
    });
    // pools: grow slowly under someone bleeding out
    this.pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: POOL, transparent: true, depthWrite: false, roughness: 0.08, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), N_POOL);
    this.pools.frustumCulled = false; for (let i = 0; i < N_POOL; i++) this.pools.setMatrixAt(i, ZERO); scene.add(this.pools);
    this.poolList = []; this.poolN = 0;
    // chunks: bone, meat, brain
    this.chunks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.4 }), N_CHUNK);
    this.chunks.frustumCulled = false; for (let i = 0; i < N_CHUNK; i++) { this.chunks.setMatrixAt(i, ZERO); this.chunks.setColorAt(i, new THREE.Color(0x6a0a08)); } scene.add(this.chunks);
    this.chunkList = new Array(N_CHUNK).fill(null); this.chunkN = 0;
    // spurts: points on a body that pump blood in pulses
    this.spurts = [];
    // fire and smoke sprites
    this.f = { p: new Float32Array(N_FIRE * 3), v: new Float32Array(N_FIRE * 3), life: new Float32Array(N_FIRE), max: new Float32Array(N_FIRE), s: new Float32Array(N_FIRE), smoke: new Uint8Array(N_FIRE), n: 0 };
    this.flames = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: FLAME, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), N_FIRE);
    this.smokes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: SMOKE, transparent: true, depthWrite: false }), N_FIRE);
    for (const m of [this.flames, this.smokes]) { m.frustumCulled = false; for (let i = 0; i < N_FIRE; i++) m.setMatrixAt(i, ZERO); scene.add(m); }
    this.amount = 1;
  }
  drop(x, y, z, vx, vy, vz, size) {
    const d = this.d, i = d.n; d.n = (i + 1) % N_DROP;
    d.p[i * 3] = x; d.p[i * 3 + 1] = y; d.p[i * 3 + 2] = z; d.v[i * 3] = vx; d.v[i * 3 + 1] = vy; d.v[i * 3 + 2] = vz;
    d.s[i] = size; d.life[i] = 3;
  }
  // a burst along a direction
  spray(at, direction, n, speed, spread = 0.5, size = 0.012) {
    n = Math.round(n * this.amount);
    for (let i = 0; i < n; i++) {
      const sp = speed * (0.35 + R() * 0.9);
      this.drop(at.x, at.y, at.z, (direction.x + (R() - 0.5) * spread * 2) * sp, (direction.y + (R() - 0.3) * spread * 2) * sp, (direction.z + (R() - 0.5) * spread * 2) * sp, size * (0.5 + R()));
    }
  }
  // pumping from an open artery: point with x,y,z; dirFn() gives the way it's facing
  spurt(point, dirFn, seconds, strength = 1) { this.spurts.push({ point, dirFn, t: seconds, max: seconds, strength, phase: R() * 6 }); }
  splat(x, y, z, size, normal = up) {
    const m = this.splats[Math.floor(R() * this.splats.length)], i = m.n; m.n = (i + 1) % (N_SPLAT / 4);
    q.setFromUnitVectors(v.set(0, 0, 1), normal).multiply(new THREE.Quaternion().setFromAxisAngle(v.set(0, 0, 1), R() * 6.28));
    m4.compose(v.set(x, y, z), q, sc.set(size, size, 1)); m.setMatrixAt(i, m4); m.instanceMatrix.needsUpdate = true;
  }
  // a pool that spreads under a point for a while
  pool(point, maxSize = 1.2) {
    const old = this.poolList.find(p => p.point === point); if (old) { old.max = Math.max(old.max, maxSize); return; }
    const i = this.poolN; this.poolN = (i + 1) % N_POOL;
    this.poolList = this.poolList.filter(p => p.i !== i);
    this.poolList.push({ i, point, size: 0.05, max: maxSize * this.amount, x: point.x, z: point.z, y: 0, settle: 0 });
  }
  chunk(at, kind = 'meat', n = 1, speed = 3) {
    const cols = { meat: [0x6a0a08, 0x8a1a14, 0x4a0604], bone: [0xd8ccb0, 0xc8b898], brain: [0xc8909a, 0xb07880, 0x9a5a64], skin: [0xd0a080] };
    for (let k = 0; k < n; k++) {
      const i = this.chunkN; this.chunkN = (i + 1) % N_CHUNK;
      const old = this.chunkList[i]; if (old) old.dead = true;
      const p = this.sim.point(at.x + (R() - 0.5) * 0.06, at.y + (R() - 0.5) * 0.06, at.z + (R() - 0.5) * 0.06, 0.015 + R() * 0.02, 0.1, this, 'chunk');
      p.setVel((R() - 0.5) * speed * 2, R() * speed * 1.3, (R() - 0.5) * speed * 2);
      p.size = p.r * (kind === 'bone' ? 1 : 1.3); p.spin = R() * 6; p.shape = [0.6 + R() * 1.2, 0.5 + R() * 0.8, 0.6 + R()]; p.bleed = kind !== 'bone' ? 1.5 : 0;
      this.chunkList[i] = p;
      const c = cols[kind] ?? cols.meat;
      this.chunks.setColorAt(i, new THREE.Color(c[Math.floor(R() * c.length)])); this.chunks.instanceColor.needsUpdate = true;
    }
    this.sim.prune();
  }
  flame(x, y, z, size = 0.1, life = 0.6, smoke = false, vy = 0.7) {
    const f = this.f, i = f.n; f.n = (i + 1) % N_FIRE;
    f.p[i * 3] = x; f.p[i * 3 + 1] = y; f.p[i * 3 + 2] = z;
    f.v[i * 3] = (R() - 0.5) * 0.15; f.v[i * 3 + 1] = vy * (0.6 + R() * 0.6); f.v[i * 3 + 2] = (R() - 0.5) * 0.15;
    f.life[i] = f.max[i] = life; f.s[i] = size; f.smoke[i] = smoke ? 1 : 0;
  }
  clear() {
    this.d.life.fill(0); this.f.life.fill(0); this.spurts.length = 0; this.poolList.length = 0;
    for (const m of this.splats) { for (let i = 0; i < N_SPLAT / 4; i++) m.setMatrixAt(i, ZERO); m.instanceMatrix.needsUpdate = true; }
    for (let i = 0; i < N_POOL; i++) this.pools.setMatrixAt(i, ZERO); this.pools.instanceMatrix.needsUpdate = true;
    for (const c of this.chunkList) if (c) c.dead = true; this.chunkList.fill(null); this.sim.prune();
  }

  update(dt, camera) {
    const d = this.d, floor = this.sim.floorAt;
    // spurts: a heartbeat at a time, weaker as they bleed out
    for (let k = this.spurts.length - 1; k >= 0; k--) {
      const s = this.spurts[k]; s.t -= dt;
      if (s.t <= 0 || s.point.dead) { this.spurts.splice(k, 1); continue; }
      s.phase += dt * 7.5;
      const beat = Math.max(0, Math.sin(s.phase)) ** 3 * (s.t / s.max) * s.strength;
      if (R() < beat * dt * 90 * this.amount) { s.dirFn(dir); const sp = 1.2 + beat * 3.2; this.drop(s.point.x, s.point.y, s.point.z, dir.x * sp + (R() - 0.5) * 0.4, dir.y * sp + (R() - 0.3) * 0.4, dir.z * sp + (R() - 0.5) * 0.4, 0.008 + R() * 0.01); }
    }
    for (let i = 0; i < N_DROP; i++) {
      if (d.life[i] <= 0) { this.drops.setMatrixAt(i, ZERO); continue; }
      d.life[i] -= dt;
      const a = i * 3;
      d.v[a + 1] -= 9.81 * dt;
      const nx = d.p[a] + d.v[a] * dt, ny = d.p[a + 1] + d.v[a + 1] * dt, nz = d.p[a + 2] + d.v[a + 2] * dt;
      // hit a wall, a trunk, the car?
      let hitN = null;
      for (const b of this.sim.near(nx, nz)) if (nx > b.min.x && nx < b.max.x && ny > b.min.y && ny < b.max.y && nz > b.min.z && nz < b.max.z) {
        const ox = Math.min(nx - b.min.x, b.max.x - nx), oz = Math.min(nz - b.min.z, b.max.z - nz), oy = b.max.y - ny;
        hitN = oy < ox && oy < oz ? v.set(0, 1, 0) : ox < oz ? v.set(nx - b.min.x < b.max.x - nx ? -1 : 1, 0, 0) : v.set(0, 0, nz - b.min.z < b.max.z - nz ? -1 : 1);
        break;
      }
      const fy = Math.max(-0.12, floor(nx, nz)) + 0.004;
      if (hitN || ny <= fy) {
        const size = d.s[i] * (3 + R() * 5);
        if (hitN) this.splat(nx + hitN.x * 0.01, ny, nz + hitN.z * 0.01, size * 1.3, hitN);
        else this.splat(nx, fy, nz, size);
        d.life[i] = 0; this.drops.setMatrixAt(i, ZERO); continue;
      }
      d.p[a] = nx; d.p[a + 1] = ny; d.p[a + 2] = nz;
      // stretch along the way it's flying
      const sp = Math.hypot(d.v[a], d.v[a + 1], d.v[a + 2]);
      q.setFromUnitVectors(up, dir.set(d.v[a], d.v[a + 1], d.v[a + 2]).normalize());
      m4.compose(v.set(nx, ny, nz), q, sc.set(d.s[i], d.s[i] * (1 + Math.min(4, sp * 0.4)), d.s[i]));
      this.drops.setMatrixAt(i, m4);
    }
    this.drops.instanceMatrix.needsUpdate = true;
    // pools spread, then stop
    for (const p of this.poolList) {
      if (!p.point.dead && p.size < p.max) { p.x += (p.point.x - p.x) * 0.02; p.z += (p.point.z - p.z) * 0.02; }
      p.size = Math.min(p.max, p.size + dt * 0.035 * (1 - p.size / p.max + 0.1));
      p.y = Math.max(-0.12, floor(p.x, p.z)) + 0.006;
      m4.compose(v.set(p.x, p.y, p.z), DOWN_Q, sc.set(p.size, p.size, 1)); this.pools.setMatrixAt(p.i, m4);
    }
    this.pools.instanceMatrix.needsUpdate = true;
    // chunks
    for (let i = 0; i < N_CHUNK; i++) {
      const c = this.chunkList[i];
      if (!c || c.dead) { this.chunks.setMatrixAt(i, ZERO); continue; }
      if (c.bleed > 0) { c.bleed -= dt; if (R() < dt * 10) this.drop(c.x, c.y, c.z, 0, -0.2, 0, 0.006); }
      if (!c.grounded) c.spin += dt * 8;
      q.setFromAxisAngle(v.set(0.5, 0.7, 0.3).normalize(), c.spin);
      m4.compose(v.set(c.x, c.y, c.z), q, sc.set(c.size * c.shape[0], c.size * c.shape[1], c.size * c.shape[2])); this.chunks.setMatrixAt(i, m4);
    }
    this.chunks.instanceMatrix.needsUpdate = true;
    // fire and smoke, turned to face the camera
    const f = this.f; camera.getWorldQuaternion(q);
    for (let i = 0; i < N_FIRE; i++) {
      if (f.life[i] <= 0) { this.flames.setMatrixAt(i, ZERO); this.smokes.setMatrixAt(i, ZERO); continue; }
      f.life[i] -= dt;
      const a = i * 3, t = f.life[i] / f.max[i];
      f.p[a] += f.v[a] * dt; f.p[a + 1] += f.v[a + 1] * dt; f.p[a + 2] += f.v[a + 2] * dt;
      const size = f.smoke[i] ? f.s[i] * (1 + (1 - t) * 3) : f.s[i] * (0.4 + Math.sin(t * Math.PI) * 0.9);
      m4.compose(v.set(f.p[a], f.p[a + 1], f.p[a + 2]), q, sc.set(size, size * (f.smoke[i] ? 1 : 1.6), 1));
      (f.smoke[i] ? this.smokes : this.flames).setMatrixAt(i, m4);
      (f.smoke[i] ? this.flames : this.smokes).setMatrixAt(i, ZERO);
    }
    this.flames.instanceMatrix.needsUpdate = true; this.smokes.instanceMatrix.needsUpdate = true;
  }
}
