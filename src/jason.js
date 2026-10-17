// Jason himself, as you see him: rotted, oversized hands and a big body in a
// torn work jacket. Everything is built from primitives with painted textures.
import * as THREE from '../vendor/three.module.js';
import { sd, smin, ssub, mesh } from './sculpt.js?v=11';

function tex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const R = Math.random;
function blob(g, x, y, r, col) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function vein(g, x, y, len, ang, width, col) {
  g.strokeStyle = col; g.lineWidth = width; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y);
  for (let i = 0; i < len; i += 6) { ang += (R() - 0.5) * 0.6; x += Math.cos(ang) * 6; y += Math.sin(ang) * 6; g.lineTo(x, y); if (R() < 0.08 && width > 0.8) vein(g, x, y, len * 0.4, ang + (R() - 0.5) * 2, width * 0.6, col); }
  g.stroke();
}

// Dead, waterlogged skin: sallow grey-olive, bruised purple and green, dark
// veins under it, grime ground into it, weeping sores and old scars.
const sores = [];
export const skinTex = tex(512, 512, (g, w, h) => {
  g.fillStyle = '#8b8670'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) blob(g, R() * w, R() * h, 20 + R() * 70, ['rgba(108,104,84,0.55)', 'rgba(120,88,96,0.45)', 'rgba(92,100,70,0.5)', 'rgba(160,148,108,0.4)', 'rgba(70,60,58,0.4)'][i % 5]);
  for (let i = 0; i < 26; i++) vein(g, R() * w, R() * h, 60 + R() * 120, R() * 6.3, 1.2 + R() * 1.6, 'rgba(48,52,74,0.38)');
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${30 + R() * 30 | 0},${24 + R() * 20 | 0},${14},${R() * 0.25})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }   // grime and pores
  for (let i = 0; i < 40; i++) blob(g, R() * w, R() * h, 8 + R() * 26, 'rgba(38,30,20,0.5)');   // dirt smudges
  for (let i = 0; i < 9; i++) {   // sores: dark wet centre, angry red, yellowed rim
    const x = R() * w, y = R() * h, r = 3 + R() * 6; sores.push([x, y, r]);
    blob(g, x, y, r * 2.2, 'rgba(150,60,50,0.5)');
    g.fillStyle = 'rgba(190,170,90,0.8)'; g.beginPath(); g.ellipse(x, y, r * 1.15, r * 0.9, R() * 3, 0, 7); g.fill();
    g.fillStyle = '#5a1410'; g.beginPath(); g.ellipse(x, y, r, r * 0.75, R() * 3, 0, 7); g.fill();
    g.fillStyle = '#1e0806'; g.beginPath(); g.ellipse(x + 1, y, r * 0.5, r * 0.35, R() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 10; i++) { g.strokeStyle = 'rgba(190,160,150,0.55)'; g.lineWidth = 2; const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 70, y + (R() - 0.5) * 30); g.stroke(); }   // scars
  for (let i = 0; i < 18; i++) blob(g, R() * w, R() * h, 6 + R() * 22, 'rgba(90,10,6,0.55)');   // other people's blood
  for (let i = 0; i < 300; i++) { g.strokeStyle = 'rgba(40,30,24,0.25)'; g.lineWidth = 0.7; const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + R() * 10, y + (R() - 0.5) * 3); g.stroke(); }   // creases
});
export const skinBump = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) { const v = 100 + R() * 70 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 1, 1); }
  for (let i = 0; i < 200; i++) { g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 1; const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4 + R() * 9, y + (R() - 0.5) * 2); g.stroke(); }
  for (const [x, y, r] of sores) { g.fillStyle = '#202020'; g.beginPath(); g.arc(x / 2, y / 2, r / 2, 0, 7); g.fill(); g.strokeStyle = '#d0d0d0'; g.lineWidth = 1.5; g.stroke(); }
}, false);
const nailTex = tex(32, 32, (g, w, h) => {
  g.fillStyle = '#8a7a48'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(60,50,30,0.6)'; g.beginPath(); g.moveTo(R() * w, 0); g.lineTo(R() * w, h); g.stroke(); }
  g.fillStyle = 'rgba(25,15,8,0.9)'; g.fillRect(0, h * 0.7, w, h * 0.3);   // filth under the tips
});
// heavy work jacket: faded olive canvas, oil, blood, rips
export const jacketTex = tex(512, 512, (g, w, h) => {
  g.fillStyle = '#3a3d2c'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.08})`; g.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,230,${R() * 0.035})`; g.fillRect(x, 0, 1, h); }
  for (let i = 0; i < 50; i++) blob(g, R() * w, R() * h, 15 + R() * 60, ['rgba(20,22,14,0.5)', 'rgba(80,78,58,0.35)', 'rgba(50,30,20,0.4)'][i % 3]);
  for (let i = 0; i < 26; i++) { blob(g, R() * w, R() * h, 6 + R() * 30, 'rgba(70,6,4,0.65)'); }
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(60,4,2,0.8)'; g.beginPath(); g.arc(R() * w, R() * h, 1 + R() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 14; i++) {   // tears with dark showing through
    const x = R() * w, y = R() * h; g.fillStyle = '#0d0e0a'; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 7; k++) g.lineTo(x + (R() - 0.5) * 30, y + (R() - 0.5) * 18); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(110,105,80,0.6)'; g.lineWidth = 1; g.stroke();
  }
});
const pantsTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#25231f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${60 + R() * 40 | 0},${55 + R() * 30 | 0},${45},${R() * 0.12})`; g.fillRect(R() * w, R() * h, 1, 3); }
  for (let i = 0; i < 30; i++) blob(g, R() * w, R() * h, 10 + R() * 40, 'rgba(70,58,40,0.35)');   // mud
  for (let i = 0; i < 10; i++) blob(g, R() * w, R() * h, 5 + R() * 20, 'rgba(60,5,3,0.6)');
});
const bootTex = tex(128, 128, (g, w, h) => {
  g.fillStyle = '#1d1712'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) blob(g, R() * w, R() * h, 4 + R() * 20, 'rgba(80,64,44,0.4)');
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.4})`; g.fillRect(R() * w, R() * h, 2, 1); }
});

export const skinMat = new THREE.MeshStandardMaterial({ map: skinTex, bumpMap: skinBump, bumpScale: 0.9, roughness: 0.72, metalness: 0, color: 0xffffff });
const nailMat = new THREE.MeshStandardMaterial({ map: nailTex, roughness: 0.45 });
const woundMat = new THREE.MeshStandardMaterial({ color: 0x4a0c08, roughness: 0.25 });
const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8ceb0, roughness: 0.5 });
export const jacketMat = new THREE.MeshStandardMaterial({ map: jacketTex, roughness: 0.95 });
const pantsMat = new THREE.MeshStandardMaterial({ map: pantsTex, roughness: 0.95 });
const bootMat = new THREE.MeshStandardMaterial({ map: bootTex, roughness: 0.7 });
const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.6 });
const buckleMat = new THREE.MeshStandardMaterial({ color: 0x6a6a60, roughness: 0.4, metalness: 0.7 });

// A tapered rounded segment from 0 to -len along Z (radius r0 at the base, r1 at the tip)
function seg(r0, r1, len) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 10, 2);
  g.rotateX(-Math.PI / 2); g.translate(0, 0, -len / 2);
  return g;
}
const sphere = (r, ws = 10, hs = 8) => new THREE.SphereGeometry(r, ws, hs);

// Hand in the same frame the controllers use: built flat (fingers along -Z,
// palm down), then rolled so the palm faces in. side: 'left' | 'right'.
// Everything is sculpted: a thick palm with knuckles, tendons and the meat at
// the base of the thumb, a wrist that runs on into the forearm, and fingers
// of three jointed segments each, swollen at the knuckles.
const handCache = {};
const boxUV = (g, k = 2.2) => { const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - p.getZ(i)) * k; uv[i * 2 + 1] = (p.getY(i) - p.getZ(i)) * k; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };
function handGeos(s) {
  if (handCache[s]) return handCache[s];
  const K = 1.14, { ell, sphere, cone, box } = sd;
  // the palm and wrist (in the flat frame, before it's placed)
  const palm = (x, y, z) => {
    let d = box(x, y, z, 0, 0, -0.008, 0.043 * K, 0.0135 * K, 0.048 * K, 0.012);
    d = smin(d, ell(x, y, z, s * 0.024, -0.005, 0.026, 0.024 * K, 0.016 * K, 0.03 * K), 0.018);              // the ball of the thumb
    d = smin(d, ell(x, y, z, -s * 0.024, -0.004, 0.028, 0.02 * K, 0.014 * K, 0.03 * K), 0.018);              // the heel of the hand
    d = smin(d, cone(x, y / 0.72, z, 0, -0.002, 0.035, 0, -0.002, 0.062, 0.029 * K, 0.027 * K), 0.025);        // the wrist: flatter than it is wide, ends where the arm takes over
    for (let i = 0; i < 4; i++) {
      const fx = s * (0.0315 - i * 0.021) * K;
      d = smin(d, sphere(x, y, z, fx, 0.003, -0.05 * K, 0.0105 * K), 0.01);                                   // knuckles
      d = smin(d, cone(x, y, z, fx * 0.85, 0.014 * K, 0.035, fx, 0.013 * K, -0.045 * K, 0.004, 0.004), 0.006);  // tendons across the back
    }
    return d;
  };
  const palmG = boxUV(mesh(palm, [-0.08, -0.05, -0.1], [0.08, 0.05, 0.15], 0.0042));
  // one finger segment: from its knuckle (origin) along -Z for L; a bit wider than deep
  const segCache = {};
  const seg = (r0, r1, L, tip) => {
    const key = [r0, r1, L, tip].map(v => (+v).toFixed(4)).join();
    return segCache[key] ??= boxUV(mesh((x, y, z) => {
      // a little wider than deep, slimmer in the middle of each segment than at its joints
      let d = cone(x / 1.12, y / 0.94, z, 0, 0, r0 * 0.4, 0, 0, -L, r0, r1);                                   // overlaps the segment before, so the joint is seamless
      d = smin(d, ell(x, y, z, 0, 0.001, -L * 0.05, r0 * 1.08, r0 * 0.96, r0 * 0.9), r0 * 0.9);               // a slight fullness at the joint
      if (tip) d = smin(d, ell(x, y, z, 0, -0.0015, -L * 0.98, r1 * 0.95, r1 * 0.75, r1 * 1.1), r1 * 0.4);   // fingertip pad
      return d;
    }, [-r0 * 1.6, -r0 * 1.6, -L - r1 * 2], [r0 * 1.6, r0 * 1.6, r0 * 1.6], Math.min(0.0024, r1 * 0.26)));
  };
  return handCache[s] = { palmG, seg };
}
export function buildHand(side, skin = skinMat) {
  const s = side === 'left' ? 1 : -1;
  const root = new THREE.Group(), flat = new THREE.Group();
  root.add(flat);
  flat.rotation.z = s * Math.PI / 2;
  flat.position.set(-s * 0.014, -0.032, 0.08);
  const { palmG, seg } = handGeos(s);
  const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
  const K = 1.14;
  add(flat, palmG, skin);
  const fingers = [];
  const LEN = [[0.046, 0.029, 0.023], [0.051, 0.033, 0.025], [0.047, 0.03, 0.023], [0.037, 0.024, 0.02]].map(a => a.map(v => v * K * 0.86));
  const RAD = [0.0104, 0.0107, 0.01, 0.0086].map(v => v * K);
  for (let i = 0; i < 4; i++) {
    const joints = [];
    let parent = flat, z = -0.05 * K;
    for (let j = 0; j < 3; j++) {
      const g = new THREE.Group();
      g.position.set(j === 0 ? s * (0.0315 - i * 0.021) * K : 0, j === 0 ? 0.002 : 0, z);
      if (j === 0) g.rotation.y = s * (i - 1.5) * 0.05;
      parent.add(g);
      const r0 = RAD[i] * (1 - j * 0.11), r1 = RAD[i] * (1 - (j + 1) * 0.11), L = LEN[i][j];
      add(g, seg(r0, r1, L, j === 2), skin);
      if (j === 2) {
        const nail = add(g, new THREE.BoxGeometry(r1 * 1.6, 0.0025, L * 0.55), nailMat, 0, r1 * 0.72, -L * 0.62);
        nail.rotation.x = 0.06; if (i === 1 || i === 3) nail.scale.z = 0.7;   // a couple broken off short
      }
      joints.push(g); parent = g; z = -L;
    }
    fingers.push(joints);
  }
  // thumb: three segments out of the ball of the thumb
  const thumb = new THREE.Group(); thumb.position.set(s * 0.036 * K, -0.008, 0.028); flat.add(thumb);
  add(thumb, seg(0.0135 * K, 0.0118 * K, 0.04 * K, false), skin);
  const thumb1 = new THREE.Group(); thumb1.position.z = -0.04 * K; thumb.add(thumb1);
  add(thumb1, seg(0.0124 * K, 0.0112 * K, 0.03 * K, false), skin);
  const thumb2 = new THREE.Group(); thumb2.position.z = -0.03 * K; thumb1.add(thumb2);
  add(thumb2, seg(0.0112 * K, 0.01 * K, 0.025 * K, true), skin);
  add(thumb2, new THREE.BoxGeometry(0.018 * K, 0.003, 0.018 * K), nailMat, 0, 0.0105 * K, -0.02 * K);

  const cur = { index: 0.2, rest: 0.2 };
  root.userData.pose = (index, rest, k = 1) => {
    cur.index += (index - cur.index) * k; cur.rest += (rest - cur.rest) * k;
    fingers.forEach((joints, i) => {
      const c = i === 0 ? cur.index : cur.rest * (1 + i * 0.03);
      joints[0].rotation.x = -c * 1.3 - 0.08; joints[1].rotation.x = -c * 1.55 - 0.12; joints[2].rotation.x = -c * 1.0 - 0.08;   // never quite straight: rigor
    });
    const c = Math.max(cur.rest, cur.index * 0.6);
    thumb.rotation.y = -s * (0.8 - 0.55 * c); thumb.rotation.x = -c * 0.3 - 0.1; thumb1.rotation.x = -c * 0.5; thumb2.rotation.x = -c * 0.8;
  };
  root.userData.pose(0.2, 0.2);
  return root;
}
const sphere3 = r => new THREE.SphereGeometry(r, 10, 8);

// Ragged sleeve end: an open tube with a torn, uneven hem
function raggedTube(r0, r1, len) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 14, 3, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < -len / 2 + 0.001) p.setY(i, p.getY(i) + R() * 0.035);
  g.computeVertexNormals();
  return g;
}

// The body under your head: chest and gut, shoulders, arms to your hands, legs.
export function makeBody(scene) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  jacketMat.side = THREE.DoubleSide;
  const limb = (r, m, ragged = false) => { const x = new THREE.Mesh(ragged ? raggedTube(r, r * 0.9, 1) : new THREE.CylinderGeometry(r, r * 0.86, 1, 12), m); g.add(x); return x; };
  const torso = new THREE.Group();
  const part = (geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); torso.add(m); return m; };
  part(new THREE.CapsuleGeometry(0.14, 0.14, 6, 18), jacketMat, 0, 0.09, 0, 1.45, 1, 0.78);       // barrel chest
  part(new THREE.CapsuleGeometry(0.13, 0.12, 6, 18), jacketMat, 0, -0.14, 0.02, 1.32, 1, 0.82);   // gut
  part(new THREE.SphereGeometry(0.07, 12, 10), jacketMat, -0.2, 0.21, 0, 1, 0.9, 1);              // shoulders
  part(new THREE.SphereGeometry(0.07, 12, 10), jacketMat, 0.2, 0.21, 0, 1, 0.9, 1);
  part(new THREE.CylinderGeometry(0.2, 0.17, 0.06, 18), jacketMat, 0, 0.24, 0, 1, 1, 0.65);
  // the jacket hangs open over a filthy dark shirt
  const shirt = new THREE.MeshStandardMaterial({ color: 0x24221d, roughness: 1 });
  part(new THREE.BoxGeometry(0.1, 0.42, 0.02), shirt, 0, -0.03, 0.108, 1, 1, 1);
  part(new THREE.BoxGeometry(0.14, 0.12, 0.03), jacketMat, -0.12, -0.18, 0.11, 1, 1, 1);   // pockets
  part(new THREE.BoxGeometry(0.14, 0.12, 0.03), jacketMat, 0.12, -0.18, 0.11, 1, 1, 1);
  part(new THREE.TorusGeometry(0.11, 0.025, 6, 16, Math.PI), jacketMat, 0, 0.27, 0.0, 1, 1, 0.7).rotation.x = -Math.PI / 2;   // collar
  const hips = new THREE.Group();
  const hp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), pantsMat); hp.scale.set(1.45, 0.9, 0.9); hips.add(hp);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.192, 0.192, 0.05, 20, 1, true), leatherMat); belt.scale.z = 0.66; belt.position.y = 0.06; hips.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.01), buckleMat); buckle.position.set(0, 0.06, 0.128); hips.add(buckle);
  const hem = new THREE.Mesh(raggedTube(0.2, 0.21, 0.16), jacketMat); hem.scale.z = 0.7; hem.position.y = 0.12; hips.add(hem);   // jacket skirt
  g.add(torso, hips);
  const feet = [0, 1].map(() => {
    const f = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.3), bootMat); f.add(b);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), bootMat); toe.scale.set(1, 0.75, 1); toe.position.set(0, -0.005, 0.12); f.add(toe);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.025, 0.32), new THREE.MeshStandardMaterial({ color: 0x0d0b09 })); sole.position.y = -0.05; f.add(sole);
    g.add(f); return f;
  });
  // forearm: jacket sleeve with a torn cuff; the bare wrist shows below it
  const arms = [0, 1].map(() => [limb(0.062, jacketMat), limb(0.056, jacketMat, true)]);
  const wrists = [0, 1].map(() => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.036, 1, 14).scale(1, 1, 0.8), skinMat); g.add(w); return w; });
  const legs = [0, 1].map(() => [limb(0.08, pantsMat), limb(0.064, pantsMat)]);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, torso, hips, feet, wrists, arms, legs, phase: 0, speed: 0, last: new THREE.Vector3(), yaw: 0 };
}

const UP = new THREE.Vector3(0, 1, 0), av = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3(), t: new THREE.Vector3(), t2: new THREE.Vector3(), t3: new THREE.Vector3() };
const bq = new THREE.Quaternion();
function placeLimb(m, a, b) {
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.scale.set(1, Math.max(0.01, a.distanceTo(b)), 1);
  m.quaternion.setFromUnitVectors(UP, av.t2.subVectors(b, a).normalize());
}
function joint(S, H, L1, L2, bend, out) {
  const d = Math.min(L1 + L2 - 0.001, Math.max(0.01, S.distanceTo(H)));
  av.t3.subVectors(H, S).normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  av.t2.copy(bend).addScaledVector(av.t3, -bend.dot(av.t3)).normalize();
  return out.copy(S).addScaledVector(av.t3, a).addScaledVector(av.t2, hh);
}
// Lay the body out under the head. handFor(side) -> hand {glove, side} or null.
// The body turns after the head rather than snapping with it.
export function poseBody(B, head, headYaw, handFor, floorY, dt) {
  let dy = headYaw - B.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  if (Math.abs(dy) > 0.6) B.yaw += dy - Math.sign(dy) * 0.6;
  B.yaw += dy * Math.min(1, dt * 2.5);
  const yaw = B.yaw;
  const fwd = av.f.set(-Math.sin(yaw), 0, -Math.cos(yaw)), right = av.r.set(Math.cos(yaw), 0, -Math.sin(yaw));
  const neck = av.a.copy(head).addScaledVector(UP, -0.3).addScaledVector(fwd, -0.09);
  bq.setFromAxisAngle(UP, yaw);
  B.torso.position.copy(neck).addScaledVector(UP, -0.3); B.torso.quaternion.copy(bq);
  B.hips.position.copy(neck).addScaledVector(UP, -0.64); B.hips.quaternion.copy(bq);
  B.chest = B.torso.position;
  const moved = Math.hypot(head.x - B.last.x, head.z - B.last.z); B.last.copy(head);
  B.speed += (Math.min(5, moved / Math.max(dt, 1e-3)) - B.speed) * 0.15;
  const walking = B.speed > 0.25;
  B.phase += walking ? moved * 5.5 : 0;
  const stride = walking ? Math.min(0.32, B.speed * 0.12) : 0;
  const hipY = Math.max(floorY + 0.75, neck.y - 0.7);
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, swing = Math.sin(B.phase + i * Math.PI);
    const hip = av.b.set(neck.x, hipY, neck.z).addScaledVector(right, side * 0.11);
    const foot = av.c.set(hip.x, floorY + 0.09 + Math.max(0, swing) * stride * 0.45, hip.z).addScaledVector(fwd, 0.05 + swing * stride).addScaledVector(right, side * 0.02);
    const knee = joint(hip, foot, 0.47, 0.47, fwd, av.e);
    placeLimb(B.legs[i][0], hip, knee); placeLimb(B.legs[i][1], knee, foot);
    B.feet[i].position.copy(foot).addScaledVector(fwd, 0.05).setY(Math.max(floorY + 0.05, foot.y - 0.03)); B.feet[i].quaternion.copy(bq);
    const sh = av.b.copy(neck).addScaledVector(UP, -0.05).addScaledVector(right, side * 0.2);
    const hand = handFor(side);
    const ws = hand?.side === 'left' ? 1 : -1;
    const H = hand ? av.c.copy(hand.glove.position).add(av.t.set(-ws * 0.014, -0.032, 0.13).applyQuaternion(hand.glove.quaternion))
      : av.c.copy(sh).addScaledVector(UP, -0.6).addScaledVector(right, side * 0.06).addScaledVector(fwd, 0.04);
    const elbow = joint(sh, H, 0.33, 0.31, av.t.copy(UP).multiplyScalar(-0.6).addScaledVector(right, side * 0.5).addScaledVector(fwd, -0.3), av.e);
    placeLimb(B.arms[i][0], sh, elbow);
    const fore = B.arms[i][1], wrist = B.wrists[i];
    if (hand) {
      // forearm lives in the hand's space so wrist and hand can never come apart
      const gl = hand.glove;
      if (fore.parent !== gl) { gl.add(fore); gl.add(wrist); }
      gl.updateMatrixWorld(true);
      const wl = av.b.set(-ws * 0.014, -0.032, 0.13), el = gl.worldToLocal(av.f.copy(elbow));
      const sleeveEnd = av.t.copy(wl).lerp(el, 0.18);
      placeLimb(fore, el, sleeveEnd);
      placeLimb(wrist, wl, av.t3.copy(wl).lerp(el, 0.26));
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    } else {
      if (fore.parent !== B.g) { B.g.add(fore); B.g.add(wrist); }
      placeLimb(fore, elbow, H); wrist.visible = true;
      placeLimb(wrist, H, av.t.copy(H).lerp(elbow, 0.2));
    }
  }
}
