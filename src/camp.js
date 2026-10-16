// Camp Crystal Lake: the ground, the lake, cabins, the lodge, the campfire,
// the woods, and a walk grid the counselors find their way round with.
import * as THREE from '../vendor/three.module.js';

export const BOUND = 58;                 // the woods close in past this
const SHORE = x => -30 + Math.sin(x * 0.07) * 3 + Math.sin(x * 0.19 + 1) * 1.2;
export const shoreZ = SHORE;
export const WATER_Y = -0.12;
export const DOCK = { x0: -1.3, x1: 1.3, z0: -46, z1: -27 };
const inDock = (x, z) => x > DOCK.x0 && x < DOCK.x1 && z > DOCK.z0 && z < DOCK.z1;
// ground height the physics (and your feet) stand on
// raised floors (cabins, the lodge, porches, the shed) and, for bodies only, the bunks
const FLOORS = [], BUNKS = [];
function rectAdd(list, cx, cz, yaw, lx, lz, w, d, h) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  list.push({ x: cx + lx * c + lz * s, z: cz - lx * s + lz * c, c, s, hw: w / 2, hd: d / 2, h, r: Math.hypot(w, d) / 2 });
}
function rectHeight(list, x, z) {
  let best = -9;
  for (const f of list) {
    const dx = x - f.x, dz = z - f.z;
    if (dx * dx + dz * dz > f.r * f.r) continue;
    const lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c;
    if (Math.abs(lx) <= f.hw && Math.abs(lz) <= f.hd && f.h > best) best = f.h;
  }
  return best;
}
// where things that fall come to rest: the ground, a floor, or a bunk
export function restAt(x, z) { return Math.max(groundAt(x, z), rectHeight(BUNKS, x, z)); }
export function groundAt(x, z) {
  const fl = rectHeight(FLOORS, x, z); if (fl > -9) return fl;
  if (inDock(x, z)) return 0.05;
  const s = SHORE(x);
  if (z > s) return 0;
  return Math.max(-0.75, (z - s) * 0.12);   // shelves down into the lake
}
export const inLake = (x, z) => z < SHORE(x) - 0.5 && !inDock(x, z);

export const CAMPFIRE = { x: 0, z: -12 };
export const CAR = { x: 9, z: 44, yaw: 0.25 };
export const ROAD_END = { x: 2, z: 60 };
export const START = { x: 0, z: -52, yaw: 0 };   // Jason comes out of the lake
// cabins: centre, facing (yaw the door looks along), size
export const CABINS = [
  { x: -22, z: -5, yaw: Math.PI / 2 + 0.3, name: 'CABIN 1' },
  { x: -27, z: 9, yaw: Math.PI / 2, name: 'CABIN 2' },
  { x: -20, z: 22, yaw: Math.PI / 2 - 0.5, name: 'CABIN 3' },
  { x: 20, z: 22, yaw: -Math.PI / 2 + 0.5, name: 'CABIN 4' },
  { x: 27, z: 9, yaw: -Math.PI / 2, name: 'CABIN 5' },
  { x: 22, z: -5, yaw: -Math.PI / 2 - 0.3, name: 'CABIN 6' },
];
export const LODGE = { x: 0, z: 27, w: 14, d: 9, yaw: Math.PI };   // door faces the camp (north)
export const SPOTS = [];      // places counselors hang about: {x, z, kind}
export const HIDES = [];      // places they run to and hide: inside cabins and the lodge
export const WEAPON_SPOTS = {};
export const BEDS = [];       // lower bunks: { x, z, yaw (head end), side: where to stand to get in }
// the tool shed on the shore by the dock: a workbench and a pegboard wall of things to kill with
export const SHED = { x: -6, z: -24.6, slots: [], lean: [] };
// things you can wreck so nobody gets help: the phone line, their car, the power
export const PHONE = { x: -6.9, y: 1.45, z: 25.5, stand: { x: -6.15, z: 25.5 }, cut: false, mesh: null };
// the camp's only phone line comes in on the entrance sign; the junction box is on its left post
export const SIGN = { x: 8.2, z: 52, half: 3.2 };
export const JUNCTION = { x: SIGN.x - SIGN.half, y: 1.45, z: SIGN.z - 0.2, hp: 2, mesh: null };
export const GENERATOR = { x: 9.2, z: 31.5, hp: 3, on: true, mesh: null };
export let WINDOW_MAT = null;
// a chain-link fence all the way round; the only way through is the padlocked gate on the road
export const FENCE = 55;
export const GATE = { x: 7.9, z: FENCE, w: 4.4, open: false, panels: [], box: null };

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
let seed = 1337;
const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- textures
function grassTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2c3a1f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const c = 30 + Math.random() * 40;
      g.fillStyle = `rgba(${c * 0.8 | 0},${c * 1.15 | 0},${c * 0.55 | 0},${0.25 + Math.random() * 0.4})`;
      const x = Math.random() * w, y = Math.random() * h;
      g.fillRect(x, y, 1 + Math.random() * 2, 3 + Math.random() * 6);
    }
    for (let i = 0; i < 260; i++) {   // dead leaves and bare earth
      g.fillStyle = `rgba(${70 + Math.random() * 40 | 0},${50 + Math.random() * 25 | 0},${25 | 0},${0.35})`;
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 3, Math.random() * 3, 0, 7); g.fill();
    }
  }, [1, 1]);
}
function woodTex(base = [92, 64, 40], planks = true) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const v = Math.sin(y * 0.35) * 8 + Math.random() * 10;
      g.fillStyle = `rgba(${base[0] + v | 0},${base[1] + v * 0.8 | 0},${base[2] + v * 0.5 | 0},0.5)`; g.fillRect(0, y, w, 1);
    }
    if (planks) for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(15,8,4,0.85)'; g.fillRect(0, y, w, 3); }
    for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(30,18,8,0.5)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 4, 2, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 4 + Math.random() * 12); }
  });
}
function barkTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#2e2219'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w; g.strokeStyle = `rgba(${10 + Math.random() * 30 | 0},${8 + Math.random() * 20 | 0},6,0.9)`; g.lineWidth = 1 + Math.random() * 3;
      g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 4, y); g.stroke();
    }
  }, [2, 3]);
}
function roofTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2622'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 16; x < w; x += 32) {
      const c = 30 + Math.random() * 25; g.fillStyle = `rgb(${c},${c * 0.92},${c * 0.85})`; g.fillRect(x, y, 30, 14);
    }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(40,60,30,0.35)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 0, 7); g.fill(); }   // moss
  }, [2, 2]);
}
// The entrance sign: a heavy plank board, stained dark, the name routed into it
// and painted cream, weathered by years of lake winters.
function signTex() {
  return canvasTex(1024, 300, (g, w, h) => {
    g.fillStyle = '#3e2a1a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { const v = Math.sin(y * 0.21) * 6 + Math.random() * 10; g.fillStyle = `rgba(${70 + v | 0},${48 + v * 0.8 | 0},${30 + v * 0.5 | 0},0.35)`; g.fillRect(0, y, w, 1); }
    for (const y of [100, 200]) { g.fillStyle = 'rgba(10,6,3,0.9)'; g.fillRect(0, y - 2, w, 4); }   // three planks
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(20,12,6,0.5)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 8, 2 + Math.random() * 3, 0, 0, 7); g.fill(); }   // knots
    g.strokeStyle = '#d9c9a4'; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);   // painted border
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const carve = (text, font, y, fill) => {
      g.font = font;
      g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillText(text, w / 2 + 3, y + 4);   // the routed groove's shadow
      g.fillStyle = fill; g.fillText(text, w / 2, y);
    };
    carve('CAMP', 'bold 64px Georgia, "Times New Roman", serif', 74, '#e6d8b8');
    carve('CRYSTAL LAKE', 'bold 120px Georgia, "Times New Roman", serif', 166, '#ece0c2');
    carve('EST. 1935', 'italic 34px Georgia, serif', 246, '#cdbd98');
    // weathering: paint flaked off, grime in the grain, moss creeping up from the bottom
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(62,42,26,${Math.random() * 0.8})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 1 + Math.random() * 2); }
    for (let i = 0; i < 40; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30); const x = Math.random() * w, y = h - Math.random() * 40; g.save(); g.translate(x, y); gr.addColorStop(0, 'rgba(50,70,30,0.45)'); gr.addColorStop(1, 'rgba(50,70,30,0)'); g.fillStyle = gr; g.fillRect(-30, -30, 60, 60); g.restore(); }
  });
}

