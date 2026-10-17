// People: sculpted bodies (skin over muscle, clothes over skin, organs inside)
// on a jointed skeleton that is animated while they're in control and goes
// over to physics when they aren't. Blades cut the meshes wherever they pass:
// limbs, torsos and heads come apart along the line of the cut, capped with
// flesh and bone, and what's inside falls out.
import * as THREE from '../vendor/three.module.js';
import { segDist } from './sim.js?v=15';
import { realFace, fleshTex, fabricTex, shirtTex } from './faces.js?v=15';
import { bodyParts, ORGANS, organGeo, LEN } from './anatomy.js?v=15';
import { sliceGeometry } from './slice.js?v=15';

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
// collision radius of each point: as thick as the flesh round it, so nothing lies half through the floor
const RAD = { pelvis: 0.13, spine: 0.12, chest: 0.13, neck: 0.065, head: 0.12,
  lSh: 0.095, rSh: 0.095, lEl: 0.05, rEl: 0.05, lWr: 0.035, rWr: 0.035, lFin: 0.03, rFin: 0.03,
  lHip: 0.095, rHip: 0.095, lKn: 0.06, rKn: 0.06, lAn: 0.05, rAn: 0.05, lToe: 0.045, rToe: 0.045 };
const HIPS = ['pelvis', 'spine', 'lHip', 'rHip'], CHEST = ['spine', 'chest', 'neck', 'lSh', 'rSh'];
// what comes away with each joint when it's cut
const BELOW = {
  lSh: ['lEl', 'lWr', 'lFin'], lEl: ['lWr', 'lFin'], lWr: ['lFin'], rSh: ['rEl', 'rWr', 'rFin'], rEl: ['rWr', 'rFin'], rWr: ['rFin'],
  lHip: ['lKn', 'lAn', 'lToe'], lKn: ['lAn', 'lToe'], lAn: ['lToe'], rHip: ['rKn', 'rAn', 'rToe'], rKn: ['rAn', 'rToe'], rAn: ['rToe'],
  neck: ['head'], spine: ['chest', 'neck', 'head', 'lSh', 'rSh', 'lEl', 'lWr', 'lFin', 'rEl', 'rWr', 'rFin'],
};
const PARTS = [
  ['hips', 'pelvis', 'spine'], ['torso', 'spine', 'neck'], ['neck', 'neck', 'head'], ['head', 'head', 'head'],
  ['lUpper', 'lSh', 'lEl'], ['lFore', 'lEl', 'lWr'], ['lHand', 'lWr', 'lFin'], ['rUpper', 'rSh', 'rEl'], ['rFore', 'rEl', 'rWr'], ['rHand', 'rWr', 'rFin'],
  ['lThigh', 'lHip', 'lKn'], ['lShin', 'lKn', 'lAn'], ['lFoot', 'lAn', 'lToe'], ['rThigh', 'rHip', 'rKn'], ['rShin', 'rKn', 'rAn'], ['rFoot', 'rAn', 'rToe'],
];
const baseOf = n => n.split('#')[0];
const kindOf = n => { const b = baseOf(n); return b.startsWith('l') || b.startsWith('r') ? b.slice(1).toLowerCase() : b; };   // 'lFore#2' -> 'fore'
const RADIUS = { hips: 0.15, torso: 0.16, neck: 0.06, head: 0.12, upper: 0.055, fore: 0.045, hand: 0.045, thigh: 0.09, shin: 0.06, foot: 0.05, chunk: 0.07 };

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
// the body wall cut through: red muscle in bands with yellow fat between (the cavity is a real hole now)
const waistTex = tex(128, 128, (g, s) => {
  g.fillStyle = '#7a0c0a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${120 + R() * 70 | 0},${10 + R() * 20 | 0},16,0.6)`; g.lineWidth = 1 + R() * 2.5; const y = R() * s; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + (R() - 0.5) * 20, s * 0.7, y + (R() - 0.5) * 20, s, y + (R() - 0.5) * 10); g.stroke(); }
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${190 + R() * 30 | 0},${140 + R() * 30 | 0},${70 + R() * 20 | 0},0.6)`; g.beginPath(); g.ellipse(R() * s, R() * s, 2 + R() * 5, 1.5 + R() * 2.5, R() * 3, 0, 7); g.fill(); }
});
// the inside of the body: a wet, dark membrane laced with vessels
const cavityTex = tex(128, 128, (g, s) => {
  g.fillStyle = '#5a0c0a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${90 + R() * 60 | 0},10,10,0.35)`; g.beginPath(); g.arc(R() * s, R() * s, 4 + R() * 14, 0, 7); g.fill(); }
  for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(40,10,40,0.5)'; g.lineWidth = 0.8 + R() * 1.5; let x = R() * s, y = R() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (R() - 0.5) * 24; y += (R() - 0.5) * 24; g.lineTo(x, y); } g.stroke(); }
});
const cavityMat = new THREE.MeshStandardMaterial({ map: cavityTex, roughness: 0.22, metalness: 0.05 });
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


// the inside of a head: skull, then brain
const brainTex = tex(128, 128, (g, s) => {
  const c = s / 2;
  g.fillStyle = '#d8c8a8'; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
  g.fillStyle = '#c4889a'; g.beginPath(); g.arc(c, c, c * 0.86, 0, 7); g.fill();
  g.strokeStyle = 'rgba(120,50,70,0.8)'; g.lineWidth = 2.5;
  for (let i = 0; i < 26; i++) { g.beginPath(); let x = c + (R() - 0.5) * c * 1.4, y = c + (R() - 0.5) * c * 1.4; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 16; y += (R() - 0.5) * 16; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(90,0,0,0.6)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(c + (R() - 0.5) * c, c + (R() - 0.5) * c, 4 + R() * 6, 0, 7); g.fill(); }
});
const brainCapMat = new THREE.MeshStandardMaterial({ map: brainTex, roughness: 0.3, side: THREE.DoubleSide });
const organCutMat = new THREE.MeshStandardMaterial({ color: 0x6a0c0a, roughness: 0.3, side: THREE.DoubleSide });
// the heart on its own, centred on itself (for holding up)
let heartG = null;
function heartGeo() { if (!heartG) { heartG = organGeo('heart').clone(); heartG.translate(0.022, -0.2, -0.035); } return heartG; }
// wet organs: a vein-laced texture, tinted per organ
const organTex = tex(256, 128, (g, w, h) => {
  g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 20); g.save(); g.translate(R() * w, R() * h); gr.addColorStop(0, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-20, -20, 40, 40); g.restore(); }
  g.strokeStyle = 'rgba(80,0,20,0.5)'; g.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) { g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 30; y += (R() - 0.5) * 20; g.lineTo(x, y); } g.stroke(); }
});
const organMats = {};
function organMat(o) { return organMats[o.name] ??= new THREE.MeshStandardMaterial({ color: o.color, map: o.bone ? null : organTex, roughness: o.bone ? 0.6 : 0.22, metalness: 0.05 }); }
// skin and cloth bump: pores and weave catch the light
const skinBump = tex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 100 + R() * 70 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 1, 1); } });
const hairTex = tex(128, 256, (g, w, h) => {
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i++) { const x = R() * w, y = R() * h, v = 90 + R() * 120 | 0; g.strokeStyle = `rgba(${v},${v},${v},0.6)`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 4, y + 12, x + (R() - 0.5) * 6, y + 24 + R() * 20); g.stroke(); }
});
const clothBump = tex(128, 128, (g, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 110 + ((x + y) % 4 < 2 ? 30 : 0) + R() * 20 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); } });
for (const t of [skinBump, clothBump]) { t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; }
hairTex.wrapS = hairTex.wrapT = THREE.RepeatWrapping; hairTex.repeat.set(3, 2);
clothBump.repeat.set(6, 6);
// an eye: white with fine veins, the iris at u = 0.25 (the sphere's +Z), a black pupil
const eyeCache = {};
function eyeTex(iris) {
  return eyeCache[iris] ??= tex(256, 128, (g, w, h) => {
    g.fillStyle = '#d6cdbf'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(170,40,40,0.35)'; g.lineWidth = 0.8;
    for (let i = 0; i < 18; i++) { g.beginPath(); let x = w * 0.25 + (R() < 0.5 ? -1 : 1) * (40 + R() * 30), y = R() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (w * 0.25 - x) * 0.25 + (R() - 0.5) * 8; y += (R() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); }
    const cx = w * 0.25, cy = h * 0.5, r = 22;
    const col = '#' + iris.toString(16).padStart(6, '0');
    g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    for (let a = 0; a < 40; a++) { g.strokeStyle = a % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(cx + Math.cos(a / 40 * 6.28) * 7, cy + Math.sin(a / 40 * 6.28) * 7); g.lineTo(cx + Math.cos(a / 40 * 6.28) * r, cy + Math.sin(a / 40 * 6.28) * r); g.stroke(); }
    g.strokeStyle = '#141008'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
    g.fillStyle = '#060404'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
  });
}
const teethMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.3 });
const mouthMat = new THREE.MeshLambertMaterial({ color: 0x3a0a0a });
const eyeLidGeo = new THREE.SphereGeometry(0.0131, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), lowLidGeo = new THREE.SphereGeometry(0.013, 16, 4, 0, Math.PI * 2, Math.PI * 0.7, Math.PI * 0.3);
const eyeGeo = new THREE.SphereGeometry(0.0118, 18, 12);
// where the jaw splits from the skull: below a plane through the corner of the mouth and the hinge by the ear
const HINGE = new V(0, -0.033, -0.012), MOUTH = new V(0, -0.0625, 0.1);
const jawN = new V().subVectors(MOUTH, HINGE).cross(new V(1, 0, 0)).normalize().negate();   // points down, away from the skull: the jaw side
const jawD = jawN.dot(HINGE);

