// The building kit: houses, cabins, lodges and barns put together from a floor plan.
// Walls have real holes for doors and windows, rooms are split by inner walls,
// doors swing on hinges, and every room is furnished and lit.
//
// A plan is in the building's own space: x across, z front (+) to back (-), floor at y = 0.
// Buildings only turn in quarter turns, so every wall lines up with the world grid
// and its collision box is exact.
import * as THREE from '../vendor/three.module.js';

export const DOOR_H = 2.05, WIN_Y0 = 0.95, WIN_Y1 = 1.85;

// ---------------------------------------------------------------- textures
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
const R = Math.random;
function planks(base, gap = 32, vertical = false, grain = 10) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < (vertical ? w : h); i++) {
      const v = Math.sin(i * 0.33) * 6 + R() * grain;
      g.fillStyle = `rgba(${base[0] + v | 0},${base[1] + v * 0.8 | 0},${base[2] + v * 0.5 | 0},0.45)`;
      if (vertical) g.fillRect(i, 0, 1, h); else g.fillRect(0, i, w, 1);
    }
    if (gap) for (let p = 0; p < (vertical ? w : h); p += gap) { g.fillStyle = 'rgba(12,7,3,0.8)'; if (vertical) g.fillRect(p, 0, 2, h); else g.fillRect(0, p, w, 2); }
    for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(28,16,8,0.45)'; g.beginPath(); g.ellipse(R() * w, R() * h, 2 + R() * 4, 1.5 + R() * 2, vertical ? 1.57 : 0, 0, 7); g.fill(); }
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.12})`; g.fillRect(R() * w, R() * h, vertical ? 1 : 3 + R() * 10, vertical ? 3 + R() * 10 : 1); }
  });
}
function logs() {
  return canvasTex(256, 256, (g, w, h) => {
    for (let y = 0; y < h; y += 32) {
      const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, '#2a1c12'); gr.addColorStop(0.2, '#6a4a32'); gr.addColorStop(0.55, '#5a3e28'); gr.addColorStop(0.9, '#33231a'); gr.addColorStop(1, '#1a110b');
      g.fillStyle = gr; g.fillRect(0, y, w, 32);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(20,12,6,${R() * 0.4})`; g.fillRect(R() * w, y + 4 + R() * 24, 6 + R() * 30, 1); }
    }
  });
}
// round logs seen from inside: lighter, weathered grey-honey, chinking between
function logsLight() {
  return canvasTex(256, 256, (g, w, h) => {
    for (let y = 0; y < h; y += 32) {
      const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, '#5a4a38'); gr.addColorStop(0.18, '#a08a6a'); gr.addColorStop(0.5, '#8e7858'); gr.addColorStop(0.85, '#6a5640'); gr.addColorStop(1, '#c8bca0');
      g.fillStyle = gr; g.fillRect(0, y, w, 32);
      g.fillStyle = 'rgba(200,190,160,0.8)'; g.fillRect(0, y + 29, w, 3);   // chinking
      for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(40,30,20,${R() * 0.35})`; g.fillRect(R() * w, y + 4 + R() * 22, 8 + R() * 40, 1); }
      for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(50,36,22,0.6)'; g.beginPath(); g.ellipse(R() * w, y + 16, 4, 6, 0, 0, 7); g.fill(); }
    }
  });
}
// board-and-batten: wide vertical boards, a thin strip over each joint, weathered
function batten(base, wear = 0.6) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) { const v = Math.sin(x * 0.4) * 5 + R() * 12; g.fillStyle = `rgba(${base[0] + v | 0},${base[1] + v * 0.8 | 0},${base[2] + v * 0.6 | 0},0.5)`; g.fillRect(x, 0, 1, h); }
    for (let x = 0; x < w; x += 42) { g.fillStyle = 'rgba(10,6,3,0.7)'; g.fillRect(x + 36, 0, 2, h); g.fillStyle = `rgba(${base[0] + 16},${base[1] + 12},${base[2] + 8},1)`; g.fillRect(x + 33, 0, 8, h); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 41, 0, 2, h); }
    for (let i = 0; i < 500 * wear; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '160,150,130' : '20,14,8'},${R() * 0.18})`; g.fillRect(R() * w, R() * h, 1, 4 + R() * 30); }
    const gr = g.createLinearGradient(0, h, 0, h * 0.7); gr.addColorStop(0, 'rgba(20,14,8,0.5)'); gr.addColorStop(1, 'rgba(20,14,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);   // damp near the ground
  });
}
function shingles() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 14) for (let x = -(y / 14 % 2) * 10; x < w; x += 20 + R() * 6) { const c = 50 + R() * 25 | 0; g.fillStyle = `rgb(${c},${c * 0.72 | 0},${c * 0.5 | 0})`; g.fillRect(x, y, 18 + R() * 5, 13); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y + 12, 22, 2); }
  });
}
function junkTex() {
  return canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 9; i++) {   // patches: rusted tin, grey boards, a door, tarpaper
      const x = R() * w, y = R() * h, pw = 50 + R() * 90, ph = 50 + R() * 90, k = R() * 4 | 0;
      if (k === 0) { for (let xx = 0; xx < pw; xx += 6) { g.fillStyle = `rgb(${90 + R() * 40 | 0},${60 + R() * 20 | 0},${40})`; g.fillRect(x + xx, y, 6, ph); } }
      else if (k === 1) { g.fillStyle = '#5a5a52'; g.fillRect(x, y, pw, ph); for (let yy = 0; yy < ph; yy += 12) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y + yy, pw, 2); } }
      else if (k === 2) { g.fillStyle = '#7a7e7a'; g.fillRect(x, y, pw, ph); for (let xx = 0; xx < pw; xx += 8) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + xx, y, 3, ph); } }
      else { g.fillStyle = '#2a2622'; g.fillRect(x, y, pw, ph); }
      for (let j = 0; j < 20; j++) { g.fillStyle = `rgba(110,50,20,${R() * 0.5})`; g.beginPath(); g.arc(x + R() * pw, y + R() * ph, 2 + R() * 8, 0, 7); g.fill(); }
    }
  });
}
function screenTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,40,40,0.55)'; for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1, h); for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
    g.fillStyle = '#5a4a36'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h); g.fillRect(0, 0, w, 12); g.fillRect(0, h - 16, w, 16); g.fillRect(0, h * 0.5 - 6, w, 12);
  });
}
function wallpaper(base, ink, kind) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = ink; g.strokeStyle = ink;
    if (kind === 'stripe') for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 10, h);
    else if (kind === 'floral') for (let y = 16; y < h; y += 48) for (let x = (y / 48 % 2) * 32 + 16; x < w; x += 64) { for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + Math.cos(k * 1.26) * 6, y + Math.sin(k * 1.26) * 6, 5, 3, k * 1.26, 0, 7); g.fill(); } }
    else { g.lineWidth = 1; for (let y = 0; y < h; y += 16) { g.globalAlpha = 0.25; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
    g.globalAlpha = 1;
    // water stains and grime toward the floor
    for (let i = 0; i < 6; i++) { const x = R() * w, gr = g.createRadialGradient(x, h, 0, x, h, 60 + R() * 60); gr.addColorStop(0, 'rgba(60,40,20,0.35)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  });
}
function siding(base) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 21) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, y + 2, w, 3); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(40,30,20,${R() * 0.25})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 8); }   // peeling, dirt
  });
}
function tiles(a, b, n = 8) {
  return canvasTex(256, 256, (g, w, h) => {
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s); }
    g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 1; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(50,40,30,${R() * 0.2})`; g.beginPath(); g.arc(R() * w, R() * h, 4 + R() * 20, 0, 7); g.fill(); }
  });
}
function rugTex(c1, c2, c3) {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, h);
    g.strokeStyle = c2; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.lineWidth = 3; g.strokeStyle = c3; g.strokeRect(24, 24, w - 48, h - 48);
    g.fillStyle = c2; for (let i = 0; i < 5; i++) { g.save(); g.translate(w / 2, h / 2); g.rotate(i * 0.6); g.fillRect(-30 + i * 4, -6, 60 - i * 8, 12); g.restore(); }
    for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.15})`; g.fillRect(R() * w, R() * h, 1, 1); }
  });
}
function paintingTex(kind) {
  return canvasTex(128, 96, (g, w, h) => {
    if (kind === 0) {   // lake at dusk
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a4a6a'); gr.addColorStop(0.55, '#c08a5a'); gr.addColorStop(0.56, '#2a3a4a'); gr.addColorStop(1, '#101820'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#0c1410'; for (let x = 0; x < w; x += 6) { g.beginPath(); g.moveTo(x, h * 0.56); g.lineTo(x + 3, h * 0.3 - R() * 12); g.lineTo(x + 6, h * 0.56); g.fill(); }
    } else if (kind === 1) {   // a stag
      g.fillStyle = '#4a3a22'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c140a'; g.beginPath(); g.ellipse(64, 60, 26, 14, 0, 0, 7); g.fill(); g.fillRect(44, 64, 4, 24); g.fillRect(80, 64, 4, 24); g.beginPath(); g.ellipse(92, 40, 7, 9, 0.4, 0, 7); g.fill();
      g.strokeStyle = '#1c140a'; g.lineWidth = 2; g.beginPath(); g.moveTo(92, 32); g.lineTo(84, 14); g.moveTo(94, 32); g.lineTo(104, 14); g.stroke();
    } else if (kind === 2) {   // an old family photo
      g.fillStyle = '#b8a888'; g.fillRect(0, 0, w, h); g.fillStyle = '#6a5a44';
      for (const x of [34, 64, 94]) { g.beginPath(); g.arc(x, 36, 10, 0, 7); g.fill(); g.fillRect(x - 13, 46, 26, 40); }
    } else {   // a band poster
      g.fillStyle = '#121014'; g.fillRect(0, 0, w, h); g.fillStyle = '#c02a2a'; g.font = 'bold 22px Impact, Arial'; g.textAlign = 'center'; g.fillText(['LIVE!', 'ROCK', 'TOUR 84'][R() * 3 | 0], 64, 34);
      g.fillStyle = '#e8d8b0'; g.beginPath(); g.moveTo(30, 90); g.lineTo(64, 44); g.lineTo(98, 90); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  });
}
// a soft disc of light for the floor under a lamp (drawn additively)
const glowTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,190,120,0.55)'); gr.addColorStop(0.4, 'rgba(255,160,90,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;

// ---------------------------------------------------------------- materials (shared by every building)
export function kitMaterials() {
  const L = (o) => new THREE.MeshLambertMaterial(o);
  const M = {
    plank: L({ map: planks([96, 70, 46], 32, true) }), plankDark: L({ map: planks([60, 42, 28], 32, true) }),
    logInt: L({ map: logsLight() }), boardBatten: L({ map: batten([58, 44, 32]) }), barnWood: L({ map: batten([72, 58, 44], 0.9) }), brownStain: L({ map: batten([84, 56, 34], 0.4) }),
    sage: L({ map: siding('#7a8a6c') }), brownShingle: L({ map: shingles() }), junk: L({ map: junkTex() }), tarp: L({ color: 0x3a4a5a }),
    trimWhite: L({ color: 0xd8d4c8 }), screen: new THREE.MeshLambertMaterial({ map: screenTex(), transparent: true, alphaTest: 0.25, side: THREE.DoubleSide }),
    upperLit: new THREE.MeshBasicMaterial({ color: 0x8a5a2a }), upperDark: new THREE.MeshPhongMaterial({ color: 0x1c2430, specular: 0x5a6a80, shininess: 60 }), attic: L({ color: 0x14100c }),
    log: L({ map: logs() }), sidingWhite: L({ map: siding('#b8b2a2') }), sidingRed: L({ map: siding('#6a2a20') }), sidingGreen: L({ map: siding('#3e4a36') }), sidingBlue: L({ map: siding('#4a5664') }),
    panel: L({ map: planks([120, 88, 58], 42, true, 6) }), knotty: L({ map: planks([140, 104, 66], 28, true, 12) }),
    paperBeige: L({ map: wallpaper('#a89a7a', '#8a7a5a', 'floral') }), paperGreen: L({ map: wallpaper('#6a7a5a', '#5a6a4a', 'stripe') }), paperBlue: L({ map: wallpaper('#7a8698', '#6a7688', 'floral') }), plaster: L({ map: wallpaper('#b8b0a0', '#a09888', 'plain') }),
    floor: L({ map: planks([92, 62, 40], 24) }), floorDark: L({ map: planks([58, 40, 26], 24) }), linoleum: L({ map: tiles('#a8a090', '#6a6458') }), bathTile: L({ map: tiles('#c8c8c0', '#b0b0a8', 12) }),
    ceiling: L({ map: planks([150, 120, 86], 40, true, 4) }),
    roof: L({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2a2622'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 16; x < w; x += 32) { const c = 30 + R() * 25; g.fillStyle = `rgb(${c},${c * 0.92},${c * 0.85})`; g.fillRect(x, y, 30, 14); } for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(40,60,30,0.35)'; g.beginPath(); g.arc(R() * w, R() * h, 6 + R() * 14, 0, 7); g.fill(); } }, [2, 2]) }),
    tin: L({ map: canvasTex(128, 128, (g, w, h) => { for (let x = 0; x < w; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, '#5a5c5e'); gr.addColorStop(0.5, '#8a8c8e'); gr.addColorStop(1, '#4a4c4e'); g.fillStyle = gr; g.fillRect(x, 0, 8, h); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(110,50,20,${R() * 0.5})`; g.beginPath(); g.arc(R() * w, R() * h, 3 + R() * 10, 0, 7); g.fill(); } }, [3, 3]) }),
    stone: L({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#4a4a48'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const c = 60 + R() * 50 | 0; g.fillStyle = `rgb(${c},${c},${c - 4})`; g.beginPath(); g.ellipse(R() * w, R() * h, 8 + R() * 10, 6 + R() * 6, R() * 3, 0, 7); g.fill(); g.strokeStyle = '#202020'; g.stroke(); } }) }),
    brick: L({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#3a3430'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) for (let x = (y / 12 % 2) * 14; x < w; x += 28) { g.fillStyle = `rgb(${110 + R() * 40 | 0},${48 + R() * 20 | 0},${36})`; g.fillRect(x + 1, y + 1, 26, 10); } }) }),
    fabricRed: L({ color: 0x6a2420 }), fabricBrown: L({ color: 0x5a4430 }), fabricGreen: L({ color: 0x3a4a30 }), fabricBlue: L({ color: 0x34405a }), fabricMustard: L({ color: 0x8a6a2a }), fabricPlaid: L({ map: canvasTex(64, 64, (g) => { g.fillStyle = '#6a2a22'; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(20,20,30,0.55)'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 6, 64); g.fillRect(0, i, 64, 6); } g.fillStyle = 'rgba(220,200,150,0.3)'; for (let i = 8; i < 64; i += 16) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); } }) }),
    mattress: L({ color: 0x8a8a7a }), sheet: L({ color: 0xb8b4a6 }), pillow: L({ color: 0xc8c2b4 }),
    metal: L({ color: 0x3c4046 }), steel: L({ color: 0x8a8e92 }), chrome: L({ color: 0xb0b4b8 }), black: L({ color: 0x141414 }), porcelain: L({ color: 0xd8d6cc }), appliance: L({ color: 0xc8c0a8 }), avocado: L({ color: 0x7a7a3a }),
    hay: L({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#8a7a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${150 + R() * 70 | 0},${130 + R() * 50 | 0},${50 + R() * 30 | 0},0.8)`; g.beginPath(); const x = R() * w, y = R() * h; g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 14, y + (R() - 0.5) * 6); g.stroke(); } }) }),
    crate: L({ map: planks([110, 84, 52], 21) }), green: L({ color: 0x2c4a2a }), plant: L({ color: 0x2a4a22 }), soil: L({ color: 0x2a1e14 }),
    glass: new THREE.MeshBasicMaterial({ color: 0x8aa0b8, transparent: true, opacity: 0.12, depthWrite: false }),
    // lit window glass: warm while the power's on; cut the power and it goes dark
    windowLit: new THREE.MeshBasicMaterial({ color: 0xffb860, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
    bulb: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), flame: new THREE.MeshBasicMaterial({ color: 0xffa040 }), tube: new THREE.MeshBasicMaterial({ color: 0xe8f0ff }),
    shade: L({ color: 0xd8c8a0, emissive: 0x6a5030 }), shadeOff: L({ color: 0xd8c8a0 }),
    glow: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 1 }),
    glowFlame: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 1 }),
    rug: [rugTex('#5a2420', '#2a140e', '#a8884a'), rugTex('#2a3a4a', '#141c24', '#9a8a6a'), rugTex('#4a5a30', '#1e2614', '#b0a070')].map(m => L({ map: m })),
    pictures: [0, 1, 2, 3].map(k => L({ map: paintingTex(k) })),
    frame: L({ color: 0x2a1a0e }),
    flag: L({ side: THREE.DoubleSide, map: canvasTex(96, 60, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#e8e0d0' : '#a02028'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#1e2a5a'; g.fillRect(0, 0, w * 0.4, h * 7 / 13); g.fillStyle = '#e8e0d0'; for (let y = 3; y < h * 7 / 13; y += 5) for (let x = 3; x < w * 0.4; x += 6) g.fillRect(x, y, 1.5, 1.5); }) }),
    porchSign: text => L({ map: canvasTex(360, 70, (g, w, h) => { g.fillStyle = '#2a2a24'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8d0b8'; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#e8e0c8'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); }) }),
  };
  return M;
}

