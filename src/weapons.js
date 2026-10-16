// Jason's tools. Each is modelled with its grip at the origin, pointing down -Z.
import * as THREE from '../vendor/three.module.js';

const R = Math.random;
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function blob(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
// old steel: scratched grey, patches of orange-brown rust, dried blood
const steelTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#8a8c8e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${R() < 0.5 ? '255,255,255' : '20,20,20'},${R() * 0.18})`; g.lineWidth = 0.6; const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 40, y + (R() - 0.5) * 6); g.stroke(); }
  for (let i = 0; i < 40; i++) blob(g, R() * w, R() * h, 8 + R() * 30, `rgba(${110 + R() * 40 | 0},${50 + R() * 20 | 0},20,${0.4 + R() * 0.4})`);
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${90 + R() * 60 | 0},${40 + R() * 20 | 0},15,${R() * 0.5})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
});
const bloodTex = tex(256, 256, (g, w, h) => {
  g.drawImage(steelTex.image, 0, 0);
  for (let i = 0; i < 30; i++) blob(g, R() * w, R() * h, 10 + R() * 40, 'rgba(70,4,2,0.75)');
  for (let i = 0; i < 20; i++) { g.strokeStyle = 'rgba(60,2,2,0.8)'; g.lineWidth = 2 + R() * 4; const x = R() * w; g.beginPath(); g.moveTo(x, R() * h); g.lineTo(x + (R() - 0.5) * 20, R() * h); g.stroke(); }
});
const woodTex = tex(128, 256, (g, w, h) => {
  g.fillStyle = '#5a3c22'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x++) { g.fillStyle = `rgba(${R() < 0.5 ? '30,18,8' : '120,90,60'},${0.1 + R() * 0.15})`; g.fillRect(x, 0, 1, h); }
  for (let i = 0; i < 12; i++) blob(g, R() * w, R() * h, 4 + R() * 10, 'rgba(25,12,6,0.6)');
  for (let i = 0; i < 16; i++) blob(g, R() * w, R() * h, 8 + R() * 20, 'rgba(60,4,2,0.55)');
  for (let i = 0; i < 30; i++) blob(g, R() * w, R() * h, 6 + R() * 16, 'rgba(20,14,8,0.5)');   // grime from handling
});
const tapeTex = tex(64, 64, (g, w, h) => {
  g.fillStyle = '#1e1e1c'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(80,80,70,0.5)'; g.fillRect(0, y, w, 1); }
  for (let i = 0; i < 8; i++) blob(g, R() * w, R() * h, 6 + R() * 10, 'rgba(70,4,2,0.6)');
});
const leatherTex = tex(64, 64, (g, w, h) => {
  g.fillStyle = '#3e2816'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 6) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y, w, 1.5); }
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.3})`; g.fillRect(R() * w, R() * h, 1, 1); }
});
const M = {
  steel: new THREE.MeshStandardMaterial({ map: steelTex, metalness: 0.65, roughness: 0.55 }),
  bloody: new THREE.MeshStandardMaterial({ map: bloodTex, metalness: 0.5, roughness: 0.5 }),
  edge: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.9, roughness: 0.25 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x5a2c14, map: steelTex, metalness: 0.3, roughness: 0.85 }),
  wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 }),
  tape: new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.9 }),
  leather: new THREE.MeshStandardMaterial({ map: leatherTex, roughness: 0.75 }),
  brass: new THREE.MeshStandardMaterial({ color: 0x8a6a30, metalness: 0.8, roughness: 0.4 }),
  red: new THREE.MeshStandardMaterial({ color: 0x5a1410, roughness: 0.7 }),
  lens: new THREE.MeshBasicMaterial({ color: 0xfff2c8 }),
  black: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 }),
};
export const WM = M;

// len: grip to tip. blade: where along the length the cutting part starts (0..1).
export const WEAPONS = {
  machete: { name: 'Machete', len: 0.7, melee: true, blade: 0.2, dmg: 4.5 },
  axe: { name: 'Axe', len: 0.86, melee: true, blade: 0.8, dmg: 6, halves: true, heavy: true },
  knife: { name: 'Hunting knife', len: 0.32, melee: true, blade: 0.36, dmg: 2.5, tiltVR: 0.8, tiltDesk: 0.1, thrust: true },
  pitchfork: { name: 'Pitchfork', len: 1.45, melee: true, blade: 0.82, dmg: 3, thrust: true, impale: true, tiltVR: 0.25, tiltDesk: 0.1 },
};
const HANDLE = -Math.PI / 2;
// where the fist closes on each (tool space) and how it's rolled round the handle
export const GRIPS = {
  machete: [[0, 0, -0.05], HANDLE], axe: [[0, 0, -0.08], HANDLE], knife: [[0, 0, -0.035], HANDLE], pitchfork: [[0, 0, -0.35], HANDLE],
};
function box(g, mat, w, h, d, x, y, z, rx = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; }
function cyl(g, mat, r0, r1, len, x, y, z, seg = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, seg), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; }
// a flat blade shape extruded thin, lying in the YZ plane
function bladeShape(pts, thick, mat) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.4, bevelSize: 0.002, bevelSegments: 1 });
  geo.translate(0, 0, -thick / 2); geo.rotateY(Math.PI / 2);   // shape x -> -z (along the tool), shape y -> y
  // planar UVs from the outline
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, -p.getZ(i) * 2, p.getY(i) * 4);
  return new THREE.Mesh(geo, mat);
}

export function buildWeapon(kind) {
  const g = new THREE.Group();
  switch (kind) {
    case 'machete': {
      // taped wooden grip, riveted, a long blade with a belly and a clipped tip
      cyl(g, M.tape, 0.017, 0.016, 0.16, 0, 0, -0.04, 10);
      for (let i = 0; i < 7; i++) cyl(g, M.tape, 0.0182, 0.0182, 0.006, 0, 0, 0.03 - i * 0.022, 10);
      cyl(g, M.wood, 0.019, 0.019, 0.02, 0, 0, 0.045);
      for (const z of [-0.01, -0.08]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6), M.brass); r.rotation.z = Math.PI / 2; r.position.set(0, 0, z); g.add(r); }
      box(g, M.rust, 0.012, 0.05, 0.012, 0, 0.005, -0.125);   // bolster
      const b = bladeShape([[0.13, 0.018], [0.4, 0.03], [0.6, 0.032], [0.67, 0.02], [0.7, -0.005], [0.66, -0.035], [0.45, -0.04], [0.13, -0.022]], 0.004, M.bloody);
      g.add(b);
      const e = bladeShape([[0.14, -0.022], [0.45, -0.04], [0.66, -0.035], [0.7, -0.005], [0.69, -0.012], [0.65, -0.03], [0.45, -0.034], [0.14, -0.017]], 0.0046, M.edge);
      g.add(e);
      break;
    }
    case 'axe': {
      // long hickory haft, worn smooth and stained, a rusted wedge head
      const haft = cyl(g, M.wood, 0.019, 0.016, 0.86, 0, 0, -0.39, 10); haft.scale.x = 0.82;
      const head = new THREE.Group(); head.position.set(0, 0.02, -0.79); g.add(head);
      const eye = box(head, M.rust, 0.04, 0.06, 0.07, 0, 0, 0);
      const s = new THREE.Shape(); s.moveTo(-0.035, 0.02); s.lineTo(0.13, 0.075); s.quadraticCurveTo(0.16, 0, 0.13, -0.075); s.lineTo(-0.035, -0.02); s.closePath();
      const wedge = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.004, bevelSegments: 1 }), M.bloody);
      wedge.geometry.translate(0, 0, -0.006); wedge.rotation.set(0, Math.PI / 2, Math.PI / 2); head.add(wedge);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.15), M.edge); edge.position.set(0, 0.155, 0); head.add(edge);
      box(head, M.rust, 0.036, 0.04, 0.05, 0, -0.045, 0);   // poll
      break;
    }
    case 'knife': {
      // stacked leather handle, brass guard, clip-point blade
      for (let i = 0; i < 9; i++) cyl(g, i % 3 ? M.leather : M.black, 0.0145, 0.0145, 0.011, 0, 0, 0.05 - i * 0.011, 10);
      cyl(g, M.brass, 0.016, 0.016, 0.012, 0, 0, 0.06);
      box(g, M.brass, 0.012, 0.075, 0.01, 0, -0.004, -0.05);
      const b = bladeShape([[0.055, 0.017], [0.22, 0.017], [0.27, 0.012], [0.32, 0.0], [0.28, -0.012], [0.2, -0.02], [0.055, -0.016]], 0.004, M.bloody);
      g.add(b);
      const e = bladeShape([[0.06, -0.016], [0.2, -0.02], [0.28, -0.012], [0.32, 0.0], [0.31, -0.002], [0.27, -0.011], [0.2, -0.016], [0.06, -0.012]], 0.0046, M.edge);
      g.add(e);
      break;
    }
    case 'pitchfork': {
      // ash shaft, an iron socket and three long tines
      cyl(g, M.wood, 0.017, 0.016, 1.2, 0, 0, -0.43, 10);
      cyl(g, M.rust, 0.022, 0.018, 0.1, 0, 0, -1.06, 10);
      box(g, M.rust, 0.16, 0.022, 0.025, 0, 0, -1.115);
      for (const x of [-0.07, 0, 0.07]) {
        const t = cyl(g, M.rust, 0.007, 0.0025, 0.33, x, 0, -1.29, 6);
        if (x) { t.rotation.z = 0; t.position.x = x * 0.95; }
      }
      for (const x of [-0.07, 0, 0.07]) { const tip = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.03, 6), M.bloody); tip.rotation.x = -Math.PI / 2; tip.position.set(x * 0.95, 0, -1.45); g.add(tip); }
      break;
    }
  }
  g.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return g;
}

// the sheath on your hip and the strap the axe rides in
export function buildSheath() {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.5), M.leather); s.position.z = -0.25; g.add(s);
  for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.046, 0.01), M.black); st.position.z = -0.05 - i * 0.18; g.add(st); }
  return g;
}

// a counselor's flashlight and its beam (no real light: an additive cone that shows up in the fog)
const beamTex = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.75, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,245,215,0.9)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); return t;
})();
export function buildFlashlight() {
  const g = new THREE.Group();
  cyl(g, M.black, 0.017, 0.017, 0.2, 0, 0, -0.04, 10); cyl(g, M.black, 0.026, 0.02, 0.05, 0, 0, -0.15, 12);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.023, 12), M.lens); lens.position.z = -0.176; lens.rotation.y = Math.PI; g.add(lens);
  const beamGeo = new THREE.ConeGeometry(2.4, 14, 20, 1, true); beamGeo.translate(0, -7, 0); beamGeo.rotateX(Math.PI / 2);   // apex at the lens, opening down -Z
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ map: beamTex, color: 0x6a6250, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  beam.position.z = -0.17; g.add(beam);
  // a pool of light where it lands
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x3a362a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })() }));
  pool.rotation.x = -Math.PI / 2;
  g.userData = { beam, pool, lens };
  return g;
}