let pieceN = 0;

export class Human {
  // opts: x, z, yaw, scale, female, skin, hair, look, shirt, print, pants, shorts, shoes, kind, uniform
  constructor(scene, sim, blood, o) {
    this.scene = scene; this.sim = sim; this.blood = blood; this.o = o;
    const s = this.s = o.scale ?? 1;
    this.root = { x: o.x, z: o.z }; this.yaw = o.yaw ?? 0;
    this.alive = true; this.hp = o.hp ?? 100; this.maxHp = this.hp; this.bleed = 0;
    this.mode = 'anim'; this.pose = 'idle'; this.speed = 0; this.wantSpeed = 0; this.goal = null; this.face = null; this.look = null;
    this.phase = R() * 6; this.time = R() * 10; this.downT = 0; this.blend = 1; this.held = 0; this.chokeT = 0; this.outT = 0;
    this.severed = new Set(); this.loose = new Set(); this.wounds = []; this.guts = []; this.extra = []; this.scared = false; this.cause = null; this.fireT = 0; this.burnT = 0;
    this.headGone = false; this.split = null; this.heartOut = false; this.gutted = false; this.cleaved = false; this.unaware = true; this.legCut = false;
    this.female = !!o.female; this.kind = o.kind ?? 'counselor';
    this.stubs = []; this.ownGeos = []; this.organs = [];
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

    // ---- materials: skin with pores, a shirt that is this person's own canvas (blood soaks into it), trousers, shoes
    const skin = new THREE.MeshLambertMaterial({ color: o.skin, map: fleshTex, bumpMap: skinBump, bumpScale: 0.5 });
    this.shirtCanvas = document.createElement('canvas'); this.shirtCanvas.width = this.shirtCanvas.height = 256;
    this.shirtCanvas.getContext('2d').drawImage(shirtTex(o.shirt, o.print).image, 0, 0, 256, 256);
    const shirtT = new THREE.CanvasTexture(this.shirtCanvas); shirtT.colorSpace = THREE.SRGBColorSpace;
    const shirt = new THREE.MeshLambertMaterial({ map: shirtT, bumpMap: clothBump, bumpScale: 0.6 });
    const pants = new THREE.MeshLambertMaterial({ color: o.pants, map: fabricTex, bumpMap: clothBump, bumpScale: 0.8 });
    const shoe = new THREE.MeshLambertMaterial({ color: o.shoes ?? 0xd8d4cc, bumpMap: clothBump, bumpScale: 0.5 });
    const hair = new THREE.MeshLambertMaterial({ color: o.hair ?? 0x2a1a10, map: hairTex, bumpMap: hairTex, bumpScale: 0.8 });
    this.headMat = new THREE.MeshLambertMaterial({ map: realFace({ ...o.look, sculpted: true }, 'neutral'), bumpMap: skinBump, bumpScale: 0.4 });
    this.mats = { skin, shirt, pants, shoe, hair }; this.shirtT = shirtT;
    this.group = new THREE.Group(); scene.add(this.group);

    // ---- the sculpted parts; each layer knows what its cross-section looks like when it's cut
    const G = bodyParts(this.female, o.build ?? 1);
    this.parts = {};
    const layer = (g, geo, mat, cap) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.userData.layer = true; m.userData.cap = cap; g.add(m); return m; };
    const part = (name, from, to, capMat) => { const g = new THREE.Group(); g.scale.setScalar(s); this.group.add(g); return this.parts[name] = { name, g, from, to, gone: false, capMat }; };
    const hips = part('hips', 'pelvis', 'spine', waistMat); layer(hips.g, G.hips.skin, [pants, waistMat, cavityMat], true);
    const torso = part('torso', 'spine', 'neck', waistMat); layer(torso.g, G.torso.skin, [shirt, waistMat, cavityMat], true);
    const neck = part('neck', 'neck', 'head', stumpMat); layer(neck.g, G.neck.skin, skin, true);
    const head = part('head', 'head', 'head', brainCapMat);
    this.buildFace(head.g, G.head.skin, skin, hair, o);
    if (o.uniform) {   // police: cap, badge, belt
      const capM = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.6 });
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.09, 0.07, 18), capM); top.position.y = 0.105; head.g.add(top);
      const peak = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.07), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3 })); peak.position.set(0, 0.075, 0.1); peak.rotation.x = 0.25; head.g.add(peak);
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.005), new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8, roughness: 0.3 })); badge.position.set(0.08, 0.27, 0.115); torso.g.add(badge);
    }
    // what's inside: the organs, sitting in the cavity; hidden (not drawn) until someone opens them up
    for (const org of ORGANS) {
      const host = this.parts[org.group];
      const m = new THREE.Mesh(organGeo(org.name), organMat(org)); m.frustumCulled = false; m.visible = false; m.userData.organ = org;
      host.g.add(m); this.organs.push(m);
    }
    for (const sd of ['l', 'r']) {
      const up = part(sd + 'Upper', sd + 'Sh', sd + 'El', stumpMat); layer(up.g, G.upper.skin, skin, true); layer(up.g, o.uniform || o.longSleeves ? G.upper.longSleeve : G.upper.sleeve, shirt, false);
      const fo = part(sd + 'Fore', sd + 'El', sd + 'Wr', stumpMat); layer(fo.g, G.fore.skin, skin, true); if (o.uniform || o.longSleeves) layer(fo.g, G.fore.longSleeve, shirt, false);
      const ha = part(sd + 'Hand', sd + 'Wr', sd + 'Fin', stumpMat); const hm = layer(ha.g, G.hand.skin, skin, true); if (sd === 'l') hm.scale.x = -1;   // the left hand is the mirror of the right
      const th = part(sd + 'Thigh', sd + 'Hip', sd + 'Kn', stumpMat);
      if (o.shorts) { layer(th.g, G.thigh.skin, skin, true); layer(th.g, G.thigh.shorts, pants, false); } else layer(th.g, G.thigh.pants, pants, true);
      const sh = part(sd + 'Shin', sd + 'Kn', sd + 'An', stumpMat);
      layer(sh.g, G.shin.skin, skin, true); if (!o.shorts) layer(sh.g, G.shin.pants, pants, false);
      const ft = part(sd + 'Foot', sd + 'An', sd + 'Toe', stumpMat); layer(ft.g, G.foot.skin, shoe, true);
    }
    this.caps = [];
    this.anim = {}; for (const k in REST) this.anim[k] = new V();
    this.group.traverse(m => { if (m.isMesh && !m.userData.organ) m.castShadow = true; });
    this.sync();
  }

  // ---- the face: skull, a jaw that opens, eyes that move, lids that blink
  buildFace(g, headGeo, skin, hairMat, o) {
    // split the sculpted head into skull and jaw along the line of the mouth
    const { front: jawGeo, back: skullGeo } = sliceGeometry(headGeo, jawN, jawD, false);
    const lay = (geo, mat, parent, cap = true) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.userData.layer = true; m.userData.cap = cap; parent.add(m); return m; };
    lay(skullGeo, this.headMat, g);
    const pivot = new THREE.Group(); pivot.position.copy(HINGE); g.add(pivot);
    const jaw = lay(jawGeo, this.headMat, pivot); jaw.position.copy(HINGE).negate();
    // inside the mouth
    const cav = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), mouthMat); cav.position.set(0, -0.064, 0.072); cav.scale.set(1.1, 0.8, 0.9); g.add(cav);
    const upT = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.007, 0.012), teethMat); upT.position.set(0, -0.0585, 0.084); g.add(upT);
    const loT = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.007, 0.01), teethMat); loT.position.set(0, -0.0665, 0.081); jaw.add(loT);
    this.teeth = [upT, loT];
    // eyes and lids
    const eyeMat = new THREE.MeshStandardMaterial({ map: eyeTex(o.look?.eyes ?? 0x4a2a14), roughness: 0.15 });
    this.eyes = []; this.lids = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(sx * 0.031, 0.013, 0.083); g.add(e); this.eyes.push(e);
      const lid = new THREE.Mesh(eyeLidGeo, skin); lid.position.copy(e.position); g.add(lid); this.lids.push(lid);
      const low = new THREE.Mesh(lowLidGeo, skin); low.position.copy(e.position); low.rotation.x = -0.25; g.add(low);
    }
    // hair
    if (o.hair != null) lay(o.look?.long ? bodyParts(this.female, o.build ?? 1).head.longHair : bodyParts(this.female, o.build ?? 1).head.hair, hairMat, g, false);
    this.jaw = pivot; this.faceT = { blink: 2 + R() * 3, blinkT: 0, look: new V(0, 0, 1), jaw: 0, glance: 0 };
  }
  // every frame: blink, look, talk
  animateFace(dt) {
    if (!this.eyes || !this.jaw || this.headGone || this.cleaved) return;
    const f = this.faceT, dead = !this.alive, out = this.state === 'out' || this.pose === 'sleep';
    // where the eyes point: at Jason if they've seen him, otherwise glancing about
    if ((f.glance -= dt) <= 0) { f.glance = 0.6 + R() * 2.5; f.want = new V((R() - 0.5) * 0.8, (R() - 0.5) * 0.4, 1).normalize(); }
    let want = f.want ?? new V(0, 0, 1);
    if (this.lookAtW && !dead && !out) { this.parts.head.g.updateMatrixWorld(true); want = this.parts.head.g.worldToLocal(t1.copy(this.lookAtW)).normalize(); if (want.z < 0.2) want.z = 0.2; want.normalize(); }
    if (dead) want = t2.set(0.15, 0.55, 0.8).normalize();   // rolled up and glassy
    f.look.lerp(want, Math.min(1, dt * (this.scared ? 14 : 6))).normalize();
    for (const e of this.eyes) e.quaternion.setFromUnitVectors(t3.set(0, 0, 1), f.look);
    // lids: blink every few seconds, wide with terror, shut asleep, half-open dead
    f.blink -= dt; if (f.blink <= 0) { f.blink = (this.scared ? 1 : 2.5) + R() * 3; f.blinkT = 0.14; }
    f.blinkT = Math.max(0, f.blinkT - dt);
    let lid = this.scared ? -0.42 : -0.1;   // relaxed: the lid sits over the top of the iris
    if (f.blinkT > 0) lid = 1.35; if (out) lid = 1.4; if (dead) lid = 0.35; if (this.choked && this.chokeT > 0.4) lid = -0.95;
    for (const l of this.lids) l.rotation.x += (lid - l.rotation.x) * Math.min(1, dt * (f.blinkT > 0 ? 40 : 10));
    // the jaw: hangs open dead, works when they talk, gapes when they scream
    let jaw = 0;
    const talking = this.line && this.line.end > (this.clock?.() ?? 0);
    if (talking) jaw = this.lineBig ? 0.32 + Math.sin(this.time * 9) * 0.05 : 0.08 + Math.abs(Math.sin(this.time * 17)) * 0.16;
    else if (this.scared && this.alive) jaw = 0.06 + Math.sin(this.time * 3) * 0.02;
    if (this.choked && this.chokeT > 0.4) jaw = 0.25;
    if (dead) jaw = 0.22; if (out) jaw = 0.07;
    f.jaw += (jaw - f.jaw) * Math.min(1, dt * 14);
    this.jaw.rotation.x = f.jaw;
    for (const t of this.teeth) t.visible = f.jaw > 0.05;
  }

  // ---------------------------------------------------------------- animation
  // Build the pose in the body's own frame, then place it in the world.
  computePose(dt) {
    if (this.pose === 'sleep') return this.sleepPose();
    const A = this.anim, s = this.s, sp = this.speed, run = Math.min(1, Math.max(0, (sp - 1.6) / 1.6)), walk = Math.min(1, sp / 1.0);
    const T = this.time, pose = this.pose;
    const crouchT = pose === 'hide' || pose === 'cower' ? 1 : 0;
    this.crouchS = (this.crouchS ?? crouchT) + (crouchT - (this.crouchS ?? crouchT)) * Math.min(1, dt * (this.menace ? 1.7 : 9));   // Jason rises slowly
    const crouch = this.crouchS;
    const ph = this.phase, bob = (0.018 + run * 0.03) * walk * Math.abs(Math.sin(ph));
    const lean = run * 0.32 + walk * 0.05 + crouch * 0.25 + (this.menace ? 0.13 : 0);   // Jason: hunched, heavy, coming at you
    const hard = this.scared || this.breathHard;
    const breathe = Math.sin(T * (hard ? 4.5 : 1.6)) * (hard ? 0.012 : 0.004);
    // standing about: weight rocks from one leg to the other
    const sway = (pose === 'idle' || pose === 'warm' ? Math.sin(T * 0.33 + this.phase) * 0.035 : 0);
    const limp = Math.min(1, (this.legHurt ?? 0) / 40), limpSide = this.limpSide ?? 1;
    const P = (out, x, y, z) => out.set(x, y, z);
    // spine: pelvis then up, leaning forward about X
    // a limp: the body drops onto the good leg every time the hurt one takes weight
    const limpDrop = limp * walk * Math.max(0, Math.sin(ph + (limpSide > 0 ? Math.PI : 0))) * 0.06;
    const pelY = 0.96 - bob - crouch * 0.47 - limpDrop;
    P(A.pelvis, sway, pelY, 0);
    const up = (len, from, out, extraLean = 0) => out.set(from.x, from.y + Math.cos(lean + extraLean) * len, from.z + Math.sin(lean + extraLean) * len);
    up(0.21, A.pelvis, A.spine); up(0.19, A.spine, A.chest, crouch * 0.2); A.chest.y += breathe; up(0.17, A.chest, A.neck, crouch * 0.1);
    // a flinch: the top half jerks away from a blow, then comes back
    if (this.flinch && this.flinch.t > 0) {
      this.flinch.t -= dt; const e = Math.sin(Math.min(1, this.flinch.t / 0.45) * Math.PI) * this.flinch.k;
      for (const k of ['chest', 'neck']) { A[k].x += this.flinch.x * e * (k === 'neck' ? 1.3 : 1); A[k].z += this.flinch.z * e * (k === 'neck' ? 1.3 : 1); A[k].y -= e * 0.03; }
    }
    // head: turned toward what they're looking at
    let hy = 0, hp = -lean * 0.6;
    if (this.look) {
      const dx = this.look.x - this.root.x, dz = this.look.z - this.root.z;
      hy = Math.max(-1.2, Math.min(1.2, Math.atan2(dx, dz) - this.yaw)); hy = Math.atan2(Math.sin(hy), Math.cos(hy)); hy = Math.max(-1.2, Math.min(1.2, hy));
    }
    if (pose === 'hide') hp = 0.1;
    if (this.menace) hp += pose === 'raise' ? -0.1 : 0.3;
    this.headTurn = (this.headTurn ?? 0) + (hy - (this.headTurn ?? 0)) * Math.min(1, dt * 5);
    A.head.set(A.neck.x + Math.sin(this.headTurn) * 0.02 + (this.tilt ?? 0) * 0.05, A.neck.y + 0.14 * Math.cos(hp), A.neck.z + 0.14 * Math.sin(-hp) * -1 + 0.012);
    // shoulders and hips, the chest counter-twisting against the stride
    // the chest counter-twists against the stride, and turns with the head when they look back over a shoulder
    const twist = Math.sin(ph) * 0.12 * walk - Math.max(-0.35, Math.min(0.35, (this.headTurn ?? 0) * 0.3));
    for (const [side, sx] of [['l', -1], ['r', 1]]) {
      const sh = A[side + 'Sh'];
      sh.set(A.chest.x + Math.cos(twist) * 0.19 * sx, A.chest.y + 0.085, A.chest.z + Math.sin(twist) * 0.19 * sx * -1 + Math.sin(lean) * 0.04);
      A[side + 'Hip'].set(A.pelvis.x + 0.095 * sx, A.pelvis.y - 0.04, A.pelvis.z - Math.sin(twist) * 0.04 * sx);
    }
    // legs
    for (const [side, sx, off] of [['l', -1, 0], ['r', 1, Math.PI]]) {
      const hurtLeg = (side === 'l' ? -1 : 1) === limpSide;
      const p = ph + off, stride = (0.2 + run * 0.28) * walk * (hurtLeg ? 1 - limp * 0.5 : 1);
      const foot = t1.set(0.1 * sx, 0.085 + Math.max(0, -Math.sin(p)) * (0.07 + run * 0.18) * walk, Math.cos(p) * stride);
      if (crouch) foot.set(0.13 * sx, 0.085, 0.3);
      if (sway) foot.x += sway * 0.4;   // feet stay planted while the hips rock over them
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
      else if (pose === 'raise' && side === 'r') { hand.set(0.16, A.head.y + 0.34, A.head.z - 0.1); bend.set(1, 0.6, -0.5); }
      else if (pose === 'strike' && side === 'r') { hand.set(-0.14, A.pelvis.y + 0.18, A.chest.z + 0.52); bend.set(1, -0.2, 0.3); }
      else if (pose === 'unmask' && side === 'l') { const k = this.unmaskK ?? 0; hand.set(-0.02, A.head.y + 0.0 + k * 0.13, A.head.z + 0.17 + k * 0.05); bend.set(-1, -0.4, 0); }
      else if (pose === 'choke' && side === 'l') { hand.set(-0.03, A.neck.y + 0.06, A.chest.z + 0.55); bend.set(-1, -0.6, 0); }
      else if ((pose === 'raise' || pose === 'strike') && side === 'l') { hand.set(-0.26, 0.9, pose === 'raise' ? 0.12 : -0.05); bend.set(-0.6, -0.3, -1); }
      else if (this.menace && run < 0.3) { const sw = Math.cos(p) * (side === 'r' ? 0.07 : 0.12) * walk; hand.set(0.27 * sx, 0.85 + Math.abs(sw) * 0.1, sw + 0.08); bend.set(sx * 0.6, -0.3, -1); }   // arms heavy at his sides, the machete low
      else if (run > 0.2) { const sw = Math.cos(p) * 0.28 * run; hand.set(0.2 * sx, 1.08 + Math.max(0, sw) * 0.25, sw + 0.08); bend.set(sx * 0.3, -0.4, -1); }   // pumping, elbows bent
      else { const sw = Math.cos(p) * 0.16 * walk; hand.set(0.235 * sx, 0.93 + Math.abs(sw) * 0.15 - crouch * 0.4, sw + 0.03); }
      if (this.scared && pose === 'idle') { hand.set(0.12 * sx, 1.1, 0.15); bend.set(sx, -1, 0); }
      // clutching a wound: the hand on the side of it presses over it
      if (this.clutch && this.clutch.t > 0 && (this.clutch.x * sx >= -0.02 || this.clutch.both)) { hand.set(this.clutch.x * 0.8 + sx * 0.02, this.clutch.y, this.clutch.z + 0.06); bend.set(sx, -0.5, -0.3); }
      if (this.breathHard && walk < 0.3 && pose === 'idle') { hand.set(0.1 * sx, 0.6, 0.22); bend.set(sx, 0.2, -0.5); }   // hands on knees, gasping
      { const hs = (this.handS ??= {})[side] ??= hand.clone(); const rate = this.menace ? (pose === 'strike' ? 16 : pose === 'raise' ? 4.5 : 6) : 18; hs.lerp(hand, Math.min(1, dt * rate)); hand.copy(hs); }
      ik(sh, hand, 0.29, 0.25, bend, A[side + 'El']);
      A[side + 'Wr'].copy(t3.subVectors(hand, A[side + 'El']).setLength(0.25).add(A[side + 'El']));
      A[side + 'Fin'].copy(t3.subVectors(A[side + 'Wr'], A[side + 'El']).setLength(0.17).add(A[side + 'Wr']));
    }
  }
  // asleep on their back in a bunk: head toward +Z, breathing slow (left side is +X lying face up)
  sleepPose() {
    const A = this.anim, h = 0.61 + Math.sin(this.time * 1.1) * 0.004, b = Math.sin(this.time * 1.1) * 0.006;
    const set = (k, x, y, z) => A[k].set(x, y, z);
    set('pelvis', 0, h + 0.1, 0); set('spine', 0, h + 0.11 + b, 0.21); set('chest', 0, h + 0.12 + b, 0.4); set('neck', 0, h + 0.12, 0.57); set('head', 0.02, h + 0.14, 0.71);
    for (const [sd, sx] of [['l', 1], ['r', -1]]) {
      set(sd + 'Sh', sx * 0.19, h + 0.11, 0.49); set(sd + 'El', sx * 0.23, h + 0.07, 0.22); set(sd + 'Wr', sx * 0.21, h + 0.08, -0.02); set(sd + 'Fin', sx * 0.17, h + 0.1, -0.18);
      set(sd + 'Hip', sx * 0.095, h + 0.09, -0.03); set(sd + 'Kn', sx * 0.11, h + 0.1, -0.45); set(sd + 'An', sx * 0.12, h + 0.08, -0.87); set(sd + 'Toe', sx * 0.13, h + 0.2, -0.9);
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
    // stumps: a cut-off limb's remaining end follows the joint it hangs from
    for (const st of this.stubs) {
      if (this.loose.has(st.from) || st.p.hand) continue;
      const A0 = this.anim[st.from], A1 = this.anim[st.to];
      const lx = A0.x + (A1.x - A0.x) * st.t, ly = A0.y + (A1.y - A0.y) * st.t, lz = A0.z + (A1.z - A0.z) * st.t;
      st.p.moveTo(this.root.x + (lx * c + lz * sn) * s, this.ground + ly * s, this.root.z + (-lx * sn + lz * c) * s, true); st.p.locked = true;
    }
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt * 2);
  }
  // control: called every frame by the game
  update(dt, floorAt, push) {
    this.time += dt;
    if (this.clutch) this.clutch.t -= dt;
    // the last of the nerves firing: twitches for a while after death
    if (!this.alive && this.twitchT > 0) {
      this.twitchT -= dt;
      if (R() < dt * 6 * Math.min(1, this.twitchT / 2)) { const ks = ['lWr', 'rWr', 'lAn', 'rAn', 'lFin', 'rFin', 'head']; const k = ks[Math.floor(R() * ks.length)]; if (!this.loose.has(k) || R() < 0.3) this.p[k].addVel((R() - 0.5) * 1.6, R() * 1.2, (R() - 0.5) * 1.6); }
    }
    if (this.alive && this.bleed > 0) { this.hp -= this.bleed * dt; if (this.hp <= 0) this.die(); }
    if (this.fireT > 0) this.burn(dt);
    if (this.mode === 'anim') {
      // turn toward where they're going and move
      let want = this.yaw;
      if (this.goal) { want = Math.atan2(this.goal.x - this.root.x, this.goal.z - this.root.z); if (Math.hypot(this.goal.x - this.root.x, this.goal.z - this.root.z) < 0.3) this.wantSpeed = 0; }
      else if (this.face != null) want = this.face;
      let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * (this.speed > 2 ? 6 : 4));
      const target = this.goal ? this.wantSpeed * Math.max(0.2, Math.cos(d)) * (1 - Math.min(1, (this.legHurt ?? 0) / 40) * 0.55) : 0;
      this.speed += (target - this.speed) * Math.min(1, dt * 3);
      this.root.x += Math.sin(this.yaw) * this.speed * dt; this.root.z += Math.cos(this.yaw) * this.speed * dt;
      if (this.pose !== 'sleep') push?.(this.root);
      this.phase += this.speed * dt * (this.speed > 2 ? 4.4 : 5.6);
      this.ground = floorAt(this.root.x, this.root.z);
      this.applyPose(dt);
    } else {
      for (const k in this.p) if (!this.p[k].hand) this.p[k].locked = false;
      for (const st of this.stubs) if (!st.p.hand) st.p.locked = false;
      if (this.alive) this.struggle(dt);
      if (this.alive && !this.held && this.state !== 'out') {
        this.downT -= dt;
        if (this.downT <= 0 && this.canStand()) this.getUp(floorAt);
      }
      if (this.state === 'out' && (this.outT -= dt) <= 0) { this.state = null; this.downT = 0.5; }
    }
    // face
    const expr = !this.alive ? 'dead' : this.state === 'out' || this.pose === 'sleep' ? 'out' : this.chokeT > 0.4 && this.choked ? 'choke' : this.hp < this.maxHp * 0.55 ? 'bleed' : this.scared ? 'fear' : 'neutral';
    const bk = expr + Math.floor(this.bruise ?? 0);
    if (bk !== this.expr && !this.headGone) { this.expr = bk; this.headMat.map = realFace({ ...this.o.look, sculpted: true }, expr, Math.floor(this.bruise ?? 0)); this.headMat.needsUpdate = true; }
    this.animateFace(dt);
  }
  canStand() { return !['lHip', 'rHip', 'lKn', 'rKn', 'lAn', 'rAn'].some(j => this.severed.has(j)) && !this.split && !this.legCut; }
  // go over to physics: tripped, hit, grabbed, dead
  ragdoll(seconds = 0) {
    if (this.mode === 'rag') { this.downT = Math.max(this.downT, seconds); return; }
    this.mode = 'rag'; this.downT = seconds;
    for (const k in this.p) if (!this.p[k].hand) this.p[k].locked = false;
    for (const st of this.stubs) st.p.locked = false;
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
    for (const n in this.parts) {
      const pt = this.parts[n]; if (pt.gone) continue;
      const [pa, pb] = this.ends(pt);
      const r = ((RADIUS[pt.chunk ? 'chunk' : kindOf(n)] ?? 0.05) + pad) * this.s, d2 = segDist(a, b, pa, pb);
      if (d2 < r * r && d2 < bd) { bd = d2; best = { part: n, t: segDist.t, s: segDist.s, d: Math.sqrt(d2) }; }
    }
    return best;
  }
  ends(pt) { const a = pt.fromPt ?? this.p[pt.from]; return [a, pt.toPt ?? (pt.to === pt.from ? a : this.p[pt.to])]; }
  // a cut, a stab, a blow. dir: the way the blade was moving (unit).
  hit(partName, point, dir, kind, dmg) {
    const pt = this.parts[partName]; if (!pt || pt.gone) return null;
    this.unaware = false;
    this.wound(partName, point, dir, kind);
    const k = kindOf(partName), isHead = k === 'head' || k === 'neck';
    this.hp -= dmg * (isHead ? 2.2 : k === 'torso' || k === 'hips' ? 1 : 0.55);
    this.bleed += kind === 'stab' ? 3 : kind === 'slash' ? 2 : 0.3;
    this.blood.spray(point, t1.copy(dir).multiplyScalar(-0.3).add(t2.set(0, 0.4, 0)).normalize(), kind === 'blunt' ? 6 : 14, 2.5, 0.6);
    if (this.alive && this.mode === 'anim' && (kind === 'blunt' || dmg > 25)) this.ragdoll(1.2 + R());
    else if (this.alive) {
      // into their own frame: which way the blow pushed them, and where the wound is
      const c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
      this.flinch = { x: dir.x * c - dir.z * sn, z: dir.x * sn + dir.z * c, t: 0.45, k: Math.min(0.12, 0.04 + dmg * 0.003) };
      const lx = (point.x - this.root.x) * c - (point.z - this.root.z) * sn, lz = (point.x - this.root.x) * sn + (point.z - this.root.z) * c;
      const ly = (point.y - (this.ground ?? 0)) / this.s;
      if (ly > 0.7 && ly < 1.6) this.clutch = { x: lx / this.s, y: ly, z: lz / this.s, t: 4, both: kindOf(partName) === 'torso' || kindOf(partName) === 'hips' };
    }
    const kk = kindOf(partName);
    if (kk === 'thigh' || kk === 'shin' || kk === 'foot') { this.legHurt = (this.legHurt ?? 0) + dmg; this.limpSide = partName.startsWith('l') ? -1 : 1; }
    if (this.hp <= 0 && this.alive) this.die();
    return pt;
  }
  wound(partName, point, dir, kind) {
    const pt = this.parts[partName]; if (!pt || pt.gone || this.wounds.length > 40 || pt.chunk) return;
    pt.g.updateMatrixWorld(true);
    const local = pt.g.worldToLocal(t1.copy(point)), k = kindOf(partName);
    const ax = k === 'head' ? new V(local.x, local.y, local.z) : new V(local.x, 0, local.z);
    if (ax.lengthSq() < 1e-6) ax.set(0, 0, 1);
    ax.normalize();
    const radius = { head: 0.1, torso: 0.14, hips: 0.14, neck: 0.05, thigh: 0.08, upper: 0.05, shin: 0.05 }[k] ?? 0.04;
    const m = new THREE.Mesh(plane, woundMat[kind === 'stab' ? 'stab' : kind === 'blunt' ? 'hole' : 'slash']);
    m.position.set(ax.x * radius * 1.08, k === 'head' ? ax.y * radius : Math.max(0, Math.min(LEN[k] ?? 0.3, local.y)), ax.z * radius * 1.08);
    m.lookAt(t2.copy(m.position).add(t3.copy(ax)));
    const ld = t3.copy(dir).transformDirection(mb.copy(pt.g.matrixWorld).invert());
    m.rotateZ(Math.atan2(ld.y, ld.x) + Math.PI / 2);
    const sz = kind === 'slash' ? 0.07 : kind === 'stab' ? 0.05 : 0.06;
    m.scale.set(sz * 0.6, sz * (kind === 'slash' ? 1.8 : 1), 1);
    pt.g.add(m); this.wounds.push(m);
    if (k === 'torso' || k === 'upper') this.soak(k === 'torso' ? Math.atan2(local.x, local.z) / (Math.PI * 2) + 0.5 : 0.1, k === 'torso' ? 1 - local.y / 0.4 : 0.9, kind === 'stab' ? 22 : 30);
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


  // ---------------------------------------------------------------- cutting them up
  // Slice a part along the plane through point with normal (world space).
  slicePart(name, point, normal) {
    const pt = this.parts[name]; if (!pt || pt.gone) return false;
    const k = kindOf(name);
    if (k === 'torso' || k === 'hips') this.openUp();
    if (k === 'neck' && !pt.chunk) return this.decapitate(1.2, point, normal);
    if ((k === 'torso' || k === 'hips') && !pt.chunk && !this.severed.has('spine')) return this.halve(point, normal, name);
    pt.g.updateMatrixWorld(true);
    const oldW = pt.g.matrixWorld.clone();
    // which side stays with this part's own points
    const ref = pt.chunk || k === 'torso' || k === 'hips' ? new V(0, 0, 0) : k === 'head' ? new V(0, -0.1, -0.02) : new V(0, 0.001, 0);
    const { stay, go } = this.cutMeshes(pt.g, point, normal, ref, pt.capMat);
    if (!go.length) return false;
    let piece;
    if (k === 'head' || pt.chunk || k === 'torso' || k === 'hips') piece = this.freePiece(go, oldW, name, pt.capMat, normal);
    else piece = this.cutLimb(pt, point, normal, go, oldW);
    // what spilled
    const spill = t4.copy(normal);
    this.blood.spray(point, spill, 30, 3, 0.8); this.blood.spray(point, spill.negate(), 20, 2.5, 0.8);
    if (k === 'head' && !pt.chunk) {
      this.cleaved = true; this.cause = Math.abs(t1.copy(normal).dot(t2.subVectors(this.p.head, this.p.neck).normalize())) > 0.7 ? 'top of the head sliced off' : 'head split open';
      this.blood.chunk(point, 'brain', 4, 1.5); this.blood.spurt(this.p.head, out => out.set(0, 1, 0), 5, 1);
      this.hp = 0; this.die();
    }
    return piece || true;
  }
  // cut every layer of a part's group; returns the meshes that stay and the new meshes that go
  cutMeshes(g, point, normal, refLocal, capMat) {
    g.updateMatrixWorld(true);
    // flatten anything nested (the jaw) into direct children first, so every mesh is in the part's own space
    for (const ch of [...g.children]) if (ch.isGroup) { for (const m of [...ch.children]) { ch.updateMatrixWorld(true); const w = m.matrixWorld.clone(); g.attach(m); } g.remove(ch); if (ch === this.jaw) this.jaw = null; }
    const stay = [], go = [];
    for (const m of [...g.children]) {
      if (!m.isMesh) continue;
      m.updateMatrix();
      const toMesh = mb.copy(g.matrixWorld).multiply(m.matrix).invert();
      const lp = t1.copy(point).applyMatrix4(toMesh), ln = t2.copy(normal).transformDirection(toMesh), d = ln.dot(lp);
      const refM = t3.copy(refLocal).applyMatrix4(mb.copy(m.matrix).invert());
      const keepFront = ln.dot(refM) - d > 0;
      const bone = m.userData.organ?.bone;   // the blade goes through ribs and spine too
      if ((m.userData.layer || bone) && m.geometry.attributes.position.count > 0) {
        const { front, back } = sliceGeometry(m.geometry, ln.clone(), d, bone ? true : m.userData.cap);
        const keep = keepFront ? front : back, lose = keepFront ? back : front;
        const mats = Array.isArray(m.material) ? m.material : [m.material, bone ? m.material : capMat];
        if (lose) { const nm = new THREE.Mesh(lose, mats); nm.matrix.copy(m.matrix); nm.matrixAutoUpdate = false; nm.userData = { ...m.userData }; nm.frustumCulled = false; go.push(nm); this.ownGeos.push(lose); }
        if (keep) { m.geometry = keep; m.material = mats; this.ownGeos.push(keep); stay.push(m); } else g.remove(m);
      } else {
        // attachments (wounds, eyes, teeth, organs): go with whichever side they're on
        const pos = t3.setFromMatrixPosition(m.matrix);
        const side = t4.copy(normal).transformDirection(mb.copy(g.matrixWorld).invert());
        const pl = t1.copy(point).applyMatrix4(mb.copy(g.matrixWorld).invert());
        const s = side.dot(t2.subVectors(pos, pl)), sr = side.dot(t2.subVectors(refLocal, pl));
        // organs go with whichever piece they sit in (their mesh is centred on the body, so go by the organ's own middle)
        const so = m.userData.organ ? side.dot(t2.set(...m.userData.organ.c).applyMatrix4(m.matrix).sub(pl)) : s;
        if ((so > 0) !== (sr > 0)) { g.remove(m); m.matrixAutoUpdate = false; go.push(m); }
      }
    }
    return { stay, go };
  }
  // put meshes (with matrices relative to a group whose world matrix was oldW) into another group, keeping where they are
  rehome(meshes, oldW, g) {
    g.updateMatrixWorld(true);
    const inv = mb.copy(g.matrixWorld).invert().multiply(oldW);
    for (const m of meshes) { const mm = new THREE.Matrix4().multiplyMatrices(inv, m.matrix); m.matrixAutoUpdate = true; mm.decompose(m.position, m.quaternion, m.scale); m.castShadow = !m.userData.organ; g.add(m); }
  }
  // a limb cut part-way: the near end stays as a stump, the far end (and everything past it) comes away
  cutLimb(pt, point, normal, go, oldW) {
    const [a, b] = this.ends(pt);
    const ab = t1.set(b.x - a.x, b.y - a.y, b.z - a.z), den = normal.dot(ab);
    let t = Math.abs(den) > 1e-4 ? normal.dot(t2.set(point.x - a.x, point.y - a.y, point.z - a.z)) / den : 0.5;
    t = Math.max(0.06, Math.min(0.94, t));
    const cx = a.x + ab.x * t, cy = a.y + ab.y * t, cz = a.z + ab.z * t;
    const below = new Set([b, ...(pt.belowPts ?? (BELOW[pt.to] ?? []).map(k => this.p[k]))]);
    // the far side loses every link to the near side
    for (const l of this.links) if (below.has(l.a) !== below.has(l.b)) l.cut = true;
    this.sim.links = this.sim.links.filter(l => !l.cut); this.links = this.links.filter(l => !l.cut);
    const mk = (x, y, z, tag) => { const p = this.sim.point(x, y, z, 0.04 * this.s, 0.6, this, tag); p.px = x - (b.x - b.px); p.py = y - (b.y - b.py); p.pz = z - (b.z - b.pz); return p; };
    // the stump: a new end for this part, held rigid to the joint it hangs from
    const stub = mk(cx, cy, cz, 'stub'); stub.px = cx; stub.py = cy; stub.pz = cz;
    this.links.push(this.sim.link(a, stub, 'rod', 1, null, this));
    const anchor = this.links.find(l => !l.cut && (l.a === a || l.b === a) && !below.has(l.a === a ? l.b : l.a) && (l.a === a ? l.b : l.a) !== stub);
    if (anchor) this.links.push(this.sim.link(anchor.a === a ? anchor.b : anchor.a, stub, 'rod', 0.6, null, this));
    if (!pt.chunk) this.stubs.push({ p: stub, from: pt.from, to: pt.to, t });
    pt.toPt = stub;
    // the piece: from the cut to b, with a third point so it knows which way it's turned
    const c2 = mk(cx, cy, cz, 'cut');
    const side = this.sideOf(pt, t3).normalize();
    const sp = mk(cx + side.x * 0.06, cy + side.y * 0.06, cz + side.z * 0.06, 'side');
    for (const [p, q] of [[c2, b], [sp, c2], [sp, b]]) this.links.push(this.sim.link(p, q, 'rod', 1, null, this));
    const name = baseOf(pt.name) + '#' + (++pieceN);
    const g = new THREE.Group(); g.scale.setScalar(this.s); this.group.add(g);
    const piece = this.parts[name] = { name, g, from: pt.from, to: pt.to, fromPt: c2, toPt: pt.toPt === stub ? b : b, sideFix: { o: c2, s: sp }, gone: false, capMat: pt.capMat, belowPts: [...below].filter(p => p !== b) };
    piece.toPt = b;
    // parts hanging off b now turn with the piece
    for (const q of Object.values(this.parts)) if (q !== piece && below.has(q.fromPt ?? this.p[q.from])) q.sideFix = { o: c2, s: sp };
    for (const key in this.p) if (below.has(this.p[key])) this.loose.add(key);
    this.syncPart(piece); g.updateMatrixWorld(true);
    this.rehome(go, oldW, g);
    // consequences
    const k = kindOf(pt.name);
    if (k === 'thigh' || k === 'shin' || k === 'foot') this.legCut = true;
    this.blood.spurt(stub, out => out.set(stub.x - a.x, stub.y - a.y, stub.z - a.z).normalize(), this.alive ? 8 : 3, k === 'thigh' ? 1.5 : 1);
    this.blood.spurt(c2, out => out.set(c2.x - b.x, c2.y - b.y, c2.z - b.z).normalize(), 2, 0.6);
    this.blood.pool(this.p.pelvis, 1.4);
    for (const p of [c2, sp, ...below]) p.addVel((R() - 0.5) * 1.2, 0.8, (R() - 0.5) * 1.2);
    this.bleed += k === 'thigh' || k === 'upper' ? 10 : 6;
    if (this.alive) { this.hp -= 30; this.ragdoll(2); if (this.legCut) this.downT = 99; this.onSever?.(pt.to); if (this.hp <= 0) this.die(); }
    return piece;
  }
  // a piece with no joints of its own (the top of a head, a slab of torso): three points of its own
  freePiece(meshes, oldW, fromName, capMat, normal) {
    // where the piece is: the middle of its meshes
    const box = new THREE.Box3(); for (const m of meshes) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(oldW, m.matrix))); }
    const c = box.getCenter(new V()), size = box.getSize(new V()).length() / 2;
    const up = new V(0, 1, 0), side = new V().crossVectors(normal, up); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
    const mk = (v, tag) => this.sim.point(v.x, v.y, v.z, Math.min(0.06, size * 0.5), 0.5, this, tag);
    const p0 = mk(c, 'chunk'), p1 = mk(c.clone().addScaledVector(up, 0.05), 'chunk'), p2 = mk(c.clone().addScaledVector(side, 0.05), 'chunk');
    for (const [a, b] of [[p0, p1], [p1, p2], [p0, p2]]) this.links.push(this.sim.link(a, b, 'rod', 1, null, this));
    for (const p of [p0, p1, p2]) p.addVel(normal.x * 1.2 + (R() - 0.5) * 0.6, 0.8 + R(), normal.z * 1.2 + (R() - 0.5) * 0.6);
    const name = 'chunk#' + (++pieceN);
    const g = new THREE.Group(); g.scale.setScalar(this.s); this.group.add(g);
    const piece = this.parts[name] = { name, g, from: null, to: null, fromPt: p0, toPt: p1, sideFix: { o: p0, s: p2 }, gone: false, capMat, chunk: true, of: baseOf(fromName) };
    this.syncPart(piece); g.updateMatrixWorld(true);
    this.rehome(meshes, oldW, g);
    return piece;
  }
  // through the middle: everything above comes off everything below, and the insides come out
  halve(point, normal, name) {
    if (this.split) return false;
    this.openUp();
    this.split = 'waist'; this.cause = 'halved';
    const torso = this.parts.torso, hips = this.parts.hips;
    torso.g.updateMatrixWorld(true); hips.g.updateMatrixWorld(true);
    const tW = torso.g.matrixWorld.clone(), hW = hips.g.matrixWorld.clone();
    // the mesh is cut where the blade went; the body comes apart at the spine
    const cutT = this.cutMeshes(torso.g, point, normal, new V(0, 0.33, 0), waistMat);   // upper keeps the chest
    const cutH = this.cutMeshes(hips.g, point, normal, new V(0, -0.05, 0), waistMat);   // lower keeps the legs
    this.sever('spine', 1.4, true);
    this.syncPart(torso); this.syncPart(hips);
    this.rehome(cutT.go, tW, hips.g);   // the bottom of the torso stays on the hips
    this.rehome(cutH.go, hW, torso.g);  // the top of the hips goes with the chest
    this.spillOrgans(point, normal);
    this.entrails(this.p.pelvis, 9); this.entrails(this.p.spine, 7);
    this.blood.chunk(point, 'meat', 6, 3);
    this.hp = 0; this.die();
    return true;
  }
  // organs near a cut fall out; one the blade went through is cut in two
  spillOrgans(point, normal, onlyGroup = null) {
    for (const m of [...this.organs]) {
      const org = m.userData.organ; if (onlyGroup && org.group !== onlyGroup) continue;
      if (!m.parent) continue;
      m.parent.updateMatrixWorld(true); m.updateMatrix(); m.updateMatrixWorld(true);
      const c = t1.set(...org.c).applyMatrix4(m.matrixWorld);
      const dist = Math.abs(t2.subVectors(c, point).dot(normal));
      if (dist > org.r * 0.75 + 0.015 || org.bone) continue;   // the skeleton, and anything the cut didn't reach, stays inside
      const host = m.parent, oldW = host.matrixWorld.clone();
      m.visible = true; m.updateMatrix(); host.remove(m);
      this.organs.splice(this.organs.indexOf(m), 1);
      if (dist < org.r * 0.5 && !org.bone) {
        // the blade went through it
        const toMesh = mb.copy(oldW).multiply(m.matrix).invert();
        const lp = t3.copy(point).applyMatrix4(toMesh), ln = t4.copy(normal).transformDirection(toMesh);
        const { front, back } = sliceGeometry(m.geometry, ln.clone(), ln.dot(lp), true);
        for (const half of [front, back]) if (half) { const hm = new THREE.Mesh(half, [m.material, organCutMat]); hm.matrix.copy(m.matrix); hm.matrixAutoUpdate = false; this.ownGeos.push(half); const pc = this.freePiece([hm], oldW, 'chunk', organCutMat, normal); pc.organ = org.name; }
      } else { m.matrixAutoUpdate = false; const pc = this.freePiece([m], oldW, 'chunk', organCutMat, normal); pc.organ = org.name; }
    }
    this.blood.spray(point, normal, 25, 2, 1);
  }
  // Cut at a joint: everything past it comes away as its own piece.
  sever(joint, force = 1, noCaps = false) {
    if (this.severed.has(joint) || !BELOW[joint]) return false;
    const below = new Set(BELOW[joint]);
    if (below.has('head') && this.headGone) return false;
    this.severed.add(joint);
    for (const k of BELOW[joint]) this.loose.add(k);
    const J = this.p[joint];
    const J2 = this.sim.point(J.x, J.y, J.z, J.r, 1, this, joint + '*');
    J2.px = J.px; J2.py = J.py; J2.pz = J.pz;
    for (const l of this.links) {
      const aIn = below.has(l.a.tag), bIn = below.has(l.b.tag), aJ = l.a === J, bJ = l.b === J;
      if ((aIn && bJ) || (bIn && aJ)) { if (aJ) l.a = J2; else l.b = J2; }
      else if (aIn !== bIn) l.cut = true;
    }
    this.sim.links = this.sim.links.filter(l => !l.cut); this.links = this.links.filter(l => !l.cut);
    // which way the piece is turned, from now on: a point of its own beside the cut
    const first = this.p[BELOW[joint][0]], side = this.sideOf(this.parts[joint === 'spine' ? 'torso' : joint === 'neck' ? 'neck' : Object.keys(this.parts).find(n => this.parts[n].from === joint) ?? 'torso'], new V()).normalize();
    const sp = this.sim.point(J.x + side.x * 0.06, J.y + side.y * 0.06, J.z + side.z * 0.06, 0.03, 0.5, this, 'side');
    this.links.push(this.sim.link(sp, J2, 'rod', 1, null, this), this.sim.link(sp, first, 'rod', 1, null, this));
    for (const n in this.parts) {
      const pt = this.parts[n];
      if (pt.from === joint && below.has(pt.to)) pt.fromPt = J2;
      if (joint === 'spine' && n === 'torso') pt.fromPt = J2;
      if (joint !== 'spine' && joint !== 'neck' && (below.has(pt.from) || (pt.from === joint && below.has(pt.to)))) pt.sideFix = { o: J2, s: sp };
    }
    if (!noCaps) {
      const r = { lSh: 0.05, rSh: 0.05, lEl: 0.04, rEl: 0.04, lWr: 0.03, rWr: 0.03, lHip: 0.08, rHip: 0.08, lKn: 0.052, rKn: 0.052, lAn: 0.035, rAn: 0.035, neck: 0.05, spine: 0.14 }[joint] * this.s;
      const capMat = joint === 'spine' ? waistMat : stumpMat;
      this.capAt(J, joint, false, r, capMat); this.capAt(J2, joint, true, r, capMat);
    }
    const along = (out) => { const nb = this.neighbour(J, below); return out.subVectors(J, nb).normalize(); };
    this.blood.spurt(J, out => along(out), this.alive ? 8 : 3, joint === 'neck' ? 1.4 : 1);
    this.blood.spray(J, along(t1), 30, 3, 0.7);
    this.blood.pool(this.p.pelvis, 1.4);
    for (const k of below) this.p[k].addVel((R() - 0.5) * 1.5 * force, 1.2 * force, (R() - 0.5) * 1.5 * force);
    J2.addVel((R() - 0.5) * 1.5 * force, 1.2 * force, (R() - 0.5) * 1.5 * force);
    this.bleed += 8;
    if (joint === 'neck' || joint === 'spine') { this.hp = 0; this.die(); }
    else if (this.alive) { this.ragdoll(2); this.onSever?.(joint); if (joint.endsWith('Hip') || joint.endsWith('Kn') || joint.endsWith('An')) this.downT = 99; }
    return true;
  }
  neighbour(J, below) { for (const l of this.links) { if (l.a === J && !below.has(l.b.tag) && l.b.tag !== J.tag) return l.b; if (l.b === J && !below.has(l.a.tag) && l.a.tag !== J.tag) return l.a; } return this.p.chest; }
  capAt(point, joint, far, r, mat) {
    const m = new THREE.Mesh(disc, mat); m.scale.setScalar(r); m.frustumCulled = false;
    this.group.add(m); this.caps.push({ m, point, joint, far });
  }
  splitWaist() { const P = this.p; return this.halve(t1.copy(P.spine), new V().subVectors(P.chest, P.pelvis).normalize(), 'torso'); }
  // off at the neck: with a blade, cut where it went (the bottom of the neck stays on them)
  decapitate(force = 1, point = null, normal = null) {
    if (this.headGone || this.severed.has('neck')) return false;
    if (point) {
      const neck = this.parts.neck; neck.g.updateMatrixWorld(true); const w = neck.g.matrixWorld.clone();
      const { go } = this.cutMeshes(neck.g, point, normal, new V(0, 0.14, 0), stumpMat);
      this.rehome(go, w, this.parts.torso.g);
      this.sever('neck', force, true);
    } else this.sever('neck', force);
    this.cause ??= 'decapitated';
    return true;
  }
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
  // an axe down through the skull: the head comes apart where it went in
  cleaveHead(point = null, normal = null) {
    if (this.headGone || this.cleaved) return false;
    const P = this.p;
    if (!normal) { normal = new V().subVectors(P.rSh, P.lSh).normalize(); point = t1.copy(P.head); }
    return this.slicePart('head', point, normal);
  }

  // belly opened: the gut spills out and hangs
  // the body's been opened: what's inside can be seen now
  openUp() {
    if (this.opened) return;
    this.opened = true;
    for (const m of this.organs) { m.visible = true; m.castShadow = false; }
  }
  disembowel() {
    this.openUp();
    if (this.gutted || this.split) return false;
    this.gutted = true;
    this.entrails(this.p.spine, 10, true);
    // the belly is open: the coils of gut come out with it
    const P = this.p, fwd = new V().subVectors(P.lSh, P.rSh).cross(t2.subVectors(P.neck, P.pelvis)).normalize().multiplyScalar(-1);
    this.spillOrgans(t1.copy(P.pelvis).lerp(P.spine, 0.6).addScaledVector(fwd, 0.11), fwd, 'hips');
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
    this.heartOut = true; this.openUp();
    const P = this.p, fwd = t1.subVectors(P.lSh, P.rSh).cross(t2.subVectors(P.neck, P.pelvis)).normalize().multiplyScalar(-1);
    const at = t2.copy(P.chest).lerp(P.neck, 0.2).addScaledVector(fwd, 0.14);
    const heart = this.sim.point(at.x, at.y, at.z, 0.045, 0.3, this, 'heart');
    const vessel = this.sim.point(at.x, at.y + 0.05, at.z, 0.02, 0.1, this, 'heart');
    this.sim.link(heart, vessel, 'rod', 1, null, this);
    // the real one, out of their chest: a fist-sized muscle with its vessels torn off
    const hm = this.organs.find(m => m.userData.organ.name === 'heart'); if (hm) { hm.parent?.remove(hm); this.organs.splice(this.organs.indexOf(hm), 1); }
    const m = new THREE.Mesh(heartGeo(), [organMat(ORGANS[0]), organCutMat]); m.frustumCulled = false; this.group.add(m);
    this.extra.push({ p: heart, q: vessel, m });
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
    this.alive = false; this.hp = 0; this.scared = true; this.twitchT = 4 + R() * 3;
    this.ragdoll(1e9);
    // a last push the way they were going
    const v = this.speed;
    if (v > 0.5) for (const k in this.p) this.p[k].addVel(Math.sin(this.yaw) * v * 0.6, 0, Math.cos(this.yaw) * v * 0.6);
    // the legs go: knees buckle forward and the top half falls, so no corpse is left standing
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), side = R() < 0.5 ? -1 : 1, fall = 0.6 + R() * 1.2;
    for (const k of ['lKn', 'rKn']) if (!this.loose?.has(k)) this.p[k].addVel(fx * 1.6, -0.3, fz * 1.6);
    for (const k of ['chest', 'neck', 'head', 'lSh', 'rSh']) if (!this.loose?.has(k)) this.p[k].addVel(-fx * fall + fz * side * 0.6, -0.4, -fz * fall - fx * side * 0.6);
    this.p.pelvis.addVel(0, -0.6, 0);
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
  // which way a part's front faces
  sideOf(pt, out) {
    if (pt.sideFix) return out.set(pt.sideFix.s.x - pt.sideFix.o.x, pt.sideFix.s.y - pt.sideFix.o.y, pt.sideFix.s.z - pt.sideFix.o.z);
    const P = this.p, k = kindOf(pt.name);
    if (k === 'foot') return out.set(0, 1, 0);
    if (k === 'hips' || k === 'thigh' || k === 'shin') return out.subVectors(P.rHip, P.lHip).cross(t4.subVectors(P.spine, P.pelvis)).normalize();
    out.subVectors(P.rSh, P.lSh).cross(t4.subVectors(P.neck, P.spine)).normalize();
    if (!isFinite(out.x)) out.set(0, 0, 1);
    return out;
  }
  syncPart(pt) {
    const P = this.p;
    if (pt.name === 'head') {
      const side = this.sideOf(pt, new V());
      const up = new V().subVectors(P.head, this.parts.neck.fromPt ?? P.neck).normalize();
      pt.g.quaternion.setFromRotationMatrix(this.frameOf(new V(), up, side, mb));
      pt.g.position.set(P.head.x, P.head.y, P.head.z);
      return;
    }
    const [a, b] = this.ends(pt);
    const side = this.sideOf(pt, new V());
    pt.g.quaternion.setFromRotationMatrix(this.frameOf(a, b, side, mb));
    pt.g.position.set(a.x, a.y, a.z);
  }
  sync() {
    for (const n in this.parts) { const pt = this.parts[n]; if (!pt.gone) this.syncPart(pt); }
    for (const c of this.caps) {
      const nb = c.far ? this.capNeighbour(c) : this.neighbour(c.point, BELOW[c.joint] ? new Set(BELOW[c.joint]) : new Set());
      if (!nb) continue;
      t1.subVectors(c.point, nb).normalize();
      c.m.position.set(c.point.x, c.point.y, c.point.z); c.m.quaternion.setFromUnitVectors(t2.set(0, 0, 1), t1);
    }
    for (const g of this.guts) { g.m.position.set((g.a.x + g.b.x) / 2, (g.a.y + g.b.y) / 2, (g.a.z + g.b.z) / 2); g.m.quaternion.setFromUnitVectors(UP, t1.set(g.b.x - g.a.x, g.b.y - g.a.y, g.b.z - g.a.z).normalize()); }
    for (const e of this.extra) { e.m.position.set(e.p.x, e.p.y, e.p.z); if (e.q) e.m.quaternion.setFromUnitVectors(UP, t1.set(e.q.x - e.p.x, e.q.y - e.p.y, e.q.z - e.p.z).normalize()); }
  }
  capNeighbour(c) { for (const l of this.links) { if (l.a === c.point) return l.b; if (l.b === c.point) return l.a; } return null; }
  dispose() {
    this.scene.remove(this.group); this.sim.remove(this); this.gone = true;
    for (const k in this.p) this.p[k].dead = true;
    this.shirtT.dispose();
    for (const g of this.ownGeos) g.dispose();
  }
}
