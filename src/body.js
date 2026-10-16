// People: a jointed body that is animated (walking, running, hiding, on the
// phone) while they're in control of it, and goes over to physics the moment
// they aren't: knocked down, grabbed, dead. Shaped limbs, painted faces and
// clothes, and wounds that tear the meshes apart.
import * as THREE from '../vendor/three.module.js';
import { segDist } from './sim.js?v=2';
import { realFace, fleshTex, fabricTex, shirtTex } from './faces.js?v=2';

const V = THREE.Vector3, R = Math.random;
const t1 = new V(), t2 = new V(), t3 = new V(), t4 = new V(), mb = new THREE.Matrix4(), UP = new V(0, 1, 0);

// rest pose, facing +Z, metres
const REST = {
  pelvis: [0, 0.96, 0], spine: [0, 1.17, 0.005], chest: [0, 1.36, 0], neck: [0, 1.53, 0], head: [0, 1.67, 0.01],
  lSh: [-0.19, 1.45, 0], lEl: [-0.215, 1.17, -0.01], lWr: [-0.225, 0.92, 0.01], lFin: [-0.228, 0.75, 0.025],
  rSh: [0.19, 1.45, 0], rEl: [0.215, 1.17, -0.01], rWr: [0.225, 0.92, 0.01], rFin: [0.228, 0.75, 0.025],
  lHip: [-0.095, 0.92, 0], lKn: [-0.1, 0.5, 0.02], lAn: [-0.1, 0.085, -0.01], lToe: [-0.105, 0.03, 0.15],
  rHip: [0.095, 0.92, 0], rKn: [0.1, 0.5, 0.02], rAn: [0.1, 0.085, -0.01], rToe: [0.105, 0.03, 0.15],
};
const MASS = { pelvis: 4, spine: 3, chest: 4, neck: 1, head: 2.5, lSh: 1.5, rSh: 1.5, lHip: 2, rHip: 2 };
const RAD = { pelvis: 0.12, spine: 0.11, chest: 0.12, head: 0.11, neck: 0.06, lAn: 0.05, rAn: 0.05, lToe: 0.04, rToe: 0.04, lFin: 0.04, rFin: 0.04 };
const HIPS = ['pelvis', 'spine', 'lHip', 'rHip'], CHEST = ['spine', 'chest', 'neck', 'lSh', 'rSh'];
// what comes away with each joint when it's cut
const BELOW = {
  lSh: ['lEl', 'lWr', 'lFin'], lEl: ['lWr', 'lFin'], lWr: ['lFin'], rSh: ['rEl', 'rWr', 'rFin'], rEl: ['rWr', 'rFin'], rWr: ['rFin'],
  lHip: ['lKn', 'lAn', 'lToe'], lKn: ['lAn', 'lToe'], lAn: ['lToe'], rHip: ['rKn', 'rAn', 'rToe'], rKn: ['rAn', 'rToe'], rAn: ['rToe'],
  neck: ['head'], spine: ['chest', 'neck', 'head', 'lSh', 'rSh', 'lEl', 'lWr', 'lFin', 'rEl', 'rWr', 'rFin'],
};
// parts: [name, from, to, cloth?]
const PARTS = [
  ['hips', 'pelvis', 'spine'], ['torso', 'spine', 'neck'], ['neck', 'neck', 'head'], ['head', 'head', 'head'],
  ['lUpper', 'lSh', 'lEl'], ['lFore', 'lEl', 'lWr'], ['lHand', 'lWr', 'lFin'], ['rUpper', 'rSh', 'rEl'], ['rFore', 'rEl', 'rWr'], ['rHand', 'rWr', 'rFin'],
  ['lThigh', 'lHip', 'lKn'], ['lShin', 'lKn', 'lAn'], ['lFoot', 'lAn', 'lToe'], ['rThigh', 'rHip', 'rKn'], ['rShin', 'rKn', 'rAn'], ['rFoot', 'rAn', 'rToe'],
];

