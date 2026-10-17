// JASON'S REVENGE -- Camp Crystal Lake, Friday the 13th.
import * as THREE from '../vendor/three.module.js';
import { Sim, STEP, segDist } from './sim.js?v=13';
import { Human } from './body.js?v=13';
import { Blood } from './blood.js?v=13';
import { sfx } from './sfx.js?v=13';
import { score } from './score.js?v=13';
import { Rain } from './rain.js?v=13';
import { AREAS } from './areas.js?v=13';
import { WINDMILL } from './camp.js?v=13';
import { buildCamp, AREA, TOOL_SPOTS, DOORS, HIDING, BUILDINGS, LAMPS, groundAt, restAt, inLake, WATER_Y, CAMPFIRE, CAR, ROAD_END, START, LODGE, SPOTS, HIDES, WEAPON_SPOTS, BEDS, SHED, PHONE, JUNCTION, GENERATOR, WINDOW_MAT, CABINS, GATE, FENCE, findPath, sightClear, BOUND, shoreZ } from './camp.js?v=13';
import { buildHand, makeBody, poseBody, skinMat } from './jason.js?v=13';
import { WEAPONS, GRIPS, buildWeapon, buildSheath, buildFlashlight, WM } from './weapons.js?v=13';

const V3 = THREE.Vector3, $ = id => document.getElementById(id);
const NEG_Z = new V3(0, 0, -1), UP = new V3(0, 1, 0), X_AXIS = new V3(1, 0, 0);
const tv = new V3(), tv2 = new V3(), tv3 = new V3(), tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion();
const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ------------------------------------------------------------ settings
const S = { height: 0.12, snap: true, vol: 1 };
try { Object.assign(S, JSON.parse(localStorage.getItem('jasonSettings') || '{}')); } catch { /* defaults */ }
const saveSettings = () => { try { localStorage.setItem('jasonSettings', JSON.stringify(S)); } catch { /* private mode */ } };

// ------------------------------------------------------------ renderer / scene
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1522);
scene.fog = new THREE.FogExp2(0x101824, 0.03);
const rig = new THREE.Group(); scene.add(rig);
const camera = new THREE.PerspectiveCamera(72, 1, 0.04, 600);
camera.rotation.order = 'YXZ'; camera.position.set(0, 1.75, 0); rig.add(camera);
scene.add(new THREE.HemisphereLight(0x5a6c8c, 0x1a1c20, 1.7));
const moonLight = new THREE.DirectionalLight(0xa8bce0, 1.6); moonLight.position.set(-120, 170, -330); scene.add(moonLight, moonLight.target);
// moon shadows in a box that travels with you (trees, cabins, bodies, you)
const MOON_DIR = new V3(-120, 170, -330).normalize();
moonLight.castShadow = true; moonLight.shadow.mapSize.set(1024, 1024);
Object.assign(moonLight.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 120 });
moonLight.shadow.bias = -0.0006; moonLight.shadow.normalBias = 0.04;
function followMoon(h) {
  // snap to shadow-map texels so the edges don't crawl as you move
  const step = 32 / 1024, x = Math.round(h.x / step) * step, z = Math.round(h.z / step) * step;
  moonLight.target.position.set(x, 0, z); moonLight.position.set(x + MOON_DIR.x * 60, MOON_DIR.y * 60, z + MOON_DIR.z * 60);
  moonLight.target.updateMatrixWorld();
}

const sim = new Sim(); sim.floorAt = restAt;
const hemiL = scene.children.find(o => o.isHemisphereLight);
const rain = new Rain(scene, groundAt);
rain.onThunder = () => sfx.thunder();
const SKY = { clear: { bg: 0x0e1522, fog: 0x101824, density: 0.03, hemi: 1.7 }, wet: { bg: 0x0a0f17, fog: 0x0e141c, density: 0.045, hemi: 1.45 } };
function setWeather(wet) {
  const k = wet ? SKY.wet : SKY.clear;
  scene.background.setHex(k.bg); scene.fog.color.setHex(k.fog); scene.fog.density = k.density; hemiL.intensity = k.hemi;
  rain.set(wet); sfx.rain(wet);
}
const blood = new Blood(scene, sim);
// what you picked on the title screen: the area, who you play, and whether the film's cast is there
const QS = new URLSearchParams(location.search);
const SET = { area: QS.get('area') ?? 'crystal', mode: QS.get('mode') ?? 'jason', cast: QS.get('cast') !== '0' };
const camp = buildCamp(scene, sim, SET.area);

// ------------------------------------------------------------ state
let inVR = false, started = false, paused = false;
const P = { hp: 100, hurtT: 0, lastHit: -99, y: 0, stamina: 100, sprint: false, sense: 0, senseCd: 0, down: false, moveSpeed: 0 };
const counselors = [], police = [], tools = [];
const RUN = { lastAlarm: 0, night: 1, t: 0, dawn: 480, over: false, calledAt: -1, policeAt: -1, policeHere: false, carGone: false, carHp: 3, carDriving: null, kills: [], escaped: [] };
const victims = () => police.length ? [...counselors, ...police] : counselors;
const posOf = d => d.mode === 'anim' ? d.root : d.p.pelvis;

// ------------------------------------------------------------ Jason: hands and body
const body = makeBody(scene);
function makeHand(ctrl) {
  return { ctrl, pos: new V3(), prevPos: new V3(), vel: new V3(), quat: new THREE.Quaternion(), held: null, trigger: false, trigV: 0, gripV: 0,
    src: null, active: false, punchCd: 0, tip: new V3(), prevTip: new V3(), hasTip: false, side: 'right', twist: 0 };
}
const vrHands = [0, 1].map(i => {
  const c = renderer.xr.getController(i); rig.add(c);
  const h = makeHand(c); h.side = i ? 'right' : 'left';
  h.glove = buildHand(h.side); h.glove.visible = false; scene.add(h.glove);
  h.ray = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 1.5), new THREE.MeshBasicMaterial({ color: 0xc8c0b0, transparent: true, opacity: 0.35 }));
  h.ray.position.z = -0.75; h.ray.visible = false; c.add(h.ray);
  c.addEventListener('connected', e => {
    h.src = e.data;
    const side = e.data.handedness === 'left' ? 'left' : 'right';
    if (side !== h.side) { h.side = side; for (const ch of [...h.glove.children].slice(1)) body.g.add(ch); scene.remove(h.glove); h.glove = buildHand(side); scene.add(h.glove); }
  });
  c.addEventListener('disconnected', () => { h.src = null; h.trigger = false; drop(h); });
  c.addEventListener('selectstart', () => { h.trigger = true; if (menu.open) menuClick(h); });
  c.addEventListener('selectend', () => { h.trigger = false; });
  // weapons stay in your hand until you squeeze again; people only while you keep hold
  c.addEventListener('squeezestart', () => { if (menu.open) return; if (h.held?.type === 'tool') drop(h); else grab(h); });
  c.addEventListener('squeezeend', () => { if (h.held && h.held.type !== 'tool') drop(h); });
  return h;
});
const desk = makeHand(null); desk.jab = 0; desk.side = 'right';
desk.glove = buildHand('right'); desk.glove.visible = false; scene.add(desk.glove);
const hands = () => inVR ? vrHands : [desk];
const allHands = () => [...vrHands, desk];
function pulse(h, i, ms) { h?.src?.gamepad?.hapticActuators?.[0]?.pulse?.(i, ms); }
const headV = new V3();
function headPos() { return camera.getWorldPosition(headV); }
function headYaw() { camera.getWorldDirection(tv3); return Math.atan2(-tv3.x, -tv3.z); }
const BLOODY = new THREE.Color(0x5a0a06);
let handBlood = 0;
function bloody(amt) { handBlood = Math.min(1, Math.max(0, handBlood + amt)); skinMat.color.setRGB(1, 1, 1).lerp(BLOODY, handBlood * 0.55); }

// sheath on the left hip, a strap over the right shoulder, a slot on the right hip
const holsters = [
  { name: 'left hip', off: [-0.24, -0.78, 0.04], tool: null },
  { name: 'right hip', off: [0.24, -0.78, 0.04], tool: null },
  { name: 'back', off: [0.16, -0.25, 0.22], tool: null },
];
const sheath = buildSheath(); scene.add(sheath);
const holQ = new THREE.Quaternion(), holDown = new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.PI / 2);
function holsterPos(hs, out) {
  const yaw = body.yaw, c = Math.cos(yaw), s = Math.sin(yaw), head = headPos();
  return out.set(head.x + hs.off[0] * c + hs.off[2] * s, head.y + hs.off[1], head.z - hs.off[0] * s + hs.off[2] * c);
}

// ------------------------------------------------------------ weapons
function makeTool(kind) {
  const def = WEAPONS[kind];
  const t = { kind, def, mesh: buildWeapon(kind), held: null, support: null, embed: null, holster: null, planted: false };
  t.a = sim.point(0, 1, 0, 0.03, 0.6, t, 'tool'); t.b = sim.point(0, 1, -def.len, 0.03, 0.4, t, 'tool');
  t.a.grip = t.b.grip = 1; sim.link(t.a, t.b, 'rod', 1, def.len, t);
  scene.add(t.mesh); tools.push(t);
  return t;
}
function plant(t, at, dir) {
  t.a.moveTo(at.x - dir.x * t.def.len * 0.86, at.y - dir.y * t.def.len * 0.86, at.z - dir.z * t.def.len * 0.86);
  t.b.moveTo(at.x + dir.x * t.def.len * 0.14, at.y + dir.y * t.def.len * 0.14, at.z + dir.z * t.def.len * 0.14);
  t.a.locked = t.b.locked = true; t.planted = true;
}
function hang(t, slot) {
  t.a.moveTo(slot.x, slot.y, slot.z); t.b.moveTo(slot.x, slot.y + t.def.len, slot.z);
  t.a.locked = t.b.locked = true; t.planted = true; t.hung = true;
  // flat of the blade facing into the shed: tool -Z up the wall, tool +X out of it
  t.hangQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3(0, 0, -1), new V3(1, 0, 0), new V3(0, -1, 0)));
}
function lean(t, at) {
  t.a.moveTo(at.x, 0.06 + 0.05, at.z); t.b.moveTo(at.x + 0.05, t.def.len * 0.96, at.z + 0.22);
  t.a.locked = t.b.locked = true; t.planted = true; t.hung = true;
}
function resetTools() {
  for (const t of tools) { scene.remove(t.mesh); if (t.glint) scene.remove(t.glint); sim.remove(t); }
  tools.length = 0; for (const hs of holsters) hs.tool = null;
  for (const h of allHands()) h.held = null;
  // the machete starts on your back: reach over your right shoulder for it
  const m = makeTool('machete'); holsters[2].tool = m; m.holster = holsters[2];
  // the rest are on the way up from the water: a knife in the dock, an axe in a stump on the shore, a pitchfork by the fire path
  plant(makeTool('knife'), tv2.set(TOOL_SPOTS.knife.x, TOOL_SPOTS.knife.y, TOOL_SPOTS.knife.z), tv.set(0.1, -1, 0.15).normalize());
  plant(makeTool('axe'), tv2.set(STUMP.x + 0.05, 0.62, STUMP.z), tv.set(0.15, -1, 0.3).normalize());
  plant(makeTool('pitchfork'), tv2.set(TOOL_SPOTS.pitchfork.x, 0.02, TOOL_SPOTS.pitchfork.z), tv.set(0.15, -1, 0.2).normalize());
  // the shed: everything on the pegboard, grip down, head up; the long ones leaned in the corners; one outline left empty
  ['hatchet', 'cleaver', 'sickle', 'hammer', null, 'icepick', 'shears', 'crowbar'].forEach((k, i) => { if (k) hang(makeTool(k), SHED.slots[i]); });
  lean(makeTool('sledge'), SHED.lean[0]); lean(makeTool('spear'), SHED.lean[1]);
}

// a chopping stump on the shore for the axe
const STUMP = TOOL_SPOTS.stump;
{
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.6, 12), new THREE.MeshLambertMaterial({ color: 0x4a3626 }));
  st.position.set(STUMP.x, 0.3, STUMP.z); scene.add(st);
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), new THREE.MeshLambertMaterial({ color: 0x8a6a48 })); top.rotation.x = -Math.PI / 2; top.position.set(STUMP.x, 0.605, STUMP.z); scene.add(top);
  sim.addBox(new V3(STUMP.x - 0.35, 0, STUMP.z - 0.35), new V3(STUMP.x + 0.35, 0.6, STUMP.z + 0.35), false);
}
// moonlight catching the steel of a weapon nobody's holding
const glintMat = new THREE.SpriteMaterial({ color: 0xcfd8e8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, map: (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(31, 4, 2, 56); x.fillRect(4, 31, 56, 2);   // a star of light
  return new THREE.CanvasTexture(c); })() });
function updateGlints(t) {
  for (const tool of tools) {
    if (!tool.glint) { tool.glint = new THREE.Sprite(glintMat); tool.glint.scale.setScalar(0.22); scene.add(tool.glint); }
    const free = !tool.held && !tool.holster && !tool.stuck && !tool.pull && (!tool.hung || vrHands.some(h => h.aim === tool));
    tool.glint.visible = free;
    if (!free) continue;
    tool.glint.position.set(tool.a.x + (tool.b.x - tool.a.x) * 0.55, tool.a.y + (tool.b.y - tool.a.y) * 0.55 + 0.04, tool.a.z + (tool.b.z - tool.a.z) * 0.55);
    tool.glint.scale.setScalar(0.2 + 0.18 * Math.max(0, Math.sin(t * 1.7 + tool.a.x)) ** 4 + (P.sense > 0 ? 0.3 : 0) + (vrHands.some(h => h.aim === tool) ? 0.35 + 0.1 * Math.sin(t * 9) : 0));
  }
}