// ---------------------------------------------------------------- the kit
// ctx: { statics (group merged later), live (group kept as is), addSolid(x0,y0,z0,x1,y1,z1,opaque), floor(rect), bunk(rect),
//        lamps[], doors[], hides[], beds[], spots[], world }
export function makeKit(M, ctx) {
  const T = 0.14;                      // wall thickness
  const quarter = y => Math.round(y / (Math.PI / 2)) & 3;

  function building(def) {
    const { x: X, z: Z } = def, q = quarter(def.yaw ?? 0), yaw = q * Math.PI / 2;
    const W = def.w, D = def.d, H = def.h ?? 2.6, FH = def.floorY ?? 0.2;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const g = new THREE.Group(); g.position.set(X, 0, Z); g.rotation.y = yaw; ctx.statics.add(g);
    const live = new THREE.Group(); live.position.copy(g.position); live.rotation.y = yaw; ctx.live.add(live);
    const toW = (lx, lz) => ({ x: X + lx * c + lz * s, z: Z - lx * s + lz * c });
    // a local rectangle to a world box (exact, since we only turn in quarter turns)
    const solid = (x0, z0, x1, z1, y0, y1, opaque = true) => {
      const a = toW(x0, z0), b = toW(x1, z1);
      return ctx.addSolid(Math.min(a.x, b.x), y0, Math.min(a.z, b.z), Math.max(a.x, b.x), y1, Math.max(a.z, b.z), opaque);
    };
    const box = (mat, w, h, d, x, y, z, parent = g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
    const B = { def, g, live, toW, solid, box, W, D, H, FH, yaw, rooms: [], inside: null, door: null };
    const ext = M[def.ext ?? 'plank'], int = M[def.int ?? 'panel'];

    // ---- floor, the platform it stands on, the ceiling
    box(M.plankDark, W + 0.3, FH, D + 0.3, 0, FH / 2, 0);
    ctx.floor(X, Z, yaw, 0, 0, W + 0.3, D + 0.3, FH);
    for (const r of def.rooms ?? [{ x0: -W / 2, z0: -D / 2, x1: W / 2, z1: D / 2 }]) {
      const fm = M[r.floor ?? def.floorMat ?? 'floor'].clone(); fm.map = fm.map?.clone(); if (fm.map) { fm.map.needsUpdate = true; fm.map.repeat.set((r.x1 - r.x0) / 2, (r.z1 - r.z0) / 2); }
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), fm); fl.rotation.x = -Math.PI / 2; fl.position.set((r.x0 + r.x1) / 2, FH + 0.004, (r.z0 + r.z1) / 2); g.add(fl);
      const cm = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), M[def.ceil ?? 'ceiling']); cm.rotation.x = Math.PI / 2; cm.position.set((r.x0 + r.x1) / 2, FH + H - 0.01, (r.z0 + r.z1) / 2); g.add(cm);
      B.rooms.push({ ...r, w: toW((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2) });
    }

    // ---- walls: outside ones with doors and windows cut in, then the inner walls
    // a wall from (ax, az) to (bx, bz), axis-aligned; holes: [{ at (centre, along the wall from a), w, kind: 'door'|'window'|'arch', door: panel? }]
    const wall = (ax, az, bx, bz, holes, outMat, inMat, outward) => {
      const alongX = Math.abs(bx - ax) > Math.abs(bz - az), len = alongX ? Math.abs(bx - ax) : Math.abs(bz - az), dir = alongX ? Math.sign(bx - ax) : Math.sign(bz - az);
      const P = t => alongX ? [ax + dir * t, az] : [ax, az + dir * t];
      const piece = (t0, t1, y0, y1) => {
        if (t1 - t0 < 0.01 || y1 - y0 < 0.01) return;
        const [p0x, p0z] = P(t0), [p1x, p1z] = P(t1), cx = (p0x + p1x) / 2, cz = (p0z + p1z) / 2, l = t1 - t0, cy = FH + (y0 + y1) / 2, hgt = y1 - y0;
        if (outward) {   // two skins: weathered outside, finished inside
          const ox = alongX ? 0 : outward * T / 4, oz = alongX ? outward * T / 4 : 0;
          box(outMat, alongX ? l : T / 2, hgt, alongX ? T / 2 : l, cx + ox, cy, cz + oz);
          box(inMat, alongX ? l : T / 2, hgt, alongX ? T / 2 : l, cx - ox, cy, cz - oz);
        } else box(inMat, alongX ? l : T, hgt, alongX ? T : l, cx, cy, cz);
      };
      const hs = [...(holes ?? [])].map(h => ({ ...h, t0: h.at - h.w / 2, t1: h.at + h.w / 2 })).sort((a, b) => a.t0 - b.t0);
      let t = 0;
      const span = (t0, t1, opaque) => {   // collision for a run of wall
        if (t1 - t0 < 0.01) return;
        const [p0x, p0z] = P(t0), [p1x, p1z] = P(t1);
        solid(Math.min(p0x, p1x) - (alongX ? 0 : T / 2), Math.min(p0z, p1z) - (alongX ? T / 2 : 0), Math.max(p0x, p1x) + (alongX ? 0 : T / 2), Math.max(p0z, p1z) + (alongX ? T / 2 : 0), 0, FH + H, opaque);
      };
      for (const h of hs) {
        piece(t, h.t0, 0, H); span(t, h.t0, true);
        if (h.kind === 'window') {
          piece(h.t0, h.t1, 0, WIN_Y0); piece(h.t0, h.t1, WIN_Y1, H); span(h.t0, h.t1, false);
          const [mx, mz] = P(h.at);
          const pane = new THREE.Mesh(new THREE.PlaneGeometry(h.w, WIN_Y1 - WIN_Y0), h.lit === false ? M.glass : M.windowLit);
          pane.position.set(mx, FH + (WIN_Y0 + WIN_Y1) / 2, mz); if (!alongX) pane.rotation.y = Math.PI / 2; pane.userData.keep = true; live.add(pane);
          // frame and a cross bar
          // frame, sill, and the bars that make six panes
          const trim = M[def.trim === 'white' ? 'trimWhite' : 'plankDark'];
          for (const [fw, fh, fy] of [[h.w + 0.1, 0.07, WIN_Y0], [h.w + 0.1, 0.07, WIN_Y1]]) box(trim, alongX ? fw : T + 0.05, fh, alongX ? T + 0.05 : fw, mx, FH + fy, mz);
          for (const sgn of [-1, 1]) { const [ex, ez] = P(h.at + sgn * (h.w / 2 + 0.02)); box(trim, alongX ? 0.06 : T + 0.05, WIN_Y1 - WIN_Y0, alongX ? T + 0.05 : 0.06, ex, FH + (WIN_Y0 + WIN_Y1) / 2, ez); }
          for (const k of [-1, 1]) { const [bx2, bz2] = P(h.at + k * h.w / 6); box(trim, alongX ? 0.025 : T + 0.02, WIN_Y1 - WIN_Y0, alongX ? T + 0.02 : 0.025, bx2, FH + (WIN_Y0 + WIN_Y1) / 2, bz2); }
          box(trim, alongX ? h.w : T + 0.02, 0.025, alongX ? T + 0.02 : h.w, mx, FH + (WIN_Y0 + WIN_Y1) / 2, mz);
          box(trim, alongX ? h.w + 0.16 : 0.12, 0.04, alongX ? 0.12 : h.w + 0.16, mx + (alongX ? 0 : (outward ?? 0) * 0.07), FH + WIN_Y0 - 0.04, mz + (alongX ? (outward ?? 0) * 0.07 : 0));
        } else {
          const top = h.kind === 'arch' ? Math.min(H, 2.3) : DOOR_H;
          piece(h.t0, h.t1, top, H);
          if (h.kind === 'door' && h.panel !== false) door(P, h, alongX, outward);
          // a frame round the doorway
          const [mx, mz] = P(h.at);
          for (const sgn of [-1, 1]) { const [fx, fz] = P(h.at + sgn * (h.w / 2 + 0.03)); box(M.plankDark, alongX ? 0.06 : T + 0.05, top, alongX ? T + 0.05 : 0.06, fx, FH + top / 2, fz); }
          box(M.plankDark, alongX ? h.w + 0.12 : T + 0.05, 0.08, alongX ? T + 0.05 : h.w + 0.12, mx, FH + top, mz);
        }
        t = h.t1;
      }
      piece(t, len, 0, H); span(t, len, true);
    };
    // a door on a hinge at one side of the hole; swings open when anyone comes near
    const door = (P, h, alongX, outward) => {
      const [hx, hz] = P(h.t0 + 0.02), hinge = new THREE.Group(); hinge.position.set(hx, FH, hz); live.add(hinge);
      const dw = h.w - 0.04, panel = new THREE.Mesh(new THREE.BoxGeometry(dw, DOOR_H - 0.03, 0.045), M[h.mat ?? (outward ? (def.screenDoor ? 'screen' : 'plankDark') : 'panel')]);
      panel.position.set(dw / 2, (DOOR_H - 0.03) / 2, 0); hinge.add(panel);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.chrome); knob.position.set(dw - 0.08, 1.0, 0.04); hinge.add(knob);
      const knob2 = knob.clone(); knob2.position.z = -0.04; hinge.add(knob2);
      // which way along the wall the panel lies, and which way it swings (into the room)
      const along = alongX ? Math.atan2(0, 1) : -Math.PI / 2;
      const [px, pz] = P(h.t0 + 1), base = Math.atan2(-(pz - hz), px - hx);
      hinge.rotation.y = base;
      const [mx, mz] = P(h.at);
      const wpos = toW(mx, mz), A = toW(...P(h.t0)), Bp = toW(...P(h.t1));
      const box3 = ctx.world.addBox(new THREE.Vector3(Math.min(A.x, Bp.x) - (Math.abs(A.x - Bp.x) < 0.1 ? 0.06 : 0), 0, Math.min(A.z, Bp.z) - (Math.abs(A.z - Bp.z) < 0.1 ? 0.06 : 0)),
        new THREE.Vector3(Math.max(A.x, Bp.x) + (Math.abs(A.x - Bp.x) < 0.1 ? 0.06 : 0), FH + DOOR_H, Math.max(A.z, Bp.z) + (Math.abs(A.z - Bp.z) < 0.1 ? 0.06 : 0)), false);
      ctx.doors.push({ hinge, base, swing: (h.swing ?? 1) * (outward ? (alongX ? outward : -outward) : 1) * 1.45, open: h.open ?? 0, target: 0, x: wpos.x, z: wpos.z, box: box3, y1: FH + DOOR_H, hold: 0, building: B, locked: !!h.locked, hp: 3, broken: false, panel, ext: !!outward });
      void along;
    };
    const holesOn = side => (def.holes ?? []).filter(h => h.side === side).map(h => ({ ...h, kind: h.kind ?? 'window', w: h.w ?? (h.kind === 'door' ? 1.0 : 0.9) }));
    // the four outside walls: front (+z), back (-z), left (-x), right (+x); 'at' measured from the left (or the back) end
    wall(-W / 2, D / 2, W / 2, D / 2, holesOn('front').map(h => ({ ...h, at: h.at + W / 2 })), ext, int, 1);
    wall(-W / 2, -D / 2, W / 2, -D / 2, holesOn('back').map(h => ({ ...h, at: h.at + W / 2 })), ext, int, -1);
    wall(-W / 2, -D / 2, -W / 2, D / 2, holesOn('left').map(h => ({ ...h, at: h.at + D / 2 })), ext, int, -1);
    wall(W / 2, -D / 2, W / 2, D / 2, holesOn('right').map(h => ({ ...h, at: h.at + D / 2 })), ext, int, 1);
    if (def.loftDoor) { box(M.attic, 1.8, 1.5, 0.05, 0, FH + H - 1.0, D / 2 + T / 2 + 0.03); for (const sx of [-0.95, 0.95]) box(M.plankDark, 0.1, 1.6, 0.08, sx, FH + H - 1.0, D / 2 + T / 2 + 0.05); box(M.plankDark, 2.0, 0.1, 0.08, 0, FH + H - 0.2, D / 2 + T / 2 + 0.05); box(M.plankDark, 0.12, 0.12, 1.2, 0, FH + H + 0.35, D / 2 + 0.5); }
    // corner posts so the skins meet cleanly
    for (const [px, pz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) box(ext, T + 0.02, H, T + 0.02, px, FH + H / 2, pz);
    // inner walls: [x0, z0, x1, z1, holes along it (doors default)]
    for (const w of def.walls ?? []) {
      const [ax, az, bx, bz, holes = [], mat] = w;
      wall(ax, az, bx, bz, holes.map(h => typeof h === 'number' ? { at: h - (Math.abs(bx - ax) > Math.abs(bz - az) ? Math.min(ax, bx) : Math.min(az, bz)), w: 0.95, kind: 'door' } : { ...h, at: h.at - (Math.abs(bx - ax) > Math.abs(bz - az) ? Math.min(ax, bx) : Math.min(az, bz)), w: h.w ?? 0.95, kind: h.kind ?? 'door' }), int, M[mat] ?? int, 0);
    }

    // ---- the roof
    const roof = def.roof ?? 'gable', pitch = def.pitch ?? (roof === 'aframe' ? 0.95 : 0.5), over = 0.35;
    let top = FH + H;
    if (def.upper) {
      // an upstairs you can see from outside (lit windows, the walls) but don't walk into
      const UH = def.upper.h ?? 2.4;
      box(M.attic, W - 0.1, 0.05, D - 0.1, 0, top + 0.03, 0);
      for (const [ax, az, bx, bz, side] of [[-W / 2, D / 2, W / 2, D / 2, 'front'], [-W / 2, -D / 2, W / 2, -D / 2, 'back'], [-W / 2, -D / 2, -W / 2, D / 2, 'left'], [W / 2, -D / 2, W / 2, D / 2, 'right']]) {
        const alongX = side === 'front' || side === 'back', len = alongX ? W : D;
        box(ext, alongX ? len + T : T, UH, alongX ? T : len + T, (ax + bx) / 2, top + UH / 2, (az + bz) / 2);
        for (const at of def.upper[side] ?? []) {
          const lit = R() < 0.6, pane = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.0), lit ? M.upperLit : M.upperDark);
          const o = (side === 'front' || side === 'right') ? 1 : -1;
          pane.position.set(alongX ? at : ax + o * (T / 2 + 0.01), top + 1.2, alongX ? az + o * (T / 2 + 0.01) : at); pane.rotation.y = alongX ? (o > 0 ? 0 : Math.PI) : (o > 0 ? Math.PI / 2 : -Math.PI / 2); g.add(pane);
          const trimM = M[def.trim === 'white' ? 'trimWhite' : 'plankDark'];
          box(trimM, alongX ? 0.95 : T + 0.06, 0.06, alongX ? T + 0.06 : 0.95, pane.position.x, top + 0.69, pane.position.z);
          box(trimM, alongX ? 0.95 : T + 0.06, 0.06, alongX ? T + 0.06 : 0.95, pane.position.x, top + 1.71, pane.position.z);
          box(trimM, alongX ? 0.03 : T + 0.04, 1.0, alongX ? T + 0.04 : 0.03, pane.position.x, top + 1.2, pane.position.z);
        }
      }
      top += UH;
    }
    if (roof === 'flat') {
      box(M[def.roofMat ?? 'tin'], W + 0.3, 0.12, D + 0.3, 0, top + 0.06, 0);
    } else if (roof === 'shed') {
      const r = box(M[def.roofMat ?? 'roof'], W + 0.5, 0.08, D + 0.6, 0, top + 0.25, 0); r.rotation.x = -0.12;
    } else {
      // ridge along x; slopes fall to the front and back
      const run = D / 2 + over, len = run / Math.cos(pitch), rise = Math.tan(pitch) * D / 2;
      for (const sgn of [-1, 1]) { const r = box(M[def.roofMat ?? 'roof'], W + over * 2, 0.08, len, 0, top + rise / 2 - Math.tan(pitch) * over / 2, sgn * (run / 2 - over / 2 + over / 2)); r.position.z = sgn * (D / 4); r.position.y = top + rise / 2; r.rotation.x = sgn * pitch; }
      const gable = new THREE.Shape(); gable.moveTo(-D / 2, 0); gable.lineTo(D / 2, 0); gable.lineTo(0, rise); gable.closePath();
      for (const sgn of [-1, 1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(gable), ext); m.position.set(sgn * W / 2, top, 0); m.rotation.y = sgn * Math.PI / 2; g.add(m); const m2 = m.clone(); m2.rotation.y += Math.PI; m2.position.x -= sgn * 0.01; g.add(m2); }
    }
    if (roof !== 'flat' && roof !== 'shed') {
      const rise = Math.tan(pitch) * D / 2;
      // dormers poking out of the front slope, each with a lit window
      for (const dx of def.dormers ?? []) {
        const dz = D / 2 - 1.0, dy = top + Math.tan(pitch) * 1.0 - 0.1;
        box(ext, 1.4, 1.3, 1.6, dx, dy + 0.55, dz - 0.4);
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), R() < 0.6 ? M.upperLit : M.upperDark); pane.position.set(dx, dy + 0.6, dz + 0.41); g.add(pane);
        for (const sgn of [-1, 1]) { const rr = box(M[def.roofMat ?? 'roof'], 0.95, 0.06, 1.8, dx + sgn * 0.4, dy + 1.38, dz - 0.4); rr.rotation.z = -sgn * 0.6; }
      }
      if (def.atticRound) for (const sgn of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), M.upperLit); c.position.set(sgn * (W / 2 + 0.02), top + rise * 0.45, 0); c.rotation.y = sgn * Math.PI / 2; g.add(c); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 16), M.trimWhite); rim.position.copy(c.position); rim.rotation.y = c.rotation.y; g.add(rim); }
    }
    if (def.chimney) { const [cx, cz] = def.chimney; box(M.stone, 0.9, top + 2.2, 0.8, cx, (top + 2.2) / 2, cz); solid(cx - 0.45, cz - 0.4, cx + 0.45, cz + 0.4, 0, top + 2.2); }

    const furn = (f) => FURN[f[0]]?.(B, f.slice(1));
    const lamp = (p, kind, o = {}) => addLamp(B, p, kind, o);
    // ---- porch: a deck across the front with posts, a little roof and steps
    if (def.porch) {
      const pd = def.porch.d ?? 2, pw = def.porch.w ?? W, px = def.porch.x ?? 0, z0 = D / 2;
      box(M.plankDark, pw, 0.1, pd, px, FH - 0.05, z0 + pd / 2);
      ctx.floor(X, Z, yaw, px, z0 + pd / 2, pw, pd, FH);
      const trimM = M[def.trim === 'white' ? 'trimWhite' : 'plankDark'];
      for (let k = 0; k <= Math.max(1, Math.round(pw / 3)); k++) { const sx = -pw / 2 + 0.12 + k * (pw - 0.24) / Math.max(1, Math.round(pw / 3)); box(trimM, 0.14, 2.4, 0.14, px + sx, FH + 1.2, z0 + pd - 0.1); }
      box(M[def.roofMat ?? 'roof'], pw + 0.3, 0.07, pd + 0.4, px, FH + 2.45, z0 + pd / 2).rotation.x = 0.12;
      for (const sx of [-1, 1]) { box(trimM, pw / 2 - 0.8, 0.06, 0.06, px + sx * (pw / 4 + 0.4), FH + 0.85, z0 + pd - 0.08); box(trimM, pw / 2 - 0.8, 0.05, 0.05, px + sx * (pw / 4 + 0.4), FH + 0.15, z0 + pd - 0.08); for (let k = 0; k < Math.floor((pw / 2 - 0.8) / 0.18); k++) box(trimM, 0.035, 0.7, 0.035, px + sx * 0.6 + sx * k * 0.18, FH + 0.5, z0 + pd - 0.08); }
      if (def.porch.flag) { const pole = box(M.chrome, 0.03, 1.6, 0.03, px + pw / 2 - 0.3, FH + 2.3, z0 + pd - 0.05); pole.rotation.z = -0.6; const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), M.flag); fl.position.set(px + pw / 2 + 0.25, FH + 2.75, z0 + pd - 0.05); fl.rotation.z = -0.25; g.add(fl); }
      if (def.porch.sign) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.35), M.porchSign(def.porch.sign)); sg.position.set(px, FH + 2.2, z0 + pd - 0.02); g.add(sg); }
      box(M.plankDark, 1.2, FH * 0.5, 0.4, px, FH * 0.25, z0 + pd + 0.2);   // step
      ctx.floor(X, Z, yaw, px, z0 + pd + 0.2, 1.2, 0.4, FH * 0.5);
      if (def.porch.swing) furn(['porchswing', px - pw / 2 + 1.2, z0 + pd / 2, 2]);
      if (def.porch.chairs) { furn(['rocker', px + pw / 2 - 0.9, z0 + pd / 2 + 0.1, 0]); furn(['rocker', px + pw / 2 - 1.8, z0 + pd / 2 + 0.1, 0]); }
      if (def.porch.light !== false) lamp([px + 0.9, FH + 2.25, z0 + 0.25], 'porch', { power: 2.2, range: 6 });
    }

    // ---- furniture and lamps
    for (const f of def.furn ?? []) furn(f);
    for (const l of def.lamps ?? []) lamp(l.slice(0, 3).map((v, i) => i === 1 ? v + FH : v), l[3] ?? 'ceiling', l[4]);

    // ---- what the counselors know about it
    const front = def.holes?.find(h => h.side === 'front' && h.kind === 'door');
    const fd = front ? toW(front.at, D / 2 + 1.4) : toW(0, D / 2 + 1.4);
    B.door = fd; B.inside = toW(def.inside?.[0] ?? 0, def.inside?.[1] ?? 0);
    for (const r of B.rooms) if (r.kind !== 'bath' || R() < 0.5) ctx.spots.push({ x: r.w.x, z: r.w.z, kind: r.spot ?? (def.main ? 'lodge' : 'cabin'), building: B });
    for (const hd of def.hideAt ?? []) { const p = toW(hd[0], hd[1]); ctx.hides.push({ x: p.x, z: p.z, door: fd, cabin: B }); }
    return B;
  }

  // ---------------------------------------------------------------- lamps
  // every lamp glows and lights the floor under it; the nearest few to you are real lights
  function addLamp(B, [lx, ly, lz], kind, o = {}) {
    const p = B.toW(lx, lz), parent = B.g;
    const flame = kind === 'lantern' || kind === 'candle' || kind === 'fire';
    const color = o.color ?? (kind === 'tube' ? 0xdce6ff : flame ? 0xff9a40 : 0xffc888);
    if (kind === 'ceiling') {
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 12, 1, true), M.shade); shade.position.set(lx, ly - 0.08, lz); parent.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.bulb); bulb.position.set(lx, ly - 0.16, lz); parent.add(bulb);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), M.black); cord.position.set(lx, ly + 0.02, lz); parent.add(cord);
    } else if (kind === 'bare' || kind === 'porch') {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.bulb); bulb.position.set(lx, ly, lz); parent.add(bulb);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), M.metal); base.position.set(lx, ly + 0.05, lz); parent.add(base);
    } else if (kind === 'tube') {
      const fix = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.16), M.metal); fix.position.set(lx, ly, lz); parent.add(fix);
      const tubeM = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.06), M.tube); tubeM.position.set(lx, ly - 0.035, lz); parent.add(tubeM);
    } else if (kind === 'table' || kind === 'floor') {
      const h = kind === 'floor' ? 1.45 : 0.42;
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, h * 0.8, 6), M.metal); stand.position.set(lx, ly - h * 0.6, lz); parent.add(stand);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.04, 10), M.metal); foot.position.set(lx, ly - h + 0.02, lz); parent.add(foot);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.2, 12, 1, true), M.shade); shade.position.set(lx, ly, lz); parent.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M.bulb); bulb.position.set(lx, ly - 0.03, lz); parent.add(bulb);
    } else if (kind === 'lantern') {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8), M.flame); glass.position.set(lx, ly, lz); parent.add(glass);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 8), M.metal); cap.position.set(lx, ly + 0.11, lz); parent.add(cap);
    } else if (kind === 'candle') {
      for (let i = 0; i < 5; i++) { const cx = lx + (R() - 0.5) * 0.4, cz = lz + (R() - 0.5) * 0.25, h = 0.06 + R() * 0.14; const cdl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, h, 6), M.porcelain); cdl.position.set(cx, ly + h / 2, cz); parent.add(cdl); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), M.flame); fl.position.set(cx, ly + h + 0.015, cz); fl.scale.y = 1.8; parent.add(fl); }
    }
    // the pool of light on the floor beneath it
    const gr = o.range ?? (kind === 'tube' ? 7 : kind === 'candle' ? 3 : 5.5);
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(gr * 0.8, gr * 0.8), flame ? M.glowFlame : M.glow); disc.rotation.x = -Math.PI / 2; disc.position.set(lx, B.FH + 0.012, lz); parent.add(disc);
    ctx.lamps.push({ x: p.x, y: ly, z: p.z, color, power: o.power ?? (kind === 'tube' ? 3.2 : kind === 'candle' ? 1.2 : kind === 'porch' ? 2.4 : 2.8), range: gr, flicker: o.flicker ?? (flame ? 0.3 : kind === 'tube' && R() < 0.4 ? 1 : 0), powered: !flame, building: B, kind });
  }

  // ---------------------------------------------------------------- furniture
  // each: (building, [x, z, quarter turns, ...options]); front of a thing faces +z when turned 0
  const piece = (B, x, z, rot, w, d, build, opts = {}) => {
    const fg = new THREE.Group(); fg.position.set(x, B.FH, z); fg.rotation.y = (rot ?? 0) * Math.PI / 2; B.g.add(fg);
    build(fg, (mat, bw, bh, bd, bx, by, bz, parent = fg) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat); m.position.set(bx, by, bz); parent.add(m); return m; });
    if (opts.solid !== false) {
      const turned = (rot ?? 0) % 2 === 1, hw = (turned ? d : w) / 2, hd = (turned ? w : d) / 2;
      B.solid(x - hw, z - hd, x + hw, z + hd, 0, B.FH + (opts.h ?? 0.8), opts.opaque ?? false);
    }
    return fg;
  };
  const surface = (B, x, z, y) => { const p = B.toW(x, z); ctx.surfaces?.push({ x: p.x, y: B.FH + y, z: p.z, building: B }); };
  // moving parts (wardrobe doors, stall doors, curtains) go in a twin of the furniture's group that isn't merged away
  const liveOf = (B, fg) => { if (!fg.userData.lg) { const lg = new THREE.Group(); lg.position.copy(fg.position); lg.rotation.copy(fg.rotation); B.live.add(lg); fg.userData.lg = lg; } return fg.userData.lg; };
  const local = (B, fg, lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), fg.rotation.y); return B.toW(fg.position.x + v.x, fg.position.z + v.z); };
  const hide = (B, fg, kind, lx = 0, lz = 0.6, extra = {}) => { const p = local(B, fg, lx, lz), c = local(B, fg, 0, 0); ctx.hidingSpots.push({ x: c.x, z: c.z, out: p, yaw: B.yaw + fg.rotation.y, kind, building: B, y: B.FH, ...extra }); };
  const FURN = {
    bunk: (B, [x, z, rot]) => {
      const iron = B.def.ironBunks, frame = iron ? M.metal : M.plankDark;
      const fg = piece(B, x, z, rot, 0.95, 2.0, (fg, b) => {
        for (const y of [0.42, 1.42]) { b(frame, 0.92, iron ? 0.03 : 0.07, 1.98, 0, y, 0); if (iron) for (const sx of [-0.45, 0.45]) b(frame, 0.03, 0.04, 1.98, sx, y + 0.02, 0); b(M.mattress, 0.86, 0.13, 1.88, 0, y + 0.1, 0); b(M[['fabricRed', 'fabricBlue', 'fabricGreen', 'fabricPlaid'][R() * 4 | 0]], 0.88, 0.05, 1.2, 0, y + 0.18, 0.3); b(M.pillow, 0.5, 0.1, 0.32, 0, y + 0.21, -0.72); }
        for (const px of [-0.44, 0.44]) for (const pz of [-0.96, 0.96]) b(frame, iron ? 0.035 : 0.07, 1.75, iron ? 0.035 : 0.07, px, 0.87, pz);
        if (iron) for (const pz of [-0.96, 0.96]) for (const y of [0.75, 1.75]) b(frame, 0.9, 0.03, 0.03, 0, y, pz);
        else for (let i = 0; i < 4; i++) b(M.plankDark, 0.04, 0.04, 0.4, 0.46, 0.65 + i * 0.22, 0.75);   // ladder rungs
      }, { h: 0.65 });
      const turned = (rot ?? 0) % 2 === 1; ctx.bunk(B.def.x, B.def.z, B.yaw, x, z, turned ? 2 : 0.92, turned ? 0.92 : 2, B.FH + 0.62);
      bed(B, fg);
      hide(B, fg, 'underbed', 0, 0.9, { low: true });
    },
    bed: (B, [x, z, rot, dbl]) => {
      const w = dbl ? 1.45 : 1.0;
      const fg = piece(B, x, z, rot, w, 2.05, (fg, b) => {
        b(M.plankDark, w, 0.3, 2.0, 0, 0.2, 0); b(M.mattress, w - 0.06, 0.18, 1.92, 0, 0.44, 0);
        b(M.sheet, w - 0.04, 0.04, 1.9, 0, 0.54, 0); b(M[['fabricPlaid', 'fabricMustard', 'fabricBlue', 'fabricRed'][R() * 4 | 0]], w - 0.02, 0.06, 1.3, 0, 0.57, 0.3);
        for (const px of dbl ? [-0.33, 0.33] : [0]) b(M.pillow, 0.5, 0.11, 0.34, px, 0.6, -0.75);
        b(M.plankDark, w, 0.9, 0.08, 0, 0.45, -1.0);   // headboard
      }, { h: 0.6 });
      ctx.bunk(B.def.x, B.def.z, B.yaw, x, z, (rot ?? 0) % 2 ? 2 : w, (rot ?? 0) % 2 ? w : 2, B.FH + 0.58);
      bed(B, fg);
      hide(B, fg, 'underbed', 0, 0.9, { low: true });
    },
    wardrobe: (B, [x, z, rot]) => {
      const fg = piece(B, x, z, rot, 1.0, 0.6, (fg, b) => {
        b(M.plankDark, 1.0, 2.0, 0.04, 0, 1.0, -0.28); for (const sx of [-0.48, 0.48]) b(M.plankDark, 0.04, 2.0, 0.6, sx, 1.0, 0); b(M.plankDark, 1.0, 0.05, 0.6, 0, 2.0, 0); b(M.plankDark, 1.0, 0.05, 0.6, 0, 0.03, 0);
        b(M.plankDark, 1.06, 0.08, 0.64, 0, 2.06, 0);
      }, { h: 2.1, opaque: true });
      // two doors that open, with a thin crack between them to look out of
      const doors = [];
      for (const sgn of [-1, 1]) {
        const hg = new THREE.Group(); hg.position.set(sgn * 0.48, 0.05, 0.3); liveOf(B, fg).add(hg);
        const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.465, 1.92, 0.03), M.panel); pnl.position.set(-sgn * 0.233, 0.96, 0); hg.add(pnl);
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), M.chrome); k.position.set(-sgn * 0.42, 1.0, 0.02); hg.add(k);
        pnl.userData.keep = true; k.userData.keep = true; hg.userData.keep = true; doors.push({ hinge: hg, sgn });
      }
      hide(B, fg, 'wardrobe', 0, 0.75, { doors, fg });
    },
    closet: (B, [x, z, rot]) => FURN.wardrobe(B, [x, z, rot]),
    lockers: (B, [x, z, rot, n = 4]) => {
      const fg = piece(B, x, z, rot, n * 0.42, 0.5, (fg, b) => {
        for (let i = 0; i < n; i++) { const lx = (i - (n - 1) / 2) * 0.42; b(M.sidingGreen, 0.4, 1.85, 0.5, lx, 0.925, 0); b(M.black, 0.2, 0.02, 0.01, lx, 1.6, 0.255); b(M.black, 0.2, 0.02, 0.01, lx, 1.55, 0.255); }
      }, { h: 1.9, opaque: true });
      hide(B, fg, 'locker', 0, 0.7);
    },
    dresser: (B, [x, z, rot]) => (surface(B, x, z, 0.87), piece)(B, x, z, rot, 1.0, 0.5, (fg, b) => { b(M.plankDark, 1.0, 0.85, 0.5, 0, 0.425, 0); for (let i = 0; i < 3; i++) { b(M.panel, 0.9, 0.22, 0.02, 0, 0.17 + i * 0.27, 0.255); b(M.chrome, 0.1, 0.02, 0.02, 0, 0.2 + i * 0.27, 0.27); } b(M.porcelain, 0.12, 0.2, 0.12, 0.3, 0.95, 0); }, { h: 0.9 }),
    nightstand: (B, [x, z, rot, lit = true]) => { surface(B, x, z, 0.56); piece(B, x, z, rot, 0.45, 0.4, (fg, b) => { b(M.plankDark, 0.45, 0.55, 0.4, 0, 0.275, 0); b(M.panel, 0.38, 0.15, 0.02, 0, 0.4, 0.205); }, { h: 0.6 }); if (lit) addLamp(B, [x, B.FH + 0.97, z], 'table', { power: 1.8, range: 4.5 }); },
    table: (B, [x, z, rot, w = 1.4, d = 0.85, chairs = 4]) => { surface(B, x, z, 0.79);
      piece(B, x, z, rot, w, d, (fg, b) => { b(M.plankDark, w, 0.05, d, 0, 0.76, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(M.plankDark, 0.06, 0.74, 0.06, sx * (w / 2 - 0.07), 0.37, sz * (d / 2 - 0.07)); }, { h: 0.78 });
      const seats = [[0, d / 2 + 0.38, 2], [0, -d / 2 - 0.38, 0], [-w / 2 - 0.35, 0, 1], [w / 2 + 0.35, 0, 3]].slice(0, chairs);
      for (const [cx, cz, cr] of seats) { const v = new THREE.Vector3(cx, 0, cz).applyAxisAngle(new THREE.Vector3(0, 1, 0), (rot ?? 0) * Math.PI / 2); FURN.chair(B, [x + v.x, z + v.z, cr + (rot ?? 0)]); }
      const sp = B.toW(x, z + d / 2 + 0.7); ctx.spots.push({ x: sp.x, z: sp.z, kind: 'table', face: B.yaw + (rot ?? 0) * Math.PI / 2 + Math.PI, building: B });
    },
    chair: (B, [x, z, rot]) => piece(B, x, z, rot, 0.45, 0.45, (fg, b) => { b(M.plankDark, 0.44, 0.04, 0.42, 0, 0.45, 0); b(M.plankDark, 0.44, 0.5, 0.04, 0, 0.72, -0.2); for (const sx of [-0.19, 0.19]) for (const sz of [-0.18, 0.18]) b(M.plankDark, 0.035, 0.45, 0.035, sx, 0.22, sz); }, { solid: false }),
    rocker: (B, [x, z, rot]) => piece(B, x, z, rot, 0.6, 0.8, (fg, b) => { b(M.plankDark, 0.55, 0.05, 0.5, 0, 0.45, 0); b(M.plankDark, 0.55, 0.7, 0.05, 0, 0.82, -0.24); for (const sx of [-0.26, 0.26]) b(M.plankDark, 0.04, 0.08, 0.8, sx, 0.05, 0); }, { solid: false }),
    porchswing: (B, [x, z, rot]) => piece(B, x, z, rot, 1.4, 0.6, (fg, b) => { b(M.plankDark, 1.4, 0.05, 0.5, 0, 0.5, 0); b(M.plankDark, 1.4, 0.5, 0.05, 0, 0.78, -0.24); for (const sx of [-0.68, 0.68]) b(M.metal, 0.01, 1.7, 0.01, sx, 1.4, 0); }, { solid: false }),
    couch: (B, [x, z, rot, mat]) => {
      piece(B, x, z, rot, 2.0, 0.9, (fg, b) => { const f = M[mat ?? ['fabricBrown', 'fabricGreen', 'fabricMustard', 'fabricPlaid'][R() * 4 | 0]]; b(f, 2.0, 0.42, 0.9, 0, 0.21, 0); b(f, 2.0, 0.5, 0.22, 0, 0.66, -0.34); for (const sx of [-0.92, 0.92]) b(f, 0.18, 0.62, 0.9, sx, 0.31, 0); for (const sx of [-0.45, 0.45]) b(f, 0.86, 0.12, 0.62, sx, 0.48, 0.08); }, { h: 0.6 });
      const sp = B.toW(x, z); ctx.spots.push({ x: sp.x, z: sp.z, kind: 'couch', building: B });
    },
    armchair: (B, [x, z, rot]) => piece(B, x, z, rot, 0.9, 0.9, (fg, b) => { const f = M[['fabricBrown', 'fabricGreen', 'fabricRed'][R() * 3 | 0]]; b(f, 0.9, 0.42, 0.85, 0, 0.21, 0); b(f, 0.9, 0.55, 0.2, 0, 0.7, -0.33); for (const sx of [-0.38, 0.38]) b(f, 0.15, 0.6, 0.85, sx, 0.3, 0); }, { h: 0.6 }),
    fireplace: (B, [x, z, rot, lit = true]) => {
      piece(B, x, z, rot, 1.8, 0.6, (fg, b) => { b(M.stone, 1.8, 1.3, 0.6, 0, 0.65, 0); b(M.black, 0.9, 0.7, 0.1, 0, 0.45, 0.26); b(M.plankDark, 2.0, 0.1, 0.4, 0, 1.33, 0.08); b(M.stone, 1.0, B.H - 1.3, 0.5, 0, 1.3 + (B.H - 1.3) / 2, -0.05); for (let i = 0; i < 3; i++) b(M.plankDark, 0.5, 0.08, 0.08, -0.15 + i * 0.12, 0.2, 0.18); }, { h: 1.3, opaque: true });
      if (lit) { const p = local(B, { position: new THREE.Vector3(x, 0, z), rotation: { y: (rot ?? 0) * Math.PI / 2 } }, 0, 0.5); const lp = { x: p.x, z: p.z }; void lp; addLamp(B, [x + Math.sin((rot ?? 0) * Math.PI / 2) * 0.45, B.FH + 0.4, z + Math.cos((rot ?? 0) * Math.PI / 2) * 0.45], 'fire', { power: 3, range: 6, flicker: 1 }); }
    },
    stove: (B, [x, z, rot]) => piece(B, x, z, rot, 0.76, 0.65, (fg, b) => { b(M.appliance, 0.76, 0.9, 0.65, 0, 0.45, 0); b(M.black, 0.7, 0.02, 0.6, 0, 0.91, 0); for (const sx of [-0.18, 0.18]) for (const sz of [-0.14, 0.14]) b(M.steel, 0.2, 0.02, 0.2, sx, 0.93, sz); b(M.black, 0.6, 0.35, 0.02, 0, 0.45, 0.33); b(M.appliance, 0.76, 0.2, 0.06, 0, 1.0, -0.3); }, { h: 0.95 }),
    fridge: (B, [x, z, rot]) => piece(B, x, z, rot, 0.75, 0.7, (fg, b) => { b(M.avocado, 0.75, 1.7, 0.7, 0, 0.85, 0); b(M.chrome, 0.03, 0.4, 0.04, 0.3, 1.25, 0.36); b(M.chrome, 0.03, 0.3, 0.04, 0.3, 0.6, 0.36); b(M.black, 0.75, 0.01, 0.01, 0, 1.05, 0.355); }, { h: 1.7, opaque: true }),
    counter: (B, [x, z, rot, w = 2.0, sink = false]) => (surface(B, x, z, 0.9), piece(B, x, z, rot, w, 0.62, (fg, b) => { b(M.plankDark, w, 0.86, 0.6, 0, 0.43, 0); b(M.linoleum, w + 0.02, 0.04, 0.64, 0, 0.88, 0); for (let i = 0; i < Math.floor(w / 0.5); i++) b(M.panel, 0.44, 0.7, 0.02, -w / 2 + 0.27 + i * 0.5, 0.42, 0.305); if (sink) { b(M.steel, 0.5, 0.05, 0.4, 0, 0.885, 0); b(M.chrome, 0.03, 0.25, 0.03, 0, 1.0, -0.22); } b(M.plankDark, w, 0.7, 0.35, 0, 1.75, -0.12); }, { h: 0.9 })),
    sink: (B, [x, z, rot]) => piece(B, x, z, rot, 0.55, 0.45, (fg, b) => { b(M.porcelain, 0.55, 0.18, 0.45, 0, 0.8, 0); b(M.porcelain, 0.12, 0.7, 0.12, 0, 0.36, -0.1); b(M.chrome, 0.03, 0.15, 0.03, 0, 0.95, -0.17); b(M.chrome, 0.4, 0.55, 0.02, 0, 1.45, -0.22); }, { solid: false }),
    toilet: (B, [x, z, rot]) => piece(B, x, z, rot, 0.45, 0.7, (fg, b) => { b(M.porcelain, 0.38, 0.4, 0.5, 0, 0.2, 0.05); b(M.porcelain, 0.42, 0.04, 0.48, 0, 0.42, 0.06); b(M.porcelain, 0.42, 0.4, 0.18, 0, 0.6, -0.26); }, { h: 0.45 }),
    stall: (B, [x, z, rot]) => {
      const fg = piece(B, x, z, rot, 0.95, 1.4, (fg, b) => { for (const sx of [-0.47, 0.47]) b(M.sidingGreen, 0.03, 1.8, 1.4, sx, 1.0, 0); b(M.porcelain, 0.38, 0.4, 0.5, 0, 0.2, -0.35); b(M.porcelain, 0.42, 0.4, 0.18, 0, 0.6, -0.62); }, { solid: false });
      for (const sx of [-0.47, 0.47]) { const p = local(B, fg, sx, 0); B.solid(p.x - 0.05, p.z - 0.05, p.x + 0.05, p.z + 0.05, 0, 2); }
      const hg = new THREE.Group(); hg.position.set(-0.45, 0.1, 0.7); liveOf(B, fg).add(hg);
      const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.6, 0.03), M.sidingGreen); pnl.position.set(0.44, 0.9, 0); pnl.userData.keep = true; hg.add(pnl);
      hide(B, fg, 'stall', 0, 1.1, { doors: [{ hinge: hg, sgn: -1, single: true }], fg });
    },
    shower: (B, [x, z, rot]) => {
      const fg = piece(B, x, z, rot, 0.95, 0.95, (fg, b) => { b(M.bathTile, 0.95, 0.04, 0.95, 0, 0.02, 0); for (const sx of [-0.47, 0.47]) b(M.bathTile, 0.03, 2.0, 0.95, sx, 1.0, 0); b(M.chrome, 0.12, 0.05, 0.12, 0, 1.95, -0.4); b(M.chrome, 0.02, 0.02, 0.95, 0, 2.0, 0); }, { solid: false });
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.7, 0.02), M.fabricMustard); curtain.position.set(0, 1.05, 0.46); liveOf(B, fg).add(curtain);
      hide(B, fg, 'shower', 0, 0.9, { curtain, fg });
    },
    bathtub: (B, [x, z, rot]) => piece(B, x, z, rot, 0.8, 1.7, (fg, b) => { b(M.porcelain, 0.8, 0.55, 1.7, 0, 0.275, 0); b(M.black, 0.66, 0.02, 1.55, 0, 0.56, 0); }, { h: 0.55 }),
    shelf: (B, [x, z, rot, w = 1.0]) => piece(B, x, z, rot, w, 0.35, (fg, b) => { for (const sx of [-w / 2, w / 2]) b(M.plankDark, 0.04, 1.9, 0.35, sx, 0.95, 0); for (let i = 0; i < 5; i++) { b(M.plankDark, w, 0.03, 0.35, 0, 0.1 + i * 0.42, 0); for (let k = 0; k < Math.floor(w / 0.08); k++) if (R() < 0.75 && i > 0) b(M[['fabricRed', 'fabricBlue', 'fabricGreen', 'fabricMustard', 'fabricBrown'][R() * 5 | 0]], 0.05, 0.2 + R() * 0.1, 0.24, -w / 2 + 0.06 + k * 0.08, 0.1 + i * 0.42 + 0.14, 0); } b(M.plankDark, w, 1.9, 0.02, 0, 0.95, -0.17); }, { h: 1.9, opaque: true }),
    desk: (B, [x, z, rot, lit = true]) => { surface(B, x, z, 0.78); piece(B, x, z, rot, 1.2, 0.65, (fg, b) => { b(M.plankDark, 1.2, 0.05, 0.65, 0, 0.75, 0); b(M.plankDark, 0.45, 0.72, 0.6, -0.36, 0.37, 0); b(M.plankDark, 0.04, 0.72, 0.6, 0.57, 0.37, 0); for (let i = 0; i < 3; i++) b(M.sheet, 0.21, 0.005, 0.28, (R() - 0.5) * 0.5, 0.78, (R() - 0.5) * 0.3); }, { h: 0.78 }); FURN.chair(B, [x, z + 0.55, 2 + (rot ?? 0)]); if (lit) addLamp(B, [x + 0.4, B.FH + 1.18, z - 0.15], 'table', { power: 1.8, range: 4.5 }); },
    rug: (B, [x, z, rot, w = 2.4, d = 1.6]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.rug[R() * 3 | 0]); m.rotation.x = -Math.PI / 2; m.rotation.z = (rot ?? 0) * Math.PI / 2; m.position.set(x, B.FH + 0.008, z); B.g.add(m); },
    picture: (B, [x, y, z, rot, big]) => { const s = big ? 1.6 : 1; const fr = new THREE.Mesh(new THREE.BoxGeometry(0.62 * s, 0.48 * s, 0.03), M.frame); fr.position.set(x, B.FH + y, z); fr.rotation.y = (rot ?? 0) * Math.PI / 2; B.g.add(fr); const pc = new THREE.Mesh(new THREE.PlaneGeometry(0.54 * s, 0.4 * s), M.pictures[R() * 4 | 0]); pc.position.set(0, 0, 0.017); fr.add(pc); },
    tv: (B, [x, z, rot]) => piece(B, x, z, rot, 0.8, 0.5, (fg, b) => { b(M.plankDark, 0.8, 0.55, 0.5, 0, 0.275, 0); b(M.plankDark, 0.62, 0.48, 0.42, -0.04, 0.8, 0); b(M.black, 0.42, 0.34, 0.01, -0.08, 0.82, 0.215); b(M.steel, 0.1, 0.25, 0.01, 0.22, 0.82, 0.215); }, { h: 1.05 }),
    record: (B, [x, z, rot]) => piece(B, x, z, rot, 0.9, 0.45, (fg, b) => { b(M.plankDark, 0.9, 0.65, 0.45, 0, 0.325, 0); b(M.black, 0.32, 0.01, 0.32, -0.15, 0.66, 0); b(M.chrome, 0.02, 0.02, 0.18, 0.06, 0.67, 0); for (let i = 0; i < 12; i++) b(M[['fabricRed', 'fabricBlue', 'fabricMustard'][i % 3]], 0.012, 0.3, 0.3, -0.38 + i * 0.03, 0.17, 0); }, { h: 0.66 }),
    pooltable: (B, [x, z, rot]) => { piece(B, x, z, rot, 1.3, 2.4, (fg, b) => { b(M.plankDark, 1.3, 0.12, 2.4, 0, 0.74, 0); b(M.green, 1.12, 0.02, 2.22, 0, 0.81, 0); for (const sx of [-0.55, 0.55]) for (const sz of [-1.1, 1.1]) b(M.plankDark, 0.14, 0.7, 0.14, sx, 0.35, sz); for (let i = 0; i < 9; i++) { const ball = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), M[['fabricRed', 'fabricBlue', 'fabricMustard', 'porcelain', 'black'][i % 5]]); ball.position.set((R() - 0.5) * 0.9, 0.85, (R() - 0.5) * 1.9); fg.add(ball); } }, { h: 0.85 }); addLamp(B, [x, B.FH + B.H - 0.5, z], 'ceiling', { power: 2.6 }); const sp = B.toW(x + 1.1, z); ctx.spots.push({ x: sp.x, z: sp.z, kind: 'pool', building: B }); },
    bar: (B, [x, z, rot, w = 3]) => piece(B, x, z, rot, w, 0.6, (fg, b) => { b(M.plankDark, w, 1.05, 0.55, 0, 0.525, 0); b(M.panel, w + 0.1, 0.05, 0.68, 0, 1.08, 0.05); for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10), M.fabricRed); st.position.set(-w / 2 + 0.4 + i * (w - 0.8) / 3, 0.72, 0.6); fg.add(st); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 5), M.chrome); leg.position.set(st.position.x, 0.35, 0.6); fg.add(leg); } for (let i = 0; i < 8; i++) { const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 6), M[['green', 'fabricBrown', 'glass'][i % 3]]); bt.position.set(-w / 2 + 0.3 + i * 0.3, 1.24, -0.1); fg.add(bt); } }, { h: 1.1 }),
    crates: (B, [x, z, rot, n = 3]) => piece(B, x, z, rot, 1.2, 0.9, (fg, b) => { for (let i = 0; i < n; i++) b(M.crate, 0.6, 0.55, 0.6, (i % 2) * 0.55 - 0.27, 0.275 + Math.floor(i / 2) * 0.56, (R() - 0.5) * 0.2); }, { h: 1.1, opaque: n > 2 }),
    barrel: (B, [x, z]) => { const fg = piece(B, x, z, 0, 0.6, 0.6, () => {}, { h: 0.9 }); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 12), M.metal); m.position.y = 0.44; fg.add(m); },
    hay: (B, [x, z, rot, n = 4]) => { const fg = piece(B, x, z, rot, 1.8, 1.0, (fg, b) => { for (let i = 0; i < n; i++) b(M.hay, 0.9, 0.45, 0.48, (i % 2) * 0.92 - 0.46, 0.23 + Math.floor(i / 2) * 0.46, (R() - 0.5) * 0.1); }, { h: 0.45 * Math.ceil(n / 2), opaque: n > 2 }); if (n >= 4) hide(B, fg, 'hay', 0, -0.9, { behind: true }); },
    stalls: (B, [x, z, rot, n = 3]) => piece(B, x, z, rot, n * 2.2, 2.6, (fg, b) => { for (let i = 0; i <= n; i++) b(M.plankDark, 0.08, 1.4, 2.6, -n * 1.1 + i * 2.2, 0.7, 0); for (let i = 0; i < n; i++) { b(M.plankDark, 1.2, 1.2, 0.06, -n * 1.1 + i * 2.2 + 0.7, 0.6, 1.27); b(M.hay, 1.6, 0.15, 1.2, -n * 1.1 + i * 2.2 + 1.1, 0.08, -0.4); } }, { solid: false }),
    workbench: (B, [x, z, rot, w = 2.2]) => (surface(B, x, z, 0.95), piece(B, x, z, rot, w, 0.7, (fg, b) => { b(M.plankDark, w, 0.08, 0.7, 0, 0.9, 0); for (const sx of [-w / 2 + 0.1, w / 2 - 0.1]) for (const sz of [-0.28, 0.28]) b(M.plankDark, 0.08, 0.9, 0.08, sx, 0.45, sz); b(M.plankDark, w - 0.2, 0.04, 0.6, 0, 0.25, 0); b(M.metal, 0.22, 0.12, 0.16, w / 2 - 0.35, 1.0, 0.2); for (let i = 0; i < 4; i++) { const cn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8), M.fabricMustard); cn.position.set(-w / 2 + 0.3 + i * 0.22, 0.36, 0.1); fg.add(cn); } }, { h: 0.95 })),
    plants: (B, [x, z, rot, w = 2.4]) => piece(B, x, z, rot, w, 0.8, (fg, b) => { b(M.plankDark, w, 0.06, 0.8, 0, 0.8, 0); for (const sx of [-w / 2 + 0.06, w / 2 - 0.06]) b(M.plankDark, 0.06, 0.8, 0.8, sx, 0.4, 0); for (let i = 0; i < Math.floor(w / 0.3); i++) { b(M.soil, 0.18, 0.14, 0.18, -w / 2 + 0.2 + i * 0.3, 0.9, (R() - 0.5) * 0.4); const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + R() * 0.08, 0), M.plant); pl.position.set(-w / 2 + 0.2 + i * 0.3, 1.08, (R() - 0.5) * 0.4); fg.add(pl); } }, { h: 0.9 }),
    piano: (B, [x, z, rot]) => piece(B, x, z, rot, 1.5, 0.6, (fg, b) => { b(M.black, 1.5, 1.25, 0.6, 0, 0.625, 0); b(M.porcelain, 1.3, 0.02, 0.18, 0, 0.75, 0.38); b(M.black, 1.3, 0.04, 0.2, 0, 0.73, 0.36); }, { h: 1.25 }),
    tractor: (B, [x, z, rot]) => piece(B, x, z, rot, 1.6, 3.0, (fg, b) => { const red = M.sidingRed; b(red, 0.9, 0.8, 2.0, 0, 0.9, 0.4); b(M.black, 0.6, 0.06, 0.6, 0, 1.4, -0.7); for (const sx of [-0.75, 0.75]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 14), M.black); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.62, -0.7); fg.add(w); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12), M.black); f.rotation.z = Math.PI / 2; f.position.set(sx * 0.7, 0.32, 1.1); fg.add(f); } b(M.metal, 0.08, 0.6, 0.08, 0.3, 1.5, 1.2); }, { h: 1.4 }),
    masks: (B, [x, y, z, rot]) => { for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI), M[['porcelain', 'fabricRed', 'green', 'fabricMustard', 'plaster'][i]]); m.scale.set(0.8, 1.1, 0.5); const v = new THREE.Vector3(-0.8 + i * 0.4, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), (rot ?? 0) * Math.PI / 2); m.position.set(x + v.x, B.FH + y + (i % 2) * 0.25, z + v.z); m.rotation.y = (rot ?? 0) * Math.PI / 2 - Math.PI / 2; B.g.add(m); } },
    shrine: (B, [x, z, rot]) => { piece(B, x, z, rot, 1.2, 0.5, (fg, b) => { b(M.plankDark, 1.2, 0.8, 0.5, 0, 0.4, 0); const sw = b(M.fabricBlue, 0.7, 0.6, 0.03, 0, 1.5, -0.24); sw.rotation.z = 0.05; for (let i = 0; i < 3; i++) b(M.pictures[2], 0.18, 0.24, 0.01, -0.45 + i * 0.45, 1.1, -0.235); }, { h: 0.8 }); addLamp(B, [x, B.FH + 0.8, z], 'candle', { power: 1.4, range: 3.5 }); },
    phone: (B, [x, y, z, rot]) => { const p = B.toW(x, z), out = B.toW(x + Math.sin((rot ?? 0) * Math.PI / 2) * 0.75, z + Math.cos((rot ?? 0) * Math.PI / 2) * 0.75); ctx.phone = { x: p.x, y: B.FH + y, z: p.z, yaw: B.yaw + (rot ?? 0) * Math.PI / 2, stand: out }; },
    tools: (B, [x, z, rot]) => { surface(B, x, z, 0.95); const fg = piece(B, x, z, rot, 4.0, 0.7, (fg, b) => { b(M.plankDark, 3.8, 0.08, 0.7, 0, 0.9, 0); for (const sx of [-1.8, 1.8]) for (const sz of [-0.28, 0.28]) b(M.plankDark, 0.08, 0.9, 0.08, sx, 0.45, sz); b(M.plankDark, 3.7, 0.05, 0.6, 0, 0.25, 0); b(M.metal, 0.22, 0.12, 0.16, 1.4, 1.0, 0.2); }, { h: 0.95 }); ctx.toolWall = { B, fg, x, z, rot: rot ?? 0 }; },
  };
  function bed(B, fg) {
    const c = local(B, fg, 0, 0), head = local(B, fg, 0, -0.9), side = local(B, fg, 0.85, 0);
    ctx.beds.push({ x: c.x, z: c.z, yaw: Math.atan2(head.x - c.x, head.z - c.z), side: { x: side.x, z: side.z }, taken: null });
  }
  return { building, FURN, addLamp };
}
