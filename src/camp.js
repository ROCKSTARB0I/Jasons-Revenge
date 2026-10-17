// The world: one of the six areas round Crystal Lake. The ground, the lake, the
// buildings (from the kit in build.js), the woods, the fence, and a walk grid the
// counselors find their way round with.
import * as THREE from '../vendor/three.module.js';
import { makeKit, kitMaterials } from './build.js?v=13';
import { areaById } from './areas.js?v=13';

export const BOUND = 58;                 // the woods close in past this
let SHORE = x => -30 + Math.sin(x * 0.07) * 3 + Math.sin(x * 0.19 + 1) * 1.2;
export const shoreZ = x => SHORE(x);
export const WATER_Y = -0.12;
export const DOCK = { x0: -1.3, x1: 1.3, z0: -46, z1: -27 };
const inDock = (x, z) => x > DOCK.x0 && x < DOCK.x1 && z > DOCK.z0 && z < DOCK.z1;
// raised floors (cabins, lodges, porches, the shed) and, for bodies only, the beds
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
// where things that fall come to rest: the ground, a floor, or a bed
export function restAt(x, z) { return Math.max(groundAt(x, z), rectHeight(BUNKS, x, z)); }
export function groundAt(x, z) {
  const fl = rectHeight(FLOORS, x, z); if (fl > -9) return fl;
  if (inDock(x, z)) return 0.05;
  const s = SHORE(x);
  if (z > s) return 0;
  return Math.max(-0.75, (z - s) * 0.12);   // shelves down into the lake
}
export const inLake = (x, z) => z < SHORE(x) - 0.5 && !inDock(x, z);

