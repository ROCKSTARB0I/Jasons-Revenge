// The human body, sculpted from solid shapes: skin over muscle masses, hands
// with fingers, a skull with a face, clothes as shells over the body, and the
// organs inside, where they really sit. Every part is built in its own frame:
// Y runs from the joint it hangs from to the next joint, Z is the body's front,
// X its right. Lengths match the skeleton in body.js.
import * as THREE from '../vendor/three.module.js';
import { sd, smin, ssub, mesh, uvCylinder, uvSphere } from './sculpt.js?v=7';

const { sphere, ell, cone, box } = sd;
export const LEN = { hips: 0.21, torso: 0.36, neck: 0.14, upper: 0.281, fore: 0.25, hand: 0.17, thigh: 0.42, shin: 0.416, foot: 0.17 };

// ---------------------------------------------------------------- the solid shapes
function shapes(female) {
  const F = female ? 0.9 : 1, Hp = female ? 1.1 : 1, B = female ? 1 : 0;
  const S = {};
  S.torso = (x, y, z) => {
    let d = ell(x, y, z, 0, 0.21, -0.005, 0.145 * F, 0.15, 0.105);                          // ribcage
    d = smin(d, ell(x, y, z, 0, 0.055, 0.008, 0.132 * (female ? 0.94 : 1), 0.12, 0.098), 0.06);   // belly and waist
    d = smin(d, cone(x, y, z, -0.165 * F, 0.305, -0.01, 0.165 * F, 0.305, -0.01, 0.06, 0.06), 0.05);   // across the shoulders
    for (const s of [-1, 1]) {
      d = smin(d, cone(x, y, z, 0, 0.39, -0.02, s * 0.15 * F, 0.315, -0.02, 0.048, 0.04), 0.04);   // trapezius
      d = smin(d, ell(x, y, z, s * 0.185 * F, 0.29, 0, 0.055, 0.068, 0.056), 0.03);              // deltoid
      d = smin(d, ell(x, y, z, s * 0.068, 0.26, 0.068, 0.07, 0.052, 0.034), 0.03);               // pectoral
      if (B) d = smin(d, ell(x, y, z, s * 0.062, 0.228, 0.085, 0.058, 0.055, 0.048), 0.025);      // breasts
      d = smin(d, ell(x, y, z, s * 0.075, 0.25, -0.075, 0.06, 0.07, 0.03), 0.03);                // shoulder blades
      d = smin(d, ell(x, y, z, s * 0.115 * F, 0.13, 0.0, 0.03, 0.09, 0.07), 0.04);               // obliques / lats
    }
    d = smin(d, cone(x, y, z, 0, 0.33, -0.005, 0, 0.42, 0.005, 0.056, 0.05), 0.03);             // the base of the neck
    d = ssub(d, ell(x, y, z, 0, 0.17, -0.105, 0.012, 0.15, 0.012), 0.012);                       // the groove of the spine
    return d;
  };
  S.hips = (x, y, z) => {
    let d = ell(x, y, z, 0, 0.02, -0.005, 0.15 * Hp, 0.11, 0.105);                              // pelvis
    d = smin(d, ell(x, y, z, 0, 0.14, 0.012, 0.13 * (female ? 0.96 : 1), 0.1, 0.098), 0.05);    // lower belly
    for (const s of [-1, 1]) {
      d = smin(d, ell(x, y, z, s * 0.068 * Hp, -0.035, -0.062, 0.085 * Hp, 0.095, 0.072), 0.04);   // buttocks
      d = smin(d, cone(x, y, z, s * 0.095, -0.02, 0.0, s * 0.1, -0.15, 0.012, 0.088 * Hp, 0.082), 0.04);   // tops of the thighs
    }
    return d;
  };
  S.neck = (x, y, z) => {
    let d = cone(x, y, z, 0, -0.03, -0.005, 0, 0.13, 0.012, 0.054 * F, 0.047 * F);
    for (const s of [-1, 1]) d = smin(d, cone(x, y, z, s * 0.03, 0.0, 0.03, s * 0.022, 0.1, -0.005, 0.013, 0.012), 0.015);   // the cords of the neck
    d = smin(d, sphere(x, y, z, 0, 0.05, 0.045, female ? 0.008 : 0.014), 0.012);                // Adam's apple
    return d;
  };
  S.head = (x, y, z) => {
    let d = ell(x, y, z, 0, 0.028, -0.008, 0.077 * F + 0.004, 0.096, 0.098);                    // cranium
    d = smin(d, ell(x, y, z, 0, -0.045, 0.028, 0.06 * F, 0.068, 0.074), 0.035);                  // face and jaw
    d = smin(d, sphere(x, y, z, 0, -0.1, 0.068, 0.024), 0.03);                                   // chin
    for (const s of [-1, 1]) {
      d = smin(d, sphere(x, y, z, s * 0.054 * F, -0.06, -0.002, 0.026), 0.03);                   // angle of the jaw
      d = smin(d, ell(x, y, z, s * 0.045, -0.006, 0.072, 0.022, 0.015, 0.02), 0.015);            // cheekbones
      d = ssub(d, sphere(x, y, z, s * 0.032, 0.014, 0.1, 0.017), 0.012);                          // eye sockets
      d = smin(d, sphere(x, y, z, s * 0.032, 0.013, 0.088, 0.0125), 0.004);                       // eyes
      d = smin(d, ell(x, y, z, s * 0.078 * F, 0.002, -0.012, 0.011, 0.03, 0.02), 0.012);          // ears
      d = smin(d, sphere(x, y, z, s * 0.013, -0.03, 0.104, 0.009), 0.008);                         // nostril wings
    }
    d = smin(d, cone(x, y, z, -0.04, 0.033, 0.086, 0.04, 0.033, 0.086, 0.012, 0.012), 0.015);   // brow
    d = smin(d, cone(x, y, z, 0, 0.018, 0.098, 0, -0.024, 0.118, 0.008, 0.012), 0.008);         // nose
    d = smin(d, sphere(x, y, z, 0, -0.028, 0.114, 0.012), 0.008);
    d = smin(d, ell(x, y, z, 0, -0.057, 0.094, 0.024, 0.0075, 0.011), 0.006);                    // lips
    d = smin(d, ell(x, y, z, 0, -0.069, 0.091, 0.021, 0.008, 0.01), 0.006);
    d = smin(d, cone(x, y, z, 0, -0.07, -0.025, 0, -0.17, -0.03, 0.05, 0.048), 0.03);            // into the neck
    return d;
  };
  S.upper = (x, y, z) => {
    let d = cone(x, y, z, 0, 0, 0, 0, 0.281, 0, 0.048 * F, 0.037 * F);
    d = smin(d, ell(x, y, z, 0, 0.15, 0.016, 0.033 * F, 0.07, 0.03), 0.02);                      // biceps
    d = smin(d, ell(x, y, z, 0, 0.13, -0.02, 0.034 * F, 0.085, 0.028), 0.02);                    // triceps
    d = smin(d, sphere(x, y, z, 0, 0.0, 0, 0.052 * F), 0.03);                                    // the shoulder joint
    d = smin(d, sphere(x, y, z, 0, 0.275, -0.012, 0.03), 0.02);                                  // elbow
    return d;
  };
  S.fore = (x, y, z) => {
    let d = cone(x, y, z, 0, 0, 0, 0, 0.25, 0, 0.038 * F, 0.025 * F);
    d = smin(d, ell(x, y, z, 0.006, 0.07, 0.008, 0.038 * F, 0.075, 0.032), 0.02);                // the meat of the forearm
    d = smin(d, ell(x, y, z, 0, 0.245, 0, 0.028 * F, 0.016, 0.018), 0.015);                      // wrist
    return d;
  };
  // hand: the palm faces in toward the body (-X for the right hand once mirrored by the frame), fingers down
  S.hand = (x, y, z) => {
    let d = box(x, y, z, 0, 0.05, 0.0, 0.016, 0.048, 0.04 * F, 0.013);                            // palm, thickness along X
    const fz = [-0.028, -0.009, 0.01, 0.028], fl = [0.06, 0.07, 0.066, 0.052];
    for (let i = 0; i < 4; i++) {
      const z0 = fz[i] * F, r = (i === 3 ? 0.0078 : 0.0092) * F;
      d = smin(d, cone(x, y, z, -0.002, 0.09, z0, -0.008, 0.09 + fl[i] * 0.55, z0 * 1.03, r, r * 0.92), 0.008);
      d = smin(d, cone(x, y, z, -0.008, 0.09 + fl[i] * 0.55, z0 * 1.03, -0.018, 0.09 + fl[i], z0 * 1.05, r * 0.92, r * 0.8), 0.006);   // curled a little
    }
    d = smin(d, cone(x, y, z, -0.006, 0.03, 0.036 * F, -0.016, 0.085, 0.055 * F, 0.012, 0.009), 0.012);   // thumb
    d = smin(d, ell(x, y, z, -0.004, 0.035, 0.026, 0.016, 0.03, 0.02), 0.012);                   // the ball of the thumb
    return d;
  };
  S.thigh = (x, y, z) => {
    let d = cone(x, y, z, 0, 0, 0, 0, 0.42, 0.015, 0.085 * Hp, 0.05);
    d = smin(d, ell(x, y, z, 0, 0.17, 0.03, 0.068 * Hp, 0.15, 0.058), 0.04);                     // quadriceps
    d = smin(d, ell(x, y, z, 0, 0.19, -0.03, 0.062 * Hp, 0.14, 0.054), 0.04);                    // hamstrings
    d = smin(d, sphere(x, y, z, 0, 0.395, 0.04, 0.03), 0.02);                                    // kneecap
    return d;
  };
  S.shin = (x, y, z) => {
    let d = cone(x, y, z, 0, 0, 0.005, 0, 0.416, -0.005, 0.05 * F, 0.032 * F);
    d = smin(d, ell(x, y, z, 0, 0.13, -0.03, 0.05 * F, 0.11, 0.045), 0.03);                       // calf
    for (const s of [-1, 1]) d = smin(d, sphere(x, y, z, s * 0.026, 0.405, 0, 0.017), 0.012);     // ankle bones
    return d;
  };
  // a canvas sneaker; along the foot (+Y), Z up
  S.shoe = (x, y, z) => {
    let d = box(x, y, z, 0, 0.075, -0.012, 0.047 * F, 0.105, 0.045, 0.035);
    d = smin(d, cone(x, y, z, 0, 0, -0.01, 0, -0.005, 0.06, 0.046 * F, 0.042 * F), 0.03);        // round the ankle
    d = Math.min(d, box(x, y, z, 0, 0.075, -0.055, 0.05 * F, 0.112, 0.012, 0.01));               // sole
    return d;
  };
  return S;
}
const inflate = (f, k) => (x, y, z) => f(x, y, z) - k;
const clipBelow = (f, yMax) => (x, y, z) => Math.max(f(x, y, z), y - yMax);   // keep only y < yMax
const clipAbove = (f, yMin) => (x, y, z) => Math.max(f(x, y, z), yMin - y);   // keep only y > yMin

