import * as THREE from 'three';
import { noiseRect, pick, pixelTexture, px, type Rng } from './pixel';

export type BlockId =
  | 'grass' | 'dirt' | 'stone' | 'cobble' | 'log' | 'leaves' | 'planks'
  | 'sand' | 'sandstone' | 'cactus'
  | 'snowGrass' | 'snow' | 'ice' | 'spruceLog' | 'spruceLeaves'
  | 'coalOre' | 'ironOre' | 'goldOre' | 'diamondOre'
  | 'netherrack' | 'netherBricks' | 'glowstone' | 'soulSand'
  | 'lava';

type Draw = (ctx: CanvasRenderingContext2D, rng: Rng) => void;

const S = 16;

const DIRT = ['#866043', '#79553a', '#8f6848', '#6e4c33', '#966c4a'];
const GRASS = ['#5c9e35', '#67ad3c', '#528f2f', '#72b845', '#5a9a33'];
const STONE = ['#7f7f7f', '#8a8a8a', '#777777', '#838383', '#707070'];
const BARK = ['#6b5230', '#5c4527', '#735937', '#4f3b21'];
const WOOD = ['#b8945f', '#a88452', '#c29f68'];
const PLANK = ['#a8834f', '#b08a55', '#9c7a48'];
const LEAVES = ['#3f8a28', '#4a9a30', '#357a22', '#52a336', '#2f6e1e'];
const SAND = ['#dbd3a0', '#d6cc94', '#e0d8a8', '#cfc48a'];
const SANDSTONE = ['#d9cd96', '#d2c58b', '#dfd4a1'];
const SNOW = ['#f4f8fb', '#e9eff4', '#ffffff', '#dfe7ee'];
const SPRUCE_BARK = ['#3d2a17', '#4a3320', '#352414'];
const SPRUCE_LEAVES = ['#2d4d2d', '#355a33', '#274226', '#3b633a'];
const NETHERRACK = ['#6f2a2a', '#7d3131', '#5e2222', '#873a3a'];

const noise = (palette: string[]): Draw => (ctx, rng) => noiseRect(ctx, rng, 0, 0, S, S, palette);

function speckle(ctx: CanvasRenderingContext2D, rng: Rng, count: number, color: string) {
  for (let i = 0; i < count; i++) px(ctx, Math.floor(rng() * S), Math.floor(rng() * S), color);
}

const dirt: Draw = (ctx, rng) => {
  noiseRect(ctx, rng, 0, 0, S, S, DIRT);
  speckle(ctx, rng, 10, '#5a3f2a');
};

/** Erde mit einer ausgefransten Kante oben, z. B. Gras oder Schnee. */
const topped = (palette: string[], min: number): Draw => (ctx, rng) => {
  dirt(ctx, rng);
  for (let x = 0; x < S; x++) {
    const depth = min + Math.floor(rng() * 3) - (rng() < 0.3 ? 1 : 0);
    for (let y = 0; y < depth; y++) px(ctx, x, y, pick(rng, palette));
  }
};

const stone: Draw = (ctx, rng) => {
  noiseRect(ctx, rng, 0, 0, S, S, STONE);
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * S);
    const len = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < len; k++) px(ctx, (x + k) % S, y, '#646464');
  }
};

const cobble: Draw = (ctx, rng) => {
  ctx.fillStyle = '#4d4d4d';
  ctx.fillRect(0, 0, S, S);
  // Handverlegte Steine: [x, y, breite, höhe]
  const stones = [
    [0, 0, 6, 4], [7, 0, 5, 3], [13, 0, 3, 5], [0, 5, 4, 5], [5, 4, 7, 4],
    [13, 6, 3, 4], [0, 11, 5, 5], [5, 9, 4, 4], [10, 9, 6, 3], [6, 14, 5, 2], [12, 13, 4, 3],
  ];
  for (const [x, y, w, h] of stones) {
    noiseRect(ctx, rng, x, y, w, h, ['#9a9a9a', '#8c8c8c', '#a5a5a5', '#838383']);
    for (let i = x; i < x + w; i++) px(ctx, i, y + h - 1, '#6a6a6a');
    for (let j = y; j < y + h; j++) px(ctx, x + w - 1, j, '#6a6a6a');
  }
};

const bark = (palette: string[], dark: string): Draw => (ctx, rng) => {
  for (let x = 0; x < S; x++) {
    const base = pick(rng, palette);
    for (let y = 0; y < S; y++) px(ctx, x, y, rng() < 0.25 ? pick(rng, palette) : base);
  }
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * 10);
    for (let k = 0; k < 5; k++) px(ctx, x, y + k, dark);
  }
};