// ---------------------------------------------------------------- merge static meshes by material (keeps draw calls down on Quest)
function mergeStatic(group, scene) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse(o => {
    if (!o.isMesh || o.userData.keep) return;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    let b = buckets.get(o.material); if (!b) buckets.set(o.material, b = []);
    b.push(geo);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    out.add(new THREE.Mesh(geo, mat));
  }
  // anything flagged keep (lit windows, animated bits) stays as it is
  const kept = []; group.traverse(o => { if (o.isMesh && o.userData.keep) kept.push(o); });
  for (const k of kept) { k.updateMatrixWorld(true); const m = k.matrixWorld.clone(); k.removeFromParent(); m.decompose(k.position, k.quaternion, k.scale); out.add(k); }
  scene.add(out);
  return out;
}

// ---------------------------------------------------------------- build
export function buildCamp(scene, world) {
  const solids = [];   // world-space boxes: they block you, them and their sight
  const addSolid = (x0, y0, z0, x1, y1, z1, opaque = true) => {
    const b = { min: new THREE.Vector3(Math.min(x0, x1), y0, Math.min(z0, z1)), max: new THREE.Vector3(Math.max(x0, x1), y1, Math.max(z0, z1)), opaque };
    world.addBox(b.min, b.max, opaque); solids.push(b); return b;
  };
  const statics = new THREE.Group();
  const M = {
    wood: new THREE.MeshLambertMaterial({ map: woodTex() }),
    woodDark: new THREE.MeshLambertMaterial({ map: woodTex([58, 40, 26]) }),
    log: new THREE.MeshLambertMaterial({ map: woodTex([70, 50, 34], false) }),
    roof: new THREE.MeshLambertMaterial({ map: roofTex() }),
    bark: new THREE.MeshLambertMaterial({ map: barkTex() }),
    stone: new THREE.MeshLambertMaterial({ color: 0x55575a }),
    metal: new THREE.MeshLambertMaterial({ color: 0x3c4046 }),
    mattress: new THREE.MeshLambertMaterial({ color: 0x5a6b7a }),
    blanket: new THREE.MeshLambertMaterial({ color: 0x7a2a22 }),
    ash: new THREE.MeshLambertMaterial({ color: 0x1a1816 }),
    canoe: new THREE.MeshLambertMaterial({ color: 0x8c2a1c }),
    white: new THREE.MeshLambertMaterial({ color: 0xcfc8b8 }),
    window: new THREE.MeshBasicMaterial({ color: 0xffb860 }),
    windowDark: new THREE.MeshLambertMaterial({ color: 0x0b0d10 }),
  };
  const box = (parent, mat, w, h, d, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
  };

  // ---- sky: stars, a big moon, low cloud
  const stars = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 1600; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.45, r = 400;
    sp.push(Math.cos(th) * Math.sin(ph) * r, Math.cos(ph) * r, Math.sin(th) * Math.sin(ph) * r);
  }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starPts = new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xbfd0ff, size: 1.3, sizeAttenuation: false, fog: false }));
  scene.add(starPts);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf2f0e2, fog: false, map: canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f2efe0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,150,140,${0.2 + Math.random() * 0.3})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 14, 0, 7); g.fill(); }
  }) }));
  moon.position.set(-120, 170, -330); scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(220,230,255,0.55)'); gr.addColorStop(0.3, 'rgba(160,180,230,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(150); halo.position.copy(moon.position); scene.add(halo);

  // ---- ground: one big subdivided plane, shaped into the lake and hills, coloured by path
  const G = 160, SEG = 160;
  const gGeo = new THREE.PlaneGeometry(G * 2, G * 2, SEG, SEG); gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position, cols = new Float32Array(gp.count * 3);
  const paths = [   // dirt paths as segments
    [CAMPFIRE.x, CAMPFIRE.z, LODGE.x, LODGE.z - 5], [LODGE.x, LODGE.z + 4, CAR.x, CAR.z], [CAR.x, CAR.z, ROAD_END.x, 120],
    [CAMPFIRE.x, CAMPFIRE.z, 0, -29], ...CABINS.map(c => [CAMPFIRE.x, CAMPFIRE.z, c.x, c.z]),
  ];
  const segD = (px, pz, [ax, az, bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    let y = groundAt(x, z);
    if (z < SHORE(x)) y = Math.max(-3, (z - SHORE(x)) * 0.15);
    const edge = Math.max(Math.abs(x), z) - BOUND;
    if (edge > 0 && z > SHORE(x) + 4) y += edge * edge * 0.02 + Math.sin(x * 0.1) * Math.cos(z * 0.13) * edge * 0.15;   // hills past the woods
    if (z < -70) y += Math.max(0, -70 - z) * 0.25 + Math.sin(x * 0.05) * 3;   // far shore
    gp.setY(i, y);
    let pd = 99; for (const p of paths) pd = Math.min(pd, segD(x, z, p));
    const dirt = Math.max(0, 1 - pd / 1.6), fire = Math.max(0, 1 - Math.hypot(x - CAMPFIRE.x, z - CAMPFIRE.z) / 6);
    const sand = z < SHORE(x) + 3 ? Math.min(1, (SHORE(x) + 3 - z) / 3) : 0;
    const v = 0.85 + Math.random() * 0.3;
    let r = 0.34, gg = 0.42, b = 0.28;   // grass (the texture supplies most of the colour)
    const d = Math.max(dirt, fire) * (0.8 + Math.random() * 0.2);
    r += (0.5 - r) * d; gg += (0.36 - gg) * d; b += (0.26 - b) * d;
    r += (0.48 - r) * sand; gg += (0.42 - gg) * sand; b += (0.34 - b) * sand;
    cols[i * 3] = r * v; cols[i * 3 + 1] = gg * v; cols[i * 3 + 2] = b * v;
  }
  gGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  gGeo.computeVertexNormals();
  const gt = grassTex(); gt.repeat.set(G / 3, G / 3);
  const ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ map: gt, vertexColors: true }));
  scene.add(ground);

  // ---- the lake: dark, glinting, slow ripples (cheap: two scrolling textures)
  const ripple = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(160,190,230,${0.04 + Math.random() * 0.12})`; g.lineWidth = 1; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 2, x + 16 + Math.random() * 20, y); g.stroke(); }
  }, [30, 30]);
  ripple.colorSpace = THREE.NoColorSpace;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 300), new THREE.MeshPhongMaterial({ color: 0x08121c, specular: 0x6a7a90, shininess: 90, emissive: 0x020509, emissiveMap: ripple, transparent: true, opacity: 0.93 }));
  water.material.emissive.setHex(0x3a4c66);
  water.rotation.x = -Math.PI / 2; water.position.set(0, WATER_Y, -30 - 150 + 3); scene.add(water);
  const moonPath = new THREE.Mesh(new THREE.PlaneGeometry(14, 260), new THREE.MeshBasicMaterial({ color: 0x6d7d99, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, map: ripple }));
  moonPath.rotation.x = -Math.PI / 2; moonPath.rotation.z = -0.35; moonPath.position.set(-40, WATER_Y + 0.01, -160); scene.add(moonPath);

  // ---- the dock, canoes, a buoy line
  const dock = new THREE.Group(); statics.add(dock);
  for (let z = DOCK.z1; z > DOCK.z0; z -= 0.32) box(dock, M.wood, 2.6, 0.06, 0.28, 0, 0.02, z);
  for (let z = DOCK.z1 - 1; z > DOCK.z0; z -= 3.5) for (const sx of [-1.25, 1.25]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), M.log); p.position.set(sx, -0.9, z); dock.add(p); }
  for (let i = 0; i < 4; i++) {   // canoes pulled up on the shore
    const cx = -8 - i * 2.2 + (i > 1 ? 18 : 0), cz = SHORE(cx) + 1.5;
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.canoe);
    c.scale.set(0.42, 0.32, 2.4); c.position.set(cx, 0.32, cz); c.rotation.set(Math.PI, 0.3 * (i - 1.5), 0); statics.add(c);
    addSolid(cx - 0.45, 0, cz - 1.5, cx + 0.45, 0.35, cz + 1.5, false);
  }

  // ---- campfire, ring of logs to sit on
  const ring = new THREE.Group(); statics.add(ring);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), M.stone); s.position.set(CAMPFIRE.x + Math.cos(a) * 0.9, 0.1, CAMPFIRE.z + Math.sin(a) * 0.9); s.rotation.set(a, a * 2, 0); ring.add(s); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 7), M.ash); l.position.set(CAMPFIRE.x + Math.cos(a) * 0.25, 0.25, CAMPFIRE.z + Math.sin(a) * 0.25); l.rotation.set(0.9, a, 0); l.rotation.order = 'YXZ'; l.rotation.y = a; l.rotation.x = 1.0; ring.add(l); }
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + 0.4, x = CAMPFIRE.x + Math.cos(a) * 3.6, z = CAMPFIRE.z + Math.sin(a) * 3.6;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.6, 10), M.log); l.position.set(x, 0.22, z); l.rotation.z = Math.PI / 2; l.rotation.y = -a; l.rotation.order = 'YXZ'; ring.add(l);
    SPOTS.push({ x: CAMPFIRE.x + Math.cos(a) * 2.6, z: CAMPFIRE.z + Math.sin(a) * 2.6, kind: 'fire', face: Math.atan2(-Math.cos(a), -Math.sin(a)) });
  }
  const fireLight = new THREE.PointLight(0xff8a3a, 22, 20, 1.6); fireLight.position.set(CAMPFIRE.x, 1.1, CAMPFIRE.z); scene.add(fireLight);

  // ---- a cabin: plank walls with a doorway and windows, a pitched roof, bunks inside
  const cabin = (C, W = 5, D = 4.2, H = 2.5) => {
    const g = new THREE.Group(); g.position.set(C.x, 0, C.z); g.rotation.y = C.yaw; statics.add(g);
    const T = 0.12, door = 1.0;
    // local: door wall at +z (faces along the yaw)
    box(g, M.wood, W, H, T, 0, H / 2, -D / 2);
    box(g, M.wood, T, H, D, -W / 2, H / 2, 0); box(g, M.wood, T, H, D, W / 2, H / 2, 0);
    const side = (W - door) / 2;
    box(g, M.wood, side, H, T, -(door / 2 + side / 2), H / 2, D / 2); box(g, M.wood, side, H, T, door / 2 + side / 2, H / 2, D / 2);
    box(g, M.wood, door, H - 2.05, T, 0, 2.05 + (H - 2.05) / 2, D / 2);
    box(g, M.woodDark, W + 0.4, 0.2, D + 0.4, 0, 0.1, 0);     // floor
    rectAdd(FLOORS, C.x, C.z, C.yaw, 0, 0, W + 0.4, D + 0.4, 0.2);
    rectAdd(FLOORS, C.x, C.z, C.yaw, 0, D / 2 + 0.35, 1.6, 0.6, 0.145);
    for (const sx of [-1, 1]) rectAdd(BUNKS, C.x, C.z, C.yaw, sx * (W / 2 - 0.6), -0.6, 0.85, 1.85, 0.62);
    // roof: two slopes
    for (const s of [-1, 1]) { const r = box(g, M.roof, W + 0.6, 0.08, D / 2 / Math.cos(0.5) + 0.4, 0, H + Math.tan(0.5) * D / 4, s * D / 4); r.rotation.x = s * 0.5; }
    const gable = new THREE.Shape(); gable.moveTo(-W / 2, 0); gable.lineTo(W / 2, 0); gable.lineTo(0, Math.tan(0.5) * D / 2 + 0.05); gable.closePath();
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(gable), M.wood); m.position.set(0, H, s * D / 2); if (s < 0) m.rotation.y = Math.PI; g.add(m); }
    // windows: some lit warm from inside, some dark
    for (const [x, z, ry] of [[-W / 2 - 0.07, 0, -Math.PI / 2], [W / 2 + 0.07, 0, Math.PI / 2], [-W / 4 - 0.3, D / 2 + 0.07, 0]]) {
      const lit = Math.random() < 0.55;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), lit ? M.window : M.windowDark); w.position.set(x, 1.5, z); w.rotation.y = ry; if (lit) w.userData.keep = true; g.add(w);
      const fr = box(g, M.woodDark, 0.95, 0.08, 0.06, x, 1.82, z, ry); box(g, M.woodDark, 0.95, 0.08, 0.06, x, 1.18, z, ry);
    }
    // bunks
    for (const sx of [-1, 1]) {
      box(g, M.woodDark, 0.9, 0.08, 1.9, sx * (W / 2 - 0.6), 0.45, -0.6); box(g, M.mattress, 0.85, 0.12, 1.85, sx * (W / 2 - 0.6), 0.55, -0.6);
      box(g, M.blanket, 0.86, 0.04, 1.2, sx * (W / 2 - 0.6), 0.63, -0.3);
      box(g, M.woodDark, 0.9, 0.08, 1.9, sx * (W / 2 - 0.6), 1.45, -0.6); box(g, M.mattress, 0.85, 0.12, 1.85, sx * (W / 2 - 0.6), 1.55, -0.6);
      for (const pz of [-1.5, 0.3]) box(g, M.woodDark, 0.08, 1.7, 0.08, sx * (W / 2 - 0.6) + sx * 0.4, 0.85, pz);
    }
    // a porch step
    box(g, M.woodDark, 1.6, 0.15, 0.6, 0, 0.07, D / 2 + 0.35);
    g.updateMatrixWorld(true);
    // collision: walls as world boxes (rotated walls get approximated by thin boxes along their run)
    const wallSeg = (ax, az, bx, bz) => {
      const A = new THREE.Vector3(ax, 0, az).applyMatrix4(g.matrixWorld), B = new THREE.Vector3(bx, 0, bz).applyMatrix4(g.matrixWorld);
      const n = Math.ceil(A.distanceTo(B) / 0.5);
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t; addSolid(x - 0.3, 0, z - 0.3, x + 0.3, H, z + 0.3); }
    };
    wallSeg(-W / 2, -D / 2, W / 2, -D / 2); wallSeg(-W / 2, -D / 2, -W / 2, D / 2); wallSeg(W / 2, -D / 2, W / 2, D / 2);
    wallSeg(-W / 2, D / 2, -door / 2 - 0.2, D / 2); wallSeg(door / 2 + 0.2, D / 2, W / 2, D / 2);
    const local = (x, z) => new THREE.Vector3(x, 0, z).applyMatrix4(g.matrixWorld);
    const inside = local(0, -0.2), corner = local(W / 2 - 0.7, -D / 2 + 0.6), front = local(0, D / 2 + 1.6);
    for (const sx of [-1, 1]) {
      const c = local(sx * (W / 2 - 0.6), -0.6), side = local(sx * (W / 2 - 1.35), -0.6), head = local(sx * (W / 2 - 0.6), -1.5);
      BEDS.push({ x: c.x, z: c.z, yaw: Math.atan2(head.x - c.x, head.z - c.z), side: { x: side.x, z: side.z }, taken: null });
    }
    HIDES.push({ x: corner.x, z: corner.z, door: { x: front.x, z: front.z }, cabin: C });
    HIDES.push({ x: local(-W / 2 + 0.7, 0.9).x, z: local(-W / 2 + 0.7, 0.9).z, door: { x: front.x, z: front.z }, cabin: C });
    SPOTS.push({ x: inside.x, z: inside.z, kind: 'cabin' }, { x: front.x, z: front.z, kind: 'porch' });
    C.door = front; C.inside = inside;
  };
  for (const C of CABINS) cabin(C);

  // ---- the main lodge: bigger, with a porch and a chimney
  {
    const L = LODGE, g = new THREE.Group(); g.position.set(L.x, 0, L.z); g.rotation.y = L.yaw; statics.add(g);
    const W = L.w, D = L.d, H = 3.2, T = 0.15, door = 1.6;
    box(g, M.log, W, H, T, 0, H / 2, -D / 2); box(g, M.log, T, H, D, -W / 2, H / 2, 0); box(g, M.log, T, H, D, W / 2, H / 2, 0);
    const side = (W - door) / 2;
    box(g, M.log, side, H, T, -(door / 2 + side / 2), H / 2, D / 2); box(g, M.log, side, H, T, door / 2 + side / 2, H / 2, D / 2);
    box(g, M.log, door, H - 2.2, T, 0, 2.2 + (H - 2.2) / 2, D / 2);
    box(g, M.woodDark, W + 0.5, 0.25, D + 0.5, 0, 0.12, 0);
    rectAdd(FLOORS, L.x, L.z, L.yaw, 0, 0, W + 0.5, D + 0.5, 0.245); rectAdd(FLOORS, L.x, L.z, L.yaw, 0, D / 2 + 1.2, W, 2.4, 0.195);
    for (const s of [-1, 1]) { const r = box(g, M.roof, W + 1.2, 0.1, D / 2 / Math.cos(0.55) + 0.8, 0, H + Math.tan(0.55) * D / 4, s * D / 4); r.rotation.x = s * 0.55; }
    const gable = new THREE.Shape(); gable.moveTo(-W / 2, 0); gable.lineTo(W / 2, 0); gable.lineTo(0, Math.tan(0.55) * D / 2); gable.closePath();
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(gable), M.log); m.position.set(0, H, s * D / 2); if (s < 0) m.rotation.y = Math.PI; g.add(m); }
    box(g, M.stone, 1.2, 6, 1.0, W / 2 - 1.2, 3, -D / 2 + 0.3);   // chimney
    box(g, M.woodDark, W, 0.15, 2.4, 0, 0.12, D / 2 + 1.2);       // porch
    for (const x of [-W / 2 + 0.2, -2, 2, W / 2 - 0.2]) box(g, M.log, 0.18, 2.6, 0.18, x, 1.3, D / 2 + 2.3);
    box(g, M.roof, W + 0.4, 0.08, 2.6, 0, 2.65, D / 2 + 1.2);
    for (const x of [-4.5, -2.5, 2.5, 4.5]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), M.window); w.position.set(x, 1.6, D / 2 + 0.08); w.userData.keep = true; g.add(w); }
    // inside: long tables and benches, a stone hearth
    for (const x of [-3.5, 3.5]) {
      box(g, M.wood, 1.0, 0.08, 5, x, 0.78, -0.5); for (const z of [-2.6, 1.6]) box(g, M.woodDark, 0.9, 0.75, 0.1, x, 0.4, z);
      for (const sx of [-0.85, 0.85]) box(g, M.woodDark, 0.35, 0.45, 5, x + sx, 0.23, -0.5);
    }
    box(g, M.stone, 2.2, 1.4, 0.6, W / 2 - 1.2, 0.7, -D / 2 + 0.4);
    g.updateMatrixWorld(true);
    const wallSeg = (ax, az, bx, bz) => {
      const A = new THREE.Vector3(ax, 0, az).applyMatrix4(g.matrixWorld), B = new THREE.Vector3(bx, 0, bz).applyMatrix4(g.matrixWorld);
      const n = Math.ceil(A.distanceTo(B) / 0.5);
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t; addSolid(x - 0.3, 0, z - 0.3, x + 0.3, H, z + 0.3); }
    };
    wallSeg(-W / 2, -D / 2, W / 2, -D / 2); wallSeg(-W / 2, -D / 2, -W / 2, D / 2); wallSeg(W / 2, -D / 2, W / 2, D / 2);
    wallSeg(-W / 2, D / 2, -door / 2 - 0.2, D / 2); wallSeg(door / 2 + 0.2, D / 2, W / 2, D / 2);
    const local = (x, z) => new THREE.Vector3(x, 0, z).applyMatrix4(g.matrixWorld);
    for (const [x, z] of [[-3.5, -1], [3.5, -1]]) { const p = local(x, z); addSolid(p.x - 0.5, 0, p.z - 2.5, p.x + 0.5, 0.82, p.z + 2.5, false); }
    const front = local(0, D / 2 + 3);
    for (const [x, z] of [[-W / 2 + 1, -D / 2 + 1], [W / 2 - 1, D / 2 - 1], [-W / 2 + 1, D / 2 - 1]]) { const p = local(x, z); HIDES.push({ x: p.x, z: p.z, door: { x: front.x, z: front.z }, cabin: L }); }
    SPOTS.push({ x: local(0, 0).x, z: local(0, 0).z, kind: 'lodge' }, { x: front.x, z: front.z, kind: 'porch' }, { x: local(-1, D / 2 + 1.2).x, z: local(-1, D / 2 + 1.2).z, kind: 'porch' });
    L.door = front;
    WEAPON_SPOTS.pitchfork = local(W / 2 + 0.4, D / 2 + 0.2);
    WEAPON_SPOTS.knife = local(3.5, 0.6);
  }

  // ---- the tool shed: plank walls, a door onto the lake, a bench and a pegboard of tools, an oil lamp
  {
    const W = 4.4, D = 3.2, H = 2.5, door = 1.6, g = new THREE.Group(); g.position.set(SHED.x, 0, SHED.z); statics.add(g);
    // local -z faces the water
    box(g, M.woodDark, W + 0.3, 0.12, D + 0.3, 0, 0.06, 0);
    rectAdd(FLOORS, SHED.x, SHED.z, 0, 0, 0, W + 0.3, D + 0.3, 0.12);
    box(g, M.wood, W, H, 0.1, 0, H / 2, D / 2);                                   // back wall
    box(g, M.wood, 0.1, H, D, -W / 2, H / 2, 0); box(g, M.wood, 0.1, H, D, W / 2, H / 2, 0);
    const side = (W - door) / 2;
    box(g, M.wood, side, H, 0.1, -(door / 2 + side / 2), H / 2, -D / 2); box(g, M.wood, side, H, 0.1, door / 2 + side / 2, H / 2, -D / 2);
    box(g, M.wood, door, 0.45, 0.1, 0, H - 0.22, -D / 2);
    const roof = box(g, M.roof, W + 0.6, 0.08, D + 0.7, 0, H + 0.18, 0); roof.rotation.x = -0.12;   // single pitch, falling to the back
    // a door hanging open off one hinge
    const dr = box(g, M.woodDark, door * 0.95, H - 0.5, 0.05, -door / 2 - 0.7, (H - 0.5) / 2, -D / 2 - 0.6); dr.rotation.y = -1.2;
    // the bench along the back wall, with a vise and junk on it
    box(g, M.woodDark, W - 0.4, 0.08, 0.7, 0, 0.9, D / 2 - 0.4);
    for (const x of [-(W / 2 - 0.35), W / 2 - 0.35]) for (const z of [D / 2 - 0.12, D / 2 - 0.68]) box(g, M.woodDark, 0.08, 0.9, 0.08, x, 0.45, z);
    box(g, M.woodDark, W - 0.5, 0.05, 0.6, 0, 0.25, D / 2 - 0.4);   // shelf under it
    box(g, M.metal, 0.22, 0.12, 0.16, W / 2 - 0.7, 1.0, D / 2 - 0.62); box(g, M.metal, 0.06, 0.06, 0.25, W / 2 - 0.7, 1.0, D / 2 - 0.82);   // vise
    const can = new THREE.MeshLambertMaterial({ color: 0x6a5a2a });
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.17, 10), can); c.position.set(-1.4 + i * 0.24, 0.36, D / 2 - 0.3); g.add(c); }
    box(g, new THREE.MeshLambertMaterial({ color: 0x3a2a1a }), 0.5, 0.05, 0.3, -0.9, 0.96, D / 2 - 0.45);   // a rag-covered board, stained
    // pegboard
    const peg = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#7a5a3a'; x.fillRect(0, 0, w, h);
      for (let yy = 8; yy < h; yy += 16) for (let xx = 8; xx < w; xx += 16) { x.fillStyle = '#2a1a0e'; x.beginPath(); x.arc(xx, yy, 2.4, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(30,20,10,0.6)'; x.lineWidth = 3;   // painted outlines where tools belong
      for (let i = 0; i < 8; i++) { const xx = 30 + i * 60; x.strokeRect(xx, 60, 26, 150); }
      for (let i = 0; i < 12; i++) { const gr = x.createRadialGradient(0, 0, 0, 0, 0, 18); x.save(); x.translate(Math.random() * w, Math.random() * h); gr.addColorStop(0, 'rgba(70,4,2,0.6)'); gr.addColorStop(1, 'rgba(70,4,2,0)'); x.fillStyle = gr; x.fillRect(-18, -18, 36, 36); x.restore(); }
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, 1.2), new THREE.MeshLambertMaterial({ map: peg })); board.position.set(0, 1.62, D / 2 - 0.06); board.rotation.y = Math.PI; g.add(board);
    // the lamp
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc070 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), lampMat); lamp.position.set(-W / 2 + 0.5, 1.05, D / 2 - 0.3); lamp.userData.keep = true; g.add(lamp);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.4 })); glass.position.copy(lamp.position); glass.userData.keep = true; g.add(glass);
    SHED.light = new THREE.PointLight(0xffb060, 5, 6, 1.5); SHED.light.position.set(SHED.x - W / 2 + 0.5, 1.3, SHED.z + D / 2 - 0.5); scene.add(SHED.light);
    // walls are solid; the doorway isn't
    const seg = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = SHED.x + ax + (bx - ax) * t, z = SHED.z + az + (bz - az) * t; addSolid(x - 0.3, 0, z - 0.3, x + 0.3, H, z + 0.3); } };
    seg(-W / 2, D / 2, W / 2, D / 2); seg(-W / 2, -D / 2, -W / 2, D / 2); seg(W / 2, -D / 2, W / 2, D / 2);
    seg(-W / 2, -D / 2, -door / 2 - 0.2, -D / 2); seg(door / 2 + 0.2, -D / 2, W / 2, -D / 2);
    addSolid(SHED.x - W / 2 + 0.2, 0, SHED.z + D / 2 - 0.75, SHED.x + W / 2 - 0.2, 0.94, SHED.z + D / 2 - 0.05, false);
    // where the tools hang: grip low, head up, against the pegboard
    for (let i = 0; i < 8; i++) SHED.slots.push({ x: SHED.x - 1.65 + i * 0.47, y: 1.24, z: SHED.z + D / 2 - 0.1 });
    SHED.lean.push({ x: SHED.x + W / 2 - 0.25, z: SHED.z + D / 2 - 0.9 }, { x: SHED.x - W / 2 + 0.25, z: SHED.z - D / 2 + 0.35 });
    SPOTS.push({ x: SHED.x, z: SHED.z - D / 2 - 1.2, kind: 'shed' });
  }

  // ---- woodpile with an axe left in the chopping block
  {
    const wx = -12, wz = 14, g = new THREE.Group(); g.position.set(wx, 0, wz); statics.add(g);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 7 - r; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 8), M.log); l.rotation.x = Math.PI / 2; l.position.set(-0.8 + i * 0.27 + r * 0.13, 0.13 + r * 0.23, -1.2); g.add(l); }
    const block = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.55, 12), M.log); block.position.set(0.9, 0.27, 0.2); g.add(block);
    addSolid(wx - 1, 0, wz - 1.8, wx + 1.1, 1, wz - 0.6, false);
    WEAPON_SPOTS.axe = new THREE.Vector3(wx + 0.9, 0.55, wz + 0.2);
    SPOTS.push({ x: wx + 1.5, z: wz + 1, kind: 'chop' });
  }

  // ---- archery range, a flagpole, picnic tables
  for (let i = 0; i < 3; i++) {
    const x = 34 + i * 3, z = 30;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 20), new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, (g) => { for (let r = 5; r > 0; r--) { g.fillStyle = ['#e8e0c8', '#20242c', '#2a5ab0', '#b0282a', '#e8c430'][5 - r]; g.beginPath(); g.arc(64, 64, r * 12.5, 0, 7); g.fill(); } }) }));
    t.rotation.x = Math.PI / 2; t.position.set(x, 1.2, z); statics.add(t);
    for (const sx of [-0.4, 0.4]) box(statics, M.woodDark, 0.08, 1.6, 0.08, x + sx, 0.8, z + 0.15);
    SPOTS.push({ x, z: z - 8, kind: 'archery' });
  }
  { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 9, 8), M.metal); pole.position.set(-5, 4.5, 8); statics.add(pole); addSolid(-5.15, 0, 7.85, -4.85, 9, 8.15); }
  for (const [x, z, ry] of [[7, 6, 0.3], [-8, 2, -0.2], [12, -4, 1.1]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; statics.add(g);
    box(g, M.wood, 1.8, 0.06, 0.8, 0, 0.76, 0); for (const s of [-1, 1]) box(g, M.wood, 1.8, 0.05, 0.28, 0, 0.45, s * 0.65);
    for (const s of [-0.75, 0.75]) box(g, M.woodDark, 0.06, 0.75, 1.5, s, 0.38, 0);
    addSolid(x - 1, 0, z - 1, x + 1, 0.8, z + 1, false);
    SPOTS.push({ x: x + Math.sin(ry) * 1.3, z: z + Math.cos(ry) * 1.3, kind: 'table', face: ry + Math.PI });
  }

  // ---- the car (their way out) and the entrance sign
  {
    const g = new THREE.Group(); g.position.set(CAR.x, 0, CAR.z); g.rotation.y = CAR.yaw; scene.add(g);
    const paint = new THREE.MeshLambertMaterial({ color: 0x5a6a3a }), chrome = new THREE.MeshLambertMaterial({ color: 0x9a9fa6 }), glass = new THREE.MeshPhongMaterial({ color: 0x0a1018, specular: 0x8899aa, shininess: 80 }), tyre = new THREE.MeshLambertMaterial({ color: 0x111111 });
    box(g, paint, 1.8, 0.6, 4.4, 0, 0.6, 0); box(g, paint, 1.6, 0.5, 2.2, 0, 1.15, -0.2); box(g, glass, 1.62, 0.42, 2.0, 0, 1.15, -0.2);
    box(g, chrome, 1.84, 0.14, 0.1, 0, 0.45, 2.22); box(g, chrome, 1.84, 0.14, 0.1, 0, 0.45, -2.22);
    for (const [x, z] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16), tyre); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); }
    const lamp = new THREE.MeshBasicMaterial({ color: 0x222018 });
    for (const x of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), lamp); l.position.set(x, 0.65, 2.21); g.add(l); }
    CAR.mesh = g; CAR.lampMat = lamp;
    g.updateMatrixWorld(true);
    const c = Math.cos(CAR.yaw), s = Math.sin(CAR.yaw);
    for (let i = -2; i <= 2; i++) { const x = CAR.x + s * i * 0.9, z = CAR.z + c * i * 0.9; CAR.boxes = CAR.boxes ?? []; CAR.boxes.push(addSolid(x - 0.9, 0, z - 0.9, x + 0.9, 1.4, z + 0.9)); }
    const door = new THREE.Vector3(-1.4, 0, -0.2).applyMatrix4(g.matrixWorld); CAR.door = { x: door.x, z: door.z };
  }
  // ---- the entrance: two log posts either side of the road, a crossbeam, the sign hanging from it on chains,
  // floodlights on the ground washing it from below, and the phone line coming in on the left post
  {
    const S = SIGN, g = new THREE.Group(); g.position.set(S.x, 0, S.z); scene.add(g);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 5.2, 10), M.log); post.position.set(sx * S.half, 2.6, 0); g.add(post);
      addSolid(S.x + sx * S.half - 0.25, 0, S.z - 0.25, S.x + sx * S.half + 0.25, 5.2, S.z + 0.25);
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, S.half * 2 + 0.8, 10), M.log); beam.rotation.z = Math.PI / 2; beam.position.y = 4.95; g.add(beam);
    const signMat = new THREE.MeshLambertMaterial({ map: signTex() });
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.4, 0.1), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, signMat, signMat]);
    board.position.set(0, 3.75, 0); g.add(board);
    for (const sx of [-1.9, 1.9]) for (let i = 0; i < 4; i++) { const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8), M.metal); link.position.set(sx, 4.6 - i * 0.1, 0); link.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(link); }
    // floodlights, set in the grass on the camp side, pointing up at the sign
    const housing = new THREE.MeshLambertMaterial({ color: 0x1a1c1e }), glow = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
    const beamTex = canvasTex(4, 64, (x, w, h) => { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,240,210,0.5)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    for (const sx of [-1.4, 1.4]) {
      const lamp = new THREE.Group(); lamp.position.set(sx, 0.2, -2.2); g.add(lamp);
      lamp.lookAt(S.x + sx * 0.4, 3.75, S.z);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12), housing); can.rotation.x = Math.PI / 2; lamp.add(can);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), glow); lens.position.z = 0.15; lamp.add(lens);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 16, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      cone.rotation.x = -Math.PI / 2; cone.position.z = 2.1; lamp.add(cone);
      const stake = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), housing); stake.position.y = -0.1; g.add(stake); stake.position.set(sx, 0.1, -2.2);
    }
    const flood = new THREE.SpotLight(0xffe8c8, 60, 12, 0.55, 0.5, 1.4); flood.position.set(S.x, 0.4, S.z - 2.4); flood.target.position.set(S.x, 3.5, S.z); scene.add(flood, flood.target);
    // the junction box on the left post, with a caged work lamp over it so you can find it
    const jb = new THREE.Group(); jb.position.set(JUNCTION.x, JUNCTION.y, JUNCTION.z); jb.rotation.y = Math.PI; scene.add(jb);
    const grey = new THREE.MeshLambertMaterial({ color: 0x7a7e76 });
    box(jb, grey, 0.34, 0.44, 0.14, 0, 0, 0.07); box(jb, M.metal, 0.36, 0.04, 0.16, 0, 0.23, 0.07);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), new THREE.MeshLambertMaterial({ map: canvasTex(128, 40, (x, w, h) => { x.fillStyle = '#c9b030'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1a1a'; x.font = 'bold 18px Arial'; x.textAlign = 'center'; x.fillText('BELL SYSTEM', w / 2, 26); }) }));
    lbl.position.set(0, 0.12, 0.142); jb.add(lbl);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a10 })); led.position.set(0.12, -0.15, 0.145); jb.add(led);
    const cage = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); cage.position.set(0, 0.55, 0.12); jb.add(cage);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.08, 10, 1, true), housing); shade.position.set(0, 0.6, 0.12); jb.add(shade);
    const work = new THREE.PointLight(0xffd8a0, 4, 5, 1.6); work.position.set(JUNCTION.x, JUNCTION.y + 0.5, JUNCTION.z - 0.35); scene.add(work);
    JUNCTION.mesh = jb; JUNCTION.led = led; JUNCTION.lamp = work; JUNCTION.bulb = cage;
    // the line: up the post, off to a telephone pole by the road, away into the trees
    const sag = (a, b, drop = 0.6) => { const m = a.clone().lerp(b, 0.5); m.y -= drop; return new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 20, 0.012, 4), M.metal); };
    const top = new THREE.Vector3(JUNCTION.x, 4.9, JUNCTION.z);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.9 - JUNCTION.y - 0.22, 4), M.metal); up.position.set(JUNCTION.x - 0.02, (4.9 + JUNCTION.y + 0.22) / 2, JUNCTION.z - 0.21); scene.add(up);
    const poleAt = new THREE.Vector3(S.x - 9, 0, S.z + 7);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 7.5, 8), M.log); pole.position.set(poleAt.x, 3.75, poleAt.z); scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), M.log); arm.position.set(poleAt.x, 7.2, poleAt.z); scene.add(arm);
    addSolid(poleAt.x - 0.18, 0, poleAt.z - 0.18, poleAt.x + 0.18, 7.5, poleAt.z + 0.18);
    JUNCTION.wire = new THREE.Group(); scene.add(JUNCTION.wire);
    JUNCTION.wire.add(up, sag(top, new THREE.Vector3(poleAt.x, 7.2, poleAt.z), 0.8));
    scene.add(sag(new THREE.Vector3(poleAt.x, 7.2, poleAt.z), new THREE.Vector3(poleAt.x - 22, 7.4, poleAt.z + 30), 1.4));
    SIGN.board = board;
  }

  // ---- the woods: instanced pines, birches and stumps; trunks inside the camp are solid
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.26, 1, 7); trunkGeo.translate(0, 0.5, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 8); coneGeo.translate(0, 0.5, 0);
  const needleMat = new THREE.MeshLambertMaterial({ color: 0x1a2a1c, map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#5a7a5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,${20 + Math.random() * 40 | 0},0,0.6)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 4); } }) });
  const trees = [];
  const clear = (x, z) => {
    if (z < SHORE(x) + 2.5) return false;
    if (Math.hypot(x - CAMPFIRE.x, z - CAMPFIRE.z) < 9) return false;
    if (Math.abs(x - LODGE.x) < 10 && Math.abs(z - LODGE.z) < 8) return false;
    for (const C of CABINS) if (Math.hypot(x - C.x, z - C.z) < 5) return false;
    if (Math.hypot(x - CAR.x, z - CAR.z) < 5) return false;
    if (Math.abs(x - SIGN.x) < SIGN.half + 3 && Math.abs(z - SIGN.z) < 4) return false;
    if (Math.hypot(x - (SIGN.x - 9), z - (SIGN.z + 7)) < 2.5) return false;
    if (Math.abs(x - (CAR.x + (ROAD_END.x - CAR.x) * Math.max(0, Math.min(1, (z - CAR.z) / (120 - CAR.z))))) < 3 && z > CAR.z - 6) return false;   // the road
    if (Math.abs(x - SHED.x) < 4.5 && Math.abs(z - SHED.z) < 4) return false;
    if (Math.hypot(x + 12, z - 14) < 3 || Math.hypot(x - 37, z - 26) < 7 || Math.hypot(x + 5, z - 8) < 1.5) return false;
    for (const t of trees) if ((t.x - x) ** 2 + (t.z - z) ** 2 < 4) return false;
    return true;
  };
  seed = 1337;
  for (let i = 0; i < 6000 && trees.length < 900; i++) {
    const x = (srand() * 2 - 1) * 110, z = -28 + srand() * 140;
    const edge = Math.max(Math.abs(x), z) > BOUND - 6;
    if (!edge && srand() > 0.18) continue;   // the camp itself is mostly open
    if (!clear(x, z)) continue;
    trees.push({ x, z, h: 9 + srand() * 12, r: 2 + srand() * 1.6, birch: srand() < 0.12 });
  }
  // the far shore's tree line
  for (let i = 0; i < 400; i++) { const x = -250 + srand() * 500, z = -95 - srand() * 60; trees.push({ x, z, h: 10 + srand() * 14, r: 2.5 + srand() * 2, far: true }); }
  const birchMat = new THREE.MeshLambertMaterial({ color: 0xc8c4b8, map: canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#ddd8cc'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = '#1e1c1a'; g.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 2); } }) });
  const pines = trees.filter(t => !t.birch), birches = trees.filter(t => t.birch);
  const trunks = new THREE.InstancedMesh(trunkGeo, M.bark, pines.length), birchI = new THREE.InstancedMesh(trunkGeo, birchMat, birches.length);
  const cones = new THREE.InstancedMesh(coneGeo, needleMat, pines.length * 3);
  const birchTop = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x2c3a20 }), birches.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  pines.forEach((t, i) => {
    const y = groundAt(t.x, t.z);
    m4.compose(ps.set(t.x, y, t.z), q.identity(), sc.set(1 + t.r * 0.12, t.h * 0.45, 1 + t.r * 0.12)); trunks.setMatrixAt(i, m4);
    for (let k = 0; k < 3; k++) {
      const base = t.h * (0.22 + k * 0.22), rr = t.r * (1 - k * 0.27);
      q.setFromAxisAngle(ps.set(0, 1, 0), srand() * 6);
      m4.compose(ps.set(t.x, y + base, t.z), q, sc.set(rr, t.h * 0.42, rr)); cones.setMatrixAt(i * 3 + k, m4);
    }
    if (!t.far && Math.abs(t.x) < BOUND + 4 && t.z < BOUND + 4) addSolid(t.x - 0.3, 0, t.z - 0.3, t.x + 0.3, 6, t.z + 0.3, false);
  });
  birches.forEach((t, i) => {
    m4.compose(ps.set(t.x, 0, t.z), q.identity(), sc.set(0.6, t.h * 0.6, 0.6)); birchI.setMatrixAt(i, m4);
    m4.compose(ps.set(t.x, t.h * 0.55, t.z), q.setFromAxisAngle(ps.set(0, 1, 0), i), sc.set(t.r * 0.9, t.h * 0.3, t.r * 0.9)); birchTop.setMatrixAt(i, m4);
    if (Math.abs(t.x) < BOUND + 4 && t.z < BOUND + 4) addSolid(t.x - 0.2, 0, t.z - 0.2, t.x + 0.2, 6, t.z + 0.2, false);
  });
  scene.add(trunks, cones, birchI, birchTop);
  // ferns and long grass: crossed cards, lots of them
  const tuftGeo = new THREE.PlaneGeometry(0.6, 0.45); tuftGeo.translate(0, 0.22, 0);
  const tuftGeo2 = tuftGeo.clone().rotateY(Math.PI / 2);
  const tuftMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, alphaTest: 0.5, map: canvasTex(64, 64, (g, w, h) => {
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgb(${40 + Math.random() * 30 | 0},${70 + Math.random() * 40 | 0},${30})`; g.lineWidth = 2; g.beginPath(); const x = 8 + Math.random() * 48; g.moveTo(x, h); g.quadraticCurveTo(x + (Math.random() - 0.5) * 20, h * 0.5, x + (Math.random() - 0.5) * 30, Math.random() * h * 0.4); g.stroke(); }
  }) });
  const NT = 2600, tufts = [new THREE.InstancedMesh(tuftGeo, tuftMat, NT), new THREE.InstancedMesh(tuftGeo2, tuftMat, NT)];
  for (let i = 0; i < NT; i++) {
    let x, z; do { x = (srand() * 2 - 1) * 70; z = SHORE(0) + srand() * 100; } while (z < SHORE(x) + 1 || rectHeight(FLOORS, x, z) > -9 || rectHeight(FLOORS, x + 0.4, z) > -9 || rectHeight(FLOORS, x, z + 0.4) > -9);   // not up through the floorboards
    const s = 0.6 + srand() * 1.2;
    m4.compose(ps.set(x, 0, z), q.setFromAxisAngle(sc.set(0, 1, 0), srand() * 6), sc.set(s, s, s));
    tufts[0].setMatrixAt(i, m4); tufts[1].setMatrixAt(i, m4);
  }
  scene.add(...tufts);
  // rocks
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M.stone, 90);
  for (let i = 0; i < 90; i++) {
    const x = (srand() * 2 - 1) * 60, z = -34 + srand() * 96, s = 0.2 + srand() * 0.5;
    m4.compose(ps.set(x, groundAt(x, z) + s * 0.3, z), q.setFromEuler(new THREE.Euler(srand() * 3, srand() * 3, 0)), sc.set(s * 1.3, s * 0.7, s)); rocks.setMatrixAt(i, m4);
  }
  scene.add(rocks);

  // ---- the lodge phone, the junction box the line runs into, and the generator
  {
    const ph = new THREE.Group(); ph.position.set(PHONE.x, PHONE.y, PHONE.z); ph.rotation.y = Math.PI / 2; scene.add(ph);
    const beige = new THREE.MeshLambertMaterial({ color: 0x9a8a6a });
    box(ph, beige, 0.18, 0.24, 0.08, 0, 0, 0.04);
    const hs = box(ph, beige, 0.05, 0.22, 0.06, -0.06, 0.02, 0.1);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.06, -0.08, 0.1), new THREE.Vector3(-0.03, -0.3, 0.12), new THREE.Vector3(0.02, -0.25, 0.1), new THREE.Vector3(0, -0.1, 0.08)]), 12, 0.006, 4), M.metal); ph.add(cord);
    PHONE.mesh = ph; PHONE.handset = hs;
    const gen = new THREE.Group(); gen.position.set(GENERATOR.x, 0, GENERATOR.z); scene.add(gen);
    const red = new THREE.MeshLambertMaterial({ color: 0x6a1a14 });
    box(gen, red, 1.0, 0.55, 0.65, 0, 0.42, 0); box(gen, M.metal, 1.1, 0.12, 0.7, 0, 0.1, 0);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 12), red); tank.rotation.z = Math.PI / 2; tank.position.set(0, 0.85, 0); gen.add(tank);
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), M.metal); exh.position.set(0.42, 0.9, -0.2); gen.add(exh);
    addSolid(GENERATOR.x - 0.6, 0, GENERATOR.z - 0.4, GENERATOR.x + 0.6, 1.1, GENERATOR.z + 0.4);
    GENERATOR.mesh = gen;
    WINDOW_MAT = M.window;
    // a bare bulb on the lodge porch, run off the generator
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.window); bulb.position.set(-2.2, 2.5, LODGE.z - LODGE.d / 2 - 2.2); scene.add(bulb);
  }

  // ---- the fence
  {
    const link = canvasTex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(150,155,160,0.95)'; g.lineWidth = 3;
      for (let i = -h; i < w + h; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
    }, [1, 1]);
    link.colorSpace = THREE.SRGBColorSpace;
    const H = 2.6, mesh = new THREE.MeshLambertMaterial({ map: link, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    const run = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), t = link.clone(); t.needsUpdate = true; t.repeat.set(len / 0.7, H / 0.7);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H), mesh.clone()); m.material.map = t;
      m.position.set((x0 + x1) / 2, H / 2, (z0 + z1) / 2); m.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); scene.add(m);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), M.metal); rail.rotation.z = Math.PI / 2; rail.rotation.y = m.rotation.y; rail.position.set(m.position.x, H, m.position.z); scene.add(rail);
      for (let i = 0; i <= Math.floor(len / 3); i++) { const k = i * 3 / len; const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H + 0.1, 6), M.metal); post.position.set(x0 + (x1 - x0) * k, (H + 0.1) / 2, z0 + (z1 - z0) * k); statics.add(post); }
      // barbed wire along the top
      const barb = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 3), M.metal); barb.rotation.copy(rail.rotation); barb.position.set(m.position.x, H + 0.25, m.position.z); scene.add(barb);
      addSolid(Math.min(x0, x1) - 0.12, 0, Math.min(z0, z1) - 0.12, Math.max(x0, x1) + 0.12, H, Math.max(z0, z1) + 0.12);
    };
    const shoreW = SHORE(-FENCE) - 1, shoreE = SHORE(FENCE) - 1;
    run(-FENCE, shoreW, -FENCE, FENCE); run(FENCE, shoreE, FENCE, FENCE);
    run(-FENCE, FENCE, GATE.x - GATE.w / 2, FENCE); run(GATE.x + GATE.w / 2, FENCE, FENCE, FENCE);
    // the gate: two leaves, chained and padlocked in the middle
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(GATE.x + side * GATE.w / 2, 0, FENCE); scene.add(hinge);
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(GATE.w / 2, H), mesh.clone()); leaf.material.map = link.clone(); leaf.material.map.needsUpdate = true; leaf.material.map.repeat.set(GATE.w / 2 / 0.7, H / 0.7);
      leaf.position.set(-side * GATE.w / 4, H / 2, 0); hinge.add(leaf);
      for (const y of [0.05, H / 2, H]) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, GATE.w / 2, 6), M.metal); bar.rotation.z = Math.PI / 2; bar.position.set(-side * GATE.w / 4, y, 0); hinge.add(bar); }
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, H, 6), M.metal); frame.position.set(-side * GATE.w / 2, H / 2, 0); hinge.add(frame);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, H + 0.3, 8), M.metal); post.position.set(GATE.x + side * (GATE.w / 2 + 0.08), (H + 0.3) / 2, FENCE); scene.add(post);
      GATE.panels.push({ hinge, side });
    }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.03), new THREE.MeshLambertMaterial({ color: 0x8a7a40 })); lock.position.set(GATE.x, 1.2, FENCE - 0.05); scene.add(lock);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 4, 12), M.metal); chain.position.set(GATE.x, 1.28, FENCE); scene.add(chain);
    GATE.lock = [lock, chain];
    // the gate blocks bodies and you, but the walk grid treats it as a way through (only the police ever use it)
    GATE.box = world.addBox(new THREE.Vector3(GATE.x - GATE.w / 2, 0, FENCE - 0.15), new THREE.Vector3(GATE.x + GATE.w / 2, H, FENCE + 0.15), false);
  }

  mergeStatic(statics, scene);
  buildNav(solids);
  return { fireLight, water, ripple, solids, trees, moon };
}