// ------------------------------------------------------------ grabbing
function grab(h) {
  if (h.held || !started) return;
  for (const hs of holsters) {
    if (!hs.tool || !inVR || holsterPos(hs, tv).distanceTo(h.pos) > 0.28) continue;
    const t = hs.tool; hs.tool = null; t.holster = null; t.held = h; h.held = { type: 'tool', tool: t }; h.hasTip = false;
    pulse(h, 0.6, 50); sfx.draw(); return;
  }
  const reach = inVR ? 0.2 : 1.7, from = inVR ? h.pos : headPos();
  const dir = tv.copy(NEG_Z).applyQuaternion(h.quat);
  // desktop: whatever is nearest the middle of the screen, within arm's reach
  const near = (x, y, z, r = 0) => {
    if (inVR) return Math.hypot(x - h.pos.x, y - h.pos.y, z - h.pos.z) - r;
    tv2.set(x - from.x, y - from.y, z - from.z); const along = tv2.dot(dir); if (along < 0 || along > reach) return 99;
    return Math.sqrt(Math.max(0, tv2.lengthSq() - along * along)) * 3 + along * 0.2;
  };
  let best = null, bd = reach;
  for (const t of tools) {
    if (t.holster) continue;
    if (t.held) {
      if (t.held !== h && !t.support && inVR && Math.sqrt(segDist(h.pos, h.pos, t.a, t.b)) < 0.14) { best = { type: 'support', tool: t }; bd = 0; }
      continue;
    }
    const d = inVR ? Math.sqrt(segDist(h.pos, h.pos, t.a, t.b)) : near((t.a.x + t.b.x) / 2, (t.a.y + t.b.y) / 2, (t.a.z + t.b.z) / 2);
    if (d < bd) { bd = d; best = { type: 'tool', tool: t }; }
  }
  const mine = new Map(victims().map(d => [d, d]));
  for (const p of sim.points) {
    const d = mine.get(p.owner); if (!d || p.hand || p.dead || p.tag === 'side') continue;
    const dd = near(p.x, p.y, p.z, p.r) + (p.tag === 'neck' ? -0.05 : 0);
    if (dd < bd - 0.04) { bd = dd + 0.04; best = { type: 'point', p, d }; }
  }
  if (!best) { if (!h.pulling) { const far = farTool(h); if (far) startPull(h, far); } return; }
  h.held = best;
  if (best.type === 'support') { const t = best.tool; t.support = h; t.supportAhead = tv.subVectors(h.pos, t.held.pos).dot(tv2.set(t.b.x - t.a.x, t.b.y - t.a.y, t.b.z - t.a.z)) > 0; pulse(h, 0.4, 40); return; }
  if (best.type === 'tool') {
    const t = best.tool;
    unstick(t);
    t.held = h; t.a.locked = t.b.locked = true; h.hasTip = false;
  } else {
    const { p, d } = best;
    p.locked = true; p.hand = h; h.holdDist = 0.8;
    d.held++; d.grabbedBy = h.pos;
    d.ragdoll(1.5);
    d.choked = p.tag === 'neck';
    if (d.alive) { say(d, d.choked ? 'choke' : 'shriek'); alertOf(d, 1); }
    if (p.tag === 'gut') { sfx.squelch(p, 0.8); bloody(0.15); }
    if (d.bleed > 3 || !d.alive) bloody(0.08);
  }
  pulse(h, 0.5, 40);
}
// pull a weapon out of whatever it's in (a body, a wall, the ground, the pegboard)
function unstick(t) {
  if (t.stuck) { const d = t.stuck.d; blood.spray(t.b, tv.set(t.a.x - t.b.x, t.a.y - t.b.y, t.a.z - t.b.z).normalize(), 18, 2.5, 0.6); d.bleed += 4; t.stuck = null; sfx.slurp(t.b); sfx.squelch(t.b, 0.6); bloody(0.1); }
  if (t.wallPin) { const w = t.wallPin; w.p.hand = null; w.p.locked = false; w.d.held = Math.max(0, w.d.held - 1); t.wallPin = null; sfx.slurp(t.b); sfx.squelch(t.b, 0.7); blood.spray(t.b, UP, 15, 2, 0.8); }
  if (t.planted) { t.planted = false; t.hung = false; sfx.thud(t.a); }
}
// point at a weapon out of reach and squeeze: it flies into your hand
const FAR_REACH = 3;
function farTool(h) {
  const from = inVR ? h.pos : headPos(), dir = tv3.copy(NEG_Z).applyQuaternion(inVR ? h.quat : camera.getWorldQuaternion(tq2));
  let best = null, bs = Infinity;
  for (const t of tools) {
    if (t.held || t.holster || t.pull || t.embed) continue;
    tv2.set((t.a.x + t.b.x) / 2 - from.x, (t.a.y + t.b.y) / 2 - from.y, (t.a.z + t.b.z) / 2 - from.z);
    const along = tv2.dot(dir); if (along < 0.3 || along > FAR_REACH) continue;
    const ang = Math.sqrt(Math.max(0, tv2.lengthSq() - along * along)) / along;
    if (ang > 0.12 + 0.12 / along || ang + along * 0.004 > bs) continue;
    if (!sightClear(from.x, from.z, from.x + tv2.x, from.z + tv2.z)) continue;
    bs = ang + along * 0.004; best = t;
  }
  return best;
}
function startPull(h, t) {
  unstick(t);
  t.a.locked = t.b.locked = true;
  const d = Math.hypot(t.a.x - h.pos.x, t.a.y - h.pos.y, t.a.z - h.pos.z);
  t.pull = { h, k: 0, dur: 0.14 + d * 0.03, from: new V3((t.a.x + t.b.x) / 2, (t.a.y + t.b.y) / 2, (t.a.z + t.b.z) / 2), lift: Math.min(0.6, d * 0.08), q: t.mesh.quaternion.clone() };
  h.pulling = t; pulse(h, 0.35, 60); sfx.whoosh(t.a);
}
function updatePulls(dt) {
  for (const t of tools) {
    const P = t.pull; if (!P) continue;
    const h = P.h;
    P.k = Math.min(1, P.k + dt / P.dur);
    const e = P.k * P.k * (3 - 2 * P.k);
    tv.lerpVectors(P.from, h.pos, e); tv.y += Math.sin(Math.PI * P.k) * P.lift;
    // it turns in the air so the handle arrives first
    tv2.subVectors(t.b, t.a).normalize().lerp(tv3.copy(NEG_Z).applyQuaternion(h.quat), Math.min(1, dt * 9 * (0.3 + e))).normalize().multiplyScalar(t.def.len / 2);
    t.a.moveTo(tv.x - tv2.x, tv.y - tv2.y, tv.z - tv2.z); t.b.moveTo(tv.x + tv2.x, tv.y + tv2.y, tv.z + tv2.z);
    if (P.k < 1) continue;
    t.pull = null; h.pulling = null;
    if (h.held || !started) { t.a.locked = t.b.locked = false; continue; }
    t.held = h; h.held = { type: 'tool', tool: t }; h.hasTip = false; h.toolPos = null;
    pulse(h, 0.8, 70); sfx.draw();
  }
}
function drop(h) {
  const held = h.held;
  if (!held) return;
  h.held = null;
  if (held.type === 'point') {
    const { p, d } = held;
    p.locked = false; p.hand = null;
    p.setVel(h.vel.x * 1.1, h.vel.y * 1.1, h.vel.z * 1.1);
    d.held = Math.max(0, d.held - 1);
    if (!d.held) { d.choked = false; d.grabbedBy = null; if (d.alive) d.downT = 1.4; }
    return;
  }
  if (held.type === 'support') { held.tool.support = null; return; }
  const t = held.tool;
  if (t.embed) { t.stuck = t.embed; t.embed = null; t.held = null; return; }   // let go and it stays in them
  if (t.support) { const sup = t.support; t.support = null; t.held = sup; sup.held = { type: 'tool', tool: t }; return; }
  for (const hs of holsters) {
    if (hs.tool || holsterPos(hs, tv).distanceTo(h.pos) > 0.26) continue;
    if (hs.name !== 'back' && t.def.len > 0.75) continue;
    hs.tool = t; t.holster = hs; t.held = null; pulse(h, 0.6, 50); sfx.holster(); return;
  }
  t.held = null; t.a.locked = t.b.locked = false;
  t.a.setVel(h.vel.x, h.vel.y, h.vel.z); t.b.setVel(h.vel.x * 1.3, h.vel.y * 1.3, h.vel.z * 1.3);
}
function releaseBody(d) {
  for (const h of allHands()) {
    if (h.held?.type === 'point' && h.held.d === d) { h.held.p.locked = false; h.held.p.hand = null; h.held = null; }
    if (h.held?.type === 'tool' && h.held.tool.embed?.d === d) h.held.tool.embed = null;
  }
  for (const t of tools) { if (t.stuck?.d === d) { t.stuck = null; t.a.locked = t.b.locked = false; } if (t.wallPin?.d === d) t.wallPin = null; }
  d.held = 0;
}

// ------------------------------------------------------------ the hand each frame
const TOOL_TILT = new THREE.Quaternion(), aimM = new THREE.Matrix4(), gq = new THREE.Quaternion(), gv = new V3(), gy = new V3();
function placeGlove(h) {
  const g = h.glove, held = h.held, s = h.side === 'left' ? 1 : -1;
  if (held?.type === 'tool' || held?.type === 'support') {
    const t = held.tool, [pos, rot] = GRIPS[t.kind];
    g.quaternion.copy(t.mesh.quaternion).multiply(gq.setFromAxisAngle(X_AXIS, rot));
    gv.set(-0.016 * s, 0.034, -0.045).applyQuaternion(g.quaternion);
    g.position.fromArray(pos).applyQuaternion(t.mesh.quaternion).add(t.mesh.position).add(gv);
    if (held.type === 'support') {
      gy.copy(NEG_Z).applyQuaternion(t.mesh.quaternion);
      const along = t.kind === 'pitchfork' ? Math.max(-0.3, Math.min(0.6, tv.subVectors(h.pos, t.held.pos).dot(gy))) : (t.supportAhead ? 0.12 : -0.12);
      g.position.addScaledVector(gy, along);
    }
  } else { g.position.copy(h.pos); g.quaternion.copy(h.quat); }
}
let teleported = false;
function updateHand(h, dt) {
  h.prevPos.copy(h.pos);
  if (h.ctrl) {
    h.active = !!h.src && h.ctrl.visible;
    h.ctrl.getWorldPosition(h.pos); h.ctrl.getWorldQuaternion(h.quat);
    h.glove.visible = h.active && started;
    h.ray.visible = menu.open && h.active;
    const aim = h.active && started && !menu.open && !h.held && !h.pulling ? farTool(h) : null;
    if (aim && aim !== h.aim) pulse(h, 0.12, 15);
    h.aim = aim;
    const gp = h.src?.gamepad;
    h.trigV = gp?.buttons[0]?.value ?? (h.trigger ? 1 : 0); h.gripV = gp?.buttons[1]?.value ?? 0;
  } else {
    h.active = true;
    camera.getWorldQuaternion(h.quat);
    h.aimFrom = headPos().clone();
    h.jab = Math.max(0, (h.jab ?? 0) - dt);
    const u = h.held?.tool?.embed ? 1 : h.jab > 0 ? Math.sin(Math.PI * (1 - h.jab / 0.24)) : 0;
    if (h.held?.type === 'point') tv.set(0.05, -0.15, -h.holdDist);
    else tv.set(0.24, -0.24, -0.42 - u * 0.6);
    const tool = h.held?.tool;
    if (tool && !tool.def.thrust) {   // swing down and across
      const k = h.jab > 0 ? 1 - h.jab / 0.24 : 0;
      tv.set(0.3 - k * 0.45, -0.05 - k * 0.45, -0.5 - u * 0.35);
      h.quat.multiply(tq.setFromAxisAngle(UP, h.jab > 0 ? 0.6 - k * 1.6 : 0.25)).multiply(tq2.setFromAxisAngle(X_AXIS, h.jab > 0 ? 0.9 - k * 2.4 : 0.6));
    }
    h.pos.copy(tv).applyQuaternion(camera.getWorldQuaternion(tq)).add(h.aimFrom);
    h.glove.visible = started && !inVR;
    h.trigV = h.trigger ? 1 : 0; h.gripV = h.jab > 0 ? 1 : 0;
  }
  const k = Math.min(1, dt * 18);
  if (h.held?.type === 'tool' || h.held?.type === 'support') h.glove.userData.pose(0.97, 0.97, k);
  else if (h.held) h.glove.userData.pose(0.75 + h.trigV * 0.25, 0.75 + h.trigV * 0.25, k);
  else h.glove.userData.pose(0.15 + h.trigV * 0.85, 0.15 + h.gripV * 0.85, k);
  tv.subVectors(h.pos, h.prevPos).divideScalar(Math.max(dt, 1e-4));
  if (teleported || tv.length() > 40) { tv.set(0, 0, 0); h.vel.set(0, 0, 0); h.hasTip = false; }
  h.vel.lerp(tv, 0.5);
  h.punchCd -= dt;
  tv2.set(1, 0, 0).applyQuaternion(h.quat); const roll = Math.atan2(tv2.y, Math.hypot(tv2.x, tv2.z));
  h.twist = h.twist * 0.7 + (roll - (h.rollPrev ?? roll)) / Math.max(dt, 1e-3) * 0.3; h.rollPrev = roll;

  const held = h.held;
  if (held?.type === 'tool') {
    const t = held.tool;
    tq.copy(h.quat);
    if (!t.support) tq.multiply(TOOL_TILT.setFromAxisAngle(X_AXIS, inVR ? t.def.tiltVR ?? 1.05 : t.def.tiltDesk ?? 0.45));
    if (t.support && h.pos.distanceTo(t.support.pos) > 0.08) {
      if (t.kind === 'pitchfork' || t.supportAhead) aimM.lookAt(h.pos, t.support.pos, tv.set(0, 1, 0).applyQuaternion(h.quat));
      else aimM.lookAt(h.pos, tv2.copy(h.pos).multiplyScalar(2).sub(t.support.pos), tv.set(0, 1, 0).applyQuaternion(h.quat));
      tq.setFromRotationMatrix(aimM);
    }
    tv.copy(NEG_Z).applyQuaternion(tq);
    const back = GRIPS[t.kind][0][2];
    tv2.copy(h.pos).addScaledVector(tv, back);
    t.a.moveTo(tv2.x, tv2.y, tv2.z); t.b.moveTo(tv2.x + tv.x * t.def.len, tv2.y + tv.y * t.def.len, tv2.z + tv.z * t.def.len);
    // as a blade bites in it hangs back for an instant: the weight of it going through
    if (h.drag > 0 && h.toolPos) { h.drag -= dt; t.mesh.position.copy(h.toolPos).lerp(tv2, 0.3); t.mesh.quaternion.copy(h.toolQ).slerp(tq, 0.3); }
    else { t.mesh.position.copy(tv2); t.mesh.quaternion.copy(tq); }
    (h.toolPos ??= new V3()).copy(t.mesh.position); (h.toolQ ??= new THREE.Quaternion()).copy(t.mesh.quaternion);
    t.mesh.updateMatrixWorld(true);
    if (paused) h.hasTip = false;
    else if (t.embed) { h.hasTip = false; updateEmbed(h, t); }
    else melee(h, t, dt);
  } else if (held?.type === 'point') held.p.moveTo(h.pos.x, h.pos.y, h.pos.z);
  placeGlove(h);
}

// ------------------------------------------------------------ cutting
const bladeA = new V3(), bladeDir = new V3(), tipVel = new V3();
// where a limb comes off: the joint nearer the blade
const CUT = { lUpper: ['lSh', 'lEl'], rUpper: ['rSh', 'rEl'], lFore: ['lEl', 'lWr'], rFore: ['rEl', 'rWr'], lHand: ['lWr', 'lWr'], rHand: ['rWr', 'rWr'],
  lThigh: ['lHip', 'lKn'], rThigh: ['rHip', 'rKn'], lShin: ['lKn', 'lAn'], rShin: ['rKn', 'rAn'], lFoot: ['lAn', 'lAn'], rFoot: ['rAn', 'rAn'] };
