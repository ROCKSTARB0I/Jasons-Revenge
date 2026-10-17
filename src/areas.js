// The six places around Crystal Lake. Every one keeps the same bones (the lake to the
// south, the road and the gate to the north, a fence all round) so the hunt plays the
// same everywhere, but what's in between is its own: the buildings, the rooms, where
// people hang about, and who's there.

// ---------------------------------------------------------------- floor plans
// Building space: x across, z front (+) to back (-). See build.js for the format.
const P = Math.PI;

// a camp cabin: a bunk room, the counselor's room, a little bathroom
const bunkCabin = (o = {}) => ({
  w: 7, d: 5.5, ext: o.ext ?? 'plank', int: 'knotty',
  rooms: [{ x0: -3.5, z0: -2.75, x1: 1.2, z1: 2.75 }, { x0: 1.2, z0: -2.75, x1: 3.5, z1: 0.5 }, { x0: 1.2, z0: 0.5, x1: 3.5, z1: 2.75, floor: 'bathTile', kind: 'bath' }],
  holes: [{ side: 'front', at: -1.6, kind: 'door' }, { side: 'front', at: 2.35, w: 0.6 }, { side: 'left', at: -1.2 }, { side: 'left', at: 1.2 }, { side: 'back', at: -2.0 }, { side: 'back', at: 2.35 }, { side: 'right', at: -1.2 }],
  walls: [[1.2, -2.75, 1.2, 2.75, [-1.0, 1.0]], [1.2, 0.5, 3.5, 0.5, []]],
  furn: [['bunk', -3.0, -1.55, 0], ['bunk', -3.0, 1.45, 0], ['bunk', -1.25, -2.25, 1], ['wardrobe', 0.55, -2.42, 0], ['table', -0.9, 0.3, 0, 1.0, 0.7, 2], ['rug', -1.4, 1.2, 0, 1.6, 1.1],
    ['picture', -3.42, 1.55, 0.2, 1], ['picture', 1.12, 1.6, -2.0, 3],
    ['bed', 2.85, -1.6, 0], ['nightstand', 1.65, -2.45, 0], ['wardrobe', 2.9, 0.12, 2],
    ['shower', 1.75, 2.25, 2], ['toilet', 3.15, 1.95, 3], ['sink', 2.75, 0.78, 0]],
  lamps: [[-1.2, 2.5, 0.2, 'ceiling'], [2.35, 2.5, 1.6, 'bare', { power: 1.5, range: 4 }]],
  porch: { d: 1.8, w: 3.2, x: -1.6 }, hideAt: [[-0.4, -1.4], [2.2, -0.4]], inside: [-1.0, 0.6], ...o,
});
// the main lodge at Crystal Lake: the dining hall up front, office, toilets, a store room and the kitchen behind
const campLodge = (o = {}) => ({
  w: 16, d: 11, h: 3.0, ext: 'log', int: 'panel', main: true,
  rooms: [{ x0: -8, z0: -1, x1: 8, z1: 5.5, spot: 'lodge' }, { x0: -8, z0: -5.5, x1: -3.5, z1: -1 }, { x0: -3.5, z0: -5.5, x1: 0, z1: -1, floor: 'bathTile', kind: 'bath' }, { x0: 0, z0: -5.5, x1: 2.5, z1: -1, floor: 'floorDark' }, { x0: 2.5, z0: -5.5, x1: 8, z1: -1, floor: 'linoleum' }],
  holes: [{ side: 'front', at: 0, kind: 'door', w: 1.4 }, { side: 'front', at: -6 }, { side: 'front', at: -3.5 }, { side: 'front', at: 3.5 }, { side: 'front', at: 6 },
    { side: 'left', at: 3.6 }, { side: 'left', at: -3.3 }, { side: 'right', at: 3.6 }, { side: 'right', at: -3.3 }, { side: 'back', at: 7.35, kind: 'door' }, { side: 'back', at: -6 }, { side: 'back', at: 4.2 }],
  walls: [[-8, -1, 8, -1, [-5.8, -1.8, 1.25, { at: 5.2, w: 1.6, kind: 'arch' }]], [-3.5, -5.5, -3.5, -1], [0, -5.5, 0, -1], [2.5, -5.5, 2.5, -1]],
  furn: [['fireplace', -7.6, 2.2, 1], ['couch', -5.6, 2.2, 3], ['armchair', -6.6, 4.4, 2], ['rug', -6.4, 2.3, 1, 2.6, 2.0], ['shelf', -7.65, -0.1, 1, 1.0],
    ['table', 2.6, 1.6, 0, 3.0, 0.9, 2], ['table', 2.6, 3.9, 0, 3.0, 0.9, 2], ['table', 6.4, 2.7, 1, 2.6, 0.9, 2], ['piano', -2.6, 4.95, 2], ['record', -0.9, -0.7, 0],
    ['picture', -7.92, 1.7, 4.2, 1, true], ['picture', 7.92, 1.7, 2.6, 3, true], ['picture', 0, 1.8, 5.42, 2],
    ['desk', -6.0, -4.75, 0], ['phone', -7.92, 1.45, -2.4, 1], ['wardrobe', -4.15, -4.85, 0], ['shelf', -7.65, -4.4, 1, 1.0],
    ['stall', -3.0, -4.75, 0], ['stall', -2.0, -4.75, 0], ['sink', -0.45, -5.2, 0], ['sink', -0.45, -2.2, 3],
    ['shelf', 1.25, -5.25, 0, 2.0], ['crates', 1.2, -3.3, 0, 4], ['barrel', 2.0, -1.7],
    ['counter', 5.0, -5.15, 0, 3.0, true], ['stove', 7.3, -3.4, 3], ['fridge', 7.4, -1.85, 3], ['table', 4.4, -3.0, 0, 1.2, 0.8, 2]],
  lamps: [[-4.5, 2.95, 2.2, 'ceiling'], [3.5, 2.95, 2.2, 'ceiling'], [-7.3, 1.45, 4.9, 'floor'], [5.2, 2.95, -3.3, 'tube'], [-1.8, 2.95, -3.2, 'tube', { power: 2 }], [1.25, 2.9, -3.2, 'bare', { power: 1.4, range: 4 }]],
  porch: { d: 2.4, w: 10, x: 0, chairs: true }, chimney: [-8.35, 2.2], hideAt: [[-6, -3], [1.25, -4.3], [-2.5, -2]], inside: [0, 2], ...o,
});
// a washhouse: toilet stalls and showers
const washhouse = (o = {}) => ({
  w: 6, d: 4.4, ext: 'sidingGreen', int: 'plaster', floorMat: 'bathTile',
  holes: [{ side: 'front', at: 0, kind: 'door' }, { side: 'left', at: 0, w: 0.6 }, { side: 'right', at: 0, w: 0.6 }],
  furn: [['stall', -2.4, -1.45, 0], ['stall', -1.4, -1.45, 0], ['stall', -0.4, -1.45, 0], ['shower', 1.2, -1.6, 0], ['shower', 2.3, -1.6, 0], ['sink', -2.65, 1.2, 1], ['sink', 2.65, 1.2, 3]],
  lamps: [[0, 2.55, 0.2, 'tube', { power: 2.4 }]], roof: 'shed', inside: [0, 0.8], hideAt: [[-1.4, 0.4]], ...o,
});
// arts and crafts: long tables, shelves of paint and yarn
const craftCabin = (o = {}) => ({
  w: 8, d: 5.5, ext: 'sidingBlue', int: 'knotty',
  holes: [{ side: 'front', at: 0, kind: 'door' }, { side: 'front', at: -2.6 }, { side: 'front', at: 2.6 }, { side: 'back', at: -2.4 }, { side: 'back', at: 2.4 }, { side: 'left', at: 0 }],
  furn: [['table', -1.9, -0.5, 1, 2.2, 0.9, 2], ['table', 1.9, -0.5, 1, 2.2, 0.9, 2], ['shelf', -3.6, -1.4, 1, 1.4], ['shelf', 3.6, 1.0, 3, 1.4], ['crates', 3.2, -2.3, 0, 2], ['picture', 0, 1.6, -2.67, 0, true], ['wardrobe', -3.4, 1.9, 1]],
  lamps: [[-1.8, 2.55, 0, 'ceiling'], [1.8, 2.55, 0, 'ceiling']], porch: { d: 1.6, w: 3, x: 0 }, inside: [0, 0.8], hideAt: [[0, -2]], ...o,
});
// Packanack: the training centre's lodge. Rec room, kitchen, office up front; a corridor of rooms behind.
const bigLodge = (o = {}) => ({
  w: 20, d: 13, h: 3.0, ext: 'log', int: 'paperBeige', main: true,
  rooms: [{ x0: -10, z0: 0.5, x1: -2, z1: 6.5, spot: 'lodge' }, { x0: -2, z0: 0.5, x1: 4, z1: 6.5, floor: 'linoleum', spot: 'lodge' }, { x0: 4, z0: 0.5, x1: 7, z1: 6.5, floor: 'bathTile', kind: 'bath' }, { x0: 7, z0: 0.5, x1: 10, z1: 6.5 },
    { x0: -10, z0: -1.5, x1: 10, z1: 0.5, floor: 'floorDark', kind: 'hall' }, { x0: -10, z0: -6.5, x1: -5, z1: -1.5 }, { x0: -5, z0: -6.5, x1: 0, z1: -1.5 }, { x0: 0, z0: -6.5, x1: 5, z1: -1.5 }, { x0: 5, z0: -6.5, x1: 10, z1: -1.5 }],
  holes: [{ side: 'front', at: -6, kind: 'door' }, { side: 'front', at: -8.6 }, { side: 'front', at: -3.4 }, { side: 'front', at: 0.6 }, { side: 'front', at: 5.5, w: 0.6 }, { side: 'front', at: 8.5 },
    { side: 'left', at: -0.5, kind: 'door' }, { side: 'left', at: 3.5 }, { side: 'left', at: -4 }, { side: 'right', at: -0.5, kind: 'door' }, { side: 'right', at: 3.5 }, { side: 'right', at: -4 },
    { side: 'back', at: -7.5 }, { side: 'back', at: -2.5 }, { side: 'back', at: 2.5 }, { side: 'back', at: 7.5 }],
  walls: [[-10, 0.5, 10, 0.5, [{ at: -6, w: 2.2, kind: 'arch' }, 1.0, 5.5, 8.5]], [-2, 0.5, -2, 6.5, [{ at: 3.5, w: 1.4, kind: 'arch' }]], [4, 0.5, 4, 6.5], [7, 0.5, 7, 6.5],
    [-10, -1.5, 10, -1.5, [-7.5, -2.5, 2.5, 7.5]], [-5, -6.5, -5, -1.5], [0, -6.5, 0, -1.5], [5, -6.5, 5, -1.5]],
  furn: [['pooltable', -8.2, 3.5, 0], ['couch', -4.0, 5.65, 2], ['tv', -4.0, 2.9, 0], ['armchair', -5.4, 4.3, 1], ['bar', -4.8, 1.25, 0, 2.6], ['fireplace', -9.6, 1.6, 1], ['record', -9.65, 5.6, 1], ['rug', -4.2, 4.3, 0, 2.6, 1.8], ['picture', -9.92, 1.8, 4.5, 1, true],
    ['counter', 3.62, 3.6, 3, 3.0, true], ['stove', 3.6, 1.45, 3], ['fridge', 3.6, 5.9, 3], ['table', 0.6, 3.6, 0, 1.6, 0.9, 4],
    ['stall', 4.55, 5.75, 2], ['stall', 5.55, 5.75, 2], ['sink', 6.72, 2.0, 3],
    ['desk', 8.5, 5.8, 2], ['phone', 9.92, 1.45, 3.4, 3], ['shelf', 7.32, 3.6, 1, 1.2], ['wardrobe', 9.6, 1.4, 3],
    ['bed', -6.4, -5.4, 0, true], ['nightstand', -5.45, -6.1, 0], ['wardrobe', -9.6, -4.0, 1], ['dresser', -8.7, -6.15, 0],
    ['bunk', -4.2, -5.4, 0], ['bunk', -0.8, -5.4, 0], ['wardrobe', -2.5, -6.15, 0], ['picture', -2.5, 1.6, -1.58, 2],
    ['bunk', 0.8, -5.4, 0], ['bunk', 4.2, -5.4, 0], ['dresser', 2.5, -6.15, 0],
    ['bed', 8.6, -5.4, 0, true], ['nightstand', 9.55, -6.1, 0], ['wardrobe', 5.4, -4.0, 1], ['armchair', 6.0, -2.4, 1]],
  lamps: [[-5.5, 2.95, 3.5, 'ceiling'], [-9.3, 1.45, 0.9, 'floor'], [1, 2.95, 3.6, 'tube'], [5.5, 2.9, 3, 'bare', { power: 1.6, range: 4 }],
    [-6, 2.95, -0.5, 'ceiling', { power: 1.8 }], [0, 2.95, -0.5, 'ceiling', { power: 1.8 }], [6, 2.95, -0.5, 'ceiling', { power: 1.8 }], [-2.5, 2.95, -4, 'ceiling'], [2.5, 2.95, -4, 'ceiling']],
  porch: { d: 2.2, w: 8, x: -6, swing: true }, chimney: [-10.4, 1.6], hideAt: [[-7.5, -3.5], [2.5, -3.5], [8.5, 3]], inside: [-5, 3], ...o,
});
// a little A-frame in the trees
const aframe = (o = {}) => ({
  w: 5, d: 7, h: 2.4, roof: 'aframe', ext: 'plankDark', int: 'knotty',
  rooms: [{ x0: -2.5, z0: -0.5, x1: 2.5, z1: 3.5 }, { x0: -2.5, z0: -3.5, x1: 0, z1: -0.5, floor: 'bathTile', kind: 'bath' }, { x0: 0, z0: -3.5, x1: 2.5, z1: -0.5 }],
  holes: [{ side: 'front', at: 0, kind: 'door' }, { side: 'front', at: -1.6, w: 0.7 }, { side: 'front', at: 1.6, w: 0.7 }, { side: 'left', at: 1.4 }, { side: 'right', at: 1.4 }, { side: 'back', at: 1.25 }],
  walls: [[-2.5, -0.5, 2.5, -0.5, [-1.25, 0.6]], [0, -3.5, 0, -0.5]],
  furn: [['couch', -1.85, 1.6, 1], ['tv', 1.95, 1.2, 3], ['armchair', 1.5, 2.8, 3], ['rug', 0, 1.6, 0, 2.0, 1.4], ['picture', -2.42, 1.6, 2.9, 1],
    ['bed', 1.85, -2.35, 0], ['nightstand', 0.45, -3.2, 0], ['shower', -0.55, -2.95, 0], ['toilet', -2.15, -2.95, 0], ['sink', -2.25, -1.0, 1]],
  lamps: [[0, 2.35, 1.6, 'ceiling'], [-1.25, 2.3, -2, 'bare', { power: 1.4, range: 3.5 }]], porch: { d: 1.4, w: 2.4, x: 0 }, hideAt: [[1.2, -1.2]], inside: [0, 1.5], ...o,
});
// Higgins Haven: the old farmhouse
const farmhouse = (o = {}) => ({
  w: 13, d: 10, h: 2.7, ext: 'boardBatten', int: 'paperBeige', main: true, trim: 'white', pitch: 0.62, atticRound: true,
  upper: { front: [-4.5, -1.5, 1.5, 4.5], back: [-4, 0, 4], left: [0], right: [0] },
  rooms: [{ x0: -6.5, z0: 0.5, x1: -0.5, z1: 5, spot: 'lodge' }, { x0: -0.5, z0: 0.5, x1: 6.5, z1: 5, floor: 'linoleum', spot: 'lodge' }, { x0: -6.5, z0: -1, x1: 6.5, z1: 0.5, floor: 'floorDark', kind: 'hall' },
    { x0: -6.5, z0: -5, x1: -2.5, z1: -1 }, { x0: -2.5, z0: -5, x1: 0, z1: -1, floor: 'bathTile', kind: 'bath' }, { x0: 0, z0: -5, x1: 3.5, z1: -1 }, { x0: 3.5, z0: -5, x1: 6.5, z1: -1 }],
  holes: [{ side: 'front', at: -3, kind: 'door' }, { side: 'front', at: -5.2 }, { side: 'front', at: -1.4 }, { side: 'front', at: 1.0 }, { side: 'right', at: 2.5, kind: 'door' }, { side: 'right', at: -3 },
    { side: 'left', at: 2.8 }, { side: 'left', at: -3 }, { side: 'back', at: -4.5 }, { side: 'back', at: 1.75 }, { side: 'back', at: 5.0 }, { side: 'back', at: -1.25, w: 0.5 }],
  walls: [[-6.5, 0.5, 6.5, 0.5, [{ at: -3.5, w: 1.6, kind: 'arch' }, 3.0]], [-0.5, 0.5, -0.5, 5, [{ at: 2.8, w: 1.4, kind: 'arch' }]], [-6.5, -1, 6.5, -1, [-4.5, -1.25, 1.75, 5.0]], [-2.5, -5, -2.5, -1], [0, -5, 0, -1], [3.5, -5, 3.5, -1]],
  furn: [['fireplace', -6.1, 2.8, 1], ['couch', -4.4, 2.8, 3], ['armchair', -5.4, 4.4, 2], ['rug', -5.3, 2.8, 1, 2.2, 1.6], ['tv', -1.0, 3.6, 3], ['shelf', -1.5, 0.75, 2, 1.2], ['picture', -6.42, 1.7, 1.2, 1], ['phone', -6.42, 1.45, -0.25, 1],
    ['counter', 2.5, 4.68, 2, 3.0, true], ['stove', 4.6, 4.65, 2], ['fridge', 6.1, 4.65, 2], ['table', 2.0, 2.3, 0, 1.6, 0.9, 4],
    ['bed', -5.4, -3.9, 0, true], ['wardrobe', -3.0, -4.6, 0], ['nightstand', -4.2, -4.75, 0], ['picture', -4.5, 1.6, -4.92, 0],
    ['bathtub', -1.3, -4.1, 1], ['toilet', -0.4, -2.0, 3], ['sink', -2.28, -2.0, 1],
    ['bed', 2.6, -3.9, 0], ['wardrobe', 0.6, -4.45, 1], ['dresser', 1.2, -1.45, 2],
    ['bunk', 4.1, -3.9, 0], ['dresser', 5.8, -4.7, 0], ['picture', 6.42, 1.6, -3, 3]],
  lamps: [[-3.5, 2.65, 2.8, 'ceiling'], [-6.0, 1.45, 4.6, 'floor'], [2.5, 2.65, 2.6, 'ceiling'], [0, 2.65, -0.25, 'bare', { power: 1.5 }], [-1.25, 2.6, -3, 'bare', { power: 1.3, range: 3.5 }], [1.75, 2.65, -3, 'ceiling'], [5, 2.65, -3, 'ceiling']],
  porch: { d: 2.4, w: 13, x: 0, swing: true, chairs: true }, chimney: [-6.95, 2.8], hideAt: [[-5, -2], [4.5, -2], [-1, 3]], inside: [-3, 2.5], ...o,
});
// a barn: stalls, hay, a tractor, lanterns
const barn = (o = {}) => ({
  w: 12, d: 16, h: 4.2, floorY: 0.06, ext: 'barnWood', int: 'barnWood', floorMat: 'floorDark', roofMat: 'roof', pitch: 0.72, ceil: 'plankDark', loftDoor: true,
  holes: [{ side: 'front', at: 0, kind: 'arch', w: 3.2 }, { side: 'back', at: 0, kind: 'arch', w: 2.4 }, { side: 'left', at: -4, w: 0.7, lit: false }, { side: 'left', at: 4, w: 0.7, lit: false }, { side: 'right', at: -4, w: 0.7, lit: false }],
  furn: [['stalls', -4.6, -2, 1, 3], ['hay', 4.6, -5.6, 0, 6], ['hay', 4.6, -3.6, 0, 4], ['hay', -4.4, 5.6, 1, 4], ['tractor', 3.6, 3.6, 0], ['workbench', 5.55, 0.2, 3, 2.2], ['barrel', -5.3, 6.8], ['crates', -2.2, 7.1, 0, 3]],
  lamps: [[-2.5, 2.4, 0, 'lantern'], [2.5, 2.4, -4, 'lantern'], [0, 3.9, 4, 'bare', { power: 2 }]], hideAt: [[4.6, -6.6], [-5, 4]], inside: [0, 0], ...o,
});
const outhouse = (o = {}) => ({ w: 1.4, d: 1.4, h: 2.2, floorY: 0.15, ext: 'plankDark', int: 'plankDark', roof: 'shed', holes: [{ side: 'front', at: 0, kind: 'door', w: 0.8 }], furn: [['toilet', 0, -0.35, 0]], hideAt: [[0, 0]], inside: [0, 0], noSpot: true, ...o });
// Camp Forest Green: a long bunkhouse, two bunk rooms either side of the washroom
const bunkhouse = (o = {}) => ({
  w: 14, d: 6.5, ext: 'brownStain', int: 'knotty',
  rooms: [{ x0: -7, z0: -3.25, x1: -2, z1: 3.25 }, { x0: -2, z0: -0.5, x1: 2, z1: 3.25, kind: 'hall' }, { x0: -2, z0: -3.25, x1: 2, z1: -0.5, floor: 'bathTile', kind: 'bath' }, { x0: 2, z0: -3.25, x1: 7, z1: 3.25 }],
  holes: [{ side: 'front', at: 0, kind: 'door' }, { side: 'front', at: -4.5 }, { side: 'front', at: 4.5 }, { side: 'back', at: -4.5 }, { side: 'back', at: 4.5 }, { side: 'back', at: 0, w: 0.6 }, { side: 'left', at: 0 }, { side: 'right', at: 0 }],
  walls: [[-2, -3.25, -2, 3.25, [1.5]], [2, -3.25, 2, 3.25, [1.5]], [-2, -0.5, 2, -0.5, [0]]],
  furn: [['bunk', -6.4, -1.9, 0], ['bunk', -6.4, 1.6, 0], ['bunk', -4.2, -2.62, 1], ['lockers', -3.05, 2.95, 2, 3], ['picture', -4.5, 1.6, 3.17, 2],
    ['bunk', 6.4, -1.9, 0], ['bunk', 6.4, 1.6, 0], ['bunk', 4.2, -2.62, 1], ['lockers', 3.05, 2.95, 2, 3],
    ['stall', -1.4, -2.5, 0], ['stall', -0.45, -2.5, 0], ['shower', 1.45, -2.7, 0], ['sink', 1.7, -1.0, 3], ['chair', -1.2, 2.5, 0], ['picture', 0, 1.6, -0.58, 2]],
  lamps: [[-4.5, 2.55, 0, 'ceiling'], [4.5, 2.55, 0, 'ceiling'], [0, 2.55, -1.8, 'tube', { power: 1.6 }], [0, 2.55, 1.4, 'bare', { power: 1.4 }]], porch: { d: 1.6, w: 3, x: 0 }, hideAt: [[-4.5, 0], [4.5, 0]], inside: [0, 1.4], ...o,
});
const messHall = (o = {}) => ({
  w: 16, d: 10, h: 3.0, ext: 'brownStain', int: 'plaster', main: true,
  rooms: [{ x0: -8, z0: -1, x1: 8, z1: 5, spot: 'lodge', floor: 'linoleum' }, { x0: -8, z0: -5, x1: 4, z1: -1, floor: 'linoleum' }, { x0: 4, z0: -5, x1: 8, z1: -1, floor: 'floorDark' }],
  holes: [{ side: 'front', at: 0, kind: 'door', w: 1.4 }, { side: 'front', at: -6 }, { side: 'front', at: -3 }, { side: 'front', at: 3 }, { side: 'front', at: 6 }, { side: 'left', at: 2 }, { side: 'left', at: -3 }, { side: 'right', at: 2 }, { side: 'back', at: -6.5, kind: 'door' }, { side: 'back', at: 1 }],
  walls: [[-8, -1, 8, -1, [{ at: -2, w: 2.0, kind: 'arch' }, 6.0]], [4, -5, 4, -1]],
  furn: [['table', -5, 1.2, 0, 3.0, 0.9, 2], ['table', -5, 3.6, 0, 3.0, 0.9, 2], ['table', 5, 1.2, 0, 3.0, 0.9, 2], ['table', 5, 3.6, 0, 3.0, 0.9, 2], ['picture', 0, 1.9, -0.92, 0, true],
    ['counter', -4, -4.65, 0, 4.0, true], ['stove', -1.4, -4.65, 0], ['stove', -0.6, -4.65, 0], ['fridge', -7.6, -3.0, 1], ['table', -4, -2.5, 0, 2.4, 0.9, 0],
    ['phone', -7.92, 1.45, 0.4, 1], ['shelf', 5.0, -4.8, 0, 1.6], ['shelf', 7.2, -4.8, 0, 1.2], ['crates', 5.0, -2.6, 0, 4]],
  lamps: [[-4, 2.95, 2.4, 'tube'], [4, 2.95, 2.4, 'tube'], [0, 2.95, 2.4, 'tube', { flicker: 1 }], [-3, 2.95, -3, 'tube'], [6, 2.9, -3, 'bare', { power: 1.4 }]], hideAt: [[6, -2], [-6, -3]], inside: [0, 2], ...o,
});
const infirmary = (o = {}) => ({
  w: 9, d: 6.5, ext: 'sidingWhite', int: 'plaster', roof: 'flat', floorMat: 'linoleum',
  rooms: [{ x0: -4.5, z0: -3.25, x1: 1.5, z1: 3.25 }, { x0: 1.5, z0: 0, x1: 4.5, z1: 3.25 }, { x0: 1.5, z0: -3.25, x1: 4.5, z1: 0 }],
  holes: [{ side: 'front', at: -1.5, kind: 'door' }, { side: 'front', at: -3.5 }, { side: 'front', at: 3.0 }, { side: 'left', at: -1.5 }, { side: 'left', at: 1.5 }, { side: 'back', at: -3.0 }, { side: 'back', at: -0.5 }],
  walls: [[1.5, -3.25, 1.5, 3.25, [-1.6, 1.6]], [1.5, 0, 4.5, 0]],
  furn: [['bed', -3.9, -2.1, 0], ['bed', -2.2, -2.1, 0], ['bed', -0.5, -2.1, 0], ['chair', -3.0, 0.2, 0], ['picture', -4.42, 1.6, 1.5, 1],
    ['desk', 3.0, 2.6, 2], ['shelf', 4.2, 1.2, 3, 1.0], ['lockers', 3.0, -2.9, 0, 4], ['crates', 2.3, -0.8, 0, 2]],
  lamps: [[-1.5, 2.55, 0, 'tube', { flicker: 1 }], [3, 2.5, -1.6, 'bare', { power: 1.2, range: 3.5 }]], hideAt: [[3, -1.5]], inside: [-1.5, 0.5], ...o,
});
const trailer = (o = {}) => ({
  w: 7.5, d: 2.6, h: 2.1, floorY: 0.55, ext: 'sidingWhite', int: 'panel', roof: 'flat',
  holes: [{ side: 'front', at: 1.5, kind: 'door', w: 0.8 }, { side: 'front', at: -2.5 }, { side: 'front', at: 3.0, w: 0.6 }, { side: 'back', at: -1 }, { side: 'back', at: 2.5 }, { side: 'left', at: 0 }],
  furn: [['bed', -2.7, 0, 1], ['counter', 1.2, -0.95, 0, 1.8, true], ['table', -0.2, 0.75, 0, 0.8, 0.55, 0], ['wardrobe', 3.35, -0.45, 3]],
  lamps: [[0, 2.05, 0, 'ceiling', { power: 2 }]], porch: { d: 0.9, w: 1.4, x: 1.5, light: true }, hideAt: [[-2.7, 0.9]], inside: [0, 0.3], ...o,
});
// a family house by the water (the Jarvis place and the rental next door)
const lakeHouse = (o = {}) => ({
  w: 12, d: 10, h: 2.7, ext: o.ext ?? 'brownShingle', int: 'logInt', main: !!o.main, pitch: 0.78, dormers: [-3.2, 0.4, 3.6],
  rooms: [{ x0: -6, z0: 0, x1: 1, z1: 5, spot: 'lodge' }, { x0: 1, z0: 0, x1: 6, z1: 5, floor: 'linoleum', spot: 'lodge' }, { x0: -6, z0: -1.5, x1: 6, z1: 0, floor: 'floorDark', kind: 'hall' },
    { x0: -6, z0: -5, x1: -2, z1: -1.5 }, { x0: -2, z0: -5, x1: 0, z1: -1.5, floor: 'bathTile', kind: 'bath' }, { x0: 0, z0: -5, x1: 3, z1: -1.5 }, { x0: 3, z0: -5, x1: 6, z1: -1.5 }],
  holes: [{ side: 'front', at: -2.5, kind: 'door' }, { side: 'front', at: -4.8 }, { side: 'front', at: -0.4 }, { side: 'front', at: 2.6 }, { side: 'front', at: 4.8 },
    { side: 'left', at: -0.75, kind: 'door' }, { side: 'left', at: 2.5 }, { side: 'left', at: -3.2 }, { side: 'right', at: 2.5 }, { side: 'right', at: -3.2 }, { side: 'back', at: -4 }, { side: 'back', at: 1.5 }, { side: 'back', at: 4.5 }, { side: 'back', at: -1, w: 0.5 }],
  walls: [[-6, 0, 6, 0, [{ at: -2.5, w: 1.8, kind: 'arch' }, { at: 3.5, w: 1.4, kind: 'arch' }]], [1, 0, 1, 5, [{ at: 2.5, w: 1.2, kind: 'arch' }]], [-6, -1.5, 6, -1.5, [-4, -1, 1.5, 4.5]], [-2, -5, -2, -1.5], [0, -5, 0, -1.5], [3, -5, 3, -1.5]],
  furn: [['couch', -4.4, 3.9, 2], ['tv', -4.4, 1.0, 0], ['armchair', -1.2, 2.5, 3], ['rug', -4.2, 2.4, 0, 2.6, 1.8], ['shelf', -5.65, 2.2, 1, 1.2], ['picture', -6.0 + 0.08, 1.7, 3.9, 1, true],
    ['counter', 3.5, 4.68, 2, 3.0, true], ['fridge', 5.6, 3.0, 3], ...(o.main ? [['phone', 1.08, 1.45, 4.3, 1]] : []), ['stove', 5.6, 1.6, 3], ['table', 2.8, 2.2, 0, 1.4, 0.85, 4],
    ['bed', -4.4, -3.9, 0, true], ['wardrobe', -2.55, -4.5, 3], ['nightstand', -5.6, -4.75, 0], ['dresser', -4.0, -1.85, 2],
    ['toilet', -0.4, -4.6, 0], ['bathtub', -1.55, -3.6, 0], ['sink', -0.4, -2.1, 3],
    ...(o.kidRoom ? [['bed', 2.2, -3.9, 0], ['masks', 0.08, 1.5, -3.3, 1], ['workbench', 0.5, -2.4, 1, 1.2], ['picture', 1.5, 1.7, -4.92, 0]] : [['bed', 1.5, -3.9, 0], ['wardrobe', 2.55, -2.2, 3], ['nightstand', 0.4, -4.75, 0]]),
    ['bunk', 5.4, -3.9, 0], ['dresser', 3.6, -4.7, 0], ['picture', 5.92, 1.6, -2.5, 3]],
  lamps: [[-3.5, 2.65, 2.5, 'ceiling'], [-5.7, 1.45, 4.6, 'floor'], [3.5, 2.65, 2.5, 'ceiling'], [0, 2.65, -0.75, 'bare', { power: 1.4 }], [-1, 2.6, -3.2, 'bare', { power: 1.2, range: 3.5 }], [-4, 2.65, -3.2, 'ceiling'], [1.5, 2.65, -3.2, 'ceiling'], [4.5, 2.65, -3.2, 'ceiling']],
  porch: { d: 2.4, w: 12, x: 0, chairs: true }, chimney: [-6.4, 3.9], hideAt: [[-4.5, -3], [4.5, -2.5], [2.5, 3]], inside: [-2, 2.5], ...o,
});
// Pinehurst: the halfway house. Lots of rooms off one long hallway.
const bigHouse = (o = {}) => ({
  w: 18, d: 12, h: 2.8, ext: 'sidingWhite', int: 'paperBlue', main: true, pitch: 0.68,
  rooms: [{ x0: -9, z0: 1, x1: -1, z1: 6, spot: 'lodge' }, { x0: -1, z0: 1, x1: 4, z1: 6, spot: 'lodge' }, { x0: 4, z0: 1, x1: 9, z1: 6, floor: 'linoleum' }, { x0: -9, z0: -1, x1: 9, z1: 1, floor: 'floorDark', kind: 'hall' },
    { x0: -9, z0: -6, x1: -5, z1: -1 }, { x0: -5, z0: -6, x1: -1, z1: -1 }, { x0: -1, z0: -6, x1: 1.5, z1: -1, floor: 'bathTile', kind: 'bath' }, { x0: 1.5, z0: -6, x1: 5, z1: -1 }, { x0: 5, z0: -6, x1: 9, z1: -1 }],
  holes: [{ side: 'front', at: -5, kind: 'door', w: 1.1 }, { side: 'front', at: -7.5 }, { side: 'front', at: -2.5 }, { side: 'front', at: 1.5 }, { side: 'front', at: 6.5 },
    { side: 'left', at: 0, kind: 'door' }, { side: 'left', at: 3.5 }, { side: 'left', at: -3.5 }, { side: 'right', at: 0, kind: 'door' }, { side: 'right', at: 3.5 }, { side: 'right', at: -3.5 },
    { side: 'back', at: -7 }, { side: 'back', at: -3 }, { side: 'back', at: 3.25 }, { side: 'back', at: 7 }, { side: 'back', at: 0.25, w: 0.5 }],
  walls: [[-9, 1, 9, 1, [{ at: -5, w: 2.0, kind: 'arch' }, 1.5, 6.5]], [-1, 1, -1, 6, [{ at: 3.5, w: 1.6, kind: 'arch' }]], [4, 1, 4, 6, [{ at: 3, w: 1.2, kind: 'arch' }]],
    [-9, -1, 9, -1, [-7, -3, 0.25, 3.25, 7]], [-5, -6, -5, -1], [-1, -6, -1, -1], [1.5, -6, 1.5, -1], [5, -6, 5, -1]],
  furn: [['fireplace', -8.6, 3.5, 1], ['couch', -6.6, 3.5, 3], ['armchair', -5.0, 5.3, 2], ['tv', -2.3, 3.6, 3], ['rug', -6.5, 3.5, 1, 2.4, 1.8], ['piano', -4.2, 1.5, 0], ['picture', -8.92, 1.8, 5, 1],
    ['table', 1.5, 3.5, 0, 2.4, 1.0, 4], ['shelf', 3.65, 2.0, 3, 1.2], ['picture', 1.5, 1.8, 5.92, 2, true],
    ['counter', 6.5, 5.68, 2, 3.0, true], ['stove', 8.6, 3.6, 3], ['phone', 4.08, 1.45, 5.0, 1], ['fridge', 8.6, 2.0, 3], ['table', 6.0, 3.0, 0, 1.2, 0.8, 2],
    ['bed', -7.0, -4.9, 0], ['wardrobe', -8.6, -2.4, 1], ['nightstand', -5.6, -5.7, 0],
    ['bunk', -4.4, -4.9, 0], ['bunk', -1.6, -4.9, 0], ['dresser', -3.0, -5.7, 0],
    ['bathtub', -0.55, -4.9, 0], ['toilet', 1.1, -5.4, 0], ['sink', 1.15, -2.0, 3],
    ['bed', 3.2, -4.9, 0], ['wardrobe', 4.6, -2.3, 3], ['nightstand', 2.0, -5.7, 0],
    ['desk', 7.0, -5.55, 0], ['shelf', 8.65, -3.0, 3, 1.2], ['armchair', 6.0, -2.3, 2]],
  lamps: [[-5, 2.75, 3.5, 'ceiling'], [-8.6, 1.45, 5.6, 'floor'], [1.5, 2.75, 3.5, 'ceiling'], [6.5, 2.75, 3.5, 'ceiling'], [-5, 2.75, 0, 'bare', { power: 1.4 }], [3, 2.75, 0, 'bare', { power: 1.4 }],
    [-7, 2.75, -3.5, 'ceiling'], [-3, 2.75, -3.5, 'ceiling'], [0.25, 2.7, -3.5, 'bare', { power: 1.2, range: 3.5 }], [3.25, 2.75, -3.5, 'ceiling']],
  porch: { d: 2.4, w: 9, x: -4.5, swing: true, chairs: true }, chimney: [-9.4, 3.5], hideAt: [[-7, -3], [3.25, -3], [7, -3]], inside: [-5, 3.5], ...o,
});
const greenhouse = (o = {}) => ({
  w: 7, d: 3.6, h: 2.3, ext: 'plankDark', int: 'plankDark', floorMat: 'floorDark', roof: 'shed', roofMat: 'tin',
  holes: [{ side: 'front', at: 2.6, kind: 'door', w: 0.9 }, { side: 'front', at: -2.2, w: 1.8, lit: false }, { side: 'front', at: 0.3, w: 1.6, lit: false }, { side: 'back', at: -1.7, w: 2.6, lit: false }, { side: 'back', at: 1.7, w: 2.6, lit: false }, { side: 'left', at: 0, w: 2.2, lit: false }, { side: 'right', at: -0.4, w: 1.8, lit: false }],
  furn: [['plants', -1.6, -1.2, 0, 3.0], ['plants', 1.8, -1.2, 0, 2.6], ['plants', -2.0, 0.9, 2, 2.4], ['barrel', 1.0, 1.1]], noLight: true, inside: [0.5, 0], hideAt: [[0, 0]], ...o,
});
const coop = (o = {}) => ({ w: 3, d: 2.4, h: 1.9, ext: 'plankDark', int: 'plankDark', roof: 'shed', floorMat: 'floorDark', holes: [{ side: 'front', at: 0.6, kind: 'door', w: 0.8 }, { side: 'left', at: 0, w: 0.5, lit: false }], furn: [['hay', -0.6, -0.6, 0, 2]], noLight: true, inside: [0, 0], hideAt: [[0.3, -0.3]], noSpot: true, ...o });
const garage = (o = {}) => ({
  w: 6, d: 7, h: 2.8, ext: o.ext ?? 'sidingBlue', int: 'plankDark', floorMat: 'floorDark', ceil: 'plankDark',
  holes: [{ side: 'front', at: 0, kind: 'arch', w: 3.4 }, { side: 'right', at: 2, kind: 'door' }, { side: 'left', at: -1, lit: false }],
  furn: [['workbench', -2.5, -3.0, 0, 2.2], ['shelf', 2.6, -3.1, 0, 1.2], ['barrel', 2.4, -1.5], ['crates', -2.3, -0.6, 1, 2]],
  lamps: [[0, 2.75, -1, 'bare', { power: 2 }]], hideAt: [[2, -2.5]], inside: [0, -1], ...o,
});
// out in the trees: the shack where something has been living. Candles. A shrine.
const shack = (o = {}) => ({
  w: 3.8, d: 3.4, h: 2.2, ext: 'junk', int: 'plankDark', floorMat: 'floorDark', ceil: 'plankDark', roof: 'shed', roofMat: 'tarp',
  holes: [{ side: 'front', at: 0, kind: 'door', w: 0.85 }, { side: 'left', at: 0, w: 0.6, lit: false }],
  furn: [['shrine', 0, -1.35, 0], ['bed', 1.35, 0.2, 0], ['crates', -1.35, 0.6, 1, 2]], inside: [0, 0], hideAt: [[-1.2, -1]], noSpot: true, ...o,
});