// ---------------------------------------------------------------- walking grid + A*
const NS = 0.75, NN = Math.ceil(BOUND * 2 / NS) + 1;
let block = null, opaque = null;
const cell = v => Math.max(0, Math.min(NN - 1, Math.round((v + BOUND) / NS)));
const at = (i, j) => j * NN + i;
function buildNav(solids) {
  block = new Uint8Array(NN * NN); opaque = new Uint8Array(NN * NN);
  for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) {
    const x = -BOUND + i * NS, z = -BOUND + j * NS;
    if (z < SHORE(x) + 0.8) block[at(i, j)] = 1;
  }
  for (const b of solids) {
    const pad = 0.35;
    for (let j = cell(b.min.z - pad); j <= cell(b.max.z + pad); j++) for (let i = cell(b.min.x - pad); i <= cell(b.max.x + pad); i++) {
      const x = -BOUND + i * NS, z = -BOUND + j * NS;
      if (x < b.min.x - pad || x > b.max.x + pad || z < b.min.z - pad || z > b.max.z + pad) continue;
      block[at(i, j)] = 1;
      if (b.opaque && x >= b.min.x - 0.1 && x <= b.max.x + 0.1 && z >= b.min.z - 0.1 && z <= b.max.z + 0.1) opaque[at(i, j)] = 1;
    }
  }
}
export const walkable = (x, z) => Math.abs(x) < BOUND - 1 && Math.abs(z) < BOUND - 1 && !block[at(cell(x), cell(z))];
// can a counselor at a see b? walls and the lodge block it; trees don't (they're thin)
export function sightClear(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.4);
  for (let k = 1; k < n; k++) { const t = k / n; if (opaque[at(cell(ax + (bx - ax) * t), cell(az + (bz - az) * t))]) return false; }
  return true;
}
export function clearWalk(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.3);
  for (let k = 1; k <= n; k++) { const t = k / n; if (block[at(cell(ax + (bx - ax) * t), cell(az + (bz - az) * t))]) return false; }
  return true;
}
function nearestFree(i, j) {
  if (!block[at(i, j)]) return [i, j];
  for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < NN && b < NN && !block[at(a, b)]) return [a, b];
  }
  return [i, j];
}
// A* with a binary heap; returns smoothed waypoints [{x, z}] or null
export function findPath(ax, az, bx, bz) {
  const [si, sj] = nearestFree(cell(ax), cell(az)), [gi, gj] = nearestFree(cell(bx), cell(bz));
  const start = at(si, sj), goal = at(gi, gj);
  const g = new Float32Array(NN * NN).fill(1e9), from = new Int32Array(NN * NN).fill(-1), closed = new Uint8Array(NN * NN);
  const heap = [], f = [];
  const push = (n, fv) => { heap.push(n); f.push(fv); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (f[p] <= f[k]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; [f[p], f[k]] = [f[k], f[p]]; k = p; } };
  const pop = () => {
    const top = heap[0], lh = heap.pop(), lf = f.pop();
    if (heap.length) { heap[0] = lh; f[0] = lf; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && f[l] < f[m]) m = l; if (r < heap.length && f[r] < f[m]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; [f[m], f[k]] = [f[k], f[m]]; k = m; } }
    return top;
  };
  g[start] = 0; push(start, 0);
  let steps = 0;
  while (heap.length && steps++ < 20000) {
    const n = pop();
    if (n === goal) break;
    if (closed[n]) continue; closed[n] = 1;
    const i = n % NN, j = (n / NN) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= NN || b >= NN) continue;
      const m = at(a, b);
      if (block[m] || closed[m]) continue;
      if (di && dj && (block[at(i + di, j)] || block[at(i, j + dj)])) continue;   // no cutting corners
      const ng = g[n] + (di && dj ? 1.414 : 1);
      if (ng < g[m]) { g[m] = ng; from[m] = n; push(m, ng + Math.hypot(a - gi, b - gj)); }
    }
  }
  if (from[goal] < 0 && goal !== start) return null;
  const pts = [];
  for (let n = goal; n !== -1 && n !== start; n = from[n]) pts.push({ x: -BOUND + (n % NN) * NS, z: -BOUND + ((n / NN) | 0) * NS });
  pts.reverse();
  // string-pull: skip waypoints we can walk straight past
  const out = []; let cx = ax, cz = az;
  for (let k = 0; k < pts.length; k++) {
    const nxt = pts[k + 1];
    if (nxt && clearWalk(cx, cz, nxt.x, nxt.z)) continue;
    out.push(pts[k]); cx = pts[k].x; cz = pts[k].z;
  }
  return out;
}