const LIMB_TOUGH = { upper: 9, fore: 6, hand: 3, thigh: 16, shin: 10, foot: 4 };
const kindOf = n => { const b = n.split('#')[0]; return b === 'chunk' ? 'chunk' : b.startsWith('l') || b.startsWith('r') ? b.slice(1).toLowerCase() : b; };
function melee(h, t, dt) {
  const def = t.def;
  bladeA.set(t.a.x + (t.b.x - t.a.x) * def.blade, t.a.y + (t.b.y - t.a.y) * def.blade, t.a.z + (t.b.z - t.a.z) * def.blade);
  h.tip.set(t.b.x, t.b.y, t.b.z);
  if (!h.hasTip) { h.prevTip.copy(h.tip); h.hasTip = true; return; }
  tipVel.subVectors(h.tip, h.prevTip).divideScalar(Math.max(dt, 1e-4));
  const speed = tipVel.length();
  bladeDir.set(t.b.x - t.a.x, t.b.y - t.a.y, t.b.z - t.a.z).normalize();
  const thrust = tipVel.dot(bladeDir);
  if (speed > 2.2 && speed < 80) hitProps(h, t);
  if (speed > 1.3 && speed < 80) {
    for (const d of victims()) {
      if ((d.cutCd ?? 0) > performance.now()) continue;
      const hit = d.partAt(bladeA, h.tip, 0.03) ?? d.partAt(h.prevTip, h.tip, 0.02);
      if (!hit) continue;
      const stab = (def.thrust || t.kind === 'machete') && thrust > 1.4 && thrust > speed * 0.7;
      if (!stab && speed < 2.6) continue;
      d.cutCd = performance.now() + 250;
      const part = hit.part, dirN = tv.copy(tipVel).normalize(), at = tv2.copy(h.tip);
      bloody(0.08); pulse(h, 1, 70); maskBlood(at, def.heavy ? 1.2 : 0.7); h.drag = def.heavy ? 0.11 : 0.08;
      if (d.mode === 'anim' && d.alive && (stab || def.heavy || def.blunt || d.hp < 40)) d.ragdoll(1.5);
      if (stab) {
        const sneak = d.unaware;
        d.hit(part, at, bladeDir, 'stab', def.impale ? 55 : 40 * (sneak ? 3 : 1));
        if (sneak && (part === 'torso' || part === 'neck' || part === 'head') && d.alive) d.die();
        d.cause = def.impale ? 'impale' : 'stab';
        sfx.stab(at); sfx.squelch(at, 0.7); hitStop(0.05);
        embed(t, d, part, at);
        return;
      }
      if (def.blunt) {
        const head = kindOf(part) === 'head' || kindOf(part) === 'neck', force = speed * (def.heavy ? 1.6 : 1);
        d.hit(part, at, dirN, 'blunt', (head ? 32 : 15) * force / 3);
        for (const k of ['chest', 'neck', 'head', 'spine']) d.p[k].addVel(dirN.x * force * 0.5, dirN.y * force * 0.5 + 0.4, dirN.z * force * 0.5);
        if (head) {
          d.bruise = Math.min(3, (d.bruise ?? 0) + (def.heavy ? 1.5 : 0.7));
          if ((def.heavy && speed > 3.5) || (d.bruise >= 3 && speed > 3.2)) { d.cause = 'smash'; d.crushHead(); sfx.crunch(at); sfx.squelch(at); bloody(0.3); hitStop(0.1); continue; }
          sfx.crack(at);
        } else if (LIMB_TOUGH[kindOf(part)]) { sfx.crack(at); }   // that bone's gone
        d.ragdoll(def.heavy ? 3 : 2); d.cause ??= 'bludgeon';
        sfx.thud(at); sfx.punch(at); pulse(h, 1, def.heavy ? 120 : 80); hitStop(def.heavy ? 0.07 : 0.045);
        continue;
      }
      // The cut runs along the plane the blade swept through: its length and the way it was moving.
      const cutN = tv3.crossVectors(bladeDir, dirN); if (cutN.lengthSq() < 1e-4) cutN.set(-dirN.z, 0, dirN.x); cutN.normalize();
      const kind = kindOf(part), sharp = !def.noCut, slice = n => { const r = d.slicePart(n, at.clone(), cutN.clone()); if (r) { sfx.chop(def.heavy, at); sfx.tear(at); sfx.squelch(at); pulse(h, 1, 160); hitStop(0.12); bloody(0.3); maskBlood(at, 2); h.drag = 0.14; } return r; };
      // already-cut pieces and spilled organs: they just come apart further
      if (kind === 'chunk' && sharp && speed > 3) { if (slice(part)) continue; }
      // the head: an axe down through it, or any heavy blade hard across it
      if (kind === 'head' && sharp && ((def.halves && speed > 3.6) || (def.len >= 0.36 && speed > 4.6)) && hit.t >= 0.3) { if (slice(part)) continue; }
      // the neck: off, along the line of the swing
      if ((kind === 'neck' || (kind === 'head' && hit.t < 0.3)) && speed > 3.2 && sharp && (def.len >= 0.4 || speed > 5)) { d.cause = 'decapitated'; if (slice(d.parts.neck ? 'neck' : part)) { sfx.gush(at); continue; } }
      // straight through the trunk: an axe swung hard, or a machete swung very hard
      if ((kind === 'torso' || kind === 'hips') && sharp && ((def.halves && speed > 4.2) || (def.len >= 0.6 && speed > 6.5))) { if (slice(part)) { sfx.slop(at); continue; } }
      if ((kind === 'hips' || (kind === 'torso' && hit.t < 0.5)) && speed > 3.2 && !d.gutted && sharp) { d.hit(part, at, dirN, 'slash', 30); d.disembowel(); sfx.chop(false, at); sfx.slop(at); hitStop(0.06); bloody(0.2); continue; }
      // limbs: once a limb has taken enough, the next cut goes through it, wherever it lands
      if (LIMB_TOUGH[kind]) {
        d.limbDmg ??= {}; d.limbDmg[part] = (d.limbDmg[part] ?? 0) + def.dmg * (speed / 3.5) * (def.heavy ? 1.6 : 1);
        d.hit(part, at, dirN, 'slash', 14);
        if (d.limbDmg[part] >= LIMB_TOUGH[kind] && sharp) { if (slice(part)) continue; }
        sfx.chop(def.heavy, at); hitStop(0.035);
        continue;
      }
      d.hit(part, at, dirN, part === 'head' && def.heavy ? 'blunt' : 'slash', part === 'head' ? 45 : 28 * (def.heavy ? 1.5 : 1));
      if (part === 'head' && def.heavy && speed > 4.5) { d.crushHead(); sfx.crunch(at); }
      d.cause ??= 'hack';
      sfx.chop(def.heavy, at); sfx.squelch(at, 0.4); hitStop(def.heavy ? 0.06 : 0.035);
    }
  }
  h.prevTip.copy(h.tip);
}
let stopT = 0;
function hitStop(s) { stopT = Math.max(stopT, s); }
// Blood on the mask: when it happens close to your face, some of it lands on the
// mask and sits at the edges of your view, running down and drying dark.
const maskTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = 'rgba(90,4,2,0.95)'; g.beginPath(); for (let i = 0; i <= 18; i++) { const a = i / 18 * 6.28, r = 12 + Math.random() * 8; g.lineTo(32 + Math.cos(a) * r, 30 + Math.sin(a) * r); } g.fill();
  for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(32 + (Math.random() - 0.5) * 50, 30 + (Math.random() - 0.5) * 44, 1 + Math.random() * 3, 0, 7); g.fill(); }
  g.fillRect(29, 34, 4, 28); g.fillRect(36, 36, 2, 18);   // runs
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const maskSplats = [];
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: maskTex, transparent: true, depthTest: false, depthWrite: false, fog: false, opacity: 0 }));
  m.renderOrder = 1003; m.visible = false; camera.add(m); maskSplats.push({ m, t: 0 });
}
let maskN = 0;
function maskBlood(at, amount = 1) {
  const head = headPos(), d = head.distanceTo(tv2.set(at.x, at.y, at.z));
  if (d > 1.3) return;
  const n = Math.round((1.3 - d) * 5 * amount);
  for (let i = 0; i < n; i++) {
    const sp = maskSplats[maskN]; maskN = (maskN + 1) % maskSplats.length;
    // round the edges of the eyeholes, never right in the middle
    const a = Math.random() * 6.28, r = 0.075 + Math.random() * 0.05;
    sp.m.position.set(Math.cos(a) * r * 1.3, Math.sin(a) * r, -0.22); sp.m.rotation.z = Math.random() * 6.28;
    sp.m.scale.setScalar(0.015 + Math.random() * 0.03); sp.t = 9 + Math.random() * 5; sp.life = sp.t; sp.m.visible = true;
  }
}
function updateMaskBlood(dt) {
  for (const sp of maskSplats) {
    if (sp.t <= 0) continue;
    sp.t -= dt; sp.m.position.y -= dt * 0.0012;   // it runs
    sp.m.material.opacity = Math.min(0.85, sp.t / sp.life * 1.6) * 0.85;
    sp.m.material.color.setRGB(1, 1, 1).lerp(new THREE.Color(0x553333), 1 - sp.t / sp.life);   // and darkens as it dries
    if (sp.t <= 0) sp.m.visible = false;
  }
}
// a blade in someone keeps hold of the nearest point of them
function embed(t, d, part, at) {
  const pt = d.parts[part], [A, B] = d.ends(pt);
  const near = B !== A && B.dist(at) < A.dist(at) ? B : A;
  t.embed = { d, p: near, off: new V3(near.x - t.b.x, near.y - t.b.y, near.z - t.b.z) };
  blood.spurt(t.b, out => out.set(t.a.x - t.b.x, t.a.y - t.b.y, t.a.z - t.b.z).normalize(), 3, 0.6);
}
function updateEmbed(h, t) {
  const e = t.embed;
  if (e.d.gone || e.p.dead) { t.embed = null; return; }
  const wx = t.b.x + e.off.x, wy = t.b.y + e.off.y, wz = t.b.z + e.off.z;
  const pull = Math.hypot(wx - e.p.x, wy - e.p.y, wz - e.p.z);
  if (pull > (t.def.impale ? 0.5 : 0.22)) { yank(h, t); return; }
  const k = t.def.impale ? 0.55 : 0.3;
  if (!e.p.locked) e.p.moveTo(e.p.x + (wx - e.p.x) * k, e.p.y + (wy - e.p.y) * k, e.p.z + (wz - e.p.z) * k, true);
  // a long blade driven on through them into a wall, a tree, a post: it sticks, and so do they
  if (t.def.len >= 0.6 && t.def.thrust) for (const b of sim.near(t.b.x, t.b.z)) {
    if (b.max.y < 0.6) continue;
    const m = 0.04;
    if (t.b.x > b.min.x - m && t.b.x < b.max.x + m && t.b.z > b.min.z - m && t.b.z < b.max.z + m && t.b.y > b.min.y && t.b.y < b.max.y) { pinToWall(h, t); return; }
  }
  // twisting it in
  if (Math.abs(h.twist) > 6 && (e.grindT = (e.grindT ?? 0) - 1 / 72) <= 0) { e.grindT = 0.25; sfx.grind(e.p); blood.spray(t.b, UP, 6, 1.5, 0.8); e.d.hp -= 12; e.d.bleed += 2; if (e.d.alive) say(e.d, 'shriek'); if (e.d.hp <= 0) e.d.die(); }
  if (t.def.impale && e.d.alive && Math.random() < 0.015) { e.d.hp -= 5; if (e.d.hp <= 0) e.d.die(); }
}
function pinToWall(h, t) {
  const e = t.embed, d = e.d;
  // drive it in a little further and leave it there
  tv.set(t.b.x - t.a.x, t.b.y - t.a.y, t.b.z - t.a.z).normalize();
  for (const p of [t.a, t.b]) { p.moveTo(p.x + tv.x * 0.06, p.y + tv.y * 0.06, p.z + tv.z * 0.06); p.locked = true; }
  t.mesh.position.set(t.a.x, t.a.y, t.a.z); t.mesh.quaternion.setFromUnitVectors(NEG_Z, tv);
  e.p.moveTo(e.p.x + tv.x * 0.06, e.p.y + tv.y * 0.06, e.p.z + tv.z * 0.06); e.p.locked = true; e.p.hand = 'wall';
  t.wallPin = { p: e.p, d }; t.embed = null; t.held = null; t.planted = true; h.held = null; h.hasTip = false;
  d.held++; d.wallPinned = true; d.ragdoll(99); d.cause = 'pinned';
  sfx.stab(t.b); sfx.thud(t.b); sfx.squelch(t.b, 1); pulse(h, 1, 220); hitStop(0.12); bloody(0.2);
  blood.spray(t.b, tv.negate(), 25, 2.5, 0.6); d.bleed += 4;
  if (d.alive) say(d, 'scream');
}
function yank(h, t) {
  const e = t.embed; if (!e) return;
  t.embed = null;
  blood.spray(t.b, tv.set(t.a.x - t.b.x, t.a.y - t.b.y, t.a.z - t.b.z).normalize(), 20, 2.5, 0.6);
  e.d.bleed += 4; sfx.slurp(t.b); sfx.squelch(t.b, 0.6); bloody(0.1); pulse(h, 0.8, 60);
}
function updateStuck(t) {
  const st = t.stuck;
  if (st.d.gone || st.p.dead) { t.stuck = null; t.a.locked = t.b.locked = false; return; }
  tv.set(t.b.x - t.a.x, t.b.y - t.a.y, t.b.z - t.a.z).normalize();
  const bx = st.p.x - st.off.x, by = st.p.y - st.off.y, bz = st.p.z - st.off.z;
  t.b.moveTo(bx, by, bz); t.a.moveTo(bx - tv.x * t.def.len, by - tv.y * t.def.len, bz - tv.z * t.def.len);
  t.a.locked = t.b.locked = true;
  t.mesh.position.set(t.a.x, t.a.y, t.a.z); t.mesh.quaternion.setFromUnitVectors(NEG_Z, tv);
}