// What's where. These are filled in for the chosen area when it's built.
export let AREA = null;
export const CAMPFIRE = { x: 0, z: -12 };
export const CAR = { x: 9, z: 44, yaw: 0.25 };
export const ROAD_END = { x: 2, z: 60 };
export const START = { x: 0, z: -52, yaw: 0 };   // Jason comes out of the lake
export const CABINS = [];     // every building but the main one: { x, z, inside, door, name }
export const LODGE = { x: 0, z: 27 };              // the main building (the phone's in it)
export const BUILDINGS = [];  // all of them, with their rooms
export const SPOTS = [];      // places counselors hang about: {x, z, kind}
export const HIDES = [];      // places they run to and hide: inside the buildings
export const HIDING = [];     // wardrobes, stalls, under beds, behind hay: where you (or they) can hide
export const WEAPON_SPOTS = {};
export const TOOL_SPOTS = {};
export const BEDS = [];       // beds and bunks: { x, z, yaw (head end), side: where to stand to get in }
export const DOORS = [];
export const LAMPS = [];
// the tool shed on the shore: a workbench and a pegboard wall of things to kill with
export const SHED = { x: -6, z: -24.6, slots: [], lean: [] };
// things you can wreck so nobody gets help: the phone line, their car, the power
export const PHONE = { x: -6.9, y: 1.45, z: 25.5, stand: { x: -6.15, z: 25.5 }, cut: false, mesh: null };
// the only phone line comes in on the entrance sign; the junction box is on its left post
export const SIGN = { x: 8.2, z: 52, half: 3.2 };
export const JUNCTION = { x: 5, y: 1.45, z: 51.8, hp: 2, mesh: null };
export const GENERATOR = { x: 9.2, z: 31.5, hp: 3, on: true, mesh: null };
export let WINDOW_MAT = null;
export let WINDMILL = null;
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
let seed = 1337;
const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- textures
function grassTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2c3a1f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const c = 30 + Math.random() * 40;
      g.fillStyle = `rgba(${c * 0.8 | 0},${c * 1.15 | 0},${c * 0.55 | 0},${0.25 + Math.random() * 0.4})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 3 + Math.random() * 6);
    }
    for (let i = 0; i < 420; i++) {   // dead leaves, pine needles, bare earth
      g.fillStyle = `rgba(${70 + Math.random() * 50 | 0},${45 + Math.random() * 30 | 0},${22},${0.3 + Math.random() * 0.25})`;
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 3, Math.random() * 3, 0, 7); g.fill();
    }
  }, [1, 1]);
}
function woodTex(base = [92, 64, 40], planks = true) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { const v = Math.sin(y * 0.35) * 8 + Math.random() * 10; g.fillStyle = `rgba(${base[0] + v | 0},${base[1] + v * 0.8 | 0},${base[2] + v * 0.5 | 0},0.5)`; g.fillRect(0, y, w, 1); }
    if (planks) for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(15,8,4,0.85)'; g.fillRect(0, y, w, 3); }
    for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(30,18,8,0.5)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 4, 2, 0, 0, 7); g.fill(); }
  });
}
function leafTex() {
  return canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#6a7a5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const c = 40 + Math.random() * 80 | 0; g.fillStyle = `rgba(${c * 0.7 | 0},${c},${c * 0.5 | 0},0.7)`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); } }, [2, 2]);
}
function barkTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#2e2219'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = Math.random() * w; g.strokeStyle = `rgba(${10 + Math.random() * 30 | 0},${8 + Math.random() * 20 | 0},6,0.9)`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 4, y); g.stroke(); }
  }, [2, 3]);
}
// The entrance sign: a heavy plank board, stained dark, the name routed into it and painted cream
// Part 1's sign: a yellow board with the camp's name over a painted lake and pines
function crystalSignTex() {
  return canvasTex(1024, 300, (g, w, h) => {
    g.fillStyle = '#d8a83a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a3a1a'; g.lineWidth = 0; g.strokeStyle = '#4a2e14'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    // the painted lake and the tree line
    const sky = g.createLinearGradient(0, 150, 0, 260); sky.addColorStop(0, '#6a9ab8'); sky.addColorStop(1, '#2a5a7a'); g.fillStyle = sky; g.beginPath(); g.ellipse(w / 2, 225, 330, 55, 0, 0, 7); g.fill();
    g.fillStyle = '#1e3a20'; for (let x = 200; x < 830; x += 18) { g.beginPath(); g.moveTo(x, 222); g.lineTo(x + 9, 170 - Math.random() * 25); g.lineTo(x + 18, 222); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#3a2210'; g.font = 'italic bold 46px Georgia, serif'; g.fillText('WELCOME TO', w / 2, 52);
    g.fillStyle = '#7a1a10'; g.font = 'bold 92px Georgia, serif'; g.fillText('CAMP CRYSTAL LAKE', w / 2 + 2, 120);
    g.fillStyle = '#f0d890'; g.font = 'bold 26px Georgia, serif'; g.fillText('EST. 1935', w / 2, 270);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(90,60,30,${Math.random() * 0.5})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 2); }
  });
}
// Part 6's sign: green boards, cream letters, hung in the log arch over the road
function archSignTex([top, mid]) {
  return canvasTex(1024, 300, (g, w, h) => {
    g.fillStyle = '#2a4a2a'; g.fillRect(0, 0, w, h);
    for (const y of [100, 200]) { g.fillStyle = 'rgba(10,20,10,0.9)'; g.fillRect(0, y - 2, w, 4); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8e0c0';
    g.font = 'bold 70px Georgia, serif'; g.fillText(top, w / 2, 80); g.font = 'bold 110px Georgia, serif'; g.fillText(mid, w / 2, 190);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(20,30,15,${Math.random() * 0.6})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 2); }
  });
}
function signTex([top, mid, low]) {
  return canvasTex(1024, 300, (g, w, h) => {
    g.fillStyle = '#3e2a1a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { const v = Math.sin(y * 0.21) * 6 + Math.random() * 10; g.fillStyle = `rgba(${70 + v | 0},${48 + v * 0.8 | 0},${30 + v * 0.5 | 0},0.35)`; g.fillRect(0, y, w, 1); }
    for (const y of [100, 200]) { g.fillStyle = 'rgba(10,6,3,0.9)'; g.fillRect(0, y - 2, w, 4); }
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(20,12,6,0.5)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 8, 2 + Math.random() * 3, 0, 0, 7); g.fill(); }
    g.strokeStyle = '#d9c9a4'; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const carve = (text, font, y, fill) => { g.font = font; let size = parseInt(font.match(/(\d+)px/)[1]); while (g.measureText(text).width > w - 90 && size > 20) { size -= 4; g.font = font.replace(/\d+px/, size + 'px'); } g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillText(text, w / 2 + 3, y + 4); g.fillStyle = fill; g.fillText(text, w / 2, y); };
    if (top) carve(top, 'bold 64px Georgia, "Times New Roman", serif', 74, '#e6d8b8');
    carve(mid, 'bold 120px Georgia, "Times New Roman", serif', top ? 166 : 140, '#ece0c2');
    if (low) carve(low, 'italic 34px Georgia, serif', 246, '#cdbd98');
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
    // split very big buckets so each piece can still be culled when it's off screen
    const chunks = [];
    if (geos.length > 400) { const byCell = new Map(); for (const g of geos) { g.computeBoundingSphere(); const c = g.boundingSphere.center, k = Math.floor(c.x / 30) + ',' + Math.floor(c.z / 30); if (!byCell.has(k)) byCell.set(k, []); byCell.get(k).push(g); } chunks.push(...byCell.values()); } else chunks.push(geos);
    for (const list of chunks) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let o = 0;
      for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      out.add(new THREE.Mesh(geo, mat));
    }
  }
  const kept = []; group.traverse(o => { if (o.isMesh && o.userData.keep) kept.push(o); });
  for (const k of kept) { k.updateMatrixWorld(true); const m = k.matrixWorld.clone(); k.removeFromParent(); m.decompose(k.position, k.quaternion, k.scale); out.add(k); }
  scene.add(out);
  return out;
}

// ---------------------------------------------------------------- build
export function buildCamp(scene, world, areaId) {
  const A = AREA = areaById(areaId);
  SHORE = A.shore;
  // where everything goes in this area
  const dx = A.dock ?? 0, sz = SHORE(dx);
  Object.assign(DOCK, { x0: dx - 1.3, x1: dx + 1.3, z1: sz + 3, z0: sz - 16 });
  Object.assign(CAMPFIRE, A.campfire); Object.assign(CAR, { van: false }, A.car); Object.assign(SHED, A.shed, { slots: [], lean: [] });
  Object.assign(START, { x: dx, z: sz - 22, yaw: 0 });
  Object.assign(GATE, { x: A.gate });
  Object.assign(SIGN, { x: A.gate + 0.3, z: 52, half: 3.2 });
  Object.assign(JUNCTION, { x: SIGN.x - SIGN.half, y: 1.45, z: SIGN.z - 0.2 });
  Object.assign(GENERATOR, A.generator);
  Object.assign(ROAD_END, { x: A.gate - 6, z: 60 });
  Object.assign(TOOL_SPOTS, A.tools);

  const solids = [];   // world-space boxes: they block you, them and their sight
  const addSolid = (x0, y0, z0, x1, y1, z1, opaque = true) => {
    const b = { min: new THREE.Vector3(Math.min(x0, x1), y0, Math.min(z0, z1)), max: new THREE.Vector3(Math.max(x0, x1), y1, Math.max(z0, z1)), opaque };
    world.addBox(b.min, b.max, opaque); solids.push(b); return b;
  };
  const statics = new THREE.Group(), live = new THREE.Group(); scene.add(live);
  const KM = kitMaterials();
  const M = {
    wood: new THREE.MeshLambertMaterial({ map: woodTex() }),
    woodDark: new THREE.MeshLambertMaterial({ map: woodTex([58, 40, 26]) }),
    log: new THREE.MeshLambertMaterial({ map: woodTex([70, 50, 34], false) }),
    roof: KM.roof, bark: new THREE.MeshLambertMaterial({ map: barkTex() }),
    stone: new THREE.MeshLambertMaterial({ color: 0x55575a }), metal: new THREE.MeshLambertMaterial({ color: 0x3c4046 }),
    ash: new THREE.MeshLambertMaterial({ color: 0x1a1816 }), canoe: new THREE.MeshLambertMaterial({ color: 0x8c2a1c }),
    window: KM.windowLit, whiteRock: new THREE.MeshLambertMaterial({ color: 0xd8d6cc }),
  };
  const box = (parent, mat, w, h, d, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };

  // ---- the buildings
  const ctx = {
    statics, live, world, addSolid,
    floor: (...a) => rectAdd(FLOORS, ...a), bunk: (...a) => rectAdd(BUNKS, ...a),
    lamps: LAMPS, doors: DOORS, hides: HIDES, hidingSpots: HIDING, beds: BEDS, spots: SPOTS, phone: null, toolWall: null,
  };
  const kit = makeKit(KM, ctx);
  const footprints = [];
  for (const [plan, x, z, yaw] of A.buildings) {
    const def = { ...plan, x, z, yaw };
    const B = kit.building(def);
    B.name = def.name ?? (def.main ? A.name.toUpperCase() : 'CABIN');
    BUILDINGS.push(B);
    const q = Math.round(yaw / (Math.PI / 2)) & 1, hw = (q ? plan.d : plan.w) / 2 + 1.2, hd = (q ? plan.w : plan.d) / 2 + 1.2;
    footprints.push({ x0: x - hw - 2.5, x1: x + hw + 2.5, z0: z - hd - 2.5, z1: z + hd + 2.5 });
    if (def.main) Object.assign(LODGE, { x: B.inside.x, z: B.inside.z, door: B.door, B });
    else CABINS.push({ x, z, inside: B.inside, door: B.door, name: B.name, B });
  }
  if (!LODGE.B) Object.assign(LODGE, { x: BUILDINGS[0].inside.x, z: BUILDINGS[0].inside.z, door: BUILDINGS[0].door, B: BUILDINGS[0] });
  for (const s of SPOTS) if (s.kind === 'cabin' && s.building === LODGE.B) s.kind = 'lodge';
  if (ctx.phone) Object.assign(PHONE, ctx.phone);
  else Object.assign(PHONE, { x: LODGE.x, y: 1.6, z: LODGE.z, yaw: 0, stand: { x: LODGE.x, z: LODGE.z + 0.7 } });
  WINDOW_MAT = KM.windowLit;
  const inFootprint = (x, z, pad = 0) => footprints.some(f => x > f.x0 - pad && x < f.x1 + pad && z > f.z0 - pad && z < f.z1 + pad);

  // ---- sky: stars, a big moon
  const stars = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 1600; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.45, r = 400; sp.push(Math.cos(th) * Math.sin(ph) * r, Math.cos(ph) * r, Math.sin(th) * Math.sin(ph) * r); }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xbfd0ff, size: 1.3, sizeAttenuation: false, fog: false })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf2f0e2, fog: false, map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#f2efe0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,150,140,${0.2 + Math.random() * 0.3})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 14, 0, 7); g.fill(); } }) }));
  moon.position.set(-120, 170, -330); scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(220,230,255,0.55)'); gr.addColorStop(0.3, 'rgba(160,180,230,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(150); halo.position.copy(moon.position); scene.add(halo);

  // ---- ground: one big subdivided plane, shaped into the lake and hills, worn into paths
  const G = 160, SEG = 200;
  const gGeo = new THREE.PlaneGeometry(G * 2, G * 2, SEG, SEG); gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position, cols = new Float32Array(gp.count * 3);
  const paths = [[CAMPFIRE.x, CAMPFIRE.z, LODGE.door.x, LODGE.door.z], [LODGE.door.x, LODGE.door.z, CAR.x, CAR.z], [CAR.x, CAR.z, GATE.x, FENCE], [GATE.x, FENCE, ROAD_END.x, 120],
    [CAMPFIRE.x, CAMPFIRE.z, dx, DOCK.z1], [CAMPFIRE.x, CAMPFIRE.z, SHED.x, SHED.z - 2], ...BUILDINGS.filter(b => b !== LODGE.B).map(b => [CAMPFIRE.x, CAMPFIRE.z, b.door.x, b.door.z])];
  const segD = (px, pz, [ax, az, bx, bz]) => { const ddx = bx - ax, ddz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * ddx + (pz - az) * ddz) / (ddx * ddx + ddz * ddz || 1))); return Math.hypot(px - ax - ddx * t, pz - az - ddz * t); };
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    let y = groundAt(x, z);
    if (rectHeight(FLOORS, x, z) > -9) y = 0;
    if (z < SHORE(x)) y = Math.max(-3, (z - SHORE(x)) * 0.15);
    const edge = Math.max(Math.abs(x), z) - BOUND;
    if (edge > 0 && z > SHORE(x) + 4) y += edge * edge * 0.02 + Math.sin(x * 0.1) * Math.cos(z * 0.13) * edge * 0.15;
    if (z < -70) y += Math.max(0, -70 - z) * 0.25 + Math.sin(x * 0.05) * 3;
    gp.setY(i, y);
    let pd = 99; for (const p of paths) pd = Math.min(pd, segD(x, z, p));
    const dirt = Math.max(0, 1 - pd / 1.5) * (0.75 + 0.25 * Math.sin(x * 3.1 + z * 2.3)), fire = Math.max(0, 1 - Math.hypot(x - CAMPFIRE.x, z - CAMPFIRE.z) / 5);
    const worn = inFootprint(x, z) ? 0.35 : 0;
    const sand = z < SHORE(x) + 3 ? Math.min(1, (SHORE(x) + 3 - z) / 3) : 0;
    const v = 0.82 + Math.random() * 0.3, patch = 0.5 + 0.5 * Math.sin(x * 0.21) * Math.cos(z * 0.17);
    let r = 0.32 + patch * 0.05, gg = 0.4 + patch * 0.04, b = 0.27;
    if (A.grass === 'dry') { r = 0.46 + patch * 0.06; gg = 0.42 + patch * 0.04; b = 0.27; }
    const d = Math.min(1, Math.max(dirt, fire, worn) * (0.8 + Math.random() * 0.2));
    r += (0.46 - r) * d; gg += (0.34 - gg) * d; b += (0.24 - b) * d;
    r += (0.48 - r) * sand; gg += (0.42 - gg) * sand; b += (0.34 - b) * sand;
    cols[i * 3] = r * v; cols[i * 3 + 1] = gg * v; cols[i * 3 + 2] = b * v;
  }
  gGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  gGeo.computeVertexNormals();
  const gt = grassTex(); gt.repeat.set(G / 3, G / 3);
  const ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ map: gt, vertexColors: true }));
  scene.add(ground);

  // ---- the lake
  const ripple = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(160,190,230,${0.04 + Math.random() * 0.12})`; g.lineWidth = 1; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 2, x + 16 + Math.random() * 20, y); g.stroke(); } }, [30, 30]);
  ripple.colorSpace = THREE.NoColorSpace;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 300), new THREE.MeshPhongMaterial({ color: 0x08121c, specular: 0x6a7a90, shininess: 90, emissive: 0x3a4c66, emissiveMap: ripple, transparent: true, opacity: 0.93 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, WATER_Y, -30 - 150 + 3); scene.add(water);
  const moonPath = new THREE.Mesh(new THREE.PlaneGeometry(14, 260), new THREE.MeshBasicMaterial({ color: 0x6d7d99, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, map: ripple }));
  moonPath.rotation.x = -Math.PI / 2; moonPath.rotation.z = -0.35; moonPath.position.set(-40, WATER_Y + 0.01, -160); scene.add(moonPath);

  // ---- the dock, canoes
  const dock = new THREE.Group(); statics.add(dock);
  for (let z = DOCK.z1; z > DOCK.z0; z -= 0.32) box(dock, M.wood, 2.6, 0.06, 0.28, dx, 0.02, z);
  for (let z = DOCK.z1 - 1; z > DOCK.z0; z -= 3.5) for (const sx of [-1.25, 1.25]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), M.log); p.position.set(dx + sx, -0.9, z); dock.add(p); }
  SPOTS.push({ x: dx, z: DOCK.z0 + 2, kind: 'dock', face: Math.PI });
  if (A.extras.includes('canoes')) for (let i = 0; i < 4; i++) {
    const cx = dx - 8 - i * 2.2 + (i > 1 ? 18 : 0), cz = SHORE(cx) + 1.5;
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.canoe);
    c.scale.set(0.42, 0.32, 2.4); c.position.set(cx, 0.32, cz); c.rotation.set(Math.PI, 0.3 * (i - 1.5), 0); statics.add(c);
    addSolid(cx - 0.45, 0, cz - 1.5, cx + 0.45, 0.35, cz + 1.5, false);
  }

  // ---- campfire, ring of logs to sit on
  const ring = new THREE.Group(); statics.add(ring);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), M.stone); s.position.set(CAMPFIRE.x + Math.cos(a) * 0.9, 0.1, CAMPFIRE.z + Math.sin(a) * 0.9); s.rotation.set(a, a * 2, 0); ring.add(s); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 7), M.ash); l.position.set(CAMPFIRE.x + Math.cos(a) * 0.25, 0.25, CAMPFIRE.z + Math.sin(a) * 0.25); l.rotation.order = 'YXZ'; l.rotation.y = a; l.rotation.x = 1.0; ring.add(l); }
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + 0.4, x = CAMPFIRE.x + Math.cos(a) * 3.6, z = CAMPFIRE.z + Math.sin(a) * 3.6;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.6, 10), M.log); l.position.set(x, 0.22, z); l.rotation.order = 'YXZ'; l.rotation.z = Math.PI / 2; l.rotation.y = -a; ring.add(l);
    SPOTS.push({ x: CAMPFIRE.x + Math.cos(a) * 2.6, z: CAMPFIRE.z + Math.sin(a) * 2.6, kind: 'fire', face: Math.atan2(-Math.cos(a), -Math.sin(a)) });
  }
  const fireLight = new THREE.PointLight(0xff8a3a, 22, 20, 1.6); fireLight.position.set(CAMPFIRE.x, 1.1, CAMPFIRE.z); scene.add(fireLight);

  // ---- the tool shed: plank walls, a door onto the lake, a bench and a pegboard of tools, an oil lamp
  {
    const W = 4.4, D = 3.2, H = 2.5, door = 1.6, g = new THREE.Group(); g.position.set(SHED.x, 0, SHED.z); statics.add(g);
    box(g, M.woodDark, W + 0.3, 0.12, D + 0.3, 0, 0.06, 0);
    rectAdd(FLOORS, SHED.x, SHED.z, 0, 0, 0, W + 0.3, D + 0.3, 0.12);
    box(g, M.wood, W, H, 0.1, 0, H / 2, D / 2);
    box(g, M.wood, 0.1, H, D, -W / 2, H / 2, 0); box(g, M.wood, 0.1, H, D, W / 2, H / 2, 0);
    const side = (W - door) / 2;
    box(g, M.wood, side, H, 0.1, -(door / 2 + side / 2), H / 2, -D / 2); box(g, M.wood, side, H, 0.1, door / 2 + side / 2, H / 2, -D / 2);
    box(g, M.wood, door, 0.45, 0.1, 0, H - 0.22, -D / 2);
    const roof = box(g, M.roof, W + 0.6, 0.08, D + 0.7, 0, H + 0.18, 0); roof.rotation.x = -0.12;
    const dr = box(g, M.woodDark, door * 0.95, H - 0.5, 0.05, -door / 2 - 0.7, (H - 0.5) / 2, -D / 2 - 0.6); dr.rotation.y = -1.2;
    box(g, M.woodDark, W - 0.4, 0.08, 0.7, 0, 0.9, D / 2 - 0.4);
    for (const x of [-(W / 2 - 0.35), W / 2 - 0.35]) for (const z of [D / 2 - 0.12, D / 2 - 0.68]) box(g, M.woodDark, 0.08, 0.9, 0.08, x, 0.45, z);
    box(g, M.woodDark, W - 0.5, 0.05, 0.6, 0, 0.25, D / 2 - 0.4);
    box(g, M.metal, 0.22, 0.12, 0.16, W / 2 - 0.7, 1.0, D / 2 - 0.62); box(g, M.metal, 0.06, 0.06, 0.25, W / 2 - 0.7, 1.0, D / 2 - 0.82);
    const can = new THREE.MeshLambertMaterial({ color: 0x6a5a2a });
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.17, 10), can); c.position.set(-1.4 + i * 0.24, 0.36, D / 2 - 0.3); g.add(c); }
    const peg = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#7a5a3a'; x.fillRect(0, 0, w, h);
      for (let yy = 8; yy < h; yy += 16) for (let xx = 8; xx < w; xx += 16) { x.fillStyle = '#2a1a0e'; x.beginPath(); x.arc(xx, yy, 2.4, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(30,20,10,0.6)'; x.lineWidth = 3; for (let i = 0; i < 8; i++) x.strokeRect(30 + i * 60, 60, 26, 150);
      for (let i = 0; i < 12; i++) { const gr = x.createRadialGradient(0, 0, 0, 0, 0, 18); x.save(); x.translate(Math.random() * w, Math.random() * h); gr.addColorStop(0, 'rgba(70,4,2,0.6)'); gr.addColorStop(1, 'rgba(70,4,2,0)'); x.fillStyle = gr; x.fillRect(-18, -18, 36, 36); x.restore(); }
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, 1.2), new THREE.MeshLambertMaterial({ map: peg })); board.position.set(0, 1.62, D / 2 - 0.06); board.rotation.y = Math.PI; g.add(board);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc070 })); lamp.position.set(-W / 2 + 0.5, 1.05, D / 2 - 0.3); g.add(lamp);
    LAMPS.push({ x: SHED.x - W / 2 + 0.5, y: 1.3, z: SHED.z + D / 2 - 0.5, color: 0xffb060, power: 2.4, range: 6, flicker: 0.3, powered: false, kind: 'lantern', building: null });
    const seg = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = SHED.x + ax + (bx - ax) * t, z = SHED.z + az + (bz - az) * t; addSolid(x - 0.26, 0, z - 0.26, x + 0.26, H, z + 0.26); } };
    seg(-W / 2, D / 2, W / 2, D / 2); seg(-W / 2, -D / 2, -W / 2, D / 2); seg(W / 2, -D / 2, W / 2, D / 2);
    seg(-W / 2, -D / 2, -door / 2 - 0.2, -D / 2); seg(door / 2 + 0.2, -D / 2, W / 2, -D / 2);
    addSolid(SHED.x - W / 2 + 0.2, 0, SHED.z + D / 2 - 0.75, SHED.x + W / 2 - 0.2, 0.94, SHED.z + D / 2 - 0.05, false);
    for (let i = 0; i < 8; i++) SHED.slots.push({ x: SHED.x - 1.65 + i * 0.47, y: 1.24, z: SHED.z + D / 2 - 0.1 });
    SHED.lean.push({ x: SHED.x + W / 2 - 0.25, z: SHED.z + D / 2 - 0.9 }, { x: SHED.x - W / 2 + 0.25, z: SHED.z - D / 2 + 0.35 });
    SPOTS.push({ x: SHED.x, z: SHED.z - D / 2 - 1.2, kind: 'shed' });
    footprints.push({ x0: SHED.x - 5, x1: SHED.x + 5, z0: SHED.z - 4.5, z1: SHED.z + 4 });
  }

  // ---- woodpile, with an axe left in the chopping block
  {
    const { x: wx, z: wz } = A.tools.woodpile, g = new THREE.Group(); g.position.set(wx, 0, wz); statics.add(g);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 7 - r; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 8), M.log); l.rotation.x = Math.PI / 2; l.position.set(-0.8 + i * 0.27 + r * 0.13, 0.13 + r * 0.23, -1.2); g.add(l); }
    const block = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.55, 12), M.log); block.position.set(0.9, 0.27, 0.2); g.add(block);
    addSolid(wx - 1, 0, wz - 1.8, wx + 1.1, 1, wz - 0.6, false);
    WEAPON_SPOTS.axe = new THREE.Vector3(wx + 0.9, 0.55, wz + 0.2);
    SPOTS.push({ x: wx + 1.5, z: wz + 1, kind: 'chop' });
    footprints.push({ x0: wx - 3, x1: wx + 3, z0: wz - 3, z1: wz + 3 });
  }

  // ---- extras: archery range, a flagpole, picnic tables, a hammock, the cemetery, an overlook, split-rail fences
  if (A.extras.includes('archery')) for (let i = 0; i < 3; i++) {
    const x = 34 + i * 3, z = 34;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 20), new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, (g) => { for (let r = 5; r > 0; r--) { g.fillStyle = ['#e8e0c8', '#20242c', '#2a5ab0', '#b0282a', '#e8c430'][5 - r]; g.beginPath(); g.arc(64, 64, r * 12.5, 0, 7); g.fill(); } }) }));
    t.rotation.x = Math.PI / 2; t.position.set(x, 1.2, z); statics.add(t);
    for (const sx of [-0.4, 0.4]) box(statics, M.woodDark, 0.08, 1.6, 0.08, x + sx, 0.8, z + 0.15);
    SPOTS.push({ x, z: z - 8, kind: 'archery' });
    footprints.push({ x0: x - 2, x1: x + 2, z0: z - 10, z1: z + 2 });
  }
  if (A.extras.includes('flagpole')) { const fx = CAMPFIRE.x - 5, fz = CAMPFIRE.z + 20; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 9, 8), M.metal); pole.position.set(fx, 4.5, fz); statics.add(pole); addSolid(fx - 0.15, 0, fz - 0.15, fx + 0.15, 9, fz + 0.15); }
  if (A.extras.includes('picnic')) for (const [ox, oz, ry] of [[7, 8, 0.3], [-8, 4, -0.2], [12, -2, 1.1]]) {
    const x = CAMPFIRE.x + ox, z = CAMPFIRE.z + oz;
    if (inFootprint(x, z) || z < SHORE(x) + 3) continue;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; statics.add(g);
    box(g, M.wood, 1.8, 0.06, 0.8, 0, 0.76, 0); for (const s of [-1, 1]) box(g, M.wood, 1.8, 0.05, 0.28, 0, 0.45, s * 0.65);
    for (const s of [-0.75, 0.75]) box(g, M.woodDark, 0.06, 0.75, 1.5, s, 0.38, 0);
    addSolid(x - 1, 0, z - 1, x + 1, 0.8, z + 1, false);
    SPOTS.push({ x: x + Math.sin(ry) * 1.3, z: z + Math.cos(ry) * 1.3, kind: 'table', face: ry + Math.PI });
    footprints.push({ x0: x - 2, x1: x + 2, z0: z - 2, z1: z + 2 });
  }
  if (A.hammock) {
    const { x, z } = A.hammock, cloth = new THREE.MeshLambertMaterial({ color: 0x8a7a5a, side: THREE.DoubleSide });
    for (const sx of [-2.2, 2.2]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7, 8), M.bark); t.position.set(x + sx, 3.5, z); statics.add(t); addSolid(x + sx - 0.25, 0, z - 0.25, x + sx + 0.25, 6, z + 0.25, false); }
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.2, 12, 1, true, Math.PI * 0.6, Math.PI * 0.8), cloth); h.rotation.z = Math.PI / 2; h.position.set(x, 1.2, z); statics.add(h);
    SPOTS.push({ x, z: z + 0.9, kind: 'hammock' });
    footprints.push({ x0: x - 4, x1: x + 4, z0: z - 2, z1: z + 2 });
  }
  if (A.extras.includes('cemetery')) {
    const cx = -40, cz = 42;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const x = cx + i * 2.2 + (Math.random() - 0.5) * 0.4, z = cz + j * 2.6, h = 0.7 + Math.random() * 0.5;
      const st = box(statics, M.stone, 0.55, h, 0.14, x, h / 2, z, (Math.random() - 0.5) * 0.15); st.rotation.z = (Math.random() - 0.5) * 0.12;
      addSolid(x - 0.3, 0, z - 0.1, x + 0.3, h, z + 0.1, false);
    }
    for (let i = 0; i < 6; i++) { const p = box(statics, M.metal, 0.05, 1.1, 0.05, cx - 1.5 + i * 2.4, 0.55, cz - 1.5); void p; }
    SPOTS.push({ x: cx + 4, z: cz - 2.5, kind: 'cemetery' });
    footprints.push({ x0: cx - 2, x1: cx + 12, z0: cz - 3, z1: cz + 7 });
  }
  if (A.extras.includes('overlook')) {
    const x = -36, z = SHORE(-36) + 2.5;
    const g = new THREE.Group(); g.position.set(x, 0, z); statics.add(g);
    box(g, M.wood, 1.8, 0.06, 0.4, 0, 0.46, 0); for (const s of [-0.8, 0.8]) box(g, M.woodDark, 0.08, 0.46, 0.35, s, 0.23, 0); box(g, M.wood, 1.8, 0.4, 0.05, 0, 0.75, 0.2);
    SPOTS.push({ x, z: z + 0.5, kind: 'overlook', face: Math.PI });
  }
  if (A.extras.includes('totems')) for (const [tx, tz] of [[SIGN.x - SIGN.half - 1.2, SIGN.z - 1.5], [SIGN.x + SIGN.half + 1.2, SIGN.z - 1.5], [CAMPFIRE.x + 4.5, CAMPFIRE.z + 3]]) {
    const cols = [0x5a3a22, 0x6a2a1a, 0x4a4030, 0x2a2018, 0x3a4a3a];   // carved wood, the old paint mostly worn off
    for (let i = 0; i < 4; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.6, 10), new THREE.MeshLambertMaterial({ color: cols[(i + Math.round(tx)) % 5] })); seg.position.set(tx, 0.3 + i * 0.6, tz); statics.add(seg); const beak = box(statics, M.woodDark, 0.12, 0.1, 0.3, tx, 0.45 + i * 0.6, tz + 0.25); void beak; }
    const wing = box(statics, M.woodDark, 1.4, 0.12, 0.2, tx, 2.2, tz); void wing;
    addSolid(tx - 0.25, 0, tz - 0.25, tx + 0.25, 2.5, tz + 0.25, false);
  }
  if (A.extras.includes('whiteRocks')) for (const p of paths.slice(0, 8)) {
    const [ax, az, bx, bz] = p, len = Math.hypot(bx - ax, bz - az);
    for (let t = 1.5; t < len - 1.5; t += 1.6) for (const sgn of [-1, 1]) {
      const k = t / len, nx = -(bz - az) / len, nz = (bx - ax) / len, x = ax + (bx - ax) * k + nx * sgn * 1.25, z = az + (bz - az) * k + nz * sgn * 1.25;
      if (inFootprint(x, z, -2) || z < SHORE(x) + 1) continue;
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), M.whiteRock); rk.position.set(x, 0.06, z); rk.scale.y = 0.55; rk.rotation.y = t; statics.add(rk);
    }
  }
  if (A.extras.includes('lanternPosts')) for (const p of paths.slice(0, 6)) {
    const [ax, az, bx, bz] = p, len = Math.hypot(bx - ax, bz - az);
    for (let t = 6; t < len - 3; t += 12) {
      const k = t / len, nx = -(bz - az) / len, nz = (bx - ax) / len, x = ax + (bx - ax) * k + nx * 1.6, z = az + (bz - az) * k + nz * 1.6;
      if (inFootprint(x, z, -2)) continue;
      box(statics, M.woodDark, 0.12, 2.2, 0.12, x, 1.1, z); box(statics, M.woodDark, 0.5, 0.08, 0.08, x + 0.2, 2.15, z);
      const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 8), KM.flame); ln.position.set(x + 0.42, 1.98, z); statics.add(ln);
      LAMPS.push({ x: x + 0.42, y: 2.0, z, color: 0xffa850, power: 1.8, range: 6, flicker: 0.3, powered: false, kind: 'lantern', building: null });
      addSolid(x - 0.1, 0, z - 0.1, x + 0.1, 2.2, z + 0.1, false);
    }
  }
  if (A.extras.includes('windmill')) {
    const wx = 30, wz = 38, g = new THREE.Group(); g.position.set(wx, 0, wz); statics.add(g);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = box(g, M.metal, 0.08, 9.2, 0.08, sx * 0.9, 4.5, sz * 0.9); leg.rotation.set(sz * 0.09, 0, -sx * 0.09); }
    for (let y = 1.5; y < 8; y += 2) box(g, M.metal, 1.8 - y * 0.18, 0.05, 0.05, 0, y, 0.9 - y * 0.09);
    const hub = new THREE.Group(); hub.position.set(0, 9.3, 0.6); g.add(hub); hub.userData.keep = true;
    for (let i = 0; i < 16; i++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.4, 0.02), M.metal); blade.position.set(Math.sin(i / 16 * Math.PI * 2) * 0.85, Math.cos(i / 16 * Math.PI * 2) * 0.85, 0); blade.rotation.z = -i / 16 * Math.PI * 2; blade.rotation.y = 0.3; hub.add(blade); }
    const tail = box(g, M.metal, 0.05, 0.9, 1.6, 0, 9.3, -1.2); void tail;
    scene.add(hub); hub.position.set(wx, 9.3, wz + 0.6); WINDMILL = hub;
    addSolid(wx - 1.1, 0, wz - 1.1, wx + 1.1, 9, wz + 1.1, false);
    footprints.push({ x0: wx - 3, x1: wx + 3, z0: wz - 3, z1: wz + 3 });
  }
  if (A.extras.includes('corral')) {
    const rail = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0); for (let i = 0; i <= Math.floor(len / 2.4); i++) { const k = i * 2.4 / len, x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k; box(statics, M.woodDark, 0.14, 1.3, 0.14, x, 0.65, z); addSolid(x - 0.1, 0, z - 0.1, x + 0.1, 1.3, z + 0.1, false); } for (const y of [0.45, 0.95, 1.25]) { const rl = box(statics, M.wood, 0.08, 0.1, len, (x0 + x1) / 2, y, (z0 + z1) / 2, ry); void rl; } };
    rail(4, 10, 4, 16); rail(4, 10, 9, 10); rail(4, 26, 4, 32); rail(4, 32, 26, 32);
  }
  if (A.extras.includes('picket')) {
    const B0 = LODGE.B, fz = B0.door.z - 3.2, x0 = B0.def.x - 11, x1 = B0.def.x + 11;
    for (let x = x0; x <= x1; x += 0.2) { if (Math.abs(x - B0.door.x) < 1.2) continue; const pk = box(statics, KM.trimWhite, 0.08, 0.95 + (Math.round(x * 5) % 2) * 0.05, 0.03, x, 0.48, fz); void pk; }
    for (const y of [0.3, 0.75]) { box(statics, KM.trimWhite, B0.door.x - 1.2 - x0, 0.06, 0.03, (x0 + B0.door.x - 1.2) / 2, y, fz - 0.03); box(statics, KM.trimWhite, x1 - B0.door.x - 1.2, 0.06, 0.03, (x1 + B0.door.x + 1.2) / 2, y, fz - 0.03); }
    addSolid(x0, 0, fz - 0.06, B0.door.x - 1.2, 1, fz + 0.06, false); addSolid(B0.door.x + 1.2, 0, fz - 0.06, x1, 1, fz + 0.06, false);
  }
  if (A.extras.includes('junk')) {
    const sh = BUILDINGS.find(b => b.name === 'THE SHACK');
    if (sh) {
      // a crooked stovepipe, boards nailed over the walls at angles, a sheet of tin propped on the roof
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), M.metal); pipe.position.set(sh.def.x + 0.9, 3.0, sh.def.z - 0.6); pipe.rotation.z = 0.12; statics.add(pipe);
      for (let i = 0; i < 6; i++) { const bd = box(statics, M.woodDark, 1.4 + (i % 3) * 0.4, 0.14, 0.04, 0, 0.5 + i * 0.3, 0); bd.position.set(sh.def.x + (i % 2 ? 1.95 : -1.95) * 0.5 + (i - 3) * 0.1, 0.5 + i * 0.28, sh.def.z + (i % 2 ? 1.75 : -1.75)); bd.rotation.z = (i % 2 ? 0.25 : -0.3) * (1 + i * 0.1); }
      const tin = box(statics, KM.tin, 1.6, 0.03, 1.2, sh.def.x - 0.6, 2.75, sh.def.z + 0.4); tin.rotation.set(0.15, 0.4, 0.1);
    }
    if (sh) for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + 0.3, x = sh.def.x + Math.cos(a) * (3 + (i % 3)), z = sh.def.z + Math.sin(a) * (3 + (i % 3));
      if (i % 3 === 0) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 6, 12), M.ash); t.rotation.x = Math.PI / 2; t.position.set(x, 0.12, z); statics.add(t); }
      else if (i % 3 === 1) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 10), KM.tin); b.position.set(x, 0.44, z); b.rotation.z = i * 0.3; statics.add(b); addSolid(x - 0.3, 0, z - 0.3, x + 0.3, 0.9, z + 0.3, false); }
      else { const sh2 = box(statics, KM.junk, 1.2, 0.04, 0.9, x, 0.05, z, i); void sh2; }
    }
  }
  if (A.extras.includes('fieldfence')) {
    const runF = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0); for (let i = 0; i <= Math.floor(len / 2.5); i++) { const k = i * 2.5 / len; box(statics, M.woodDark, 0.12, 1.1, 0.12, x0 + (x1 - x0) * k, 0.55, z0 + (z1 - z0) * k); } for (const y of [0.45, 0.9]) box(statics, M.wood, 0.06, 0.1, len, (x0 + x1) / 2, y, (z0 + z1) / 2, ry); };
    runF(-40, 30, -40, 46); runF(-40, 46, -20, 46); runF(30, 34, 44, 34);
  }

  // ---- the car (their way out) and the entrance sign
  {
    const g = new THREE.Group(); g.position.set(CAR.x, 0, CAR.z); g.rotation.y = CAR.yaw; scene.add(g);
    const paint = new THREE.MeshLambertMaterial({ color: CAR.van ? 0x8a7a5a : 0x5a6a3a }), chrome = new THREE.MeshLambertMaterial({ color: 0x9a9fa6 }), glass = new THREE.MeshPhongMaterial({ color: 0x0a1018, specular: 0x8899aa, shininess: 80 }), tyre = new THREE.MeshLambertMaterial({ color: 0x111111 });
    if (CAR.van) { box(g, paint, 1.9, 1.5, 4.6, 0, 1.1, 0); box(g, glass, 1.92, 0.5, 1.0, 0, 1.45, 1.6); box(g, glass, 1.95, 0.45, 2.4, 0, 1.45, -0.6); }
    else { box(g, paint, 1.8, 0.6, 4.4, 0, 0.6, 0); box(g, paint, 1.6, 0.5, 2.2, 0, 1.15, -0.2); box(g, glass, 1.62, 0.42, 2.0, 0, 1.15, -0.2); }
    box(g, chrome, 1.84, 0.14, 0.1, 0, 0.45, 2.22); box(g, chrome, 1.84, 0.14, 0.1, 0, 0.45, -2.22);
    for (const [x, z] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16), tyre); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); }
    const lamp = new THREE.MeshBasicMaterial({ color: 0x222018 });
    for (const x of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), lamp); l.position.set(x, 0.65, 2.21); g.add(l); }
    CAR.mesh = g; CAR.lampMat = lamp; CAR.boxes = [];
    g.updateMatrixWorld(true);
    const c = Math.cos(CAR.yaw), s = Math.sin(CAR.yaw);
    for (let i = -2; i <= 2; i++) { const x = CAR.x + s * i * 0.9, z = CAR.z + c * i * 0.9; CAR.boxes.push(addSolid(x - 0.9, 0, z - 0.9, x + 0.9, 1.4, z + 0.9)); }
    const door = new THREE.Vector3(-1.4, 0, -0.2).applyMatrix4(g.matrixWorld); CAR.door = { x: door.x, z: door.z };
    footprints.push({ x0: CAR.x - 5, x1: CAR.x + 5, z0: CAR.z - 5, z1: CAR.z + 5 });
  }
  {
    const S = SIGN, g = new THREE.Group(); g.position.set(S.x, 0, S.z); scene.add(g);
    for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 5.2, 10), M.log); post.position.set(sx * S.half, 2.6, 0); g.add(post); addSolid(S.x + sx * S.half - 0.25, 0, S.z - 0.25, S.x + sx * S.half + 0.25, 5.2, S.z + 0.25); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, S.half * 2 + 0.8, 10), M.log); beam.rotation.z = Math.PI / 2; beam.position.y = 4.95; g.add(beam);
    const signMat = new THREE.MeshLambertMaterial({ map: A.signStyle === 'crystal' ? crystalSignTex() : A.signStyle === 'arch' ? archSignTex(A.sign) : signTex(A.sign) });
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.4, 0.1), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, signMat, signMat]);
    board.position.set(0, 3.75, 0); g.add(board);
    for (const sx of [-1.9, 1.9]) for (let i = 0; i < 4; i++) { const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8), M.metal); link.position.set(sx, 4.6 - i * 0.1, 0); link.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(link); }
    const housing = new THREE.MeshLambertMaterial({ color: 0x1a1c1e }), glow = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
    const beamTex = canvasTex(4, 64, (x, w, h) => { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,240,210,0.13)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    for (const sx of [-1.4, 1.4]) {
      const lamp = new THREE.Group(); lamp.position.set(sx, 0.2, -2.2); g.add(lamp);
      lamp.lookAt(S.x + sx * 0.4, 3.75, S.z);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12), housing); can.rotation.x = Math.PI / 2; lamp.add(can);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), glow); lens.position.z = 0.15; lamp.add(lens);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.6, 16, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      cone.rotation.x = -Math.PI / 2; cone.position.z = 2.1; lamp.add(cone);
    }
    const flood = new THREE.SpotLight(0xffe8c8, 60, 12, 0.55, 0.5, 1.4); flood.position.set(S.x, 0.4, S.z - 2.4); flood.target.position.set(S.x, 3.5, S.z); scene.add(flood, flood.target);
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
    footprints.push({ x0: S.x - S.half - 3, x1: S.x + S.half + 3, z0: S.z - 4, z1: S.z + 4 }, { x0: poleAt.x - 2.5, x1: poleAt.x + 2.5, z0: poleAt.z - 2.5, z1: poleAt.z + 2.5 });
  }

  // ---- the woods: instanced pines, birches; trunks inside the camp are solid
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.26, 1, 7); trunkGeo.translate(0, 0.5, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 8); coneGeo.translate(0, 0.5, 0);
  const needleMat = new THREE.MeshLambertMaterial({ color: 0x1a2a1c, map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#5a7a5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,${20 + Math.random() * 40 | 0},0,0.6)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 4); } }) });
  const trees = [];
  const roadX = z => CAR.x + (ROAD_END.x - CAR.x) * Math.max(0, Math.min(1, (z - CAR.z) / (120 - CAR.z)));
  const clear = (x, z) => {
    if (z < SHORE(x) + 2.5) return false;
    if (Math.hypot(x - CAMPFIRE.x, z - CAMPFIRE.z) < 8) return false;
    if (inFootprint(x, z)) return false;
    if (Math.abs(x - roadX(z)) < 3 && z > CAR.z - 6) return false;
    if (Math.abs(x - GATE.x) < 4 && z > FENCE - 10) return false;
    for (const p of paths) if (segD(x, z, p) < 1.8) return false;
    for (const t of trees) if ((t.x - x) ** 2 + (t.z - z) ** 2 < 4) return false;
    return true;
  };
  seed = 1337 + A.id.length * 97;
  for (let i = 0; i < 7000 && trees.length < 950; i++) {
    const x = (srand() * 2 - 1) * 110, z = -28 + srand() * 140;
    const edge = Math.max(Math.abs(x), z) > BOUND - 6;
    if (!edge && srand() > A.trees) continue;   // the camp itself is mostly open
    if (!clear(x, z)) continue;
    const oak = A.forest === 'oak' ? srand() < 0.8 : A.forest === 'mixed' ? srand() < 0.4 : false;
    trees.push(oak ? { x, z, h: 6 + srand() * 4, r: 3 + srand() * 2.5, oak: true } : { x, z, h: 12 + srand() * 12, r: 2 + srand() * 1.4, birch: !oak && srand() < 0.1 });
  }
  for (let i = 0; i < 400; i++) { const x = -250 + srand() * 500, z = -95 - srand() * 60; trees.push({ x, z, h: 10 + srand() * 14, r: 2.5 + srand() * 2, far: true }); }
  const birchMat = new THREE.MeshLambertMaterial({ color: 0xc8c4b8, map: canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#ddd8cc'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = '#1e1c1a'; g.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 2); } }) });
  const pines = trees.filter(t => !t.birch && !t.oak), birches = trees.filter(t => t.birch), oaks = trees.filter(t => t.oak);
  const trunks = new THREE.InstancedMesh(trunkGeo, M.bark, pines.length), birchI = new THREE.InstancedMesh(trunkGeo, birchMat, birches.length);
  const cones = new THREE.InstancedMesh(coneGeo, needleMat, pines.length * 3);
  const birchTop = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x2c3a20 }), birches.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  pines.forEach((t, i) => {
    const y = groundAt(t.x, t.z);
    m4.compose(ps.set(t.x, y, t.z), q.identity(), sc.set(1 + t.r * 0.12, t.h * 0.45, 1 + t.r * 0.12)); trunks.setMatrixAt(i, m4);
    for (let k = 0; k < 3; k++) { const base = t.h * (t.far ? 0.22 + k * 0.22 : 0.36 + k * 0.19), rr = t.r * (1 - k * 0.27); q.setFromAxisAngle(ps.set(0, 1, 0), srand() * 6); m4.compose(ps.set(t.x, y + base, t.z), q, sc.set(rr, t.h * 0.42, rr)); cones.setMatrixAt(i * 3 + k, m4); }
    if (!t.far && Math.abs(t.x) < BOUND + 4 && t.z < BOUND + 4) addSolid(t.x - 0.3, 0, t.z - 0.3, t.x + 0.3, 6, t.z + 0.3, false);
  });
  birches.forEach((t, i) => {
    m4.compose(ps.set(t.x, 0, t.z), q.identity(), sc.set(0.6, t.h * 0.6, 0.6)); birchI.setMatrixAt(i, m4);
    m4.compose(ps.set(t.x, t.h * 0.55, t.z), q.setFromAxisAngle(ps.set(0, 1, 0), i), sc.set(t.r * 0.9, t.h * 0.3, t.r * 0.9)); birchTop.setMatrixAt(i, m4);
    if (Math.abs(t.x) < BOUND + 4 && t.z < BOUND + 4) addSolid(t.x - 0.2, 0, t.z - 0.2, t.x + 0.2, 6, t.z + 0.2, false);
  });
  // oaks: a short thick trunk that forks, and a wide spread of leaf clumps
  const oakTrunk = new THREE.InstancedMesh(trunkGeo, M.bark, Math.max(1, oaks.length * 3)), oakLeaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshLambertMaterial({ color: A.grass === 'dry' ? 0x3a4426 : 0x2a3a20, map: leafTex() }), Math.max(1, oaks.length * 6));
  oakTrunk.count = oaks.length * 3; oakLeaf.count = oaks.length * 6;
  oaks.forEach((t, i) => {
    const y = groundAt(t.x, t.z), lean = srand() * 6;
    m4.compose(ps.set(t.x, y, t.z), q.identity(), sc.set(2.4, 3.8 + t.h * 0.25, 2.4)); oakTrunk.setMatrixAt(i * 3, m4);
    for (let k = 1; k < 3; k++) { const a = lean + k * 2.6; q.setFromEuler(new THREE.Euler(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7)); m4.compose(ps.set(t.x, y + 3.4 + t.h * 0.2, t.z), q, sc.set(1.3, t.h * 0.5, 1.3)); oakTrunk.setMatrixAt(i * 3 + k, m4); }
    for (let k = 0; k < 6; k++) { const a = lean + k * 1.1, d = t.r * (k ? 0.6 : 0); m4.compose(ps.set(t.x + Math.cos(a) * d, y + 3.6 + t.h * (0.55 + srand() * 0.3) + t.r * 0.4, t.z + Math.sin(a) * d), q.setFromAxisAngle(sc.set(0, 1, 0), a), sc.set(t.r * 0.72, t.r * 0.4, t.r * 0.72)); oakLeaf.setMatrixAt(i * 6 + k, m4); }
    if (Math.abs(t.x) < BOUND + 4 && t.z < BOUND + 4) addSolid(t.x - 0.4, 0, t.z - 0.4, t.x + 0.4, 6, t.z + 0.4, false);
  });
  scene.add(trunks, cones, birchI, birchTop, oakTrunk, oakLeaf);
  for (const m of [trunks, cones, birchI, birchTop, oakTrunk, oakLeaf]) { m.castShadow = true; m.receiveShadow = true; }
  // ferns and long grass, kept off paths and out of buildings
  const tuftGeo = new THREE.PlaneGeometry(0.6, 0.45); tuftGeo.translate(0, 0.22, 0);
  const tuftGeo2 = tuftGeo.clone().rotateY(Math.PI / 2);
  const tuftMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, alphaTest: 0.5, map: canvasTex(64, 64, (g, w, h) => { for (let i = 0; i < 26; i++) { g.strokeStyle = `rgb(${40 + Math.random() * 30 | 0},${70 + Math.random() * 40 | 0},${30})`; g.lineWidth = 2; g.beginPath(); const x = 8 + Math.random() * 48; g.moveTo(x, h); g.quadraticCurveTo(x + (Math.random() - 0.5) * 20, h * 0.5, x + (Math.random() - 0.5) * 30, Math.random() * h * 0.4); g.stroke(); } }) });
  const NT = 2600, tufts = [new THREE.InstancedMesh(tuftGeo, tuftMat, NT), new THREE.InstancedMesh(tuftGeo2, tuftMat, NT)];
  for (let i = 0; i < NT; i++) {
    let x, z, tries = 0;
    do { x = (srand() * 2 - 1) * 70; z = SHORE(0) + srand() * 100; tries++; } while (tries < 30 && (z < SHORE(x) + 1 || rectHeight(FLOORS, x, z) > -9 || rectHeight(FLOORS, x + 0.4, z) > -9 || rectHeight(FLOORS, x, z + 0.4) > -9 || paths.some(p => segD(x, z, p) < 1.2)));
    const s = 0.6 + srand() * 1.2;
    m4.compose(ps.set(x, tries >= 30 ? -5 : 0, z), q.setFromAxisAngle(sc.set(0, 1, 0), srand() * 6), sc.set(s, s, s));
    tufts[0].setMatrixAt(i, m4); tufts[1].setMatrixAt(i, m4);
  }
  scene.add(...tufts);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M.stone, 90);
  for (let i = 0; i < 90; i++) { let x, z; do { x = (srand() * 2 - 1) * 60; z = -34 + srand() * 96; } while (inFootprint(x, z)); const s = 0.2 + srand() * 0.5; m4.compose(ps.set(x, groundAt(x, z) + s * 0.3, z), q.setFromEuler(new THREE.Euler(srand() * 3, srand() * 3, 0)), sc.set(s * 1.3, s * 0.7, s)); rocks.setMatrixAt(i, m4); }
  scene.add(rocks);

  // ---- the phone, the generator
  {
    const ph = new THREE.Group(); ph.position.set(PHONE.x, PHONE.y, PHONE.z); ph.rotation.y = PHONE.yaw ?? Math.PI / 2; scene.add(ph);
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
  }

  // ---- the fence
  {
    const link = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(150,155,160,0.95)'; g.lineWidth = 3; for (let i = -h; i < w + h; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } }, [1, 1]);
    const H = 2.6, mesh = new THREE.MeshLambertMaterial({ map: link, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    const run = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), t = link.clone(); t.needsUpdate = true; t.repeat.set(len / 0.7, H / 0.7);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H), mesh.clone()); m.material.map = t;
      m.position.set((x0 + x1) / 2, H / 2, (z0 + z1) / 2); m.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); scene.add(m);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), M.metal); rail.rotation.z = Math.PI / 2; rail.rotation.y = m.rotation.y; rail.position.set(m.position.x, H, m.position.z); scene.add(rail);
      for (let i = 0; i <= Math.floor(len / 3); i++) { const k = i * 3 / len; const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H + 0.1, 6), M.metal); post.position.set(x0 + (x1 - x0) * k, (H + 0.1) / 2, z0 + (z1 - z0) * k); statics.add(post); }
      const barb = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 3), M.metal); barb.rotation.copy(rail.rotation); barb.position.set(m.position.x, H + 0.25, m.position.z); scene.add(barb);
      addSolid(Math.min(x0, x1) - 0.12, 0, Math.min(z0, z1) - 0.12, Math.max(x0, x1) + 0.12, H, Math.max(z0, z1) + 0.12);
    };
    const shoreW = SHORE(-FENCE) - 1, shoreE = SHORE(FENCE) - 1;
    run(-FENCE, shoreW, -FENCE, FENCE); run(FENCE, shoreE, FENCE, FENCE);
    run(-FENCE, FENCE, GATE.x - GATE.w / 2, FENCE); run(GATE.x + GATE.w / 2, FENCE, FENCE, FENCE);
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
    GATE.box = world.addBox(new THREE.Vector3(GATE.x - GATE.w / 2, 0, FENCE - 0.15), new THREE.Vector3(GATE.x + GATE.w / 2, H, FENCE + 0.15), false);
  }

  const merged = mergeStatic(statics, scene);
  merged.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  live.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  ground.receiveShadow = true;

  // ---- mist
  const mistTex = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 26; i++) { const x = w * 0.2 + Math.random() * w * 0.6, y = h * 0.35 + Math.random() * h * 0.3, r = 16 + Math.random() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
  const mist = [];
  for (let i = 0; i < 46; i++) {
    const onLake = i < 26;
    const x = (Math.random() * 2 - 1) * (onLake ? 60 : 55), z = onLake ? SHORE(x) - 4 - Math.random() * 40 : SHORE(x) + 10 + Math.random() * 65;
    const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0xa8b4c4, transparent: true, depthWrite: false, opacity: 0 }));
    const w = 9 + Math.random() * 10; sp2.scale.set(w, w * 0.32, 1);
    sp2.position.set(x, (onLake ? WATER_Y : groundAt(x, z)) + w * 0.08, z);
    sp2.userData = { base: 0.35 + Math.random() * 0.35, drift: (Math.random() - 0.5) * 0.25, x0: x };
    scene.add(sp2); mist.push(sp2);
  }
  const updateMist = (t, cx, cz) => {
    for (const m of mist) {
      m.position.x = m.userData.x0 + Math.sin(t * 0.02 + m.userData.x0) * 4 + t * m.userData.drift % 30;
      const d = Math.hypot(m.position.x - cx, m.position.z - cz);
      // never inside a building
      m.material.opacity = m.userData.base * Math.min(1, Math.max(0, (d - 3) / 6)) * (rectHeight(FLOORS, cx, cz) > -9 ? 0.25 : 1);
    }
  };

  // ---- interior lights: a few real lights go to the lamps nearest you; every other lamp just glows
  const POOL = 4, pool = [];
  for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffc888, 0, 6, 2); l.userData = { lamp: null, level: 0 }; scene.add(l); pool.push(l); }
  let power = true, flickT = 0;
  const lightOn = l => l.powered ? power : true;
  const updateLights = (px, pz, dt, t) => {
    flickT += dt;
    // which lamps matter: near you, and the ones in the building you're in count double
    const inB = BUILDINGS.find(b => b.rooms.some(r => { const lx = (px - b.def.x) * Math.cos(b.yaw) - (pz - b.def.z) * Math.sin(b.yaw), lz = (px - b.def.x) * Math.sin(b.yaw) + (pz - b.def.z) * Math.cos(b.yaw); return lx > r.x0 && lx < r.x1 && lz > r.z0 && lz < r.z1; }));
    const want = LAMPS.filter(l => lightOn(l)).map(l => ({ l, d: Math.hypot(l.x - px, l.z - pz) * (l.building && l.building === inB ? 0.5 : 1) })).filter(o => o.d < 22).sort((a, b) => a.d - b.d).slice(0, POOL).map(o => o.l);
    for (const L of pool) {
      const u = L.userData;
      if (u.lamp && !want.includes(u.lamp)) u.goal = 0; else if (u.lamp) u.goal = 1;
      if (!u.lamp || (u.level <= 0.01 && u.goal === 0)) {
        const free = want.find(l => !pool.some(o => o.userData.lamp === l));
        if (free) { u.lamp = free; u.level = 0; u.goal = 1; L.position.set(free.x, free.y - 0.15, free.z); L.color.setHex(free.color); L.distance = free.range * 2.2; }
        else { u.lamp = null; u.goal = 0; }
      }
      u.level += ((u.goal ?? 0) - u.level) * Math.min(1, dt * 5);
      const lamp = u.lamp;
      let fl = 1;
      if (lamp?.flicker) fl = lamp.kind === 'tube' ? (Math.sin(t * 37 + lamp.x) > 0.93 || Math.random() < 0.02 ? 0.15 : 1) : 0.85 + Math.sin(t * 9 + lamp.z) * 0.08 + Math.random() * 0.1 * lamp.flicker;
      L.intensity = lamp && lightOn(lamp) ? lamp.power * u.level * fl * 5 : 0;
    }
  };
  const setPower = on => {
    power = on;
    KM.windowLit.opacity = on ? 0.22 : 0;
    KM.bulb.color.setHex(on ? 0xffd9a0 : 0x2a2620); KM.tube.color.setHex(on ? 0xe8f0ff : 0x30343a);
    KM.glow.opacity = on ? 1 : 0; KM.shade.emissive.setHex(on ? 0x6a5030 : 0x000000);
  };

  // ---- doors: they swing open as anyone comes near and fall shut behind them
  const updateDoors = (dt, actors) => {
    for (const d of DOORS) {
      if (d.broken) continue;
      let near = false;
      for (const a of actors) if (Math.abs(a.x - d.x) < 1.5 && Math.abs(a.z - d.z) < 1.5 && Math.hypot(a.x - d.x, a.z - d.z) < 1.3) { near = true; break; }
      if (near && !d.locked) { d.target = 1; d.hold = 2.5; } else if ((d.hold -= dt) <= 0) d.target = 0;
      const was = d.open;
      d.open += (d.target - d.open) * Math.min(1, dt * (d.target ? 6 : 2.5));
      d.hinge.rotation.y = d.base + d.swing * d.open;
      const shut = d.open < 0.15;
      d.box.min.y = shut ? 0 : -10; d.box.max.y = shut ? d.y1 : -9;
      d.moved = Math.abs(d.open - was) > 0.002 ? (d.target ? 'open' : 'close') : null;
      if (was > 0.06 && d.open <= 0.06 && !d.target) d.slam = true;
    }
  };

  buildNav(solids);
  return { fireLight, water, ripple, solids, trees, moon, updateMist, updateLights, updateDoors, setPower, area: A };
}