// ---------------------------------------------------------------- meshes, cached per build
const cache = {};
export function bodyParts(female) {
  const key = female ? 'f' : 'm'; if (cache[key]) return cache[key];
  const S = shapes(female);
  const B = (f, min, max, cell, len) => uvCylinder(mesh(f, min, max, cell), len);
  const P = {};
  P.torso = { skin: B(S.torso, [-0.26, -0.08, -0.17], [0.26, 0.45, 0.18], 0.017, 0.4) };
  P.hips = { skin: B(S.hips, [-0.25, -0.2, -0.19], [0.25, 0.27, 0.16], 0.017, 0.3) };
  P.neck = { skin: B(S.neck, [-0.08, -0.06, -0.07], [0.08, 0.16, 0.08], 0.01, 0.14) };
  P.head = { skin: uvSphere(mesh(S.head, [-0.11, -0.2, -0.13], [0.11, 0.14, 0.14], 0.0065), 0) };
  // hair: a shell over the scalp above the hairline (higher at the front), and length down the back
  const scalp = (x, y, z) => Math.max(ell(x, y, z, 0, 0.03, -0.01, 0.083 * (female ? 0.9 : 1) + 0.004, 0.103, 0.106), 0.035 + 0.38 * z - y);
  P.head.hair = uvSphere(mesh(scalp, [-0.11, -0.06, -0.13], [0.11, 0.15, 0.14], 0.008), 0);
  const longHair = (x, y, z) => smin(scalp(x, y, z), Math.max(ell(x, y, z, 0, -0.09, -0.07, 0.078, 0.14, 0.045), z - 0.0), 0.03);
  P.head.longHair = uvSphere(mesh(longHair, [-0.12, -0.26, -0.14], [0.12, 0.15, 0.14], 0.009), 0);
  P.upper = { skin: B(S.upper, [-0.07, -0.06, -0.07], [0.07, 0.32, 0.07], 0.012, LEN.upper) };
  P.upper.sleeve = B(clipBelow(inflate(S.upper, 0.008), 0.14), [-0.08, -0.07, -0.08], [0.08, 0.16, 0.08], 0.012, LEN.upper);
  P.upper.longSleeve = B(inflate(S.upper, 0.008), [-0.08, -0.07, -0.08], [0.08, 0.33, 0.08], 0.012, LEN.upper);
  P.fore = { skin: B(S.fore, [-0.06, -0.04, -0.06], [0.06, 0.28, 0.06], 0.01, LEN.fore) };
  P.fore.longSleeve = B(clipBelow(inflate(S.fore, 0.008), 0.235), [-0.07, -0.05, -0.07], [0.07, 0.26, 0.07], 0.011, LEN.fore);
  P.hand = { skin: B(S.hand, [-0.05, -0.02, -0.07], [0.04, 0.19, 0.08], 0.0055, LEN.hand) };
  P.thigh = { skin: B(S.thigh, [-0.11, -0.07, -0.1], [0.11, 0.46, 0.11], 0.014, LEN.thigh) };
  P.thigh.pants = B(inflate(S.thigh, 0.012), [-0.12, -0.08, -0.11], [0.12, 0.47, 0.12], 0.014, LEN.thigh);
  P.thigh.shorts = B(clipBelow(inflate(S.thigh, 0.012), 0.17), [-0.12, -0.08, -0.11], [0.12, 0.2, 0.12], 0.014, LEN.thigh);
  P.shin = { skin: B(S.shin, [-0.07, -0.04, -0.09], [0.07, 0.44, 0.07], 0.012, LEN.shin) };
  P.shin.pants = B(clipBelow(inflate(S.shin, 0.016), 0.4), [-0.08, -0.05, -0.1], [0.08, 0.42, 0.08], 0.013, LEN.shin);
  P.foot = { skin: B(S.shoe, [-0.07, -0.06, -0.08], [0.07, 0.21, 0.08], 0.01, LEN.foot) };
  return cache[key] = P;
}