// ------------------------------------------------------------ bare hands
function pushHands() {
  for (const h of hands()) {
    if (!h.active || h.held) continue;
    const speed = h.vel.length();
    if (speed > 2.4 && h.punchCd <= 0) hitPropsHand(h);
    for (const d of victims()) {
      const c = d.p.chest; if ((c.x - h.pos.x) ** 2 + (c.y - h.pos.y) ** 2 + (c.z - h.pos.z) ** 2 > 1.6) continue;
      for (const k in d.p) {
        const p = d.p[k]; if (p.hand || p.dead) continue;
        const dx = p.x - h.pos.x, dy = p.y - h.pos.y, dz = p.z - h.pos.z, rr = p.r + 0.075, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= rr * rr || d2 < 1e-10) continue;
        if (d.mode === 'anim') { if (speed < 1.5) continue; d.ragdoll(1.5); }
        const dd = Math.sqrt(d2), nx = dx / dd, ny = dy / dd, nz = dz / dd, pen = rr - dd;
        p.x += nx * pen; p.y += ny * pen; p.z += nz * pen;
        const vn = h.vel.x * nx + h.vel.y * ny + h.vel.z * nz;
        if (vn > 0) p.addVel(nx * vn * 1.1, ny * vn * 1.1, nz * vn * 1.1);
        // a fist driven into the chest comes back out with the heart in it
        if (speed > 3.4 && (k === 'chest' || k === 'spine' || k === 'neck') && !d.heartOut && !d.split && (d.hp < 75 || speed > 5)) {
          const heart = d.ripHeart();
          if (heart) { maskBlood(heart, 2); heart.locked = true; heart.hand = h; h.held = { type: 'point', p: heart, d }; d.held++; sfx.tear(heart); sfx.squelch(heart, 1); sfx.crack(heart); pulse(h, 1, 200); bloody(0.5); h.punchCd = 0.6; hitStop(0.12); break; }
        }
        if (speed > 2.4 && h.punchCd <= 0) {
          h.punchCd = 0.25;
          const head = k === 'head';
          d.hp -= speed * (head ? 6 : 3); d.bruise = Math.min(3, (d.bruise ?? 0) + (head ? 0.34 : 0));
          if (speed > 3.2) { d.wound(head ? 'head' : 'torso', p, h.vel.clone().normalize(), 'blunt'); blood.spray(p, tv.copy(h.vel).normalize(), head ? 8 : 3, 2, 0.7); bloody(0.05); }
          d.ragdoll(speed > 4 ? 2.5 : 1.2);
          d.cause = 'beaten';
          if (d.hp <= 0) d.die(); else alertOf(d, 1);
          sfx.punch(p); pulse(h, 1, 70);
        }
      }
    }
  }
}
// what you can do to someone you've got hold of
const JOINT = { lWr: 'lSh', lEl: 'lSh', lFin: 'lWr', rWr: 'rSh', rEl: 'rSh', rFin: 'rWr', lAn: 'lHip', lKn: 'lHip', lToe: 'lAn', rAn: 'rHip', rKn: 'rHip', rToe: 'rAn' };
const FALLBACK = { lSh: 'lEl', rSh: 'rEl', lHip: 'lKn', rHip: 'rKn' };
function updateGrips(dt) {
  for (const d of victims()) {
    const held = allHands().filter(h => h.held?.type === 'point' && h.held.d === d);
    if (!held.length) { d.drownT = 0; continue; }
    d.grabbedBy = held[0].pos;
    for (const h of held) {
      const p = h.held.p;
      // squeeze a head: the skull caves in
      if (p.tag === 'head' && !d.headGone && h.trigV > 0.85) {
        h.crush = (h.crush ?? 0) + dt;
        if (Math.random() < dt * 8) pulse(h, 0.3 + h.crush * 0.5, 40);
        if (h.crush > 0.5 && Math.random() < dt * 3) { sfx.crack(p); blood.spray(p, UP, 3, 1.5, 1); d.bruise = 3; if (d.alive) say(d, 'shriek'); }
        if (h.crush > 1.4) { maskBlood(p, 2.5); d.cause = 'crush'; for (const o of held) if (o.held) { o.held.p.locked = false; o.held.p.hand = null; o.held = null; } d.held = 0; d.crushHead(); sfx.crunch(p); sfx.squelch(p, 1); bloody(0.5); pulse(h, 1, 200); hitStop(0.1); h.crush = 0; break; }
      } else h.crush = 0;
      // throat in a fist: the breath goes, then they go
      if (p.tag === 'neck' && d.alive) {
        d.chokeT += dt * (h.trigV > 0.85 ? 1.6 : 0.7);
        if (Math.random() < dt * 0.8) say(d, 'choke');
        if (d.chokeT > 4.5 && d.state !== 'out') { d.state = 'out'; d.outT = 12; }
        if (d.chokeT > 8 || (h.trigV > 0.85 && d.chokeT > 5.5)) { d.cause = 'strangle'; d.die(); sfx.crack(p); }
      }
    }
    if (held.length === 2 && held[0].held && held[1].held) {
      const [h1, h2] = held, p1 = h1.held.p, p2 = h2.held.p;
      const headish = n => n === 'head' || n === 'neck';
      // both hands on the head, wrenched round
      if (headish(p1.tag) && headish(p2.tag) && d.alive && Math.abs(h1.twist - h2.twist) > 9) { d.cause = 'snap'; d.die(); sfx.crack(p1); sfx.crunch(p1); pulse(h1, 1, 120); pulse(h2, 1, 120); }
      // pulled apart
      d.restLen ??= new Map();
      const key = p1.tag + p2.tag; if (!d.restLen.has(key)) d.restLen.set(key, Math.min(1.2, p1.dist(p2)));
      const pulling = h1.vel.dot(tv.set(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z).normalize()) - h2.vel.dot(tv) > 1.2;
      if (p1.dist(p2) > d.restLen.get(key) + 0.35 && pulling) {
        const pickJ = (a, b) => headish(a.tag) && !headish(b.tag) ? 'neck' : JOINT[a.tag] ?? null;
        let j = pickJ(p1, p2) ?? pickJ(p2, p1);
        if (j && d.severed.has(j) && FALLBACK[j]) j = FALLBACK[j];
        if (j && !d.severed.has(j)) {
          d.cause = j === 'neck' ? 'ripHead' : 'torn';
          if (d.sever(j, 0.5)) { sfx.tear(p1); sfx.gush(p1); pulse(h1, 1, 200); pulse(h2, 1, 200); bloody(0.4); hitStop(0.1); if (j !== 'neck') { d.hp -= 45; if (d.hp <= 0) d.die(); } }
        }
      }
    }
    // held under the water
    const head = d.p.head;
    if (d.alive && !d.headGone && head.y < WATER_Y - 0.05 && inLake(head.x, head.z)) {
      d.drownT = (d.drownT ?? 0) + dt;
      if (Math.random() < dt * 6) bubbles(head);
      if (Math.random() < dt * 1.2) say(d, 'choke');
      for (const h of held) if (Math.random() < dt * 5) pulse(h, 0.4, 50);
      if (d.drownT > 4.5) { d.cause = 'drown'; d.die(); bubbles(head, 14); }
    }
  }
}
const bubbleGeo = new THREE.SphereGeometry(1, 6, 4), bubbleMat = new THREE.MeshLambertMaterial({ color: 0x8aa0b0, transparent: true, opacity: 0.6 });
const bubbleList = [];
function bubbles(at, n = 3) {
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(bubbleGeo, bubbleMat); m.scale.setScalar(rand(0.008, 0.025)); m.position.set(at.x + rand(-0.08, 0.08), at.y, at.z + rand(-0.08, 0.08)); scene.add(m); bubbleList.push({ m, v: rand(0.4, 0.9) }); }
  if (Math.random() < 0.3) sfx.bubble(at);
}

// ------------------------------------------------------------ things to wreck
const jpos = () => tv3.set(JUNCTION.x, JUNCTION.y, JUNCTION.z);
function hitProps(h, t) {
  if ((h.propCd = (h.propCd ?? 0) - 1 / 72) > 0) return;
  const tip = h.tip;
  if (!PHONE.cut && segDist(bladeA, tip, jpos(), tv3) < 0.28 * 0.28) { h.propCd = 0.35; noise(tip, 14); JUNCTION.hp--; sparks(tip); sfx.clank(tip); sfx.zap(tip); pulse(h, 1, 100); if (JUNCTION.hp <= 0) cutPhone(); }
  if (GENERATOR.on && segDist(bladeA, tip, tv3.set(GENERATOR.x, 0.6, GENERATOR.z), tv3) < 0.65 * 0.65) { h.propCd = 0.35; noise(tip, 16); GENERATOR.hp--; sparks(tip); sfx.clank(tip); pulse(h, 1, 100); if (GENERATOR.hp <= 0) killPower(); }
}
function hitPropsHand(h) {
  if (!PHONE.cut && h.pos.distanceTo(jpos()) < 0.3) { h.punchCd = 0.4; noise(h.pos, 14); JUNCTION.hp--; sfx.clank(h.pos); sparks(h.pos); pulse(h, 1, 90); if (JUNCTION.hp <= 0) cutPhone(); }
  if (GENERATOR.on && h.pos.distanceTo(tv3.set(GENERATOR.x, 0.6, GENERATOR.z)) < 0.7) { h.punchCd = 0.4; noise(h.pos, 16); GENERATOR.hp--; sfx.clank(h.pos); pulse(h, 1, 90); if (GENERATOR.hp <= 0) killPower(); }
}
function sparks(at) { for (let i = 0; i < 8; i++) blood.flame(at.x, at.y, at.z, 0.02, 0.15, false, rand(-1, 2)); }
function carFront(out) { return out.set(CAR.x + Math.sin(CAR.yaw) * 1.9, 0.75, CAR.z + Math.cos(CAR.yaw) * 1.9); }
let carSmoke = 0;
function cutPhone() {
  PHONE.cut = true; JUNCTION.wire.visible = false; JUNCTION.mesh.rotation.z = 0.4; JUNCTION.mesh.position.y -= 0.05; JUNCTION.led.material.color.setHex(0x200000);
  caption('The phone line is dead.', 3.5); sfx.zap(jpos());
  for (const d of counselors) if (d.ai?.state === 'calling') { say(d, 'help'); chooseFlight(d); }
}
function killPower() {
  GENERATOR.on = false; camp.setPower(false); sfx.powerDown(tv3.set(GENERATOR.x, 0.6, GENERATOR.z));
  caption('The lights go out across the camp.', 3.5);
  for (const d of counselors) if (d.alive && d.ai && d.ai.state === 'idle') setState(d, 'investigate', { x: GENERATOR.x + rand(-2, 2), z: GENERATOR.z - 2 });
}