// ---------------------------------------------------------------- geometry
// A limb running up +Y from 0 to len. profile(t) -> [rx, rz, zOffset]; an optional ball at the root covers the joint.
function limbGeo(len, profile, ball = true, rs = 14, ls = 12) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= ls; j++) {
    const t = j / ls, [rx, rz, zo = 0] = profile(t);
    for (let i = 0; i <= rs; i++) {
      const a = i / rs * Math.PI * 2 + Math.PI;   // the seam runs down the back
      pos.push(Math.sin(a) * rx, t * len, Math.cos(a) * rz + zo); uv.push(i / rs, t);
    }
  }
  for (let j = 0; j < ls; j++) for (let i = 0; i < rs; i++) { const a = j * (rs + 1) + i, b = a + rs + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  if (ball) { const [rx, rz] = profile(0); const s = new THREE.SphereGeometry(1, 12, 8); s.scale(rx * 0.98, Math.min(rx, rz) * 0.98, rz * 0.98); g = merge(g, s); }
  return g;
}
function merge(a, b) {
  a = a.index ? a.toNonIndexed() : a; b = b.index ? b.toNonIndexed() : b;
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const A = a.attributes[k].array, B = b.attributes[k].array, out = new Float32Array(A.length + B.length);
    out.set(A); out.set(B, A.length); g.setAttribute(k, new THREE.BufferAttribute(out, a.attributes[k].itemSize));
  }
  return g;
}
const smooth = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
const lerpK = (keys, t) => { for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1_, v1] = keys[i]; return smooth(v0, v1, (t - t0) / (t1_ - t0)); } return keys.at(-1)[1]; };
const geoCache = {};
function bodyGeos(female) {
  const key = female ? 'f' : 'm'; if (geoCache[key]) return geoCache[key];
  const F = female ? 0.92 : 1;
  const G = {
    hips: limbGeo(0.3, t => [lerpK([[0, 0.14 * (female ? 1.08 : 1)], [0.5, 0.15 * (female ? 1.06 : 1)], [1, 0.13 * F]], t), lerpK([[0, 0.1], [0.5, 0.11], [1, 0.1]], t), 0], false),
    torso: limbGeo(0.4, t => [lerpK([[0, 0.135 * F], [0.35, 0.145 * F], [0.7, 0.165 * F], [0.86, 0.17 * F], [1, 0.07]], t), lerpK([[0, 0.1], [0.35, 0.105], [0.6, female ? 0.125 : 0.115], [0.85, 0.1], [1, 0.055]], t), female ? lerpK([[0, 0], [0.55, 0.012], [0.75, 0.006], [1, 0]], t) : 0], false, 18, 14),
    neck: limbGeo(0.13, t => [0.05 * F, 0.052, 0.005], false, 10, 3),
    upper: limbGeo(0.29, t => [lerpK([[0, 0.052 * F], [0.35, 0.047 * F], [1, 0.037 * F]], t), lerpK([[0, 0.05], [0.4, 0.045], [1, 0.035]], t), 0]),
    sleeve: limbGeo(0.15, t => [0.058 * F, 0.056, 0], false),
    fore: limbGeo(0.25, t => [lerpK([[0, 0.038 * F], [0.25, 0.041 * F], [1, 0.027 * F]], t), lerpK([[0, 0.036], [0.3, 0.036], [1, 0.022]], t), 0]),
    hand: limbGeo(0.17, t => [lerpK([[0, 0.03], [0.35, 0.045], [0.7, 0.042], [1, 0.02]], t) * F, lerpK([[0, 0.022], [0.4, 0.019], [1, 0.012]], t), 0], true, 10, 6),
    thigh: limbGeo(0.42, t => [lerpK([[0, 0.085 * (female ? 1.05 : 1)], [0.3, 0.078], [1, 0.05]], t), lerpK([[0, 0.085], [0.3, 0.08], [1, 0.05]], t), lerpK([[0, 0], [0.3, 0.008], [1, 0]], t)]),
    shin: limbGeo(0.415, t => [lerpK([[0, 0.05 * F], [0.28, 0.056 * F], [1, 0.034 * F]], t), lerpK([[0, 0.05], [0.25, 0.06], [1, 0.035]], t), lerpK([[0, 0], [0.25, -0.01], [1, 0]], t)]),
    pants: limbGeo(0.42, t => [lerpK([[0, 0.092], [0.3, 0.085], [1, 0.058]], t), lerpK([[0, 0.092], [0.3, 0.087], [1, 0.058]], t), 0]),
    pantsShin: limbGeo(0.415, t => [lerpK([[0, 0.058], [0.3, 0.062], [1, 0.05]], t), lerpK([[0, 0.058], [0.3, 0.066], [1, 0.05]], t), 0]),
    shorts: limbGeo(0.2, t => [0.094 - t * 0.008, 0.094 - t * 0.008, 0], false),
  };
  // a shoe: rounded toe box running along +Y (the foot bone), sole flat
  const shoe = new THREE.BoxGeometry(0.095, 0.17, 0.085, 4, 6, 3), p = shoe.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.085, x = p.getX(i), z = p.getZ(i); const k = y > 0.12 ? 1 - (y - 0.12) * 4 : 1; p.setXYZ(i, x * k, y, z * Math.max(0.6, k) + (z > 0 ? 0 : 0)); }
  shoe.computeVertexNormals(); G.shoe = shoe;
  // the head: a sphere pushed into a skull, jaw and chin
  const hg = new THREE.SphereGeometry(0.115, 36, 28), hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const ny = y / 0.115, nz = z / 0.115;
    if (ny < 0) { x *= 1 - 0.22 * Math.min(1, -ny * 1.3); if (nz > 0.2) z *= 1 + 0.05 * -ny; }   // jaw narrows; chin forward
    if (nz < 0 && ny > -0.3) z *= 1.07;                                                          // back of the skull
    if (Math.abs(x / 0.115) > 0.7 && ny > -0.2 && ny < 0.4) x *= 0.95;                            // flat at the temples
    if (nz > 0.5 && ny > 0.15 && ny < 0.35) z *= 1.025;                                          // brow
    hp.setXYZ(i, x * 0.92, y * 1.06, z);
  }
  hg.computeVertexNormals(); G.head = hg;
  return geoCache[key] = G;
}