const rings = (outer: string[], light: string[], dark: string): Draw => (ctx, rng) => {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (d > 6.5) px(ctx, x, y, pick(rng, outer));
      else px(ctx, x, y, Math.floor(d) % 2 === 0 ? pick(rng, light) : dark);
    }
  }
};

const leaves = (palette: string[]): Draw => (ctx, rng) => {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (rng() < 0.12) continue; // Lücken im Laub
      px(ctx, x, y, pick(rng, palette));
    }
  }
};

const planks: Draw = (ctx, rng) => {
  for (let board = 0; board < 4; board++) {
    const y0 = board * 4;
    noiseRect(ctx, rng, 0, y0, S, 3, PLANK);
    for (let x = 0; x < S; x++) px(ctx, x, y0 + 3, '#6f5230');
    const seam = (board * 7 + 3) % S;
    for (let y = y0; y < y0 + 3; y++) px(ctx, seam, y, '#6f5230');
  }
};

const sandstoneSide: Draw = (ctx, rng) => {
  noiseRect(ctx, rng, 0, 0, S, S, SANDSTONE);
  noiseRect(ctx, rng, 0, 0, S, 3, ['#e6dcae', '#e2d7a6']);
  for (let x = 0; x < S; x++) {
    px(ctx, x, 3, '#bfae72');
    px(ctx, x, 12, '#c4b47a');
  }
};

const cactusSide: Draw = (ctx, rng) => {
  noiseRect(ctx, rng, 0, 0, S, S, ['#5b8f2f', '#55872b', '#619833']);
  for (const x of [1, 5, 10, 14]) for (let y = 0; y < S; y++) px(ctx, x, y, '#3f6e1f');
  speckle(ctx, rng, 12, '#d9e6a3'); // Stacheln
};

const ice: Draw = (ctx, rng) => {
  noiseRect(ctx, rng, 0, 0, S, S, ['#9cc3f5', '#a8ccf7', '#93bbf0']);
  for (let i = 0; i < 3; i++) {
    const x0 = Math.floor(rng() * S);
    const y0 = Math.floor(rng() * S);
    for (let k = 0; k < 5; k++) px(ctx, (x0 + k) % S, (y0 + k) % S, '#dcecff');
  }
};

/** Stein mit farbigen Erz-Klumpen. */
const ore = (color: string, shade: string): Draw => (ctx, rng) => {
  stone(ctx, rng);
  for (let i = 0; i < 4; i++) {
    const x = 1 + Math.floor(rng() * 12);
    const y = 1 + Math.floor(rng() * 12);
    px(ctx, x, y, color);
    px(ctx, x + 1, y, shade);
    px(ctx, x, y + 1, shade);
    if (rng() < 0.6) px(ctx, x + 1, y + 1, color);
  }
};

const netherrack: Draw = (ctx, rng) => {
  noiseRect(ctx, rng, 0, 0, S, S, NETHERRACK);
  speckle(ctx, rng, 14, '#4a1818');
};

const netherBricks: Draw = (ctx, rng) => {
  ctx.fillStyle = '#170a0c';
  ctx.fillRect(0, 0, S, S);
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 ? 4 : 0;
    for (let b = -1; b < 2; b++) {
      noiseRect(ctx, rng, b * 8 + offset, row * 4, 7, 3, ['#2c1519', '#35191e', '#3d1d23']);
    }
  }
};

const glowstone: Draw = (ctx, rng) => {
  noiseRect(ctx, rng, 0, 0, S, S, ['#c28a33', '#d69d45', '#b57a2c']);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(rng() * 14);
    const y = Math.floor(rng() * 14);
    noiseRect(ctx, rng, x, y, 2 + Math.floor(rng() * 2), 2, ['#fff0a5', '#f9d26b', '#ffe487']);
  }
};

const soulSand: Draw = (ctx, rng) => {
  noiseRect(ctx, rng, 0, 0, S, S, ['#4f3a2c', '#5b4433', '#44311f']);
  // Gesichter im Sand: zwei Augen, ein Mund
  for (const [x, y] of [[2, 3], [9, 9]]) {
    px(ctx, x, y, '#2b1d13');
    px(ctx, x + 3, y, '#2b1d13');
    for (let k = 0; k < 4; k++) px(ctx, x + k, y + 3, '#2b1d13');
  }
};

type Faces = { side: Draw; top?: Draw; bottom?: Draw };