// ------------------------------------------------------------ counselors
const NAMES_F = ['ALICE', 'ANNIE', 'MARCIE', 'BRENDA', 'TERRY', 'SANDRA', 'VICKY', 'GINNY', 'DEBBIE', 'SHELLY', 'TINA', 'LAURIE', 'CHRIS', 'NANCY', 'TRISH'];
const NAMES_M = ['STEVE', 'JACK', 'NED', 'BILL', 'PAUL', 'JEFF', 'MARK', 'ANDY', 'KENNY', 'SCOTT', 'TED', 'RICK', 'DOUG', 'TOMMY', 'GARY'];
const SKINS = [0xe6c2a0, 0xdcb08a, 0xc89870, 0xf0d0b4, 0x8a5a3a, 0xb0805a, 0x6a4026, 0xe2b896];
const HAIRS = [0x1c140c, 0x3a2414, 0x5a3a1c, 0x9a7040, 0xc8a060, 0x2a1a10, 0x6a2a14, 0x101010];
const SHIRTS = [[0xa02a22, ['CAMP', 'CRYSTAL LAKE']], [0xc0a050, ['CAMP', 'CRYSTAL LAKE']], [0x2a4a7a, null], [0xd0ccc0, ['CRYSTAL', 'LAKE STAFF']], [0x3a5a3a, null], [0x6a2a5a, null], [0x8a8478, null], [0x1c1c22, ['STAFF', '1980']]];
const PANTS = [0x2a3a5a, 0x3a3a48, 0x6a5a40, 0x2a2a2a, 0x4a5a6a, 0x34405a];
let nameBag = [];
function spawnCounselor(spot) {
  let female = Math.random() < 0.5, name, castHair = null, castShort = false;
  const castLeft = SET.cast && AREA.cast ? AREA.cast.filter(c => !counselors.some(o => o.name === c[0] && !o.gone)) : [];
  if (castLeft.length) {
    const c = pick(castLeft); name = c[0]; female = !!c[1];
    castHair = { brown: 0x3a2414, blonde: 0xc8a060, dark: 0x1c140c, grey: 0x8a8478, curly: 0x5a3a1c }[c[2]] ?? null; castShort = c[3] === 'short';
  } else {
    if (!nameBag.length) nameBag = [...NAMES_F.map(n => [n, true]), ...NAMES_M.map(n => [n, false])].sort(() => Math.random() - 0.5);
    let i = nameBag.findIndex(([, f]) => f === female); if (i < 0) i = 0;
    [name] = nameBag.splice(i, 1)[0];
  }
  const skin = pick(SKINS), hair = castHair ?? pick(HAIRS), [shirt, print] = pick(SHIRTS);
  const look = { skin, hair, eyes: pick([0x4a2a14, 0x2a4a6a, 0x4a6a3a, 0x6a5030, 0x3a2a1a]), long: female && !castShort && Math.random() < 0.85, beard: !female ? pick([0, 0, 1, 2]) : 0, freckles: Math.random() < 0.25, lipstick: female && Math.random() < 0.4, seed: Math.floor(Math.random() * 1e6) };
  const d = new Human(scene, sim, blood, { x: spot.x + rand(-0.4, 0.4), z: spot.z + rand(-0.4, 0.4), yaw: spot.face ?? rand(0, 6.28), scale: female ? rand(0.93, 0.98) : rand(0.99, 1.05),
    female, skin, hair, look, shirt, print, pants: pick(PANTS), shorts: Math.random() < 0.45, shoes: pick([0xd8d4cc, 0xb8b0a0, 0x3a3a3a, 0x8a2a1a]), build: Math.random() < 0.45 ? 0 : 1 });
  d.name = name;
  d.ai = { state: 'idle', aware: 0, seen: false, seeT: Math.random() * 0.2, spot, wanderT: rand(15, 50), route: null, routeT: 0, stamina: rand(10, 16), winded: 0, screamT: 0, plan: null, callT: 0, hideT: 0, tripCd: 3, sawBody: new Set() };
  d.face = spot.face ?? d.yaw;
  d.flash = buildFlashlight(); scene.add(d.flash); scene.add(d.flash.userData.pool);
  d.onDeath = () => onKilled(d);
  d.onSever = () => { if (d.alive) say(d, 'dismember'); };
  d.onIgnite = () => { say(d, 'burning'); d.cause = 'burn'; };
  counselors.push(d);
  return d;
}
function say(d, ev) {
  if (d.gone) return;
  const now = performance.now() / 1000, talking = d.line && d.line.end > sfx.now();
  const big = ev === 'scream' || ev === 'dismember' || ev === 'die' || ev === 'burning';
  if (!big && (talking || now - (d.saidAt ?? -9) < 1.4)) return;
  if (talking) d.line.stop();
  d.saidAt = now;
  d.line = sfx.voice(ev, d.p.head, d.female, d.police ? 1.1 : 1);
  d.lineBig = big || ev === 'shriek' || ev === 'help'; d.clock = sfx.now;
}
function updateFlashlight(d) {
  const f = d.flash; if (!f) return;
  const hand = d.p.rFin;
  if (d.alive && d.ai?.state === 'asleep') { f.visible = false; f.userData.pool.visible = false; return; }   // switched off by the bed
  if (d.alive) f.visible = true;
  if (d.alive && !d.loose?.has('rFin')) {
    f.position.set(hand.x, hand.y, hand.z);
    const sweep = d.ai?.state === 'flee' ? Math.sin(d.time * 7) * 0.5 : Math.sin(d.time * 0.7) * 0.25;
    const yaw = d.yaw + (d.headTurn ?? 0) * 0.8 + sweep, pitch = d.ai?.state === 'investigate' ? -0.12 : -0.22;
    tv.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    f.quaternion.setFromUnitVectors(NEG_Z, tv); f.userData.dir = tv.clone();
  } else if (!f.userData.dropped) {
    // dropped where they fell; it goes out
    f.userData.dropped = true;
    f.position.set(hand.x, groundAt(hand.x, hand.z) + 0.03, hand.z);
    const yaw = Math.random() * 6.28; tv.set(Math.sin(yaw), -0.02, Math.cos(yaw));
    f.quaternion.setFromUnitVectors(NEG_Z, tv); f.userData.dir = tv.clone();
    f.userData.beam.visible = false; f.userData.pool.visible = false; f.userData.lens.material = WM.black;
  }
  if (f.userData.dropped) return;
  const dir = f.userData.dir, pool = f.userData.pool;
  // the beam stops at whatever it hits first: a wall, a tree, the ground
  const { dist, ground } = beamHit(f.position, dir);
  f.userData.beam.scale.setScalar(Math.max(0.05, dist / 14));
  if (ground) { pool.position.copy(f.position).addScaledVector(dir, dist); pool.position.y = groundAt(pool.position.x, pool.position.z) + 0.02; pool.scale.setScalar(0.4 + dist * 0.17); pool.visible = true; }
  else pool.visible = false;
}
function beamHit(o, dir) {
  for (let t = 0.2; t < 14; t += 0.2) {
    const x = o.x + dir.x * t, y = o.y + dir.y * t, z = o.z + dir.z * t;
    if (y <= groundAt(x, z)) return { dist: t, ground: true };
    for (const b of sim.near(x, z)) if (b.max.y > 0.5 && x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && y > b.min.y && y < b.max.y) return { dist: t, ground: false };
  }
  return { dist: 14, ground: false };
}
// ---- the brain
function setState(d, st, at = null) {
  const a = d.ai; if (!a || !d.alive) return;
  if (a.bed && st !== 'asleep' && st !== 'toBed') { if (a.state === 'asleep') { d.root.x = a.bed.side.x; d.root.z = a.bed.side.z; d.blend = 0; say(d, 'gasp'); } a.bed.taken = null; a.bed = null; if (d.flash) d.flash.visible = true; }
  a.state = st; a.route = null; a.routeT = 0; d.goal = null; a.target = at;
  d.wantSpeed = st === 'idle' ? 0 : st === 'wander' ? 1.1 : st === 'investigate' ? 1.3 : 3.6;
  d.scared = !['idle', 'wander', 'investigate'].includes(st);
  if (d.scared) d.unaware = false;
  d.pose = st === 'hide' ? 'hide' : st === 'calling' ? 'phone' : st === 'asleep' ? 'sleep' : 'idle';
}
function alertOf(d, amount) {
  const a = d.ai; if (!a || !d.alive) return;
  a.aware = Math.min(1, a.aware + amount);
  if (a.aware >= 1 && !a.seen) {
    a.seen = true; d.unaware = false; RUN.lastAlarm = RUN.t;
    if (a.screamT <= 0) { say(d, 'scream'); a.screamT = 6; screamHeard(d); score.stinger(); }
    chooseFlight(d);
  }
}
function screamHeard(from) {
  const at = posOf(from);
  for (const d of counselors) {
    if (d === from || !d.alive || !d.ai || d.ai.seen) continue;
    const me = posOf(d), dist = Math.hypot(me.x - at.x, me.z - at.z);
    if (dist > 32) continue;
    d.ai.aware = Math.max(d.ai.aware, 0.55);
    if (dist < 12 || Math.random() < 0.3) chooseFlight(d);
    else setState(d, 'investigate', { x: at.x + rand(-2, 2), z: at.z + rand(-2, 2) });
  }
}
function chooseFlight(d) {
  const a = d.ai, me = posOf(d), J = headPos();
  const away = (x, z) => Math.hypot(x - J.x, z - J.z) - Math.hypot(x - me.x, z - me.z) * 0.6;
  const opts = [];
  if (!PHONE.cut && RUN.calledAt < 0 && !counselors.some(o => o !== d && o.ai?.state === 'toPhone')) opts.push({ st: 'toPhone', x: PHONE.stand.x, z: PHONE.stand.z, w: 1.3 });
  for (const hd of HIDES) opts.push({ st: 'hide', x: hd.x, z: hd.z, hide: hd, w: 0.55 });
  let best = null, bs = -1e9;
  for (const o of opts) {
    const sc = away(o.x, o.z) * o.w + rand(0, 6) - (o.hide && counselors.some(c => c !== d && c.ai?.hideAt === o.hide) ? 8 : 0);
    if (sc > bs) { bs = sc; best = o; }
  }
  if (!best || bs < -6) { const ang = Math.atan2(me.x - J.x, me.z - J.z) + rand(-0.6, 0.6); best = { st: 'flee', x: Math.max(-FENCE + 3, Math.min(FENCE - 3, me.x + Math.sin(ang) * 20)), z: Math.max(shoreZ(me.x) + 3, Math.min(FENCE - 3, me.z + Math.cos(ang) * 20)) }; }
  a.hideAt = best.hide ?? null;
  setState(d, best.st === 'hide' ? 'flee' : best.st, { x: best.x, z: best.z });
  a.plan = best.st;
}
function goTo(d, x, z, dt) {
  const a = d.ai ?? d.cop, me = d.root;
  a.routeT -= dt;
  if (!a.route || a.routeT <= 0 || Math.hypot(a.routeTo.x - x, a.routeTo.z - z) > 1) { a.route = findPath(me.x, me.z, x, z) ?? [{ x, z }]; a.routeTo = { x, z }; a.routeT = d.scared ? 1.6 : 4; }
  while (a.route.length && Math.hypot(a.route[0].x - me.x, a.route[0].z - me.z) < 0.6) a.route.shift();
  if (!a.route.length) { d.goal = null; return Math.hypot(x - me.x, z - me.z) < 1.0; }
  d.goal = a.route[0];
  return false;
}
const crouched = () => headPos().y - P.y < 1.3;
// In the dark they only see what their flashlight is on: you have to be in the
// beam (or close enough to touch).
function canSee(d, J) {
  const eye = d.p.head, dx = J.x - eye.x, dz = J.z - eye.z, dist = Math.hypot(dx, dz);
  const f = d.flash;
  let range = 0;
  if (f && !f.userData.dropped && f.userData.dir) {
    // anywhere on you inside the cone: head, chest or legs
    for (const y of [J.y, J.y - 0.6, J.y - 1.2]) {
      tv.set(J.x - f.position.x, y - f.position.y, J.z - f.position.z);
      const len = tv.length(); if (len > 20) continue;
      if (tv.dot(f.userData.dir) / len > 0.955) { range = 20; break; }
    }
  }
  if (!range && dist < 1.6) {   // right in front of them
    const cos = (Math.sin(d.yaw) * dx + Math.cos(d.yaw) * dz) / (dist || 1);
    if (cos > 0.2) range = 1.6;
  }
  if (!range || dist > range) return 0;
  if (!sightClear(eye.x, eye.z, J.x, J.z)) return 0;
  return 1 - dist / (range + 2);
}
function updateCounselors(dt) {
  const J = headPos(), jSpeed = P.moveSpeed;
  for (const d of counselors) {
    const a = d.ai;
    updateFlashlight(d);
    if (!d.alive || !a) continue;
    a.screamT -= dt;
    if (d.held) { d.scared = true; d.unaware = false; if (Math.random() < dt * 0.6) say(d, pick(['plead', 'shriek', 'sob'])); continue; }
    // knocked down: if they can't get up, they crawl away from him
    if (d.mode === 'rag') { d.crawlTo = { x: d.p.chest.x + (d.p.chest.x - J.x), z: d.p.chest.z + (d.p.chest.z - J.z) }; if (Math.random() < dt * 0.4) say(d, pick(['sob', 'plead', 'help'])); continue; }
    const me = d.root, dist = Math.hypot(J.x - me.x, J.z - me.z);
    d.look = a.seen ? { x: J.x, z: J.z } : a.target ?? null;
    d.lookAtW = a.seen && dist < 20 ? J : null;
    if ((a.seeT -= dt) <= 0) {
      a.seeT = 0.15;
      const v = a.state === 'asleep' ? 0 : canSee(d, J);
      if (v > 0) alertOf(d, (v * 2.6 + 0.4) * 0.15 * (dist < 3 ? 6 : 1));
      if (a.state === 'asleep') { /* only noise() wakes them */ }
      else if (!a.seen && ((jSpeed > 3 && dist < (RUN.rain ? 7 : 14)) || (jSpeed > 0.8 && dist < (RUN.rain ? 2 : 4)))) { a.aware = Math.min(0.9, a.aware + 0.08); if (a.state === 'idle' || a.state === 'wander') setState(d, 'investigate', { x: J.x, z: J.z }); }
      for (const o of counselors) {
        if (o.alive || o === d || a.sawBody.has(o)) continue;
        const op = o.p.chest, od = Math.hypot(op.x - me.x, op.z - me.z);
        if (od < 9 && sightClear(me.x, me.z, op.x, op.z)) { a.sawBody.add(o); a.aware = 1; if (!a.seen) { a.seen = true; say(d, 'scream'); a.screamT = 6; screamHeard(d); score.stinger(); chooseFlight(d); } }
      }
    }
    a.aware = Math.max(0, a.aware - dt * (a.seen ? 0.01 : 0.05));
    // a long quiet spell and they lose their nerve for searching: off to bed
    if (RUN.t - RUN.lastAlarm > 70 && RUN.t > 60 && !a.bed && (['idle', 'wander', 'investigate'].includes(a.state) || (a.state === 'hide' && a.hideT > 40))) {
      const bed = BEDS.filter(b => !b.taken).sort((p, q) => Math.hypot(p.x - me.x, p.z - me.z) - Math.hypot(q.x - me.x, q.z - me.z))[0];
      if (bed && Math.random() < dt * 0.3) { bed.taken = d; setState(d, 'toBed'); a.bed = bed; a.seen = false; d.wantSpeed = 1.1; d.scared = false; }
    }
    d.unaware = !a.seen && a.aware < 0.5;
    const running = d.wantSpeed > 2;
    if (running) { a.stamina -= dt; if (a.stamina <= 0) { a.winded = rand(3, 5); a.stamina = rand(8, 14); say(d, 'gasp'); } }
    d.breathHard = a.winded > 0;
    if (a.winded > 0) { a.winded -= dt; d.wantSpeed = 1.3; if (a.winded <= 0 && d.scared) d.wantSpeed = 3.6; if (Math.random() < dt) sfx.breath(d.p.head, d.female); }
    if (running && dist < 9 && (a.tripCd -= dt) <= 0) { a.tripCd = 2; if (Math.random() < 0.12) { d.ragdoll(rand(1.4, 2.4)); d.p.chest.addVel(Math.sin(d.yaw) * 3, 0, Math.cos(d.yaw) * 3); say(d, 'shriek'); sfx.bodyfall(d.p.chest); } }
    switch (a.state) {
      case 'idle': {
        const sp = a.spot;
        if (Math.hypot(sp.x - me.x, sp.z - me.z) > 1.2) { d.wantSpeed = 1.1; goTo(d, sp.x, sp.z, dt); }
        else { d.goal = null; d.face = sp.face ?? d.yaw; d.pose = sp.kind === 'fire' ? 'warm' : 'idle'; }
        if ((a.wanderT -= dt) <= 0) { a.wanderT = rand(25, 70); a.spot = pick(SPOTS.filter(s => s.kind !== 'fire' || counselors.filter(c => c.ai?.spot === s).length < 2)); setState(d, 'wander'); }
        break;
      }
      case 'wander': if (goTo(d, a.spot.x, a.spot.z, dt)) setState(d, 'idle'); break;
      case 'toBed':
        d.wantSpeed = 1.1; d.scared = false;
        if (goTo(d, a.bed.side.x, a.bed.side.z, dt)) { a.state = 'asleep'; d.pose = 'sleep'; d.goal = null; d.speed = 0; d.root.x = a.bed.x; d.root.z = a.bed.z; d.yaw = a.bed.yaw; d.face = a.bed.yaw; d.blend = 0; d.unaware = true; if (d.flash) d.flash.visible = false; }
        break;
      case 'asleep':
        d.goal = null; d.unaware = true; d.root.x = a.bed.x; d.root.z = a.bed.z; d.yaw = a.bed.yaw;
        if (Math.random() < dt * 0.05) sfx.breath(d.p.head, d.female);
        break;
      case 'investigate': {
        const t = a.target;
        if (!t || goTo(d, t.x, t.z, dt)) { a.lookT = (a.lookT ?? 4) - dt; d.face = d.yaw + Math.sin(d.time) * 0.8; if (a.lookT <= 0) { a.lookT = 4; a.aware *= 0.5; setState(d, 'wander'); } }
        break;
      }
      case 'flee': {
        const t = a.target;
        if (t && Math.hypot(t.x - J.x, t.z - J.z) < Math.hypot(t.x - me.x, t.z - me.z) * 0.7 && dist < 10 && (a.rethink = (a.rethink ?? 0) - dt) <= 0) { a.rethink = 2.5; chooseFlight(d); break; }
        if (!t || goTo(d, t.x, t.z, dt)) {
          if (a.hideAt) { setState(d, 'hide'); a.hideT = 0; d.face = Math.atan2(a.hideAt.door.x - me.x, a.hideAt.door.z - me.z); }
          else chooseFlight(d);
        }
        break;
      }
      case 'hide':
        d.goal = null; a.hideT += dt;
        if (Math.random() < dt * 0.2) sfx.breath(d.p.head, d.female);
        if (Math.random() < dt * 0.05) say(d, 'sob');
        if (dist < 5 && canSee(d, J) > 0) { say(d, 'scream'); a.hideAt = null; chooseFlight(d); }
        else if (a.hideT > rand(50, 90) && dist > 25) { a.hideT = 0; a.seen = false; a.aware = 0.4; setState(d, 'investigate', { x: CAMPFIRE.x + rand(-3, 3), z: CAMPFIRE.z + rand(-3, 3) }); }
        break;
      case 'toPhone':
        if (PHONE.cut || RUN.calledAt >= 0) { chooseFlight(d); break; }
        if (goTo(d, PHONE.stand.x, PHONE.stand.z, dt)) { setState(d, 'calling'); a.callT = 0; d.face = -Math.PI / 2; sfx.dial(PHONE); }
        break;
      case 'calling':
        d.goal = null; d.face = -Math.PI / 2; a.callT += dt;
        if (Math.random() < dt * 0.4) say(d, 'help');
        if (PHONE.cut) { chooseFlight(d); break; }
        if (a.callT > 9) { RUN.calledAt = RUN.t; RUN.policeAt = RUN.t + Math.max(45, 85 - RUN.night * 8); caption(`${d.name} got through to the police.`, 4); score.stinger(); chooseFlight(d); }
        break;
      case 'toCar':
        if (RUN.carGone || RUN.carHp <= 0) { if (RUN.carHp <= 0) say(d, 'plead'); chooseFlight(d); break; }
        if (goTo(d, CAR.door.x, CAR.door.z, dt)) { setState(d, 'starting'); a.startT = 0; d.face = CAR.yaw + Math.PI / 2; }
        break;
      case 'starting':
        d.goal = null; a.startT += dt;
        if ((a.crankT = (a.crankT ?? 0) - dt) <= 0) { a.crankT = 1.6; if (RUN.carHp > 0) sfx.crank(CAR); }
        if (RUN.carHp <= 0) { say(d, 'plead'); chooseFlight(d); break; }
        if (a.startT > 7.5) carEscape(d);
        break;
      case 'escape':
        if (goTo(d, ROAD_END.x, ROAD_END.z, dt) || me.z > BOUND - 3) escaped(d, 'ran off down the road');
        break;
    }
  }
}
function carEscape(d) {
  RUN.carGone = true; RUN.carDriving = { t: 0 }; escaped(d, 'drove away');
  CAR.lampMat.color.setHex(0xfff0c0); sfx.engine(CAR);
  for (const b of CAR.boxes) { b.min.y = -10; b.max.y = -9; }
}
function escaped(d, how) {
  if (d.gone) return;
  RUN.escaped.push({ name: d.name, how });
  caption(`${d.name} got away.`, 3.5);
  releaseBody(d); removeVictim(d);
  checkNightOver();
}
function removeVictim(d) {
  if (d.flash) { scene.remove(d.flash); scene.remove(d.flash.userData.pool); }
  if (d.gun) scene.remove(d.gun.mesh);
  d.dispose();
  let i = counselors.indexOf(d); if (i >= 0) counselors.splice(i, 1);
  i = police.indexOf(d); if (i >= 0) police.splice(i, 1);
}
function pushRoot(r) { const [x, z] = collide(r.x, r.z, 0.25); r.x = x; r.z = z; }


// Noise: anyone in earshot hears it. Sleepers wake (light sleepers nearer the
// source), people up and about come to look. Rain covers a lot of it.
function noise(at, radius) {
  if (RUN.rain) radius *= 0.6;
  for (const d of counselors) {
    if (!d.alive || !d.ai || d.held) continue;
    const me = posOf(d), dist = Math.hypot(me.x - at.x, me.z - at.z);
    const a = d.ai;
    if (a.state === 'asleep') { if (dist < radius * 0.7) { setState(d, 'investigate', { x: at.x, z: at.z }); a.aware = 0.5; } continue; }
    if (dist > radius || a.seen) continue;
    a.aware = Math.min(0.9, a.aware + 0.3);
    if (['idle', 'wander', 'toBed'].includes(a.state)) setState(d, 'investigate', { x: at.x + rand(-1.5, 1.5), z: at.z + rand(-1.5, 1.5) });
  }
}