// ---------------------------------------------------------------- walking grid + A*
const NS = 0.4, NN = Math.ceil(BOUND * 2 / NS) + 1;
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
    const pad = b.max.y < 0.5 ? 0 : 0.24;
    if (b.max.y < 0.3) continue;
    for (let j = cell(b.min.z - pad); j <= cell(b.max.z + pad); j++) for (let i = cell(b.min.x - pad); i <= cell(b.max.x + pad); i++) {
      const x = -BOUND + i * NS, z = -BOUND + j * NS;
      if (x < b.min.x - pad || x > b.max.x + pad || z < b.min.z - pad || z > b.max.z + pad) continue;
      block[at(i, j)] = 1;
      if (b.opaque && x >= b.min.x - 0.12 && x <= b.max.x + 0.12 && z >= b.min.z - 0.12 && z <= b.max.z + 0.12) opaque[at(i, j)] = 1;
    }
  }
}
export const walkable = (x, z) => Math.abs(x) < BOUND - 1 && Math.abs(z) < BOUND - 1 && !block[at(cell(x), cell(z))];
// can a counselor at a see b? walls block it; trees and windows don't
export function sightClear(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.3);
  for (let k = 1; k < n; k++) { const t = k / n; if (opaque[at(cell(ax + (bx - ax) * t), cell(az + (bz - az) * t))]) return false; }
  return true;
}
export function clearWalk(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
  for (let k = 1; k <= n; k++) { const t = k / n; if (block[at(cell(ax + (bx - ax) * t), cell(az + (bz - az) * t))]) return false; }
  return true;
}
function nearestFree(i, j) {
  if (!block[at(i, j)]) return [i, j];
  for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < NN && b < NN && !block[at(a, b)]) return [a, b];
  }
  return [i, j];
}
// A* with a binary heap; returns smoothed waypoints [{x, z}] or null
const gScore = new Float32Array(NN * NN), from = new Int32Array(NN * NN), closed = new Uint8Array(NN * NN);
export function findPath(ax, az, bx, bz) {
  const [si, sj] = nearestFree(cell(ax), cell(az)), [gi, gj] = nearestFree(cell(bx), cell(bz));
  const start = at(si, sj), goal = at(gi, gj);
  gScore.fill(1e9); from.fill(-1); closed.fill(0);
  const heap = [], f = [];
  const push = (n, fv) => { heap.push(n); f.push(fv); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (f[p] <= f[k]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; [f[p], f[k]] = [f[k], f[p]]; k = p; } };
  const pop = () => {
    const top = heap[0], lh = heap.pop(), lf = f.pop();
    if (heap.length) { heap[0] = lh; f[0] = lf; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && f[l] < f[m]) m = l; if (r < heap.length && f[r] < f[m]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; [f[m], f[k]] = [f[k], f[m]]; k = m; } }
    return top;
  };
  gScore[start] = 0; push(start, 0);
  let steps = 0;
  while (heap.length && steps++ < 60000) {
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
      if (di && dj && (block[at(i + di, j)] || block[at(i, j + dj)])) continue;
      const ng = gScore[n] + (di && dj ? 1.414 : 1);
      if (ng < gScore[m]) { gScore[m] = ng; from[m] = n; push(m, ng + Math.hypot(a - gi, b - gj) * 1.05); }
    }
  }
  if (from[goal] < 0 && goal !== start) return null;
  const pts = [];
  for (let n = goal; n !== -1 && n !== start; n = from[n]) pts.push({ x: -BOUND + (n % NN) * NS, z: -BOUND + ((n / NN) | 0) * NS });
  pts.reverse();
  const out = []; let cx = ax, cz = az;
  for (let k = 0; k < pts.length; k++) {
    const nxt = pts[k + 1];
    if (nxt && clearWalk(cx, cz, nxt.x, nxt.z)) continue;
    out.push(pts[k]); cx = pts[k].x; cz = pts[k].z;
  }
  return out;
}