// ---------------------------------------------------------------- the areas
// shore: z of the waterline at x. Buildings: [plan, x, z, yaw]. Yaw 0 faces the road (north, +z), PI faces the lake.
// cast: the people from that film (all grown-ups), used when "movie characters" is on.
export const AREAS = [
  {
    id: 'crystal', name: 'Camp Crystal Lake', film: 'Friday the 13th (1980)', blurb: 'The old camp on the shore. Cabins in two rows, the dining lodge, the dock, the tool shed.',
    sign: ['CAMP', 'CRYSTAL LAKE', 'EST. 1935'],
    shore: x => -30 + Math.sin(x * 0.07) * 3 + Math.sin(x * 0.19 + 1) * 1.2,
    dock: 0, shed: { x: -6, z: -24.6 }, campfire: { x: 0, z: -12 }, car: { x: 9, z: 44, yaw: 0.25 }, gate: 7.9, generator: { x: 10.4, z: 31.5 },
    tools: { knife: { x: 0.7, y: 0.06, z: -36 }, stump: { x: 8, z: -23 }, pitchfork: { x: -4.5, z: -21 }, woodpile: { x: -12, z: 14 } },
    trees: 0.24,
    buildings: [[campLodge({ int: 'logInt', trim: 'white', screenDoor: true }), 0, 30, P],
      ...[['CABIN 1', -24, -6, P / 2], ['CABIN 2', -24, 5, P / 2], ['CABIN 3', -24, 16, P / 2], ['CABIN 4', 24, -6, -P / 2], ['CABIN 5', 24, 5, -P / 2], ['CABIN 6', 24, 16, -P / 2]].map(([name, x, z, y]) => [bunkCabin({ name, ext: 'log', int: 'logInt', trim: 'white', ironBunks: true, screenDoor: true }), x, z, y]),
      [washhouse({ ext: 'log' }), -13, 27, P / 2], [craftCabin({ ext: 'log', int: 'logInt', trim: 'white', screenDoor: true }), 19, 30, -P / 2]],
    extras: ['archery', 'flagpole', 'picnic', 'canoes', 'totems'], forest: 'pine', signStyle: 'crystal',
    cast: [['ALICE', 1, 'brown'], ['ANNIE', 1, 'brown'], ['BRENDA', 1, 'blonde'], ['MARCIE', 1, 'brown', 'short'], ['BILL', 0, 'brown'], ['JACK', 0, 'brown'], ['NED', 0, 'brown', 'curly'], ['STEVE', 0, 'dark']],
  },
  {
    id: 'packanack', name: 'Packanack Lodge', film: 'Friday the 13th Part 2', blurb: 'The counselor training centre deep in the woods. A big lodge full of rooms, A-frames in the trees, and a shack nobody should go near.',
    sign: ['PACKANACK', 'LODGE', 'COUNSELOR TRAINING CENTER'],
    shore: x => -34 + Math.sin(x * 0.05) * 4 + Math.sin(x * 0.17) * 1,
    dock: 4, shed: { x: -12, z: -28.5 }, campfire: { x: 12, z: -16 }, car: { x: -14, z: 44, yaw: -0.2 }, gate: -12, generator: { x: 12.4, z: 27 },
    tools: { knife: { x: 4.7, y: 0.06, z: -40 }, stump: { x: 18, z: -24 }, pitchfork: { x: -4, z: -26 }, woodpile: { x: 18, z: 8 } },
    trees: 0.3,
    buildings: [[bigLodge({ ext: 'sage', int: 'knotty', trim: 'white', porch: { d: 2.2, w: 8, x: -6, swing: true, flag: true, sign: 'PACKANACK LODGE' } }), 0, 18, P],
      ...[['CABIN 1', -26, -10, P / 2], ['CABIN 2', -28, 4, P / 2], ['CABIN 3', 28, -8, -P / 2], ['CABIN 4', 28, 8, -P / 2]].map(([name, x, z, y]) => [bunkCabin({ name, ext: 'sage', int: 'knotty', trim: 'white', screenDoor: true }), x, z, y]),
      [aframe({ name: 'THE A-FRAME' }), -30, 22, P / 2],
      [shack({ name: 'THE SHACK' }), -48, 47, P / 2], [outhouse(), 22, 30, -P / 2]],
    extras: ['picnic', 'canoes', 'junk'], forest: 'pine', signStyle: 'plank',
    cast: [['GINNY', 1, 'brown', 'curly'], ['VICKIE', 1, 'blonde'], ['SANDRA', 1, 'brown'], ['TERRY', 1, 'blonde'], ['PAUL', 0, 'dark'], ['TED', 0, 'brown', 'curly'], ['MARK', 0, 'dark'], ['JEFF', 0, 'brown'], ['SCOTT', 0, 'blonde']],
  },
  {
    id: 'higgins', name: 'Higgins Haven', film: 'Friday the 13th Part III', blurb: 'The lakeside farm. A white farmhouse with a long porch, a big red barn with a hayloft, a hammock down by the water.',
    sign: ['HIGGINS', 'HAVEN', 'PRIVATE PROPERTY'],
    shore: x => -26 + Math.sin(x * 0.09) * 4 + Math.sin(x * 0.21 + 2) * 1.5,
    dock: -2, shed: { x: 8, z: -19 }, campfire: { x: 6, z: -4 }, car: { x: -4, z: 42, yaw: 0.1, van: true }, gate: 0, generator: { x: -16.2, z: 22 },
    tools: { knife: { x: -1.3, y: 0.06, z: -32 }, stump: { x: 14, z: -10 }, pitchfork: { x: 18, z: 10 }, woodpile: { x: -22, z: 4 } },
    trees: 0.06, hammock: { x: -16, z: -14 },
    buildings: [[farmhouse(), -8, 14, P], [barn(), 18, 20, -P / 2], [outhouse(), -24, 28, P / 2]],
    extras: ['picnic', 'canoes', 'fieldfence', 'corral', 'windmill'], forest: 'oak', grass: 'dry', signStyle: 'plank',
    cast: [['CHRIS', 1, 'brown'], ['SHELLY', 0, 'curly'], ['VERA', 1, 'dark'], ['DEBBIE', 1, 'brown'], ['CHILI', 1, 'dark', 'short'], ['RICK', 0, 'brown'], ['ANDY', 0, 'brown', 'curly'], ['CHUCK', 0, 'dark']],
  },
  {
    id: 'forestgreen', name: 'Camp Forest Green', film: 'Friday the 13th Part VI', blurb: 'They renamed the camp to forget. Long green bunkhouses, the mess hall, the infirmary, staff trailers, and the cemetery down the road.',
    sign: ['CAMP', 'FOREST GREEN', 'WELCOME CAMPERS'],
    shore: x => -32 + Math.sin(x * 0.04) * 2 + Math.sin(x * 0.13) * 0.8,
    dock: 0, shed: { x: -9, z: -27 }, campfire: { x: 0, z: -10 }, car: { x: 14, z: 44, yaw: 0.3 }, gate: 14, generator: { x: 10.4, z: 31.5 },
    tools: { knife: { x: 0.7, y: 0.06, z: -38 }, stump: { x: 9, z: -22 }, pitchfork: { x: -14, z: -14 }, woodpile: { x: -10, z: 14 } },
    trees: 0.1,
    buildings: [[messHall(), 0, 30, P], [bunkhouse({ name: 'BUNKHOUSE A' }), -24, 2, P / 2], [bunkhouse({ name: 'BUNKHOUSE B' }), -24, 22, P / 2], [bunkhouse({ name: 'BUNKHOUSE C' }), 24, 0, -P / 2],
      [infirmary(), 24, 22, -P / 2], [trailer({ name: 'STAFF TRAILER' }), 38, -6, 0], [trailer({ name: 'RV' }), 40, 34, P / 2]],
    extras: ['archery', 'flagpole', 'picnic', 'canoes', 'cemetery', 'whiteRocks', 'lanternPosts', 'totems'], forest: 'pine', signStyle: 'arch',
    cast: [['MEGAN', 1, 'blonde'], ['SISSY', 1, 'dark'], ['NIKKI', 1, 'blonde', 'curly'], ['PAULA', 1, 'brown'], ['LIZBETH', 1, 'brown'], ['CORT', 0, 'brown'], ['BURT', 0, 'blonde'], ['MARTIN', 0, 'grey']],
  },
  {
    id: 'pinehurst', name: 'Pinehurst', film: 'Friday the 13th: A New Beginning', blurb: 'The halfway house up from the lake. A big old house with a long hallway of rooms, a greenhouse, the coop, an outhouse, and a trailer back in the trees.',
    sign: ['PINEHURST', 'YOUTH DEVELOPMENT CENTER', 'NO TRESPASSING'],
    shore: x => -38 + Math.sin(x * 0.06) * 3 + Math.sin(x * 0.2) * 1,
    dock: 6, shed: { x: 14, z: -31 }, campfire: { x: -4, z: -14 }, car: { x: 8, z: 44, yaw: 0.2 }, gate: 8, generator: { x: 11.4, z: 22 },
    tools: { knife: { x: 6.7, y: 0.06, z: -44 }, stump: { x: -12, z: 30 }, pitchfork: { x: -26, z: 18 }, woodpile: { x: -14, z: 32 } },
    trees: 0.14,
    buildings: [[bigHouse(), 0, 16, P], [greenhouse(), -21, 2, P / 2], [coop(), -24, 18, P / 2], [outhouse(), 18, 30, -P / 2], [trailer({ name: 'THE TRAILER', ext: 'sidingGreen' }), 30, -8, -P / 2]],
    extras: ['picnic', 'fieldfence', 'picket'], forest: 'mixed', signStyle: 'frame',
    cast: [['PAM', 1, 'brown'], ['TINA', 1, 'blonde'], ['ROBIN', 1, 'brown', 'curly'], ['VIOLET', 1, 'dark', 'short'], ['ETHEL', 1, 'grey'], ['EDDIE', 0, 'blonde'], ['JAKE', 0, 'dark'], ['JUNIOR', 0, 'brown']],
  },
  {
    id: 'jarvis', name: 'The Jarvis Place', film: 'Friday the 13th: The Final Chapter', blurb: 'Two houses on the lake: the Jarvis house and the rental next door full of kids up for the weekend. A garage, the dock, and dark woods all round.',
    sign: ['', 'LAKE ROAD', 'PRIVATE DRIVE'],
    shore: x => -30 + Math.sin(x * 0.08) * 2.5 + Math.sin(x * 0.23) * 0.8,
    dock: 0, shed: { x: -4, z: -24.5 }, campfire: { x: -2, z: -15 }, car: { x: 19, z: 22, yaw: -P / 2 }, gate: 6, generator: { x: -24.5, z: 4 },
    tools: { knife: { x: 0.7, y: 0.06, z: -36 }, stump: { x: 10, z: -18 }, pitchfork: { x: 30, z: -4 }, woodpile: { x: 32, z: 4 } },
    trees: 0.16, hammock: { x: -30, z: -16 },
    buildings: [[lakeHouse({ name: 'THE JARVIS HOUSE', kidRoom: true, ext: 'brownShingle' }), 14, 6, P], [lakeHouse({ name: 'THE RENTAL', main: true, ext: 'log' }), -14, 6, P], [garage({ ext: 'brownShingle' }), 27, 22, -P / 2]],
    extras: ['picnic', 'canoes', 'overlook'], forest: 'oak', signStyle: 'plank',
    cast: [['TRISH', 1, 'brown'], ['MRS. JARVIS', 1, 'brown', 'short'], ['SAMANTHA', 1, 'blonde'], ['SARA', 1, 'brown'], ['TERRI', 1, 'blonde'], ['TINA', 1, 'blonde'], ['ROB', 0, 'dark'], ['DOUG', 0, 'dark'], ['PAUL', 0, 'blonde'], ['TED', 0, 'brown'], ['JIMMY', 0, 'brown', 'curly']],
  },
];
export const areaById = id => AREAS.find(a => a.id === id) ?? AREAS[0];