// ------------------------------------------------------------ how they died
function killName(d) {
  if (d.cause === 'drown') return 'drowned';
  if (d.split === 'waist') return 'cut in half';
  if (d.cleaved) return 'head split open';
  if (d.cause === 'crush') return 'skull crushed in your hand';
  if (d.cause === 'smash') return 'skull smashed in';
  if (d.headGone) return 'head caved in';
  if (d.cause === 'ripHead') return 'head torn off';
  if (d.severed.has('neck')) return 'decapitated';
  if (d.heartOut) return 'heart torn out';
  if (d.burnT > 0.3) return 'burned alive';
  if (d.cause === 'snap') return 'neck snapped';
  if (d.cause === 'pinned' || d.wallPinned) return 'pinned to the wall';
  if (d.cause === 'impale') return 'impaled';
  const limbs = ['lSh', 'rSh', 'lEl', 'rEl', 'lHip', 'rHip', 'lKn', 'rKn', 'lWr', 'rWr', 'lAn', 'rAn'].filter(j => d.severed.has(j)).length;
  if (limbs >= 2 || d.cause === 'torn') return 'torn apart';
  if (d.gutted) return 'disembowelled';
  if (d.cause === 'strangle') return 'strangled';
  if (d.cause === 'stab') return 'stabbed';
  if (d.cause === 'beaten') return 'beaten to death';
  if (d.cause === 'bludgeon') return 'bludgeoned to death';
  return 'hacked to death';
}
const pending = [];
function onKilled(d) {
  if (!d.headGone && !d.severed.has('neck')) say(d, d.burnT > 0 ? 'burning' : 'die');
  sfx.bodyfall(d.p.chest);
  if (d.police) { caption('One less cop.', 2.5); return; }
  pending.push({ d, t: 0.6 });
  sting(); score.stinger(true);
}
function updatePending(dt) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const k = pending[i]; k.t -= dt; if (k.t > 0) continue;
    pending.splice(i, 1);
    const how = killName(k.d);
    RUN.kills.push({ name: k.d.name, how });
    const left = counselors.filter(c => c.alive).length;
    caption(`${k.d.name} — ${how}`, 4.5, left ? `${left} left` : '');
    checkNightOver();
  }
}

// ------------------------------------------------------------ police
const COP_SKINS = [0xdcb08a, 0xc89870, 0x8a5a3a, 0xe6c2a0];
let copCar = null, copCarT = 0, copLights = [];
function policeArrive() {
  RUN.policeHere = true;
  sfx.siren(true); setTimeout(() => sfx.siren(false), 9000);
  caption('Police. They\'re armed.', 4);
  if (!copCar) buildCopCar();
  copCar.visible = true; copCar.position.set(GATE.x - 2, 0, 75); copCarT = 0;
  setTimeout(() => { if (RUN.over) return; GATE.open = true; GATE.box.min.y = -10; GATE.box.max.y = -9; for (const m of GATE.lock) m.visible = false; sfx.clank(tv3.set(GATE.x, 1.2, FENCE)); caption('They\'ve cut the lock on the gate.', 3); }, 4000);
  const n = Math.min(4, 1 + RUN.night);
  for (let i = 0; i < n; i++) setTimeout(() => spawnCop(GATE.x + (i % 2 ? 1.2 : -1.2), FENCE + 2.5 + i * 1.2), 5000 + i * 700);
}
function buildCopCar() {
  copCar = new THREE.Group(); scene.add(copCar);
  const paint = new THREE.MeshLambertMaterial({ color: 0x1a1e26 }), white = new THREE.MeshLambertMaterial({ color: 0xc8c8c0 }), tyre = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const b = (m, w, h, dd, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); o.position.set(x, y, z); copCar.add(o); };
  b(paint, 1.8, 0.6, 4.6, 0, 0.6, 0); b(white, 1.82, 0.3, 1.6, 0, 0.75, 0); b(paint, 1.6, 0.5, 2.2, 0, 1.15, -0.2);
  for (const [x, z] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), tyre); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); copCar.add(w); }
  copLights = [0xff1a1a, 0x1a4aff].map((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.22), new THREE.MeshBasicMaterial({ color: c })); m.position.set(i ? 0.3 : -0.3, 1.48, -0.2); copCar.add(m); return m; });
  copCar.rotation.y = Math.PI;
}
function spawnCop(x, z) {
  if (RUN.over) return;
  const skin = pick(COP_SKINS);
  const d = new Human(scene, sim, blood, { x, z, yaw: Math.PI, scale: rand(1.0, 1.06), skin, hair: 0x1a1410, look: { skin, hair: 0x1a1410, eyes: 0x3a2a1a, beard: pick([0, 1, 2]), seed: Math.floor(Math.random() * 1e6) },
    shirt: 0x4a5a72, print: null, pants: 0x1c2230, shorts: false, shoes: 0x0e0e0e, uniform: true, hp: 130, kind: 'cop' });
  d.name = 'OFFICER'; d.police = true;
  d.cop = { shootT: rand(1, 2), last: headPos().clone(), seeT: 0, acc: 0, route: null, routeT: 0 };
  const gun = new THREE.Group(), gm = WM.black;
  const bx = (w, h, dd, gx, gy, gz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), gm); m.position.set(gx, gy, gz); gun.add(m); };
  bx(0.025, 0.035, 0.16, 0, 0.03, -0.08); bx(0.03, 0.09, 0.035, 0, -0.02, 0.02);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 })); flash.position.z = -0.2; flash.visible = false; gun.add(flash);
  scene.add(gun); d.gun = { mesh: gun, flash, t: 0 };
  d.onDeath = () => onKilled(d);
  d.onSever = () => { if (d.alive) say(d, 'dismember'); };
  police.push(d);
  sfx.radio(d.p.head);
}
const tracers = [];
function tracer(a, b) {
  const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]), new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8 }));
  scene.add(m); tracers.push({ m, t: 0.06 });
}
function updatePolice(dt) {
  const J = headPos();
  for (const d of police) {
    const c = d.cop, g = d.gun, hand = d.p.rFin;
    g.mesh.position.set(hand.x, hand.y, hand.z);
    if (!d.alive) { g.flash.visible = false; continue; }
    tv.set(c.see ? J.x - hand.x : Math.sin(d.yaw), c.see ? J.y - hand.y : -0.6, c.see ? J.z - hand.z : Math.cos(d.yaw)).normalize();
    g.mesh.quaternion.setFromUnitVectors(NEG_Z, tv);
    if ((g.t -= dt) <= 0) g.flash.visible = false;
    if (d.held || d.mode === 'rag') { c.see = false; continue; }
    const me = d.root, dist = Math.hypot(J.x - me.x, J.z - me.z);
    if ((c.seeT -= dt) <= 0) { c.seeT = 0.2; c.see = dist < 26 && sightClear(d.p.head.x, d.p.head.z, J.x, J.z); if (c.see) c.last.copy(J); }
    d.look = c.see ? { x: J.x, z: J.z } : null;
    if (c.see && dist < 22) {
      d.pose = 'aim'; d.goal = dist > 9 ? { x: J.x, z: J.z } : null; d.wantSpeed = 1.2; d.face = Math.atan2(J.x - me.x, J.z - me.z);
      if ((c.shootT -= dt) <= 0) {
        c.shootT = rand(0.8, 1.7); c.acc = Math.min(1, c.acc + 0.25);
        g.mesh.updateMatrixWorld(true);
        const from = g.flash.getWorldPosition(new V3());
        g.flash.visible = true; g.t = 0.05;
        sfx.gunshot(from);
        const hitP = 0.55 * c.acc * Math.max(0.2, 1 - dist / 30) * (crouched() ? 0.75 : 1) * (P.moveSpeed > 3 ? 0.7 : 1);
        const hit = Math.random() < hitP;
        tracer(from, tv3.copy(J).add(tv.set(rand(-1, 1), rand(-0.8, 0.5), rand(-1, 1)).multiplyScalar(hit ? 0.2 : 1.2)));
        if (hit) hurtJason(rand(7, 11)); else sfx.whiz();
      }
    } else {
      d.pose = 'idle'; d.wantSpeed = 2.4;
      if (goTo(d, c.last.x, c.last.z, dt)) c.last.set(J.x + rand(-6, 6), 0, J.z + rand(-6, 6));
    }
  }
}
function hurtJason(n) {
  if (P.down || RUN.over) return;
  P.hp -= n; P.hurtT = 0.4; P.lastHit = RUN.t;
  sfx.impact(); for (const h of hands()) pulse(h, 1, 120);
  if (P.hp <= 0) { P.hp = 0; P.down = true; caption('Jason goes down.', 4, '...but he always comes back.'); setTimeout(() => endNight(true), 4200); }
}

// ------------------------------------------------------------ the campfire
let fireAcc = 0;
function updateFire(dt) {
  fireAcc += dt * 40;
  while (fireAcc >= 1) {
    fireAcc -= 1;
    const r = Math.random() * 0.3, a = Math.random() * 6.28;
    blood.flame(CAMPFIRE.x + Math.cos(a) * r, 0.1 + Math.random() * 0.1, CAMPFIRE.z + Math.sin(a) * r, rand(0.14, 0.3), rand(0.4, 0.8));
    if (Math.random() < 0.15) blood.flame(CAMPFIRE.x, 0.8, CAMPFIRE.z, 0.35, 2.5, true, 0.6);
  }
  camp.fireLight.intensity = 18 + Math.sin(RUN.t * 13) * 3 + Math.sin(RUN.t * 31) * 2 + Math.random() * 3;
  for (const d of victims()) {
    for (const p of [d.p.chest, d.p.head]) if (Math.hypot(p.x - CAMPFIRE.x, p.z - CAMPFIRE.z) < 0.85 && p.y < 1.0 && d.fireT <= 0 && d.burnT < 6) d.ignite();
    if (d.fireT > 0 && inLake(d.p.chest.x, d.p.chest.z) && d.p.chest.y < 0.2) { d.fireT = 0; sfx.hiss(d.p.chest); }
    if (d.fireT > 0 && d.alive && d.mode === 'anim') { d.pose = 'flail'; d.goal = { x: d.root.x + Math.sin(d.time) * 5, z: d.root.z + Math.cos(d.time * 0.7) * 5 }; d.wantSpeed = 3; }
  }
}

// ------------------------------------------------------------ captions
const capCanvas = document.createElement('canvas'); capCanvas.width = 1024; capCanvas.height = 192;
const capTex = new THREE.CanvasTexture(capCanvas); capTex.colorSpace = THREE.SRGBColorSpace;
const capMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshBasicMaterial({ map: capTex, transparent: true, depthTest: false, fog: false }));
capMesh.renderOrder = 999; capMesh.visible = false; scene.add(capMesh);
const cap = { t: 0, life: 1 };
function caption(text, secs = 3, sub = '') {
  const g = capCanvas.getContext('2d'); g.clearRect(0, 0, 1024, 192);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 12;
  g.font = '500 54px "IM Fell English SC", "Times New Roman", serif'; g.fillStyle = '#c9c2b4'; g.fillText(text, 512, sub ? 72 : 96);
  if (sub) { g.font = 'italic 34px "Times New Roman", serif'; g.fillStyle = '#8a1a14'; g.fillText(sub, 512, 138); }
  capTex.needsUpdate = true;
  cap.t = cap.life = secs; capMesh.visible = inVR;
  const head = headPos(); camera.getWorldDirection(tv); tv.y = 0; tv.normalize();
  capMesh.position.copy(head).addScaledVector(tv, 2.6).add(tv2.set(0, -0.35, 0)); capMesh.lookAt(head);
  $('caption').innerHTML = text + (sub ? `<i>${sub}</i>` : ''); $('caption').style.opacity = 1;
}
function updateCaption(dt) {
  if (cap.t <= 0) { capMesh.visible = false; $('caption').style.opacity = 0; return; }
  cap.t -= dt;
  const a = Math.min(1, (cap.life - cap.t) * 2, cap.t / 0.8);
  capMesh.material.opacity = a; $('caption').style.opacity = a;
  const head = headPos(); camera.getWorldDirection(tv); tv.y = 0; tv.normalize();
  tv2.copy(head).addScaledVector(tv, 2.6).add(tv3.set(0, -0.35, 0)); capMesh.position.lerp(tv2, Math.min(1, dt * 1.5)); capMesh.lookAt(head);
}

// ------------------------------------------------------------ the wrist: what's left of the night
const wristCanvas = document.createElement('canvas'); wristCanvas.width = 512; wristCanvas.height = 320;
const wristTex = new THREE.CanvasTexture(wristCanvas); wristTex.colorSpace = THREE.SRGBColorSpace;
const wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ map: wristTex, transparent: true, fog: false }));
wrist.visible = false; scene.add(wrist);
let wristKey = '';
function drawWrist() {
  const alive = counselors.filter(c => c.alive).length;
  const left = Math.max(0, RUN.dawn - RUN.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
  const pol = RUN.policeHere ? 'HERE' : RUN.policeAt > 0 ? `coming · ${Math.max(0, Math.ceil(RUN.policeAt - RUN.t))}s` : '—';
  const lines = [[`NIGHT ${RUN.night}`, `${mm}:${String(ss).padStart(2, '0')} till dawn`], [`${alive} alive`, `${RUN.kills.length} dead · ${RUN.escaped.length} gone`],
    ['phone line', PHONE.cut ? 'cut' : 'live'], ['power', GENERATOR.on ? 'on' : 'off'], ['police', pol], ['the gate', GATE.open ? 'open' : 'locked']];
  const key = JSON.stringify(lines) + Math.round(P.hp);
  if (key === wristKey) return; wristKey = key;
  const g = wristCanvas.getContext('2d'); g.clearRect(0, 0, 512, 320);
  g.fillStyle = 'rgba(20,16,12,0.82)'; g.fillRect(0, 0, 512, 320); g.strokeStyle = 'rgba(120,100,80,0.5)'; g.lineWidth = 3; g.strokeRect(4, 4, 504, 312);
  g.font = '30px "Special Elite", "Courier New", monospace'; g.textBaseline = 'middle';
  const warn = b => b === 'live' || b === 'on' || b === 'open' || b === 'HERE' || b.startsWith('coming');
  lines.forEach(([a, b], i) => { g.fillStyle = i ? '#a89c88' : '#d0c6b4'; g.textAlign = 'left'; g.fillText(a, 22, 34 + i * 46); g.textAlign = 'right'; g.fillStyle = warn(b) ? '#b8432e' : '#a89c88'; g.fillText(b, 490, 34 + i * 46); });
  if (P.hp < 100) { g.fillStyle = '#3a0a06'; g.fillRect(22, 302, 468, 8); g.fillStyle = '#9a1a10'; g.fillRect(22, 302, 468 * P.hp / 100, 8); }
  wristTex.needsUpdate = true;
  $('hud').innerHTML = lines.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('') + (P.hp < 100 ? `<div class="hp"><i style="width:${P.hp}%"></i></div>` : '');
}
function updateWrist() {
  const h = vrHands.find(x => x.side === 'left' && x.active);
  wrist.visible = !!h && inVR && started && !menu.open;
  if (!wrist.visible) return;
  wrist.position.copy(h.glove.position).add(tv.set(0.03, 0.0, 0.11).applyQuaternion(h.glove.quaternion));
  wrist.quaternion.copy(h.glove.quaternion).multiply(tq.setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI / 2, 0, 'YXZ')));
}

