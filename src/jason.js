// Jason himself, as you see him: rotted, oversized hands and a big body in a
// torn work jacket. Everything is built from primitives with painted textures.
import * as THREE from '../vendor/three.module.js';

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
  for (let i = 0; i < 16; i++) {   // sores: dark wet centre, angry red, yellowed rim
    const x = R() * w, y = R() * h, r = 5 + R() * 11; sores.push([x, y, r]);
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
export function buildHand(side, skin = skinMat) {
  const s = side === 'left' ? 1 : -1;
  const root = new THREE.Group(), flat = new THREE.Group();
  root.add(flat);
  flat.rotation.z = s * Math.PI / 2;
  flat.position.set(-s * 0.014, -0.032, 0.08);
  const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
  const K = 1.14;   // he's a big man
  // palm: a thick, slightly cupped slab with a heel and the meat at the base of the thumb
  add(flat, sphere(0.05, 16, 12), skin, 0, 0, -0.005, 0.98 * K, 0.34 * K, 1.12 * K);
  add(flat, sphere(0.03, 12, 10), skin, s * 0.022, -0.006, 0.03, 1.1 * K, 0.75 * K, 1.2 * K);     // thenar
  add(flat, sphere(0.028, 12, 10), skin, -s * 0.026, -0.004, 0.03, 0.9 * K, 0.7 * K, 1.3 * K);    // heel by the little finger
  add(flat, seg(0.034, 0.03, 0.05), skin, 0, -0.002, 0.075, 1.15 * K, 0.6 * K, 1);                  // wrist
  // tendons and a fat vein along the back of the hand
  for (let i = 0; i < 4; i++) { const t = add(flat, seg(0.0042, 0.0035, 0.07), skin, s * (0.028 - i * 0.019) * K * 0.92, 0.016 * K, 0.025); t.rotation.y = s * (i - 1.5) * -0.08; }
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.5 });
  const v = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.005, 0.0165 * K, 0.07), new THREE.Vector3(-s * 0.01, 0.0185 * K, 0.02), new THREE.Vector3(s * 0.012, 0.0185 * K, -0.02), new THREE.Vector3(s * 0.006, 0.016 * K, -0.045)]), 12, 0.0028, 5), veinMat);
  flat.add(v);
  // a rotted-through patch on the back of the hand with a knuckle bone showing
  add(flat, sphere(0.012, 8, 6), woundMat, -s * 0.004, 0.0165 * K, -0.012, 1.6, 0.35, 1.1);
  add(flat, sphere(0.006, 8, 6), boneMat, -s * 0.002, 0.019 * K, -0.014, 1.4, 0.6, 0.8);

  const fingers = [];
  const LEN = [[0.048, 0.03, 0.024], [0.053, 0.034, 0.026], [0.049, 0.031, 0.024], [0.039, 0.025, 0.021]].map(a => a.map(v => v * K));
  const RAD = [0.0108, 0.0112, 0.0105, 0.0092].map(v => v * K);
  for (let i = 0; i < 4; i++) {
    const joints = [];
    let parent = flat, z = -0.05 * K;
    for (let j = 0; j < 3; j++) {
      const g = new THREE.Group();
      g.position.set(j === 0 ? s * (0.0315 - i * 0.021) * K : 0, j === 0 ? 0.002 : 0, z);
      if (j === 0) g.rotation.y = s * (i - 1.5) * 0.05;
      parent.add(g);
      const r0 = RAD[i] * (1 - j * 0.12), r1 = RAD[i] * (1 - (j + 1) * 0.12), L = LEN[i][j];
      add(g, sphere(r0 * 1.12, 10, 8), skin, 0, 0, 0, 1.05, 0.95, 1);   // swollen knuckle
      add(g, seg(r0, r1, L), skin, 0, 0, 0, 1.08, 0.92, 1);
      if (j === 2) {
        add(g, sphere(r1, 10, 8), skin, 0, -0.001, -L, 1.05, 0.85, 1.25);   // fingertip pad
        const nail = add(g, new THREE.BoxGeometry(r1 * 1.55, 0.0028, L * 0.62), nailMat, 0, r1 * 0.78, -L * 0.62);
        nail.rotation.x = 0.06; if (i === 1 || i === 3) nail.scale.z = 0.7;   // a couple broken off short
      }
      if (i === 2 && j === 1) add(g, sphere(r0 * 0.7, 8, 6), woundMat, 0, r0 * 0.75, -L * 0.4, 1.2, 0.4, 1.4);
      joints.push(g); parent = g; z = -L;
    }
    fingers.push(joints);
  }
  // thumb: metacarpal, then two segments
  const thumb = new THREE.Group(); thumb.position.set(s * 0.034 * K, -0.008, 0.03); flat.add(thumb);
  add(thumb, seg(0.0145 * K, 0.0128 * K, 0.04 * K), skin);
  const thumb1 = new THREE.Group(); thumb1.position.z = -0.04 * K; thumb.add(thumb1);
  add(thumb1, sphere(0.0135 * K, 10, 8), skin);
  add(thumb1, seg(0.0128 * K, 0.0115 * K, 0.034 * K), skin);
  const thumb2 = new THREE.Group(); thumb2.position.z = -0.034 * K; thumb1.add(thumb2);
  add(thumb2, sphere(0.0118 * K, 10, 8), skin);
  add(thumb2, seg(0.0115 * K, 0.0105 * K, 0.028 * K), skin);
  add(thumb2, sphere(0.0105 * K, 10, 8), skin, 0, -0.001, -0.028 * K, 1, 0.85, 1.2);
  add(thumb2, new THREE.BoxGeometry(0.017 * K, 0.003, 0.018 * K), nailMat, 0, 0.0095 * K, -0.02 * K);

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
  const arms = [0, 1].map(() => [limb(0.058, jacketMat), limb(0.05, jacketMat, true)]);
  const wrists = [0, 1].map(() => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.09, 12), skinMat); g.add(w); return w; });
  const legs = [0, 1].map(() => [limb(0.08, pantsMat), limb(0.064, pantsMat)]);
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
    const H = hand ? av.c.copy(hand.glove.position).add(av.t.set(-ws * 0.014, -0.032, 0.14).applyQuaternion(hand.glove.quaternion))
      : av.c.copy(sh).addScaledVector(UP, -0.6).addScaledVector(right, side * 0.06).addScaledVector(fwd, 0.04);
    const elbow = joint(sh, H, 0.33, 0.31, av.t.copy(UP).multiplyScalar(-0.6).addScaledVector(right, side * 0.5).addScaledVector(fwd, -0.3), av.e);
    placeLimb(B.arms[i][0], sh, elbow);
    const fore = B.arms[i][1], wrist = B.wrists[i];
    if (hand) {
      // forearm lives in the hand's space so wrist and hand can never come apart
      const gl = hand.glove;
      if (fore.parent !== gl) { gl.add(fore); gl.add(wrist); }
      gl.updateMatrixWorld(true);
      const wl = av.b.set(-ws * 0.014, -0.032, 0.14), el = gl.worldToLocal(av.f.copy(elbow));
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