// ---------------------------------------------------------------- textures for the insides
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// a limb cut through: skin, fat, red muscle, a ring of bone with marrow
const stumpTex = tex(128, 128, (g, s) => {
  const c = s / 2;
  g.fillStyle = '#c99a7a'; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
  g.fillStyle = '#e0c060'; g.beginPath(); g.arc(c, c, c * 0.9, 0, 7); g.fill();
  g.fillStyle = '#7a0a08'; g.beginPath(); g.arc(c, c, c * 0.8, 0, 7); g.fill();
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${150 + R() * 60 | 0},20,20,0.5)`; g.lineWidth = 1 + R() * 2; const a = R() * 6.28; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.2, c + Math.sin(a) * c * 0.2); g.lineTo(c + Math.cos(a) * c * 0.78, c + Math.sin(a) * c * 0.78); g.stroke(); }
  g.fillStyle = '#e8dcc4'; g.beginPath(); g.arc(c + 6, c - 4, c * 0.22, 0, 7); g.fill();
  g.fillStyle = '#8a3020'; g.beginPath(); g.arc(c + 6, c - 4, c * 0.1, 0, 7); g.fill();
  for (let i = 0; i < 3; i++) { g.fillStyle = '#300'; g.beginPath(); g.arc(c + (R() - 0.5) * c, c + (R() - 0.5) * c, 3 + R() * 3, 0, 7); g.fill(); }
});
// the torso cut through at the waist: spine, gut, a cavity
const waistTex = tex(128, 128, (g, s) => {
  const c = s / 2;
  g.fillStyle = '#d0a080'; g.beginPath(); g.ellipse(c, c, c, c * 0.72, 0, 0, 7); g.fill();
  g.fillStyle = '#5a0606'; g.beginPath(); g.ellipse(c, c, c * 0.92, c * 0.64, 0, 0, 7); g.fill();
  for (let i = 0; i < 14; i++) { g.fillStyle = ['#b06878', '#c08090', '#8a3a3a', '#a85868'][i % 4]; g.beginPath(); g.ellipse(c + (R() - 0.5) * c * 1.2, c + (R() - 0.2) * c * 0.6, 6 + R() * 10, 5 + R() * 6, R() * 3, 0, 7); g.fill(); }
  g.fillStyle = '#e8dcc4'; g.beginPath(); g.ellipse(c, c - c * 0.5, 9, 7, 0, 0, 7); g.fill();
});
const woundTex = {
  slash: tex(64, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(90,0,0,0)'); gr.addColorStop(0.3, 'rgba(110,4,4,0.85)'); gr.addColorStop(0.5, 'rgba(20,0,0,1)'); gr.addColorStop(0.7, 'rgba(110,4,4,0.85)'); gr.addColorStop(1, 'rgba(90,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.35, h * 0.48, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,120,110,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.16, h * 0.44, 0, 0, 7); g.stroke();
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(100,0,0,0.85)'; g.fillRect(w / 2 - 6 + R() * 12, h / 2, 2 + R() * 3, h * 0.3 + R() * h * 0.2); }
  }),
  stab: tex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(10,0,0,1)'); gr.addColorStop(0.25, 'rgba(70,0,0,1)'); gr.addColorStop(0.55, 'rgba(110,6,6,0.75)'); gr.addColorStop(1, 'rgba(100,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, w / 2, w * 0.18, w * 0.45, 0.2, 0, 7); g.fill();
  }),
  hole: tex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, '#120000'); gr.addColorStop(0.5, '#4a0202'); gr.addColorStop(0.8, 'rgba(120,10,10,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }),
};
const woundMat = Object.fromEntries(Object.entries(woundTex).map(([k, t]) => [k, new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })]));
const stumpMat = new THREE.MeshStandardMaterial({ map: stumpTex, roughness: 0.3, side: THREE.DoubleSide });
const waistMat = new THREE.MeshStandardMaterial({ map: waistTex, roughness: 0.3, side: THREE.DoubleSide });
const gutMat = new THREE.MeshStandardMaterial({ color: 0xb87882, roughness: 0.25, metalness: 0.05 });
const heartMat = new THREE.MeshStandardMaterial({ color: 0x5a0808, roughness: 0.3 });
const brainMat = new THREE.MeshStandardMaterial({ color: 0xc8909a, roughness: 0.4 });
const plane = new THREE.PlaneGeometry(1, 1), disc = new THREE.CircleGeometry(1, 16), gutGeo = new THREE.CapsuleGeometry(0.024, 0.05, 3, 8);

// ---------------------------------------------------------------- two-bone IK: where the elbow / knee goes
function ik(root, end, l1, l2, bend, out) {
  const d = Math.min(l1 + l2 - 0.0005, Math.max(0.02, root.distanceTo(end)));
  t3.subVectors(end, root).normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  t4.copy(bend).addScaledVector(t3, -bend.dot(t3)).normalize();
  return out.copy(root).addScaledVector(t3, a).addScaledVector(t4, h);
}

export class Human {
  // opts: x, z, yaw, scale, female, skin, hair, look, shirt, print, pants, shorts, shoes, kind, uniform
  constructor(scene, sim, blood, o) {
    this.scene = scene; this.sim = sim; this.blood = blood; this.o = o;
    const s = this.s = o.scale ?? 1;
    this.root = { x: o.x, z: o.z }; this.yaw = o.yaw ?? 0;
    this.alive = true; this.hp = o.hp ?? 100; this.maxHp = this.hp; this.bleed = 0;
    this.mode = 'anim'; this.pose = 'idle'; this.speed = 0; this.wantSpeed = 0; this.goal = null; this.face = null; this.look = null;
    this.phase = R() * 6; this.time = R() * 10; this.downT = 0; this.blend = 1; this.held = 0; this.chokeT = 0; this.outT = 0;
    this.severed = new Set(); this.wounds = []; this.guts = []; this.extra = []; this.scared = false; this.cause = null; this.fireT = 0; this.burnT = 0;
    this.headGone = false; this.split = null; this.heartOut = false; this.gutted = false; this.cleaved = false; this.unaware = true;
    this.female = !!o.female; this.kind = o.kind ?? 'counselor';
    this.p = {};
    const c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
    for (const [k, [x, y, z]] of Object.entries(REST)) {
      const p = sim.point(o.x + (x * c + z * sn) * s, y * s, o.z + (-x * sn + z * c) * s, (RAD[k] ?? 0.045) * s, MASS[k] ?? 1, this, k);
      p.grip = 0.9; this.p[k] = p;
    }
    this.links = [];
    const L = (a, b, kind = 'rod', k = 1) => { const l = sim.link(this.p[a], this.p[b], kind, k, null, this); this.links.push(l); return l; };
    for (let i = 0; i < HIPS.length; i++) for (let j = i + 1; j < HIPS.length; j++) L(HIPS[i], HIPS[j]);
    for (let i = 0; i < CHEST.length; i++) for (let j = i + 1; j < CHEST.length; j++) L(CHEST[i], CHEST[j]);
    L('pelvis', 'chest', 'rod', 0.12); L('lHip', 'lSh', 'rod', 0.1); L('rHip', 'rSh', 'rod', 0.1); L('pelvis', 'neck', 'min');   // the spine bends, a bit
    L('neck', 'head'); L('head', 'chest', 'min'); L('head', 'lSh', 'min'); L('head', 'rSh', 'min'); L('head', 'spine', 'rod', 0.08);
    for (const sd of ['l', 'r']) {
      L(sd + 'Sh', sd + 'El'); L(sd + 'El', sd + 'Wr'); L(sd + 'Wr', sd + 'Fin'); L(sd + 'El', sd + 'Fin');
      L(sd + 'Sh', sd + 'Wr', 'min'); L('chest', sd + 'El', 'min');
      L(sd + 'Hip', sd + 'Kn'); L(sd + 'Kn', sd + 'An'); L(sd + 'An', sd + 'Toe'); L(sd + 'Kn', sd + 'Toe');
      L(sd + 'Hip', sd + 'An', 'min'); L('pelvis', sd + 'Kn', 'min');
    }
    L('lKn', 'rKn', 'min'); L('lAn', 'rAn', 'min');
    this.len = {};
    for (const [n, a, b] of PARTS) this.len[n] = this.p[a].dist(this.p[b]);

    // ---- meshes
    const G = bodyGeos(this.female);
    const skin = new THREE.MeshLambertMaterial({ color: o.skin, map: fleshTex });
    // each person's shirt is their own canvas, so blood soaks into it where they were cut
    this.shirtCanvas = document.createElement('canvas'); this.shirtCanvas.width = this.shirtCanvas.height = 256;
    this.shirtCanvas.getContext('2d').drawImage(shirtTex(o.shirt, o.print).image, 0, 0, 256, 256);
    const shirtT = new THREE.CanvasTexture(this.shirtCanvas); shirtT.colorSpace = THREE.SRGBColorSpace;
    const shirt = new THREE.MeshLambertMaterial({ map: shirtT });
    const pants = new THREE.MeshLambertMaterial({ color: o.pants, map: fabricTex });
    const shoe = new THREE.MeshLambertMaterial({ color: o.shoes ?? 0xd8d4cc });
    this.mats = { skin, shirt, pants, shoe }; this.shirtT = shirtT;
    this.group = new THREE.Group(); scene.add(this.group);
    const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; return m; };
    this.parts = {};
    const part = (name, ...meshes) => { const g = new THREE.Group(); for (const m of meshes) g.add(m); this.group.add(g); this.parts[name] = { name, g, from: PARTS.find(p => p[0] === name)[1], to: PARTS.find(p => p[0] === name)[2], gone: false }; return g; };
    const hipsM = mk(G.hips, pants); hipsM.position.y = -0.1;
    part('hips', hipsM);
    part('torso', mk(G.torso, shirt));
    part('neck', mk(G.neck, skin));
    this.headMat = new THREE.MeshLambertMaterial({ map: realFace(o.look, 'neutral') });
    const head = mk(G.head, this.headMat);
    part('head', head);
    // nose, ears, hair
    const nose = mk(new THREE.ConeGeometry(0.016, 0.042, 8), skin); nose.position.set(0, -0.012, 0.112); nose.rotation.x = Math.PI / 2 + 0.3; nose.scale.set(1, 1, 0.75);
    const tip = mk(new THREE.SphereGeometry(0.012, 8, 6), skin); tip.position.set(0, -0.03, 0.124);
    this.parts.head.g.add(nose, tip);
    for (const sx of [-1, 1]) { const ear = mk(new THREE.SphereGeometry(0.026, 10, 8), skin); ear.scale.set(0.32, 1, 0.62); ear.position.set(sx * 0.104, -0.006, -0.006); this.parts.head.g.add(ear); }
    if (o.hair != null) {
      const hm = new THREE.MeshLambertMaterial({ color: o.hair, map: fabricTex });
      const cap = mk(new THREE.SphereGeometry(0.119, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), hm); cap.scale.set(0.95, 1.08, 1.05); cap.rotation.x = -0.32; cap.position.set(0, 0.016, -0.012);
      this.parts.head.g.add(cap);
      if (o.look?.long) {
        for (let i = 0; i < 5; i++) { const strand = mk(new THREE.CapsuleGeometry(0.035, 0.16, 3, 8), hm); strand.scale.set(1.3, 1, 0.55); strand.position.set((i - 2) * 0.042, -0.1, -0.085 + Math.abs(i - 2) * 0.012); strand.rotation.z = (i - 2) * 0.08; this.parts.head.g.add(strand); }
      }
    }
    if (o.uniform) {   // police cap
      const capM = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.6 });
      const top = mk(new THREE.CylinderGeometry(0.128, 0.118, 0.07, 18), capM); top.position.y = 0.1; this.parts.head.g.add(top);
      const peak = mk(new THREE.BoxGeometry(0.16, 0.012, 0.08), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3 })); peak.position.set(0, 0.07, 0.12); peak.rotation.x = 0.25; this.parts.head.g.add(peak);
      const badge = mk(new THREE.BoxGeometry(0.03, 0.035, 0.005), new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8, roughness: 0.3 })); badge.position.set(0.08, 0.3, 0.12); this.parts.torso.g.add(badge);
      const belt = mk(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.4 })); belt.scale.z = 0.72; belt.position.y = 0.17; this.parts.hips.g.add(belt);
    }
    for (const sd of ['l', 'r']) {
      part(sd + 'Upper', mk(G.upper, skin), mk(G.sleeve, shirt));
      part(sd + 'Fore', mk(G.fore, o.uniform ? shirt : skin));
      const hand = mk(G.hand, skin); const thumb = mk(new THREE.CapsuleGeometry(0.014, 0.04, 3, 8), skin); thumb.position.set(sd === 'l' ? 0.03 : -0.03, 0.05, 0.02); thumb.rotation.z = sd === 'l' ? -0.5 : 0.5;
      part(sd + 'Hand', hand, thumb);
      part(sd + 'Thigh', mk(G.thigh, o.shorts ? skin : pants), ...(o.shorts ? [mk(G.shorts, pants)] : [mk(G.pants, pants)]));
      part(sd + 'Shin', mk(G.shin, skin), ...(o.shorts ? [] : [mk(G.pantsShin, pants)]));
      const sh = mk(G.shoe, shoe); part(sd + 'Foot', sh);
    }
    this.caps = [];
    this.anim = {}; for (const k in REST) this.anim[k] = new V();
    this.sync();
  }

  // ---------------------------------------------------------------- animation
  // Build the pose in the body's own frame, then place it in the world.
  computePose(dt) {
    const A = this.anim, s = this.s, sp = this.speed, run = Math.min(1, Math.max(0, (sp - 1.6) / 1.6)), walk = Math.min(1, sp / 1.0);
    const T = this.time, pose = this.pose;
    const crouch = pose === 'hide' || pose === 'cower' ? 1 : 0;
    const ph = this.phase, bob = (0.018 + run * 0.03) * walk * Math.abs(Math.sin(ph));
    const lean = run * 0.32 + walk * 0.05 + crouch * 0.25;
    const breathe = Math.sin(T * (this.scared ? 4 : 1.6)) * (this.scared ? 0.008 : 0.004);
    const sway = (pose === 'idle' ? Math.sin(T * 0.4) * 0.02 : 0);
    const P = (out, x, y, z) => out.set(x, y, z);
    // spine: pelvis then up, leaning forward about X
    const pelY = 0.96 - bob - crouch * 0.47;
    P(A.pelvis, sway, pelY, 0);
    const up = (len, from, out, extraLean = 0) => out.set(from.x, from.y + Math.cos(lean + extraLean) * len, from.z + Math.sin(lean + extraLean) * len);
    up(0.21, A.pelvis, A.spine); up(0.19, A.spine, A.chest, crouch * 0.2); A.chest.y += breathe; up(0.17, A.chest, A.neck, crouch * 0.1);
    // head: turned toward what they're looking at
    let hy = 0, hp = -lean * 0.6;
    if (this.look) {
      const dx = this.look.x - this.root.x, dz = this.look.z - this.root.z;
      hy = Math.max(-1.2, Math.min(1.2, Math.atan2(dx, dz) - this.yaw)); hy = Math.atan2(Math.sin(hy), Math.cos(hy)); hy = Math.max(-1.2, Math.min(1.2, hy));
    }
    if (pose === 'hide') hp = 0.1;
    this.headTurn = (this.headTurn ?? 0) + (hy - (this.headTurn ?? 0)) * Math.min(1, dt * 5);
    A.head.set(A.neck.x + Math.sin(this.headTurn) * 0.02, A.neck.y + 0.14 * Math.cos(hp), A.neck.z + 0.14 * Math.sin(-hp) * -1 + 0.012);
    // shoulders and hips, the chest counter-twisting against the stride
    const twist = Math.sin(ph) * 0.12 * walk;
    for (const [side, sx] of [['l', -1], ['r', 1]]) {
      const sh = A[side + 'Sh'];
      sh.set(A.chest.x + Math.cos(twist) * 0.19 * sx, A.chest.y + 0.085, A.chest.z + Math.sin(twist) * 0.19 * sx * -1 + Math.sin(lean) * 0.04);
      A[side + 'Hip'].set(A.pelvis.x + 0.095 * sx, A.pelvis.y - 0.04, A.pelvis.z - Math.sin(twist) * 0.04 * sx);
    }
    // legs
    for (const [side, sx, off] of [['l', -1, 0], ['r', 1, Math.PI]]) {
      const p = ph + off, stride = (0.2 + run * 0.28) * walk;
      const foot = t1.set(0.1 * sx, 0.085 + Math.max(0, -Math.sin(p)) * (0.07 + run * 0.18) * walk, Math.cos(p) * stride);
      if (crouch) foot.set(0.13 * sx, 0.085, 0.3);
      if (pose === 'flail') foot.y += Math.max(0, Math.sin(T * 9 + off)) * 0.1;
      A[side + 'An'].copy(foot);
      ik(A[side + 'Hip'], foot, 0.42, 0.415, t2.set(sx * (crouch ? 0.35 : 0.05), 0, 1), A[side + 'Kn']);
      A[side + 'Toe'].set(foot.x + 0.005 * sx, Math.max(0.03, foot.y - 0.055), foot.z + 0.145);
    }
    // arms
    for (const [side, sx, off] of [['l', -1, Math.PI], ['r', 1, 0]]) {
      const sh = A[side + 'Sh'], p = ph + off;
      let hand = t1, bend = t2.set(sx * 0.4, -0.2, -1);
      if (pose === 'phone' && side === 'l') { hand.set(-0.09, A.head.y - 0.02, A.head.z + 0.03); bend.set(-1, -0.6, 0); }
      else if (pose === 'phone') hand.set(0.2, A.pelvis.y + 0.05, 0.05);
      else if (pose === 'aim' && side === 'r') { hand.set(0.05, A.chest.y + 0.08, A.chest.z + 0.55); bend.set(1, -0.5, 0); }
      else if (pose === 'aim') { hand.set(0.02, A.chest.y + 0.06, A.chest.z + 0.48); bend.set(-1, -0.5, 0); }
      else if (pose === 'fumble') { hand.set(0.12 * sx, 1.02 + Math.sin(T * 13 + off) * 0.02, 0.32); bend.set(sx, -0.5, 0); }
      else if (pose === 'warm') { hand.set(0.14 * sx, 1.0, 0.4); bend.set(sx, -1, 0); }
      else if (pose === 'hide') { hand.set(0.1 * sx, 0.62, 0.3); bend.set(sx, 0, -0.3); }
      else if (pose === 'cower' || pose === 'shield') { hand.set(0.07 * sx, A.head.y + 0.06, A.head.z + 0.12); bend.set(sx, -0.3, 0.6); }
      else if (pose === 'flail') { hand.set(0.35 * sx, 1.45 + Math.sin(T * 12 + off) * 0.25, 0.2 + Math.cos(T * 10) * 0.2); bend.set(sx, -1, 0); }
      else if (run > 0.2) { const sw = Math.cos(p) * 0.28 * run; hand.set(0.2 * sx, 1.08 + Math.max(0, sw) * 0.25, sw + 0.08); bend.set(sx * 0.3, -0.4, -1); }   // pumping, elbows bent
      else { const sw = Math.cos(p) * 0.16 * walk; hand.set(0.235 * sx, 0.93 + Math.abs(sw) * 0.15 - crouch * 0.4, sw + 0.03); }
      if (this.scared && pose === 'idle') { hand.set(0.12 * sx, 1.1, 0.15); bend.set(sx, -1, 0); }
      ik(sh, hand, 0.29, 0.25, bend, A[side + 'El']);
      A[side + 'Wr'].copy(t3.subVectors(hand, A[side + 'El']).setLength(0.25).add(A[side + 'El']));
      A[side + 'Fin'].copy(t3.subVectors(A[side + 'Wr'], A[side + 'El']).setLength(0.17).add(A[side + 'Wr']));
    }
  }
  // drive the points to the animated pose (or blend toward it while getting up)
  applyPose(dt) {
    this.computePose(dt);
    const c = Math.cos(this.yaw), sn = Math.sin(this.yaw), s = this.s, k = this.blend < 1 ? Math.min(1, dt * 6) : 1;
    for (const key in this.anim) {
      const p = this.p[key]; if (!p || p.cut) continue;
      if (this.severed.has(key) || this.loose?.has(key)) { if (!p.hand) p.locked = false; continue; }
      const a = this.anim[key];
      const x = this.root.x + (a.x * c + a.z * sn) * s, y = this.ground + a.y * s, z = this.root.z + (-a.x * sn + a.z * c) * s;
      if (k >= 1) p.moveTo(x, y, z, true); else p.moveTo(p.x + (x - p.x) * k, p.y + (y - p.y) * k, p.z + (z - p.z) * k, true);
      p.locked = true;
    }
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt * 2);
  }
  // control: called every frame by the game
  update(dt, floorAt, push) {
    this.time += dt;
    if (this.alive && this.bleed > 0) { this.hp -= this.bleed * dt; if (this.hp <= 0) this.die(); }
    if (this.fireT > 0) this.burn(dt);
    if (this.mode === 'anim') {
      // turn toward where they're going and move
      let want = this.yaw;
      if (this.goal) { want = Math.atan2(this.goal.x - this.root.x, this.goal.z - this.root.z); if (Math.hypot(this.goal.x - this.root.x, this.goal.z - this.root.z) < 0.3) this.wantSpeed = 0; }
      else if (this.face != null) want = this.face;
      let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * (this.speed > 2 ? 6 : 4));
      const target = this.goal ? this.wantSpeed * Math.max(0.2, Math.cos(d)) : 0;
      this.speed += (target - this.speed) * Math.min(1, dt * 3);
      this.root.x += Math.sin(this.yaw) * this.speed * dt; this.root.z += Math.cos(this.yaw) * this.speed * dt;
      push?.(this.root);
      this.phase += this.speed * dt * (this.speed > 2 ? 4.4 : 5.6);
      this.ground = floorAt(this.root.x, this.root.z);
      this.applyPose(dt);
    } else {
      for (const k in this.p) if (!this.p[k].hand) this.p[k].locked = false;
      if (this.alive) this.struggle(dt);
      if (this.alive && !this.held && this.state !== 'out') {
        this.downT -= dt;
        if (this.downT <= 0 && this.canStand()) this.getUp(floorAt);
      }
      if (this.state === 'out' && (this.outT -= dt) <= 0) { this.state = null; this.downT = 0.5; }
    }
    // face
    const expr = !this.alive ? 'dead' : this.state === 'out' ? 'out' : this.chokeT > 0.4 && this.choked ? 'choke' : this.hp < this.maxHp * 0.55 ? 'bleed' : this.scared ? 'fear' : 'neutral';
    if (expr !== this.expr && !this.headGone) { this.expr = expr; this.headMat.map = realFace(this.o.look, expr, this.bruise ?? 0); this.headMat.needsUpdate = true; }
  }
  canStand() { return !['lHip', 'rHip', 'lKn', 'rKn'].some(j => this.severed.has(j)) && !this.split; }
  // go over to physics: tripped, hit, grabbed, dead
  ragdoll(seconds = 0) {
    if (this.mode === 'rag') { this.downT = Math.max(this.downT, seconds); return; }
    this.mode = 'rag'; this.downT = seconds;
    for (const k in this.p) this.p[k].locked = false;
  }
  getUp(floorAt) {
    const P = this.p;
    this.root.x = P.pelvis.x; this.root.z = P.pelvis.z;
    t1.subVectors(P.rSh, P.lSh); this.yaw = Math.atan2(-t1.z, t1.x) ; // facing perpendicular to the shoulders
    this.mode = 'anim'; this.blend = 0; this.speed = 0;
    this.ground = floorAt(this.root.x, this.root.z);
  }
  // alive and not in control: kicking, clawing at whoever has them, crawling away
  struggle(dt) {
    if (this.state === 'out') return;
    const P = this.p;
    if (this.held && (this.kickT = (this.kickT ?? 0) - dt) <= 0) {
      this.kickT = 0.18 + R() * 0.25;
      for (const k of ['lAn', 'rAn', 'lWr', 'rWr']) if (!this.severed.has(k) && !P[k].locked) P[k].addVel((R() - 0.5) * 3, (R() - 0.3) * 2.5, (R() - 0.5) * 3);
    }
    if (this.held && this.grabbedBy) {   // hands go to the hand that's got them
      for (const k of ['lWr', 'rWr']) { const p = P[k]; if (this.severed.has(k.replace('Wr', 'Sh')) || this.severed.has(k.replace('Wr', 'El')) || p.locked) continue; const g = this.grabbedBy; p.x += (g.x - p.x) * 0.06; p.y += (g.y - 0.05 - p.y) * 0.06; p.z += (g.z - p.z) * 0.06; }
    }
    if (!this.held && !this.canStand() && this.crawlTo) {
      // dragging themselves along by their arms
      if ((this.crawlT = (this.crawlT ?? 0) - dt) <= 0) {
        this.crawlT = 0.9;
        const dx = this.crawlTo.x - P.chest.x, dz = this.crawlTo.z - P.chest.z, d = Math.hypot(dx, dz) || 1;
        for (const k of ['chest', 'lWr', 'rWr', 'neck']) if (!this.severed.has(k)) P[k].addVel(dx / d * 1.6, 0.6, dz / d * 1.6);
      }
    }
  }

  // ---------------------------------------------------------------- hits and wounds
  // which part a segment (a blade, a fist) passes through: { part, t, d }
  partAt(a, b, pad = 0.03) {
    let best = null, bd = 1e9;
    const R_ = { hips: 0.15, torso: 0.16, neck: 0.06, head: 0.12, lUpper: 0.055, rUpper: 0.055, lFore: 0.042, rFore: 0.042, lHand: 0.045, rHand: 0.045, lThigh: 0.085, rThigh: 0.085, lShin: 0.058, rShin: 0.058, lFoot: 0.05, rFoot: 0.05 };
    for (const n in this.parts) {
      const pt = this.parts[n]; if (pt.gone) continue;
      const pa = pt.fromPt ?? this.p[pt.from], pb = pt.to === pt.from ? pa : this.p[pt.to];
      const r = (R_[n] + pad) * this.s, d2 = segDist(a, b, pa, pb);
      if (d2 < r * r && d2 < bd) { bd = d2; best = { part: n, t: segDist.t, s: segDist.s, d: Math.sqrt(d2) }; }
    }
    return best;
  }
  jp(name) { return this.partFrom?.[name] ?? this.p[name]; }
  // a cut, a stab, a blow. dir: the way the blade was moving (unit). Returns what happened.
  hit(partName, point, dir, kind, dmg) {
    const pt = this.parts[partName]; if (!pt || pt.gone) return null;
    this.unaware = false;
    this.wound(partName, point, dir, kind);
    const isHead = partName === 'head' || partName === 'neck';
    this.hp -= dmg * (isHead ? 2.2 : partName === 'torso' || partName === 'hips' ? 1 : 0.55);
    this.bleed += kind === 'stab' ? 3 : kind === 'slash' ? 2 : 0.3;
    this.blood.spray(point, t1.copy(dir).multiplyScalar(-0.3).add(t2.set(0, 0.4, 0)).normalize(), kind === 'blunt' ? 6 : 14, 2.5, 0.6);
    if (this.alive && this.mode === 'anim' && (kind === 'blunt' || dmg > 25)) this.ragdoll(1.2 + R());
    if (this.hp <= 0 && this.alive) this.die();
    return pt;
  }
  wound(partName, point, dir, kind) {
    const pt = this.parts[partName]; if (!pt || pt.gone || this.wounds.length > 40) return;
    // into the part's frame; put the decal on the surface facing the hit
    pt.g.updateMatrixWorld(true);
    const local = pt.g.worldToLocal(t1.copy(point));
    const ax = partName === 'head' ? new V(local.x, local.y, local.z) : new V(local.x, 0, local.z);
    if (ax.lengthSq() < 1e-6) ax.set(0, 0, 1);
    ax.normalize();
    const radius = { head: 0.11, torso: 0.15, hips: 0.14, neck: 0.05 }[partName] ?? (partName.includes('Thigh') ? 0.08 : partName.includes('Upper') ? 0.055 : 0.045);
    const m = new THREE.Mesh(plane, woundMat[kind === 'stab' ? 'stab' : kind === 'blunt' ? 'hole' : 'slash']);
    m.position.set(ax.x * radius * 1.06, partName === 'head' ? ax.y * radius : Math.max(0, Math.min(this.len[partName] ?? 0.3, local.y)), ax.z * radius * 1.06);
    m.lookAt(t2.copy(m.position).add(t3.copy(ax)));
    // slashes run across the line of the cut
    const ld = t3.copy(dir).transformDirection(mb.copy(pt.g.matrixWorld).invert());
    m.rotateZ(Math.atan2(ld.y, ld.x) + Math.PI / 2);
    const sz = kind === 'slash' ? 0.07 : kind === 'stab' ? 0.05 : 0.06;
    m.scale.set(sz * 0.6, sz * (kind === 'slash' ? 1.8 : 1), 1);
    pt.g.add(m); this.wounds.push(m);
    // soak the shirt where it went in
    if (partName === 'torso' || partName === 'lUpper' || partName === 'rUpper') this.soak(partName === 'torso' ? Math.atan2(local.x, local.z) / (Math.PI * 2) + 0.5 : 0.1, partName === 'torso' ? 1 - local.y / 0.4 : 0.9, kind === 'stab' ? 22 : 30);
  }
  // blood spreading through the shirt
  soak(u, v, r) {
    const g = this.shirtCanvas.getContext('2d'), x = ((u % 1) + 1) % 1 * 256, y = v * 256;
    for (let i = 0; i < 3; i++) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r * (1 + i * 0.5));
      gr.addColorStop(0, 'rgba(70,4,4,0.9)'); gr.addColorStop(0.6, 'rgba(90,6,6,0.55)'); gr.addColorStop(1, 'rgba(90,6,6,0)');
      g.fillStyle = gr; g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    }
    g.fillStyle = 'rgba(70,4,4,0.75)';
    for (let i = 0; i < 4; i++) g.fillRect(x - r * 0.5 + R() * r, y, 3 + R() * 4, r + R() * r * 1.5);   // runs down
    this.shirtT.needsUpdate = true;
  }

  // ---------------------------------------------------------------- taking them apart
  // Cut at a joint: everything past it comes away as its own piece.
  sever(joint, force = 1) {
    if (this.severed.has(joint) || !BELOW[joint]) return false;
    if (BELOW[joint].some(j => this.severed.has(j) && false)) return false;
    const below = new Set(BELOW[joint]);
    if (below.has('head') && this.headGone) return false;
    this.severed.add(joint);
    this.loose ??= new Set(); for (const k of BELOW[joint]) this.loose.add(k);
    const J = this.p[joint];
    // a new point for the piece that's coming away
    const J2 = this.sim.point(J.x, J.y, J.z, J.r, 1, this, joint + '*');
    J2.px = J.px; J2.py = J.py; J2.pz = J.pz;
    for (const l of this.links) {
      const aIn = below.has(l.a.tag), bIn = below.has(l.b.tag);
      const aJ = l.a === J, bJ = l.b === J;
      if ((aIn && bJ) || (bIn && aJ)) { if (aJ) l.a = J2; else l.b = J2; }
      else if (aIn !== bIn && !(aJ || bJ)) l.cut = true;
      else if (aIn !== bIn) l.cut = true;
    }
    // waist: the two halves keep their shape
    this.sim.links = this.sim.links.filter(l => !l.cut); this.links = this.links.filter(l => !l.cut);
    this.partFrom ??= {};
    // parts starting at the joint on the far side now hang off the new point
    for (const n in this.parts) { const pt = this.parts[n]; if (pt.from === joint && below.has(pt.to)) pt.fromPt = J2; if (joint === 'spine' && n === 'torso') pt.fromPt = J2; }
    this.pieces ??= []; this.pieces.push({ joint, J, J2, below });
    // raw ends on both sides
    const r = { lSh: 0.05, rSh: 0.05, lEl: 0.04, rEl: 0.04, lWr: 0.03, rWr: 0.03, lHip: 0.08, rHip: 0.08, lKn: 0.052, rKn: 0.052, lAn: 0.035, rAn: 0.035, neck: 0.05, spine: 0.14 }[joint] * this.s;
    const capMat = joint === 'spine' ? waistMat : stumpMat;
    this.capAt(J, joint, false, r, capMat); this.capAt(J2, joint, true, r, capMat);
    // pump from the stump
    const along = (out) => { const nb = this.neighbour(J, below); return out.subVectors(J, nb).normalize(); };
    this.blood.spurt(J, out => along(out), this.alive ? 8 : 3, joint === 'neck' ? 1.4 : 1);
    this.blood.spray(J, along(t1), 30, 3, 0.7);
    this.blood.pool(this.p.pelvis, 1.4);
    // the piece flies off a little
    for (const k of below) this.p[k].addVel((R() - 0.5) * 1.5 * force, 1.2 * force, (R() - 0.5) * 1.5 * force);
    J2.addVel((R() - 0.5) * 1.5 * force, 1.2 * force, (R() - 0.5) * 1.5 * force);
    this.bleed += 8;
    if (joint === 'neck' || joint === 'spine') { this.hp = 0; this.die(); }
    else if (this.alive) { this.ragdoll(2); this.onSever?.(joint); if (joint.endsWith('Hip') || joint.endsWith('Kn')) this.downT = 99; }
    return true;
  }
  neighbour(J, below) { for (const l of this.links) { if (l.a === J && !below.has(l.b.tag) && l.b.tag !== J.tag) return l.b; if (l.b === J && !below.has(l.a.tag) && l.a.tag !== J.tag) return l.a; } return this.p.chest; }
  capAt(point, joint, far, r, mat) {
    const m = new THREE.Mesh(disc, mat); m.scale.setScalar(r); m.frustumCulled = false;
    this.group.add(m); this.caps.push({ m, point, joint, far });
  }
  // split through the middle: chest, arms and head come off the hips
  splitWaist() {
    if (this.split || this.severed.has('spine')) return false;
    this.split = 'waist'; this.cause = 'halved';
    this.sever('spine', 1.5);
    this.entrails(this.p.pelvis, 8); this.entrails(this.p.spine, 6);
    this.blood.chunk(this.p.spine, 'meat', 6, 3);
    return true;
  }
  decapitate(force = 1) { if (this.headGone || this.severed.has('neck')) return false; this.sever('neck', force); this.cause ??= 'decapitated'; return true; }
  // the skull gives way
  crushHead() {
    if (this.headGone) return false;
    this.headGone = true;
    const h = this.p.head;
    this.parts.head.g.visible = false; this.parts.head.gone = true;
    this.blood.chunk(h, 'bone', 8, 2.5); this.blood.chunk(h, 'brain', 8, 2.5); this.blood.chunk(h, 'meat', 6, 2.5);
    this.blood.spray(h, UP, 50, 3.5, 1.2);
    this.blood.spurt(this.p.neck, out => out.subVectors(this.p.neck, this.p.chest).normalize(), 6, 1.2);
    this.capAt(this.p.neck, 'neck', false, 0.05 * this.s, stumpMat);
    this.blood.pool(this.p.chest, 1.3);
    this.hp = 0; this.die();
    return true;
  }
  // an axe down through the skull: the head opens like a book
  cleaveHead() {
    if (this.headGone || this.cleaved) return false;
    this.cleaved = true;
    const g = this.parts.head.g, head = g.children[0];
    head.visible = false;
    for (const sx of [-1, 1]) {
      const half = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18, sx < 0 ? Math.PI : 0, Math.PI), this.headMat); half.scale.set(0.92, 1.06, 1);
      const pivot = new THREE.Group(); pivot.position.y = -0.09; pivot.rotation.z = sx * 0.35; half.position.y = 0.09; pivot.add(half);
      const cap = new THREE.Mesh(disc, brainMat); cap.scale.set(0.1, 0.1, 1); cap.rotation.y = sx * Math.PI / 2; cap.position.set(-sx * 0.001, 0.09, 0); pivot.add(cap);
      g.add(pivot);
    }
    for (const c of g.children) if (c.type === 'Mesh' && c !== head && c.geometry.type !== 'SphereGeometry') c.visible = c.geometry.type === 'CapsuleGeometry';
    this.blood.spray(this.p.head, UP, 40, 3, 1); this.blood.chunk(this.p.head, 'brain', 4, 1.5);
    this.blood.spurt(this.p.head, out => out.set(0, 1, 0), 5, 1);
    this.hp = 0; this.cause = 'head split open'; this.die();
    return true;
  }
  // belly opened: the gut spills out and hangs
  disembowel() {
    if (this.gutted || this.split) return false;
    this.gutted = true;
    this.entrails(this.p.spine, 10, true);
    this.blood.spray(this.p.spine, t1.subVectors(this.p.spine, this.p.chest).add(t2.set(0, 0.5, 0)).normalize(), 30, 2, 0.8);
    this.soak(0.5, 0.25, 50); this.soak(0.5, 0.45, 40);
    this.bleed += 10;
    if (this.alive) { this.onSever?.('gut'); }
    return true;
  }
  // a rope of gut from a point on the body
  entrails(from, n, front = false) {
    let prev = null;
    const P = this.p, fwd = t1.subVectors(P.lSh, P.rSh).cross(t2.subVectors(P.neck, P.pelvis)).normalize().multiplyScalar(-1);
    for (let i = 0; i < n; i++) {
      const x = from.x + (front ? fwd.x * (0.14 + i * 0.03) : (R() - 0.5) * 0.1), z = from.z + (front ? fwd.z * (0.14 + i * 0.03) : (R() - 0.5) * 0.1);
      const p = this.sim.point(x, from.y - i * 0.05, z, 0.025, 0.15, this, 'gut');
      this.sim.link(i === 0 ? from : prev, p, 'rod', 1, 0.065, this);
      const m = new THREE.Mesh(gutGeo, gutMat); m.frustumCulled = false; this.group.add(m);
      this.guts.push({ a: i === 0 ? from : prev, b: p, m });
      prev = p;
    }
  }
  // punched through the ribs and pulled out: returns the heart so a hand can hold it
  ripHeart() {
    if (this.heartOut || this.split) return null;
    this.heartOut = true;
    const P = this.p, fwd = t1.subVectors(P.lSh, P.rSh).cross(t2.subVectors(P.neck, P.pelvis)).normalize().multiplyScalar(-1);
    const at = t2.copy(P.chest).lerp(P.neck, 0.2).addScaledVector(fwd, 0.14);
    const heart = this.sim.point(at.x, at.y, at.z, 0.045, 0.3, this, 'heart');
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), heartMat); m.scale.set(1, 1.25, 0.9); m.frustumCulled = false; this.group.add(m);
    this.extra.push({ p: heart, m });
    // the hole it left
    this.wound('torso', at, fwd, 'blunt'); this.wound('torso', at, fwd, 'stab');
    this.soak(0.5, 0.3, 60);
    this.blood.spurt(P.chest, out => out.copy(fwd).add(t3.set(0, 0.3, 0)).normalize(), 5, 1.3);
    this.blood.spray(at, fwd, 40, 3, 0.6);
    this.hp = 0; this.cause = 'heart'; this.die();
    return heart;
  }
  ignite() { if (this.fireT <= 0) this.onIgnite?.(); this.fireT = 7; }
  burn(dt) {
    this.fireT -= dt; this.burnT += dt;
    if (this.alive) { this.hp -= 11 * dt; if (this.hp <= 0) { this.cause = 'burn'; this.die(); } }
    const keys = Object.keys(this.p);
    for (let i = 0; i < 3; i++) { const p = this.p[keys[Math.floor(R() * keys.length)]]; this.blood.flame(p.x + (R() - 0.5) * 0.1, p.y, p.z + (R() - 0.5) * 0.1, 0.08 + R() * 0.12, 0.4 + R() * 0.3); if (R() < 0.25) this.blood.flame(p.x, p.y + 0.2, p.z, 0.2, 1.4, true, 0.5); }
    const k = Math.min(1, dt * 0.25);
    for (const m of Object.values(this.mats)) m.color.lerp(new THREE.Color(0x1a1210), k);
    this.headMat.color.lerp(new THREE.Color(0x2a1a14), k);
  }
  die() {
    if (!this.alive) return;
    this.alive = false; this.hp = 0; this.scared = true;
    this.ragdoll(1e9);
    // a last push the way they were going
    const v = this.speed;
    if (v > 0.5) for (const k in this.p) this.p[k].addVel(Math.sin(this.yaw) * v * 0.6, 0, Math.cos(this.yaw) * v * 0.6);
    this.blood.pool(this.p.chest, this.bleed > 5 ? 1.4 : 0.8);
    this.onDeath?.(this);
  }

  // ---------------------------------------------------------------- draw
  frameOf(a, b, side, out) {   // y along a->b, z toward 'side' projected
    const y = t1.subVectors(b, a).normalize();
    const z = t2.copy(side).addScaledVector(y, -side.dot(y));
    if (z.lengthSq() < 1e-6) z.set(0, 0, 1).addScaledVector(y, -y.z);
    z.normalize(); const x = t3.crossVectors(y, z);
    return out.makeBasis(x, y, z);
  }
  sync() {
    const P = this.p;
    // body forward, from the shoulders and the spine
    const fwd = t4.subVectors(P.rSh, P.lSh).cross(t1.subVectors(P.neck, P.spine)).normalize();
    if (!isFinite(fwd.x)) fwd.set(0, 0, 1);
    const F = fwd.clone(), hipFwd = new V().subVectors(P.rHip, P.lHip).cross(t1.subVectors(P.spine, P.pelvis)).normalize();
    for (const n in this.parts) {
      const pt = this.parts[n]; if (pt.gone) continue;
      const a = pt.fromPt ?? P[pt.from], b = P[pt.to];
      let side = F;
      if (n === 'hips' || n.includes('Thigh') || n.includes('Shin')) side = hipFwd;
      if (n.includes('Foot')) { side = t1.set(0, 1, 0); }
      if (n === 'head') {
        // the head's own frame: up from the neck, facing where the face points
        const up = new V().subVectors(P.head, this.parts.neck.fromPt ?? P.neck).normalize();
        pt.g.quaternion.setFromRotationMatrix(this.frameOf(new V(), up, F, mb));
        pt.g.position.set(P.head.x, P.head.y, P.head.z);
        continue;
      }
      if (n === 'neck') { pt.g.quaternion.setFromRotationMatrix(this.frameOf(a, b, F, mb)); pt.g.position.set(a.x, a.y, a.z); continue; }
      pt.g.quaternion.setFromRotationMatrix(this.frameOf(a, b, side, mb));
      pt.g.position.set(a.x, a.y, a.z);
      if (n === 'hips') { pt.g.position.set(P.pelvis.x, P.pelvis.y, P.pelvis.z); }
    }
    for (const c of this.caps) {
      const nb = c.far ? this.capNeighbour(c) : this.neighbour(c.point, BELOW[c.joint] ? new Set(BELOW[c.joint]) : new Set());
      if (!nb) continue;
      t1.subVectors(c.point, nb).normalize();
      c.m.position.set(c.point.x, c.point.y, c.point.z); c.m.quaternion.setFromUnitVectors(t2.set(0, 0, 1), t1);
    }
    for (const g of this.guts) { g.m.position.set((g.a.x + g.b.x) / 2, (g.a.y + g.b.y) / 2, (g.a.z + g.b.z) / 2); g.m.quaternion.setFromUnitVectors(UP, t1.set(g.b.x - g.a.x, g.b.y - g.a.y, g.b.z - g.a.z).normalize()); }
    for (const e of this.extra) e.m.position.set(e.p.x, e.p.y, e.p.z);
  }
  capNeighbour(c) { for (const l of this.links) { if (l.a === c.point) return l.b; if (l.b === c.point) return l.a; } return null; }
  dispose() {
    this.scene.remove(this.group); this.sim.remove(this); this.gone = true;
    for (const k in this.p) this.p[k].dead = true;
    this.shirtT.dispose();
  }
}
