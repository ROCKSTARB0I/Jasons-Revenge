// Painted faces for the counselors, wrapped round the head sphere (face
// centred at u = 0.25). Shaded skin, real eyes, lips, brows and hair, and the
// expressions that matter here: calm, terrified, choking, unconscious, dead.
import * as THREE from '../vendor/three.module.js';

const W = 512, H = 256, CX = 128;
const EYE_Y = 116, EYE_DX = 27, NOSE_Y = 148, MOUTH_Y = 176;
const R = Math.random;
const css = hex => '#' + hex.toString(16).padStart(6, '0');
const rgb = (hex, k = 1, a = 1) => `rgba(${Math.min(255, (hex >> 16 & 255) * k) | 0},${Math.min(255, (hex >> 8 & 255) * k) | 0},${Math.min(255, (hex & 255) * k) | 0},${a})`;
function blob(g, x, y, rx, ry, col0, col1 = 'rgba(0,0,0,0)') {
  g.save(); g.translate(x, y); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, col0); gr.addColorStop(1, col1);
  g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
}
// a deterministic random per person so their freckles don't jump about between expressions
function prng(seed) { let s = seed % 2147483647 || 7; return () => (s = s * 16807 % 2147483647) / 2147483647; }

const cache = {};
// look: { skin, hair, eyes, long, beard, freckles, seed }
export function realFace(look, expr, bruise = 0) {
  const key = JSON.stringify(look) + expr + bruise;
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), rnd = prng(look.seed ?? 1);
  const skin = look.skin, hair = look.hair;
  const dead = expr === 'dead', choke = expr === 'choke', fear = expr === 'fear' || expr === 'bleed', out = expr === 'out';

  // ---- skin: base, then form shading painted in
  g.fillStyle = css(skin); g.fillRect(0, 0, W, H);
  blob(g, CX, 110, 120, 90, rgb(skin, 1.07, 0.6));                        // forehead / face catches light
  blob(g, CX, 230, 120, 40, rgb(skin, 0.72, 0.55));                       // under the jaw
  blob(g, CX - 40, 150, 26, 18, 'rgba(200,90,80,0.22)'); blob(g, CX + 40, 150, 26, 18, 'rgba(200,90,80,0.22)');   // cheeks
  for (const s of [-1, 1]) blob(g, CX + s * EYE_DX, EYE_Y + 2, 24, 15, rgb(skin, 0.7, 0.55));   // eye sockets
  blob(g, CX, 125, 7, 26, rgb(skin, 1.1, 0.5));                           // bridge of the nose
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '60,30,20' : '255,235,220'},${rnd() * 0.07})`; g.fillRect(rnd() * W, rnd() * H, 1, 1); }   // pores
  if (look.freckles) for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(140,80,40,0.35)'; g.beginPath(); g.arc(CX + (rnd() - 0.5) * 110, 130 + (rnd() - 0.5) * 40, 0.8 + rnd() * 1.4, 0, 7); g.fill(); }
  if (look.beard) for (let i = 0; i < 2500; i++) {   // stubble on the jaw and lip
    const x = CX + (rnd() - 0.5) * 120, y = 160 + rnd() * 70;
    if (Math.abs(x - CX) < 18 && y < 168) continue;
    g.fillStyle = rgb(hair, 1, 0.35); g.fillRect(x, y, 1, 1.5);
  }
  // ears, round the side
  for (const s of [-1, 1]) { blob(g, CX + s * 98, 122, 9, 20, rgb(skin, 0.75, 0.9)); blob(g, CX + s * 98, 122, 4, 12, rgb(skin, 0.55, 0.8)); }

  // ---- whole-face tints for the state they're in
  if (dead) { g.fillStyle = 'rgba(150,165,180,0.42)'; g.fillRect(0, 0, W, H); blob(g, CX, MOUTH_Y, 30, 16, 'rgba(70,70,110,0.35)'); }
  if (out) { g.fillStyle = 'rgba(170,175,180,0.2)'; g.fillRect(0, 0, W, H); }
  if (choke) { g.fillStyle = 'rgba(120,30,70,0.38)'; g.fillRect(0, 0, W, H); for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(140,0,20,0.5)'; g.fillRect(CX + (rnd() - 0.5) * 120, 90 + rnd() * 70, 1, 1); } }
  if (fear) { blob(g, CX, 130, 90, 70, 'rgba(235,235,225,0.18)'); }   // drained

  // ---- eyes
  const iris = look.eyes ?? 0x5a3a20;
  const eye = (s) => {
    const x = CX + s * EYE_DX, y = EYE_Y;
    const open = out ? 0 : dead ? 0.45 : fear ? 1.35 : choke ? 1.5 : 1;
    const ew = 12, eh = 6.2 * open;
    if (open > 0) {
      g.save(); g.beginPath(); g.ellipse(x, y, ew, eh, 0, 0, 7); g.clip();
      g.fillStyle = choke || dead ? '#e8d4cc' : '#efe9e2'; g.fillRect(x - ew, y - 12, ew * 2, 24);
      blob(g, x, y, ew, eh, 'rgba(0,0,0,0)', 'rgba(160,90,90,0.45)');   // pink at the corners
      if (choke) for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(180,20,30,0.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + s * ew, y + (rnd() - 0.5) * 4); g.lineTo(x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 6); g.stroke(); }
      const iy = y + (dead ? -2.5 : 0), ir = fear || choke ? 5.2 : 5.8;
      g.fillStyle = css(iris); g.beginPath(); g.arc(x, iy, ir, 0, 7); g.fill();
      for (let a = 0; a < 24; a++) { g.strokeStyle = rgb(iris, a % 2 ? 1.5 : 0.6, 0.6); g.lineWidth = 0.7; g.beginPath(); g.moveTo(x + Math.cos(a / 24 * 6.28) * 2, iy + Math.sin(a / 24 * 6.28) * 2); g.lineTo(x + Math.cos(a / 24 * 6.28) * ir, iy + Math.sin(a / 24 * 6.28) * ir); g.stroke(); }
      g.strokeStyle = 'rgba(20,14,10,0.8)'; g.lineWidth = 1; g.beginPath(); g.arc(x, iy, ir, 0, 7); g.stroke();
      g.fillStyle = '#080606'; g.beginPath(); g.arc(x, iy, dead ? 3.6 : fear ? 1.6 : 2.4, 0, 7); g.fill();
      if (!dead) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x - 1.8, iy - 2, 1.2, 0, 7); g.fill(); }
      else { g.fillStyle = 'rgba(200,210,220,0.25)'; g.beginPath(); g.ellipse(x, iy, ir, ir, 0, 0, 7); g.fill(); }   // glazed over
      blob(g, x, y - eh, ew, 5, 'rgba(40,20,15,0.45)');   // shadow of the upper lid
      g.restore();
    }
    // lids: crease, lash line, lower lid
    g.strokeStyle = 'rgba(25,14,10,0.95)'; g.lineWidth = out ? 1.8 : 2.4; g.lineCap = 'round';
    g.beginPath(); g.ellipse(x, y, ew, Math.max(1.2, eh), 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    if (out) { g.beginPath(); g.ellipse(x, y, ew, 2, 0, 0.1, Math.PI - 0.1); g.stroke(); }
    g.strokeStyle = rgb(skin, 0.6, 0.7); g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y - eh - 3.5, ew + 1, 4, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();   // crease
    if (!out) { g.strokeStyle = rgb(skin, 0.75, 0.6); g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 1, ew - 1, eh + 1, 0, 0.2, Math.PI - 0.2); g.stroke(); }
    blob(g, x, y + eh + 5, 12, 4, fear || dead ? 'rgba(80,40,60,0.35)' : 'rgba(90,50,40,0.18)');   // bags
  };
  eye(-1); eye(1);
  // brows: individual hairs, raised and pulled together when terrified
  for (const s of [-1, 1]) {
    const x0 = CX + s * 9, x1 = CX + s * 44;
    const inner = fear || choke ? -9 : 0, outer = fear ? -2 : 0;
    for (let i = 0; i < 70; i++) {
      const t = rnd(), x = x0 + (x1 - x0) * t, arch = Math.sin(t * Math.PI) * -5;
      const y = EYE_Y - 18 + arch + inner * (1 - t) + outer * t + (rnd() - 0.5) * 3.5 * (1 - t * 0.5);
      g.strokeStyle = rgb(hair, 0.85, 0.75); g.lineWidth = 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 3.5, y - 1.5); g.stroke();
    }
  }
  // ---- nose: shade the sides, nostrils, a highlight on the tip
  for (const s of [-1, 1]) blob(g, CX + s * 9, NOSE_Y - 10, 6, 18, rgb(skin, 0.72, 0.5));
  blob(g, CX, NOSE_Y - 2, 9, 7, rgb(skin, 1.12, 0.6));
  for (const s of [-1, 1]) { g.fillStyle = 'rgba(40,18,14,0.85)'; g.beginPath(); g.ellipse(CX + s * 5.5, NOSE_Y + 3, 3.2, 1.8, s * 0.3, 0, 7); g.fill(); blob(g, CX + s * 10, NOSE_Y, 4, 5, rgb(skin, 0.65, 0.6)); }
  blob(g, CX, NOSE_Y + 12, 6, 5, rgb(skin, 0.8, 0.4));   // the groove above the lip
  // ---- mouth
  const lip = dead ? '#7a6a78' : choke ? '#6a3050' : look.lipstick ? '#9a2a34' : rgb(skin, 0.78, 1);
  const lipD = dead ? '#5a4a58' : look.lipstick ? '#7a1a24' : rgb(skin, 0.64, 1);
  const gape = fear ? 9 : choke ? 11 : dead ? 6 : out ? 3 : 0;
  if (gape) {
    g.fillStyle = '#1a0606'; g.beginPath(); g.ellipse(CX, MOUTH_Y + gape * 0.3, 14, gape, 0, 0, 7); g.fill();
    g.fillStyle = '#e6e0d0'; g.fillRect(CX - 10, MOUTH_Y - gape * 0.65, 20, 3);   // top teeth
    if (fear) { g.fillStyle = '#d8d0c0'; g.fillRect(CX - 8, MOUTH_Y + gape * 1.1, 16, 2.5); }
    if (choke) { g.fillStyle = '#b85060'; g.beginPath(); g.ellipse(CX, MOUTH_Y + gape * 1.1, 7, 7, 0, 0, 7); g.fill(); }
  }
  g.fillStyle = lipD; g.beginPath();   // upper lip with a cupid's bow
  g.moveTo(CX - 17, MOUTH_Y); g.quadraticCurveTo(CX - 8, MOUTH_Y - 7 - gape * 0.5, CX - 2, MOUTH_Y - 5 - gape * 0.5); g.lineTo(CX, MOUTH_Y - 3.5 - gape * 0.5); g.lineTo(CX + 2, MOUTH_Y - 5 - gape * 0.5);
  g.quadraticCurveTo(CX + 8, MOUTH_Y - 7 - gape * 0.5, CX + 17, MOUTH_Y); g.quadraticCurveTo(CX, MOUTH_Y - gape * 0.6, CX - 17, MOUTH_Y); g.fill();
  g.fillStyle = lip; g.beginPath();    // fuller lower lip
  g.moveTo(CX - 15, MOUTH_Y + 1 + gape * 0.6); g.quadraticCurveTo(CX, MOUTH_Y + 10 + gape * 1.7, CX + 15, MOUTH_Y + 1 + gape * 0.6); g.quadraticCurveTo(CX, MOUTH_Y + 3 + gape * 1.2, CX - 15, MOUTH_Y + 1 + gape * 0.6); g.fill();
  if (!gape) { g.strokeStyle = 'rgba(40,14,12,0.85)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(CX - 17, MOUTH_Y); g.quadraticCurveTo(CX, MOUTH_Y + 2, CX + 17, MOUTH_Y); g.stroke(); }
  blob(g, CX, MOUTH_Y + 18, 14, 5, rgb(skin, 0.75, 0.4));   // shadow under the lip
  if (look.beard === 2) for (let i = 0; i < 260; i++) {   // a proper 80s moustache
    const x = CX + (rnd() - 0.5) * 36, y = MOUTH_Y - 9 + rnd() * 6 - Math.abs(x - CX) * -0.1;
    g.strokeStyle = rgb(hair, 0.9, 0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x - CX) * 0.08, y + 4); g.stroke();
  }

  // ---- what's been done to them
  const blood = (x0, y0, len, w = 2.2) => {
    g.strokeStyle = 'rgba(95,4,4,0.92)'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0);
    let x = x0; for (let y = y0; y < y0 + len; y += 4) { x += (rnd() - 0.5) * 1.5; g.lineTo(x, y); } g.stroke();
    g.fillStyle = 'rgba(95,4,4,0.92)'; g.beginPath(); g.arc(x, y0 + len, w * 0.9, 0, 7); g.fill();
  };
  if (expr === 'bleed') { blood(CX - 5, NOSE_Y + 4, 26); blood(CX + 30, 70, 50, 2.6); }
  if (dead) { blood(CX - 6, NOSE_Y + 4, 24, 2.4); blood(CX + 9, MOUTH_Y + 6, 60, 3); blood(CX - 2, MOUTH_Y + 8, 40, 2); }
  if (fear || dead) for (const s of [-1, 1]) { g.strokeStyle = 'rgba(200,215,230,0.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(CX + s * (EYE_DX - 4), EYE_Y + 8); g.quadraticCurveTo(CX + s * (EYE_DX - 2), EYE_Y + 30, CX + s * (EYE_DX - 6), EYE_Y + 48); g.stroke(); }   // tear tracks
  if (bruise > 0) {
    blob(g, CX + EYE_DX + 14, 150, 20, 14, 'rgba(90,30,70,0.45)');
    if (bruise >= 2) { blob(g, CX - EYE_DX, EYE_Y + 2, 20, 16, 'rgba(50,15,45,0.85)'); blob(g, CX + 4, MOUTH_Y + 4, 12, 8, 'rgba(120,20,30,0.55)'); blood(CX + 4, MOUTH_Y + 6, 30, 2); }
    if (bruise >= 3) { blob(g, CX + EYE_DX, EYE_Y + 2, 20, 16, 'rgba(50,15,45,0.85)'); g.strokeStyle = '#5a0606'; g.lineWidth = 2; g.beginPath(); g.moveTo(CX - 50, 80); g.lineTo(CX - 30, 92); g.stroke(); blood(CX - 32, 92, 40); }
  }

  // ---- hair: everything off the face, painted strand by strand
  if (hair != null) {
    const hairline = x => 62 + Math.pow(Math.abs(x - CX) / 60, 2) * 18 + (look.long ? 4 : 0);   // front hairline, higher at the temples
    const covered = (x, y) => {
      const dx = Math.min(Math.abs(x - CX), W - Math.abs(x - CX));
      if (dx > 108) return y < (look.long ? 256 : 205);          // back of the head (and the length down it)
      if (dx > 84) return y < (look.long ? 256 : 112);          // above and behind the ears
      return y < hairline(x);
    };
    g.fillStyle = rgb(hair, 0.85);
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (covered(x, y)) g.fillRect(x, y, 2, 2);
    for (let i = 0; i < 9000; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (!covered(x, y)) continue;
      const len = 6 + rnd() * 16, ang = Math.PI / 2 + (rnd() - 0.5) * 0.5 + (x < CX ? 0.15 : -0.15);
      g.strokeStyle = rgb(hair, 0.6 + rnd() * 0.9, 0.55); g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke();
    }
    for (let x = CX - 70; x < CX + 70; x += 1.5) { const y = hairline(x); g.strokeStyle = rgb(hair, 0.9, 0.5); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + (rnd() - 0.5) * 3, y + 2 + rnd() * 3); g.stroke(); }   // soft edge
    if (dead || choke) { g.fillStyle = 'rgba(80,4,4,0.5)'; for (let i = 0; i < 6; i++) blob(g, rnd() * W, rnd() * 60, 10 + rnd() * 20, 8, 'rgba(70,2,2,0.6)'); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return cache[key] = t;
}

// fabric weave + grime, multiplied over a clothing colour
export const fabricTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) { g.fillStyle = `rgba(0,0,0,${0.04 + R() * 0.06})`; g.fillRect(0, y, 128, 1); }
  for (let x = 0; x < 128; x += 2) { g.fillStyle = `rgba(255,255,255,${R() * 0.08})`; g.fillRect(x, 0, 1, 128); }
  for (let i = 0; i < 18; i++) blob(g, R() * 128, R() * 128, 6 + R() * 18, 6 + R() * 18, 'rgba(60,50,40,0.18)');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
export const fleshTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '120,60,50' : '255,240,230'},${R() * 0.12})`; g.fillRect(R() * 128, R() * 128, 1, 1); }
  for (let i = 0; i < 8; i++) blob(g, R() * 128, R() * 128, 10 + R() * 20, 10 + R() * 20, 'rgba(200,120,110,0.12)');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
// a counselor's T-shirt: the colour, the weave, and the camp's name across the chest
const shirtCache = {};
export function shirtTex(hex, text) {
  const key = hex + text; if (shirtCache[key]) return shirtCache[key];
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = css(hex); g.fillRect(0, 0, 256, 256);
  g.globalAlpha = 0.55; g.drawImage(fabricTex.image, 0, 0, 256, 256); g.globalAlpha = 1; g.globalCompositeOperation = 'multiply'; g.drawImage(fabricTex.image, 0, 0, 256, 256); g.globalCompositeOperation = 'source-over';
  if (text) {
    g.fillStyle = 'rgba(240,235,220,0.85)'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center';
    g.fillText(text[0], 128, 100); g.font = 'bold 22px Georgia, serif'; g.fillText(text[1], 128, 130);
    for (let i = 0; i < 400; i++) { g.fillStyle = css(hex); g.globalAlpha = R() * 0.6; g.fillRect(60 + R() * 136, 70 + R() * 70, 2, 1); } g.globalAlpha = 1;   // cracked print
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return shirtCache[key] = t;
}