const DESIGNS: Record<Exclude<BlockId, 'lava'>, Faces> = {
  grass: { side: topped(GRASS, 3), top: noise(GRASS), bottom: dirt },
  dirt: { side: dirt },
  stone: { side: stone },
  cobble: { side: cobble },
  log: { side: bark(BARK, '#3e2e19'), top: rings(BARK, WOOD, '#94723f') },
  leaves: { side: leaves(LEAVES) },
  planks: { side: planks },
  sand: { side: noise(SAND) },
  sandstone: { side: sandstoneSide, top: noise(['#e6dcae', '#e2d7a6', '#ddd29e']) },
  cactus: { side: cactusSide, top: rings(['#5b8f2f'], ['#7fb24a', '#74a743'], '#5b8f2f') },
  snowGrass: { side: topped(SNOW, 4), top: noise(SNOW), bottom: dirt },
  snow: { side: noise(SNOW) },
  ice: { side: ice },
  spruceLog: { side: bark(SPRUCE_BARK, '#24170b'), top: rings(SPRUCE_BARK, ['#8a6a3e', '#7c5e35'], '#5e4526') },
  spruceLeaves: { side: leaves(SPRUCE_LEAVES) },
  coalOre: { side: ore('#2b2b2b', '#454545') },
  ironOre: { side: ore('#d8af93', '#b58f74') },
  goldOre: { side: ore('#fcee4b', '#d9b92c') },
  diamondOre: { side: ore('#5decf5', '#2bb8c4') },
  netherrack: { side: netherrack },
  netherBricks: { side: netherBricks },
  glowstone: { side: glowstone },
  soulSand: { side: soulSand },
};

/** Besondere Material-Einstellungen pro Block. */
const OPTIONS: Partial<Record<BlockId, THREE.MeshLambertMaterialParameters>> = {
  leaves: { alphaTest: 0.5 },
  spruceLeaves: { alphaTest: 0.5 },
  ice: { transparent: true, opacity: 0.85 },
};

/** Leuchtende Blöcke brauchen kein Licht, sie sind selbst hell. */
const GLOWING = new Set<BlockId>(['glowstone']);

/** Lava: ein hoher Streifen, der langsam durch den Block fließt. */
function lavaTexture(): THREE.CanvasTexture {
  const texture = pixelTexture(S, S * 4, 99, (ctx, rng) => {
    noiseRect(ctx, rng, 0, 0, S, S * 4, ['#e05a00', '#ff7a00', '#ff8c10', '#cc4400']);
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(rng() * S);
      const y = Math.floor(rng() * S * 4);
      const len = 3 + Math.floor(rng() * 5);
      for (let k = 0; k < len; k++) px(ctx, x, (y + k) % (S * 4), rng() < 0.5 ? '#ffb52e' : '#ffd04a');
    }
    speckle(ctx, rng, 20, '#a83000');
  });
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 0.25);
  return texture;
}

let lava: THREE.MeshBasicMaterial | null = null;

/** Lässt die Lava fließen. Einmal pro Frame aufrufen. */
export function animateBlocks(dt: number): void {
  if (lava?.map) lava.map.offset.y = (lava.map.offset.y + dt * 0.06) % 1;
}

let cache: Record<BlockId, THREE.Material[]> | null = null;

/**
 * Pro Blocktyp 6 Materialien in der Reihenfolge von BoxGeometry: +x, -x, +y (oben), -y (unten), +z, -z.
 * Die Materialien werden einmal erzeugt und von allen Leveln geteilt.
 */
export function blockMaterials(): Record<BlockId, THREE.Material[]> {
  if (cache) return cache;
  let seed = 1;
  const make = (draw: Draw, id: BlockId) => {
    const map = pixelTexture(S, S, seed++, draw);
    const material = GLOWING.has(id)
      ? new THREE.MeshBasicMaterial({ map })
      : new THREE.MeshLambertMaterial({ map, ...OPTIONS[id] });
    // Wird von allen Leveln geteilt und beim Levelwechsel nicht freigegeben
    material.userData.shared = true;
    return material;
  };
  cache = {} as Record<BlockId, THREE.Material[]>;
  lava = new THREE.MeshBasicMaterial({ map: lavaTexture() });
  lava.userData.shared = true;
  cache.lava = [lava, lava, lava, lava, lava, lava];
  for (const [id, faces] of Object.entries(DESIGNS) as [Exclude<BlockId, 'lava'>, Faces][]) {
    const side = make(faces.side, id);
    const top = faces.top ? make(faces.top, id) : side;
    const bottom = faces.bottom ? make(faces.bottom, id) : top;
    cache[id] = [side, side, top, bottom, side, side];
  }
  return cache;
}