// ------------------------------------------------------------ in-game menu (VR panel / desktop overlay)
const menuCanvas = document.createElement('canvas'); menuCanvas.width = 1024; menuCanvas.height = 1024;
const menuTex = new THREE.CanvasTexture(menuCanvas); menuTex.colorSpace = THREE.SRGBColorSpace;
const menuMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: menuTex, transparent: true, depthTest: false, fog: false }));
menuMesh.renderOrder = 1000; menuMesh.visible = false; scene.add(menuMesh);
const menu = { open: false, rows: [], hover: -1, title: '', body: [] };
function drawMenu() {
  const g = menuCanvas.getContext('2d'); g.clearRect(0, 0, 1024, 1024);
  g.fillStyle = 'rgba(8,8,8,0.92)'; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = 'rgba(110,20,14,0.8)'; g.lineWidth = 4; g.strokeRect(10, 10, 1004, 1004);
  g.textAlign = 'center'; g.fillStyle = '#a8180e'; g.font = '68px "IM Fell English SC", "Times New Roman", serif'; g.fillText(menu.title, 512, 100);
  g.font = '28px "Special Elite", "Courier New", monospace'; g.fillStyle = '#8a8274';
  menu.body.forEach((l, i) => g.fillText(l, 512, 160 + i * 36));
  const top = 1024 - menu.rows.length * 92 - 30;
  menu.rows.forEach((r, i) => {
    const y = top + i * 92;
    g.fillStyle = i === menu.hover ? 'rgba(110,20,14,0.85)' : 'rgba(40,36,32,0.85)'; g.fillRect(212, y, 600, 72);
    g.fillStyle = '#d8d0c0'; g.font = '36px "Special Elite", "Courier New", monospace'; g.fillText(typeof r.label === 'function' ? r.label() : r.label, 512, y + 48);
  });
  menuTex.needsUpdate = true;
  $('menu').hidden = !menu.open || inVR;
  if (!inVR) {
    $('menuTitle').textContent = menu.title;
    $('menuBody').innerHTML = menu.body.map(l => `<div>${l}</div>`).join('');
    const box = $('menuRows'); box.innerHTML = '';
    menu.rows.forEach(r => { const b = document.createElement('button'); b.textContent = typeof r.label === 'function' ? r.label() : r.label; b.onclick = () => { r.act(); if (menu.open) drawMenu(); }; box.appendChild(b); });
  }
}
function openMenu(title, bodyLines, rows) {
  menu.open = true; menu.title = title; menu.body = bodyLines; menu.rows = rows; menu.hover = -1;
  const head = headPos(); camera.getWorldDirection(tv); tv.y = 0; tv.normalize();
  menuMesh.position.copy(head).addScaledVector(tv, 1.3); menuMesh.position.y = head.y - 0.1; menuMesh.lookAt(head);
  menuMesh.visible = inVR;
  if (!inVR && document.pointerLockElement) document.exitPointerLock();
  drawMenu();
}
function closeMenu() { menu.open = false; menuMesh.visible = false; $('menu').hidden = true; }
const ray = new THREE.Raycaster();
function menuHit(h) {
  ray.set(h.pos, tv.copy(NEG_Z).applyQuaternion(h.quat));
  const hit = ray.intersectObject(menuMesh)[0]; if (!hit) return -1;
  const y = (1 - hit.uv.y) * 1024, top = 1024 - menu.rows.length * 92 - 30, x = hit.uv.x * 1024;
  if (x < 212 || x > 812) return -1;
  const i = Math.floor((y - top) / 92);
  return i >= 0 && i < menu.rows.length && (y - top) % 92 < 72 ? i : -1;
}
function menuClick(h) { const i = menuHit(h); if (i >= 0) { sfx.tick(); menu.rows[i].act(); if (menu.open) drawMenu(); } }
function updateMenu() {
  if (!menu.open || !inVR) return;
  let hv = -1; for (const h of vrHands) if (h.active) { const i = menuHit(h); if (i >= 0) hv = i; }
  if (hv !== menu.hover) { menu.hover = hv; drawMenu(); }
}
function pauseMenu() {
  paused = true;
  openMenu('PAUSED', [`Night ${RUN.night}`, `${RUN.kills.length} dead · ${RUN.escaped.length} escaped`], [
    { label: 'Resume', act: () => { paused = false; closeMenu(); } },
    { label: 'Restart this night', act: () => { closeMenu(); paused = false; startNight(RUN.night); } },
    { label: () => 'Turning: ' + (S.snap ? 'snap' : 'smooth'), act: () => { S.snap = !S.snap; saveSettings(); } },
    { label: () => `Height: ${S.height >= 0 ? '+' : ''}${Math.round(S.height * 100)} cm (tap to raise)`, act: () => { S.height = S.height >= 0.3 ? -0.2 : Math.round((S.height + 0.05) * 100) / 100; saveSettings(); } },
    { label: 'How to kill', act: () => helpMenu() },
  ]);
}
function helpMenu() {
  openMenu('HOW TO KILL', [
    'Grip once for a weapon. Hold grip to hold a person.',
    'Swing hard; slow swings don\'t cut. Thrust to stab.',
    'Twist a blade that\'s in them. Lift them on the pitchfork.',
    'Axe down through the head, or level through the waist.',
    'Grip a head and squeeze the trigger: crush it.',
    'Grip a throat and squeeze: strangle. Two hands, twist: snap.',
    'Two hands, pull hard: tear off an arm, a leg, the head.',
    'Punch hard into a weak chest: tear out the heart.',
    'Hold them under in the lake. Push them into the fire.',
    'The only phone line runs into the box on the entrance sign. Cut it.',
    'The fence is locked. Only the police can open the gate.',
  ], [{ label: 'Back', act: () => pauseMenu() }]);
}

// ------------------------------------------------------------ the night
function clearNight() {
  for (const d of [...counselors, ...police]) { releaseBody(d); removeVictim(d); }
  counselors.length = 0; police.length = 0;
  blood.clear();
  for (const b of bubbleList) scene.remove(b.m); bubbleList.length = 0;
  for (const t of tracers) scene.remove(t.m); tracers.length = 0;
  pending.length = 0;
}
function startNight(n) {
  clearNight();
  for (const b of BEDS) b.taken = null;
  Object.assign(RUN, { lastAlarm: 0, night: n, t: 0, dawn: 420 + n * 30, over: false, calledAt: -1, policeAt: -1, policeHere: false, carGone: false, carHp: 3, carDriving: null, kills: [], escaped: [] });
  PHONE.cut = false; JUNCTION.hp = 2; JUNCTION.wire.visible = true; JUNCTION.mesh.rotation.z = 0; JUNCTION.mesh.position.y = JUNCTION.y; JUNCTION.led.material.color.setHex(0xff2a10);
  GATE.open = false; GATE.openT = 0; GATE.box.min.y = 0; GATE.box.max.y = 2.6; for (const p of GATE.panels) p.hinge.rotation.y = 0; for (const m of GATE.lock) m.visible = true;
  GENERATOR.on = true; GENERATOR.hp = 3; camp.setPower(true);
  CAR.mesh.position.set(CAR.x, 0, CAR.z); CAR.mesh.rotation.y = CAR.yaw; CAR.lampMat.color.setHex(0x222018); carSmoke = 0;
  for (const b of CAR.boxes) if (b.min.y < -1) { b.min.y = 0; b.max.y = 1.4; }
  if (copCar) copCar.visible = false;
  P.hp = 100; P.down = false; P.stamina = 100;
  for (const sp of maskSplats) { sp.t = 0; sp.m.visible = false; }
  handBlood = 0; bloody(0);
  resetTools();
  // scatter them about the camp, well away from the shore you come up on; a couple at most by the fire
  const count = Math.min(14, 5 + n * 2);
  const far = SPOTS.filter(s => Math.hypot(s.x - START.x, s.z - START.z) > 30).sort(() => Math.random() - 0.5);
  const chosen = [], used = new Map();
  for (const s of [...far, ...far, ...far]) {
    if (chosen.length >= count) break;
    const k = used.get(s) ?? 0;
    if ((s.kind === 'fire' && chosen.filter(c => c.kind === 'fire').length >= 2) || k >= (s.kind === 'cabin' || s.kind === 'lodge' ? 2 : 1)) continue;
    used.set(s, k + 1); chosen.push(s);
  }
  nameBag = [];
  for (const s of chosen) spawnCounselor(s);
  RUN.rain = n === 2 || (n > 2 && Math.random() < 0.45);
  setWeather(RUN.rain);
  rig.position.set(START.x, groundAt(START.x, START.z) + S.height, START.z);
  rig.rotation.y = inVR ? Math.PI : 0; deskYaw = Math.PI; deskPitch = 0;
  teleported = true;
  sting();
  caption(`Night ${['one', 'two', 'three', 'four', 'five', 'six', 'seven'][n - 1] ?? n}`, 5, `${chosen.length} counselors at ${AREA.name}${RUN.rain ? ' · rain' : ''}`);
}
function checkNightOver() {
  if (RUN.over || counselors.some(c => c.alive) || pending.length) return;
  setTimeout(() => endNight(false), 2500);
}
function endNight(fail) {
  if (RUN.over) return;
  RUN.over = true;
  for (const d of counselors.filter(c => c.alive)) RUN.escaped.push({ name: d.name, how: fail ? 'survived the night' : 'saw the sunrise' });
  const kills = RUN.kills, total = kills.length + RUN.escaped.length, ways = new Set(kills.map(k => k.how)).size;
  const lines = [
    fail ? 'They put you down. For now.' : RUN.t >= RUN.dawn ? 'Dawn came up over the lake.' : `Nobody left at ${AREA.name}.`,
    `${kills.length} of ${total} dead · ${RUN.escaped.length} got away · ${ways} different ways`, '',
    ...kills.map(k => `${k.name} — ${k.how}`), ...RUN.escaped.map(k => `${k.name} — ${k.how}`),
  ].slice(0, 20);
  paused = true;
  openMenu(fail ? 'NIGHT LOST' : RUN.escaped.length === 0 ? 'NONE SURVIVED' : 'MORNING', lines, [
    ...(!fail ? [{ label: `Night ${RUN.night + 1}`, act: () => { closeMenu(); paused = false; startNight(RUN.night + 1); } }] : []),
    { label: 'Replay this night', act: () => { closeMenu(); paused = false; startNight(RUN.night); } },
  ]);
}
function updateNight(dt) {
  if (RUN.over) return;
  RUN.t += dt;
  if (RUN.t >= RUN.dawn) { endNight(false); return; }
  if (RUN.policeAt > 0 && !RUN.policeHere && RUN.t >= RUN.policeAt) policeArrive();
  if (RUN.carDriving) {
    const c = RUN.carDriving, m = CAR.mesh; c.t += dt;
    m.rotation.y += angDiff(Math.atan2(ROAD_END.x - m.position.x, 140 - m.position.z), m.rotation.y) * Math.min(1, dt * 1.5);
    const sp = Math.min(9, c.t * 3); m.position.x += Math.sin(m.rotation.y) * sp * dt; m.position.z += Math.cos(m.rotation.y) * sp * dt;
    if (m.position.z > 140) RUN.carDriving = null;
  }
  // the gate swinging open
  if (GATE.open) { GATE.openT = Math.min(1, (GATE.openT ?? 0) + dt * 0.5); for (const p of GATE.panels) p.hinge.rotation.y = p.side * GATE.openT * 1.7; }
  if (copCar?.visible) {
    copCarT += dt;
    if (copCar.position.z > FENCE + 6) copCar.position.z -= Math.max(0, 9 - copCarT * 1.5) * dt + 0.02;
    const blink = Math.floor(RUN.t * 4) % 2;
    copLights[0].material.color.setHex(blink ? 0xff1a1a : 0x300000); copLights[1].material.color.setHex(blink ? 0x10102a : 0x1a4aff);
  }
  if (carSmoke > 0 && Math.random() < dt * 12) { const f = carFront(tv); blood.flame(f.x, f.y + 0.2, f.z, 0.3, 2, true, 0.5); }
  if (!P.down && RUN.t - P.lastHit > 5) P.hp = Math.min(100, P.hp + dt * 4);
}
// the few real lights go to the lamps nearest you
function updateLamps(dt) {
  const J = headPos(); camp.updateLights(J.x, J.z, dt, RUN.t);
}
// doors swing open as anyone comes up to them; they creak, and they bang shut
function updateDoors(dt) {
  const acts = [headPos()];
  for (const d of [...counselors, ...police]) if (!d.gone && (d.alive || d.held)) acts.push(d.p.pelvis);
  camp.updateDoors(dt, acts);
  for (const dr of DOORS) {
    if (dr.target && !dr.creaked && dr.open > 0.04) { dr.creaked = true; sfx.door(tv3.set(dr.x, 1, dr.z)); }
    if (!dr.target && dr.open < 0.04) dr.creaked = false;
    if (dr.slam) { dr.slam = false; sfx.thud(tv3.set(dr.x, 1, dr.z)); }
  }
}

// ------------------------------------------------------------ sound: the sting
let stingBuf = null, stingEnd = 0;
async function loadSting() {
  try { stingBuf = await sfx.ctx.decodeAudioData(await (await fetch('sfx/kikiki.mp3')).arrayBuffer()); } catch { /* none */ }
}
// ch-ch-ch ha-ha-ha, twice
function sting() {
  const ac = sfx.ctx;
  if (!ac || !stingBuf || ac.currentTime < stingEnd - 1) return;
  const out = ac.createGain(); out.gain.value = 0.8 * S.vol; out.connect(sfx.master ?? ac.destination);
  const t0 = ac.currentTime + 0.05, D = stingBuf.duration;
  // each play eased in and out over a few milliseconds, so neither the start nor the seam between them clicks
  for (let i = 0; i < 2; i++) {
    const s = ac.createBufferSource(), g = ac.createGain(), st = t0 + i * D; s.buffer = stingBuf;
    g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(1, st + 0.006); g.gain.setValueAtTime(1, st + D - 0.008); g.gain.linearRampToValueAtTime(0, st + D);
    s.connect(g).connect(out); s.start(st); s.stop(st + D + 0.01);
  }
  stingEnd = t0 + stingBuf.duration * 2;
}
function updateAudio() {
  const J = headPos();
  let fear = 0, near = 99;
  for (const d of counselors) {
    if (!d.alive) continue;
    const at = posOf(d), dist = Math.hypot(at.x - J.x, at.z - J.z);
    near = Math.min(near, dist);
    fear = Math.max(fear, d.scared ? 1 - dist / 25 : (1 - dist / 14) * 0.45);
  }
  if (police.some(d => d.alive && d.cop?.see)) fear = 1;
  score.tension = paused ? 0 : fear;
  sfx.updateAmbience(Math.max(0, 1 - Math.abs(J.z - shoreZ(J.x)) / 12), near < 6 ? 0.2 : 1);
}