// ---------------------------------------------------------------- organs, where they sit (in the torso's frame: Y up from the spine point)
// group: which part they live in. color: base tint for the wet material.
export const ORGANS = [
  { name: 'heart', group: 'torso', c: [-0.022, 0.2, 0.035], r: 0.06, color: 0x7a1414 },
  { name: 'lungL', group: 'torso', c: [-0.072, 0.225, -0.005], r: 0.09, color: 0xc07a80 },
  { name: 'lungR', group: 'torso', c: [0.075, 0.225, -0.005], r: 0.09, color: 0xc07a80 },
  { name: 'liver', group: 'torso', c: [0.045, 0.07, 0.025], r: 0.09, color: 0x4a1210 },
  { name: 'stomach', group: 'torso', c: [-0.05, 0.075, 0.04], r: 0.06, color: 0xc8907e },
  { name: 'kidneyL', group: 'torso', c: [-0.052, 0.015, -0.06], r: 0.045, color: 0x6a1a18 },
  { name: 'kidneyR', group: 'torso', c: [0.052, 0.005, -0.06], r: 0.045, color: 0x6a1a18 },
  { name: 'bowel', group: 'hips', c: [0, 0.1, 0.03], r: 0.1, color: 0xc89090 },
  { name: 'colon', group: 'hips', c: [0, 0.1, 0.03], r: 0.12, color: 0xa86e6a },
  { name: 'spineT', group: 'torso', c: [0, 0.18, -0.07], r: 0.2, color: 0xe2d6bc, bone: true },
  { name: 'spineL', group: 'hips', c: [0, 0.08, -0.06], r: 0.12, color: 0xe2d6bc, bone: true },
  { name: 'ribs', group: 'torso', c: [0, 0.2, 0], r: 0.15, color: 0xe6dac0, bone: true },
];
function organShape(name) {
  switch (name) {
    case 'heart': return (x, y, z) => {
      // a fist-sized muscle, apex down and to the left, the aorta arching up out of the top
      let d = ell(x, y, z, -0.022, 0.2, 0.035, 0.045, 0.055, 0.038);
      d = smin(d, ell(x, y, z, -0.04, 0.165, 0.04, 0.03, 0.035, 0.028), 0.02);
      d = smin(d, cone(x, y, z, -0.012, 0.24, 0.03, -0.004, 0.285, 0.02, 0.014, 0.012), 0.012);
      d = smin(d, cone(x, y, z, -0.004, 0.285, 0.02, -0.03, 0.29, -0.01, 0.012, 0.011), 0.008);
      d = smin(d, cone(x, y, z, 0.012, 0.24, 0.04, 0.02, 0.28, 0.035, 0.011, 0.01), 0.01);   // pulmonary trunk
      return d;
    };
    case 'lungL': return (x, y, z) => ssub(ell(x, y, z, -0.072, 0.225, -0.005, 0.058, 0.11, 0.07), ell(x, y, z, -0.025, 0.19, 0.04, 0.04, 0.05, 0.04), 0.02);   // notched for the heart
    case 'lungR': return (x, y, z) => ell(x, y, z, 0.075, 0.225, -0.005, 0.063, 0.11, 0.072);
    case 'liver': return (x, y, z) => smin(ell(x, y, z, 0.06, 0.075, 0.025, 0.075, 0.045, 0.06), ell(x, y, z, -0.01, 0.085, 0.04, 0.05, 0.025, 0.04), 0.03);
    case 'stomach': return (x, y, z) => smin(ell(x, y, z, -0.06, 0.08, 0.04, 0.045, 0.05, 0.035), cone(x, y, z, -0.04, 0.05, 0.045, 0.0, 0.045, 0.05, 0.022, 0.015), 0.02);
    case 'kidneyL': return (x, y, z) => ssub(ell(x, y, z, -0.052, 0.015, -0.06, 0.024, 0.045, 0.02), sphere(x, y, z, -0.025, 0.015, -0.06, 0.012), 0.01);
    case 'kidneyR': return (x, y, z) => ssub(ell(x, y, z, 0.052, 0.005, -0.06, 0.024, 0.045, 0.02), sphere(x, y, z, 0.025, 0.005, -0.06, 0.012), 0.01);
    case 'bowel': {
      // the small intestine: one long tube, coiled back and forth to fill the belly
      const segs = []; let px = -0.07, py = 0.04, pz = 0.0;
      for (let i = 0; i < 46; i++) {
        const a = i * 1.9, nx = Math.sin(a) * 0.075, ny = 0.04 + (i / 46) * 0.13 + Math.sin(a * 0.7) * 0.012, nz = 0.035 + Math.cos(a * 1.3) * 0.035;
        segs.push([px, py, pz, nx, ny, nz]); px = nx; py = ny; pz = nz;
      }
      return (x, y, z) => { let d = 1; for (const s of segs) d = Math.min(d, cone(x, y, z, ...s, 0.014, 0.014)); return d; };
    }
    case 'colon': return (x, y, z) => {
      // the large intestine framing it: up the right side, across the top, down the left
      let d = cone(x, y, z, 0.1, 0.02, 0.03, 0.1, 0.2, 0.03, 0.022, 0.022);
      d = smin(d, cone(x, y, z, 0.1, 0.2, 0.03, -0.1, 0.2, 0.04, 0.021, 0.021), 0.015);
      d = smin(d, cone(x, y, z, -0.1, 0.2, 0.04, -0.09, 0.0, 0.02, 0.02, 0.02), 0.015);
      for (let i = 0; i < 12; i++) d = smin(d, sphere(x, y, z, 0.1 - (i > 3 ? Math.min(i - 3, 5) * 0.04 : 0) * (i > 8 ? 1 : 1), 0.02 + Math.min(i, 4) * 0.045, 0.03, 0.024), 0.01);   // the pouches
      return d;
    };
    case 'spineT': return (x, y, z) => { let d = 1; for (let i = 0; i < 9; i++) { const y0 = -0.02 + i * 0.045; d = Math.min(d, box(x, y, z, 0, y0, -0.075, 0.018, 0.016, 0.016, 0.005), cone(x, y, z, 0, y0, -0.09, 0, y0 - 0.01, -0.11, 0.006, 0.004)); } return d; };
    case 'spineL': return (x, y, z) => { let d = 1; for (let i = 0; i < 4; i++) { const y0 = 0.02 + i * 0.05; d = Math.min(d, box(x, y, z, 0, y0, -0.07, 0.022, 0.019, 0.02, 0.006)); } return d; };
    case 'ribs': return (x, y, z) => {
      // twelve pairs curving round from the spine toward the breastbone
      let d = cone(x, y, z, 0, 0.16, 0.098, 0, 0.29, 0.1, 0.012, 0.012);   // sternum
      for (let i = 0; i < 9; i++) {
        const y0 = 0.3 - i * 0.026, w = 0.1 + Math.sin((i + 2) / 11 * Math.PI) * 0.035, dep = 0.085 + Math.sin((i + 2) / 11 * Math.PI) * 0.02;
        for (const s of [-1, 1]) {
          let px = 0, pz = -0.08;
          for (let k = 1; k <= 6; k++) { const a = k / 6 * Math.PI * 0.9; const nx = s * Math.sin(a) * w, nz = -Math.cos(a) * dep; d = Math.min(d, cone(x, y, z, px, y0 + (k - 1) * 0.004, pz, nx, y0 + k * 0.004 - (k > 4 ? 0.01 : 0), nz, 0.005, 0.005)); px = nx; pz = nz; }
        }
      }
      return d;
    };
  }
}
const organCache = {};
export function organGeo(name) {
  if (organCache[name]) return organCache[name];
  const o = ORGANS.find(q => q.name === name), [cx, cy, cz] = o.c, r = o.r + 0.03;
  const cell = name === 'ribs' ? 0.005 : name === 'bowel' ? 0.006 : name.startsWith('spine') ? 0.005 : 0.007;
  const min = name === 'ribs' ? [-0.16, 0.06, -0.12] : [cx - r, cy - r, cz - r], max = name === 'ribs' ? [0.16, 0.34, 0.13] : [cx + r, cy + r, cz + r];
  if (name === 'spineT') { min[0] = -0.04; max[0] = 0.04; min[1] = -0.06; max[1] = 0.38; min[2] = -0.13; max[2] = -0.05; }
  if (name === 'spineL') { min[0] = -0.04; max[0] = 0.04; min[1] = -0.02; max[1] = 0.22; min[2] = -0.1; max[2] = -0.04; }
  return organCache[name] = uvSphere(mesh(organShape(name), min, max, cell), cy);
}
