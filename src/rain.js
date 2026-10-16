// Rain: streaks falling around wherever you are, rings on the ground and the
// lake where they land, and now and then lightning.
import * as THREE from '../vendor/three.module.js';

const N = 2200, BOX = 14, TOP = 9;
const R = Math.random;

export class Rain {
  constructor(scene, floorAt) {
    this.floorAt = floorAt; this.on = false; this.flash = 0; this.nextBolt = 20;
    const pos = new Float32Array(N * 6);
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.lines = new THREE.LineSegments(this.geo, new THREE.LineBasicMaterial({ color: 0x9aaac0, transparent: true, opacity: 0.32, depthWrite: false }));
    this.lines.frustumCulled = false; this.lines.visible = false; scene.add(this.lines);
    this.drops = Array.from({ length: N }, () => ({ x: (R() - 0.5) * BOX * 2, y: R() * TOP, z: (R() - 0.5) * BOX * 2, v: 8 + R() * 3 }));
    // splash rings
    const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.strokeStyle = 'rgba(200,215,235,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 12, 0, 7); g.stroke(); return new THREE.CanvasTexture(c); })();
    this.rings = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0.5 }), 160);
    this.rings.frustumCulled = false; this.rings.visible = false; scene.add(this.rings);
    this.ringList = Array.from({ length: 160 }, () => ({ x: 0, y: -99, z: 0, t: 1 })); this.ringN = 0;
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); this.v = new THREE.Vector3(); this.sc = new THREE.Vector3();
  }
  set(on) { this.on = on; this.lines.visible = on; this.rings.visible = on; this.nextBolt = 15 + R() * 25; }
  // centre: where the player's head is. Returns how bright a lightning flash is right now (0..1).
  update(dt, cx, cy, cz) {
    if (!this.on) return 0;
    const p = this.geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const d = this.drops[i];
      d.y -= d.v * dt; d.x -= dt * 0.8;   // a little wind
      // keep them in a box that travels with you
      if (d.x < cx - BOX) d.x += BOX * 2; else if (d.x > cx + BOX) d.x -= BOX * 2;
      if (d.z < cz - BOX) d.z += BOX * 2; else if (d.z > cz + BOX) d.z -= BOX * 2;
      const fy = Math.max(-0.12, this.floorAt(d.x, d.z));
      if (d.y < fy) {
        if (R() < 0.12 && Math.abs(d.x - cx) < 8 && Math.abs(d.z - cz) < 8) { const r = this.ringList[this.ringN]; this.ringN = (this.ringN + 1) % this.ringList.length; r.x = d.x; r.y = fy + 0.01; r.z = d.z; r.t = 0; }
        d.y = cy + TOP * (0.4 + R() * 0.6); d.x = cx + (R() - 0.5) * BOX * 2; d.z = cz + (R() - 0.5) * BOX * 2;
      }
      const k = i * 6;
      p[k] = d.x; p[k + 1] = d.y; p[k + 2] = d.z; p[k + 3] = d.x + 0.03; p[k + 4] = d.y + 0.35; p[k + 5] = d.z;
    }
    this.geo.attributes.position.needsUpdate = true;
    for (let i = 0; i < this.ringList.length; i++) {
      const r = this.ringList[i]; r.t += dt * 2.5;
      const s = r.t < 1 ? 0.03 + r.t * 0.12 : 0;
      this.m4.compose(this.v.set(r.x, r.y, r.z), this.q, this.sc.set(s, s, s)); this.rings.setMatrixAt(i, this.m4);
    }
    this.rings.instanceMatrix.needsUpdate = true;
    // lightning: a double flicker, thunder a few seconds behind it
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) { this.nextBolt = 18 + R() * 35; this.flash = 1; this.thunderIn = 1 + R() * 4; this.second = 0.12; }
    if (this.second > 0 && (this.second -= dt) <= 0) this.flash = 0.8;
    if (this.thunderIn > 0 && (this.thunderIn -= dt) <= 0) this.onThunder?.();
    this.flash = Math.max(0, this.flash - dt * 6);
    return this.flash;
  }
}