// ------------------------------------------------------------ moving about
const keys = {};
let deskYaw = 0, deskPitch = 0, snapReady = true, sprintToggle = false;
function collide(x, z, R_ = 0.32) {
  for (let k = 0; k < 2; k++) for (const b of [...sim.near(x, z), ...sim.near(x + R_, z + R_), ...sim.near(x - R_, z - R_)]) {
    if (b.max.y < 0.5) continue;
    const cx = Math.max(b.min.x, Math.min(x, b.max.x)), cz = Math.max(b.min.z, Math.min(z, b.max.z));
    const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= R_ * R_) continue;
    if (d2 < 1e-8) { const ox = Math.min(x - b.min.x, b.max.x - x), oz = Math.min(z - b.min.z, b.max.z - z); if (ox < oz) x = x - b.min.x < b.max.x - x ? b.min.x - R_ : b.max.x + R_; else z = z - b.min.z < b.max.z - z ? b.min.z - R_ : b.max.z + R_; continue; }
    const d = Math.sqrt(d2); x = cx + dx / d * R_; z = cz + dz / d * R_;
  }
  return [x, z];
}
function moveJason(dx, dz, dt) {
  const J = headPos(), wading = groundAt(J.x, J.z) < -0.1;
  const run = P.sprint && P.stamina > 0;
  let speed = (run ? 4.3 : 2.1) * (wading ? 0.6 : 1);
  if (P.down) speed = 0;
  const len = Math.hypot(dx, dz); if (len > 1) { dx /= len; dz /= len; }
  let nx = J.x + dx * speed * dt, nz = J.z + dz * speed * dt;
  [nx, nz] = collide(nx, nz);
  nx = Math.max(-BOUND + 1, Math.min(BOUND - 1, nx)); nz = Math.max(-62, Math.min(BOUND - 1, nz));
  rig.position.x += nx - J.x; rig.position.z += nz - J.z;
  const moved = Math.hypot(nx - J.x, nz - J.z) / Math.max(dt, 1e-3);
  P.moveSpeed = moved;
  if (run && moved > 1) P.stamina = Math.max(0, P.stamina - dt * 22); else P.stamina = Math.min(100, P.stamina + dt * 14);
  if (P.stamina <= 0) { P.sprint = false; sprintToggle = false; }
  const fy = groundAt(nx, nz) + S.height;
  P.y = fy; rig.position.y += (fy - rig.position.y) * Math.min(1, dt * 8);
  P.stepAcc = (P.stepAcc ?? 0) + moved * dt;
  if (P.stepAcc > (run ? 1.0 : 0.85)) { P.stepAcc = 0; const f = tv.set(nx, fy - S.height, nz); wading ? sfx.splash(f) : sfx.step(f, 0.14); noise(f, wading ? (run ? 9 : 4) : run ? 8 : 1.6); }
}
function desktopMove(dt) {
  let f = 0, s = 0;
  if (keys.KeyW) f++; if (keys.KeyS) f--; if (keys.KeyD) s++; if (keys.KeyA) s--;
  P.sprint = !!keys.ShiftLeft || !!keys.ShiftRight;
  camera.rotation.set(deskPitch, deskYaw, 0);
  const sy = Math.sin(deskYaw), cy = Math.cos(deskYaw);
  if (!menu.open) moveJason(-sy * f + cy * s, -cy * f - sy * s, dt);
  if (keys.KeyC) camera.position.y = Math.max(1.1, camera.position.y - dt * 3); else camera.position.y = Math.min(1.75, camera.position.y + dt * 3);
}
function vrMove(dt) {
  let mx = 0, my = 0, tx = 0;
  for (const h of vrHands) {
    const gp = h.src?.gamepad; if (!gp) continue;
    const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0], gp.axes[1]];
    if (h.side === 'left') {
      mx = ax[0]; my = ax[1];
      const click = gp.buttons[3]?.pressed; if (click && !h.clickPrev) sprintToggle = !sprintToggle; h.clickPrev = click;
      const y = gp.buttons[5]?.pressed; if (y && !h.yPrev && !RUN.over) { if (menu.open && paused) { paused = false; closeMenu(); } else if (!menu.open) pauseMenu(); } h.yPrev = y;
    } else {
      tx = ax[0];
      const click = gp.buttons[3]?.pressed; if (click && !h.clickPrev) useSense(); h.clickPrev = click;
      const b = gp.buttons[5]?.pressed; if (b && !h.bPrev && !RUN.over) { if (menu.open && paused) { paused = false; closeMenu(); } else if (!menu.open) pauseMenu(); } h.bPrev = b;
    }
  }
  if (Math.hypot(mx, my) < 0.15) { mx = my = 0; sprintToggle = false; }
  P.sprint = sprintToggle;
  camera.getWorldDirection(tv); tv.y = 0; tv.normalize();
  const rx = -tv.z, rz = tv.x;
  if (!menu.open) moveJason(tv.x * -my + rx * mx, tv.z * -my + rz * mx, dt);
  const J = headPos().clone();
  if (S.snap) {
    if (Math.abs(tx) > 0.7 && snapReady) { rig.rotation.y -= Math.sign(tx) * Math.PI / 6; snapReady = false; teleported = true; }
    if (Math.abs(tx) < 0.3) snapReady = true;
  } else if (Math.abs(tx) > 0.2) rig.rotation.y -= tx * dt * 2.2;
  rig.updateMatrixWorld(true);
  const J2 = headPos(); rig.position.x += J.x - J2.x; rig.position.z += J.z - J2.z;
}
// Jason's sense: for a moment you can feel where their fear is
const senseMarks = [];
const senseMat = new THREE.SpriteMaterial({ color: 0x8a0a06, transparent: true, depthTest: false, fog: false, opacity: 0, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })() });
function useSense() { if (P.senseCd > 0) return; P.sense = 5; P.senseCd = 20; sfx.heartbeat(); }
function updateSense(dt) {
  P.senseCd = Math.max(0, P.senseCd - dt); P.sense = Math.max(0, P.sense - dt);
  const live = counselors.filter(c => c.alive);
  while (senseMarks.length < live.length) { const s = new THREE.Sprite(senseMat); s.renderOrder = 998; s.scale.setScalar(0.7); scene.add(s); senseMarks.push(s); }
  senseMat.opacity = Math.min(0.9, P.sense) * (0.6 + Math.sin(RUN.t * 9) * 0.4);
  senseMarks.forEach((s, i) => { const d = live[i]; s.visible = !!d && P.sense > 0; if (d) s.position.set(d.p.chest.x, d.p.chest.y, d.p.chest.z); });
}

// desktop input
let noLock = false, dragging = false, lastMX = 0, lastMY = 0;
canvas.addEventListener('mousedown', e => {
  if (!started || inVR || menu.open) return;
  if (!document.pointerLockElement && !noLock) canvas.requestPointerLock?.();
  if (e.button === 0) { desk.trigger = true; if (!desk.held || desk.held.type === 'tool') desk.jab = 0.24; }
  if (e.button === 2) { if (desk.held) drop(desk); else grab(desk); }
});
canvas.addEventListener('mouseup', e => { if (e.button === 0) desk.trigger = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockerror', () => { noLock = true; });
canvas.addEventListener('pointerdown', e => { dragging = true; lastMX = e.clientX; lastMY = e.clientY; });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('mousemove', e => {
  if (!started || inVR || menu.open) return;
  let dx = 0, dy = 0;
  if (document.pointerLockElement === canvas) { dx = e.movementX; dy = e.movementY; }
  else if (dragging) { dx = e.clientX - lastMX; dy = e.clientY - lastMY; lastMX = e.clientX; lastMY = e.clientY; }
  deskYaw -= dx * 0.0024; deskPitch = Math.max(-1.45, Math.min(1.45, deskPitch - dy * 0.0024));
});
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (!started) return;
  if (e.code === 'KeyE') { if (desk.held) drop(desk); else grab(desk); }
  if (e.code === 'KeyF') useSense();
  if (e.code === 'KeyQ' && desk.held?.type === 'point') { desk.vel.copy(NEG_Z).applyQuaternion(camera.getWorldQuaternion(tq)).multiplyScalar(9).y += 3; drop(desk); }
  if (e.code === 'KeyR') desk.trigger = true;
  if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
    const hs = holsters[+e.code.slice(-1) - 1];
    if (desk.held?.type === 'tool') { const t = desk.held.tool; const free = holsters.find(x => !x.tool && (x.name === 'back' || t.def.len < 0.75)); if (free) { desk.held = null; t.held = null; t.holster = free; free.tool = t; sfx.holster(); } }
    else if (hs.tool && !desk.held) { const t = hs.tool; hs.tool = null; t.holster = null; t.held = desk; desk.held = { type: 'tool', tool: t }; desk.hasTip = false; sfx.draw(); }
  }
  if (e.code === 'KeyM' || e.code === 'Escape') { if (menu.open && paused && !RUN.over) { paused = false; closeMenu(); } else if (!menu.open) pauseMenu(); }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyR') desk.trigger = false; });

// ------------------------------------------------------------ title screen
// the camera drifts slowly over the water toward the fire while the menu is up
function titleCam(time) {
  const t = time / 1000;
  rig.position.set(START.x + Math.sin(t * 0.03) * 6, 0, START.z + 8 + Math.sin(t * 0.02) * 3);
  rig.rotation.y = 0;
  camera.position.set(0, 1.1, 0);
  camera.rotation.set(-0.02 + Math.sin(t * 0.1) * 0.01, Math.PI + Math.sin(t * 0.05) * 0.12, 0);
}
{
  const gc = $('grain'), gx = gc.getContext('2d');
  const grain = () => {
    if (started) return;
    gc.width = 240; gc.height = 160;
    const img = gx.createImageData(240, 160);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gx.putImageData(img, 0, 0);
    setTimeout(grain, 70);
  };
  grain();
}
async function begin(vr) {
  sfx.init(); await loadSting(); sfx.ambience(); score.start(sfx.ctx, sfx.master, sfx.verb);
  $('screen').hidden = true; $('hud').hidden = false; $('caption').hidden = false;
  started = true; inVR = vr;
  camera.position.set(0, 1.75, 0);
  startNight(1);
}
$('playDesktop').onclick = () => begin(false);
// the title screen: pick a place (the page reloads with it built behind the menu), who you play, who's there
{
  const go = (o) => { const q = new URLSearchParams({ area: SET.area, mode: SET.mode, cast: SET.cast ? '1' : '0', ...o }); location.search = q.toString(); };
  const box = $('areas');
  for (const a of AREAS) {
    const b = document.createElement('button'); b.innerHTML = `${a.name}<small>${a.film}</small>`;
    if (a.id === AREA.id) b.className = 'on';
    b.onclick = () => { if (a.id !== AREA.id) go({ area: a.id }); };
    box.appendChild(b);
  }
  $('areaBlurb').textContent = AREA.blurb;
  $('rosterHead').textContent = AREA.name.toUpperCase();
  $('rosterYear').textContent = AREA.film.toUpperCase();
  $('castToggle').checked = SET.cast;
  $('castNames').textContent = AREA.cast.map(c => c[0][0] + c[0].slice(1).toLowerCase()).join(', ');
  $('castToggle').onchange = e => go({ cast: e.target.checked ? '1' : '0' });
}
$('howBtn').onclick = () => { $('how').hidden = !$('how').hidden; };
$('enterVR').onclick = async () => {
  if (!navigator.xr) return;
  try {
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    renderer.xr.setFoveation?.(1);
    await renderer.xr.setSession(session);
    session.addEventListener('end', () => { inVR = false; });
    begin(true);
  } catch (err) { $('vrNote').textContent = 'Could not start VR: ' + err.message; }
};
(async () => {
  const ok = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  if (!ok) { $('enterVR').disabled = true; $('vrNote').textContent = 'Open this page in the Meta Quest browser to play in VR.'; }
})();
$('menuClose').onclick = () => { if (paused && !RUN.over) { paused = false; closeMenu(); } };

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ------------------------------------------------------------ main loop
let last = 0, acc = 0;
const hurtMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5a0000, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, fog: false }));
hurtMesh.renderOrder = 1001; camera.add(hurtMesh);
// one bad frame (an error anywhere) must never stop the loop: in VR that freezes the whole view
let frameErrors = 0;
function frame(time) {
  try { step(time); }
  catch (e) {
    if (frameErrors++ < 5) console.error('frame error', e);
    try { renderer.render(scene, camera); } catch { /* nothing more to do */ }
  }
}
function step(time) {
  let dt = Math.min(0.05, (time - last) / 1000 || 0); last = time;
  if (stopT > 0) { stopT -= dt; dt *= 0.15; }   // the jolt of a blow landing
  if (!started) {
    titleCam(time); followMoon(camera.getWorldPosition(tv)); camp.updateMist(time / 1000, tv.x, tv.z); camp.updateLights(tv.x, tv.z, dt, time / 1000);
    RUN.t += dt; updateFire(dt); blood.update(dt, camera);
    renderer.render(scene, camera);
    return;
  }
  if (inVR) vrMove(dt); else desktopMove(dt);
  for (const h of hands()) updateHand(h, dt);
  updatePulls(dt);
  teleported = false;
  const head = headPos();
  poseBody(body, head, headYaw(), side => inVR ? vrHands.find(h => h.active && (h.side === 'left') === (side < 0)) ?? null : (side > 0 ? desk : null), P.y - S.height, dt);
  body.g.visible = true;
  holQ.setFromAxisAngle(UP, body.yaw);
  for (const t of tools) if (t.holster) {
    holsterPos(t.holster, t.mesh.position);
    t.mesh.quaternion.copy(holQ).multiply(holDown);
    if (t.holster.name === 'back') t.mesh.quaternion.multiply(tq.setFromAxisAngle(X_AXIS, Math.PI * 0.92)).multiply(tq2.setFromAxisAngle(UP, 0.35));
    tv.copy(NEG_Z).applyQuaternion(t.mesh.quaternion);
    t.a.moveTo(t.mesh.position.x, t.mesh.position.y, t.mesh.position.z); t.b.moveTo(t.a.x + tv.x * t.def.len, t.a.y + tv.y * t.def.len, t.a.z + tv.z * t.def.len);
    t.a.locked = t.b.locked = true;
  }
  holsterPos(holsters[0], sheath.position); sheath.position.y += 0.02; sheath.quaternion.copy(holQ).multiply(holDown);
  if (!paused) {
    for (const d of victims()) d.update(dt, groundAt, pushRoot);
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 4) { sim.step(); pushHands(); acc -= STEP; n++; }
    if (n === 4) acc = 0;
    updateGrips(dt);
    updateCounselors(dt);
    updatePolice(dt);
    updateFire(dt);
    updatePending(dt);
    updateNight(dt);
    updateLamps(dt); updateDoors(dt);
    if (WINDMILL) WINDMILL.rotation.z -= dt * 0.7;
    updateSense(dt);
    updateGlints(RUN.t);
    const bolt = rain.update(dt, head.x, head.y, head.z);
    hemiL.intensity = (RUN.rain ? SKY.wet.hemi : SKY.clear.hemi) + bolt * 6;
    blood.update(dt, camera);
    for (const d of victims()) if (d.bleed > 1 && Math.random() < dt * Math.min(20, d.bleed * 2)) { const p = pick([d.p.chest, d.p.pelvis, d.p.neck]); blood.drop(p.x, p.y, p.z, rand(-0.2, 0.2), -0.5, rand(-0.2, 0.2), 0.008); }
  }
  for (const d of victims()) d.sync();
  for (const t of tools) {
    if (t.stuck) { updateStuck(t); continue; }
    if (t.holster || t.held) continue;
    t.mesh.position.set(t.a.x, t.a.y, t.a.z);
    if (t.hung && t.hangQ) { t.mesh.quaternion.copy(t.hangQ); continue; }
    t.mesh.quaternion.setFromUnitVectors(NEG_Z, tv.set(t.b.x - t.a.x, t.b.y - t.a.y, t.b.z - t.a.z).normalize());
  }
  for (let i = bubbleList.length - 1; i >= 0; i--) { const b = bubbleList[i]; b.m.position.y += b.v * dt; if (b.m.position.y > WATER_Y) { scene.remove(b.m); bubbleList.splice(i, 1); } }
  for (let i = tracers.length - 1; i >= 0; i--) { const t = tracers[i]; t.t -= dt; t.m.material.opacity = Math.max(0, t.t / 0.06); if (t.t <= 0) { scene.remove(t.m); tracers.splice(i, 1); } }
  updateCaption(dt); drawWrist(); updateWrist(); updateMenu(); updateAudio(); updateMaskBlood(dt);
  P.hurtT = Math.max(0, P.hurtT - dt);
  hurtMesh.material.opacity = P.hurtT * 1.2 + (P.hp < 40 ? (1 - P.hp / 40) * 0.25 : 0);
  hurtMesh.visible = hurtMesh.material.opacity > 0.01;
  sfx.setListener(head.x, head.y, head.z, headYaw());
  camp.ripple.offset.x = time * 0.000004; camp.ripple.offset.y = time * 0.000007;
  followMoon(head); camp.updateMist(time / 1000, head.x, head.z);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

// for poking at things from the console
window.jr = { camp, LAMPS, BUILDINGS, DOORS, HIDING, AREA, SET, THREE, scene, renderer, RUN, P, S, counselors, police, tools, sim, blood, rig, camera, desk, vrHands, startNight, endNight, policeArrive, caption, grab, drop, killName, holsters, body, cutPhone, killPower,
  get state() { return { started, inVR, paused }; }, begin, look(y, p) { deskYaw = y; deskPitch = p; }, tp(x, z) { rig.position.x = x; rig.position.z = z; } };
