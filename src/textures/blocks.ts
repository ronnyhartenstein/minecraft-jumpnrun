import * as THREE from 'three';
import { noiseRect, pick, pixelTexture, px, type Rng } from './pixel';

export type BlockId = 'grass' | 'dirt' | 'stone' | 'cobble' | 'log' | 'leaves' | 'planks';

const S = 16;

const DIRT = ['#866043', '#79553a', '#8f6848', '#6e4c33', '#966c4a'];
const GRASS = ['#5c9e35', '#67ad3c', '#528f2f', '#72b845', '#5a9a33'];
const STONE = ['#7f7f7f', '#8a8a8a', '#777777', '#838383', '#707070'];
const BARK = ['#6b5230', '#5c4527', '#735937', '#4f3b21'];
const WOOD = ['#b8945f', '#a88452', '#c29f68'];
const PLANK = ['#a8834f', '#b08a55', '#9c7a48'];
const LEAVES = ['#3f8a28', '#4a9a30', '#357a22', '#52a336', '#2f6e1e'];

function dirt(ctx: CanvasRenderingContext2D, rng: Rng) {
  noiseRect(ctx, rng, 0, 0, S, S, DIRT);
  for (let i = 0; i < 10; i++) px(ctx, Math.floor(rng() * S), Math.floor(rng() * S), '#5a3f2a');
}

function grassSide(ctx: CanvasRenderingContext2D, rng: Rng) {
  dirt(ctx, rng);
  for (let x = 0; x < S; x++) {
    const depth = 3 + Math.floor(rng() * 3) - (rng() < 0.3 ? 1 : 0);
    for (let y = 0; y < depth; y++) px(ctx, x, y, pick(rng, GRASS));
  }
}

function stone(ctx: CanvasRenderingContext2D, rng: Rng) {
  noiseRect(ctx, rng, 0, 0, S, S, STONE);
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * S);
    const len = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < len; k++) px(ctx, (x + k) % S, y, '#646464');
  }
}

function cobble(ctx: CanvasRenderingContext2D, rng: Rng) {
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
}

function logSide(ctx: CanvasRenderingContext2D, rng: Rng) {
  for (let x = 0; x < S; x++) {
    const base = pick(rng, BARK);
    for (let y = 0; y < S; y++) px(ctx, x, y, rng() < 0.25 ? pick(rng, BARK) : base);
  }
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * 10);
    for (let k = 0; k < 5; k++) px(ctx, x, y + k, '#3e2e19');
  }
}

function logTop(ctx: CanvasRenderingContext2D, rng: Rng) {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (d > 6.5) px(ctx, x, y, pick(rng, BARK));
      else px(ctx, x, y, Math.floor(d) % 2 === 0 ? pick(rng, WOOD) : '#94723f');
    }
  }
}

function leaves(ctx: CanvasRenderingContext2D, rng: Rng) {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (rng() < 0.12) continue; // Lücken im Laub
      px(ctx, x, y, pick(rng, LEAVES));
    }
  }
}

function planks(ctx: CanvasRenderingContext2D, rng: Rng) {
  for (let board = 0; board < 4; board++) {
    const y0 = board * 4;
    noiseRect(ctx, rng, 0, y0, S, 3, PLANK);
    for (let x = 0; x < S; x++) px(ctx, x, y0 + 3, '#6f5230');
    const seam = (board * 7 + 3) % S;
    for (let y = y0; y < y0 + 3; y++) px(ctx, seam, y, '#6f5230');
  }
}

function material(draw: (ctx: CanvasRenderingContext2D, rng: Rng) => void, seed: number, opts: THREE.MeshLambertMaterialParameters = {}) {
  return new THREE.MeshLambertMaterial({ map: pixelTexture(S, S, seed, draw), ...opts });
}

/** Pro Blocktyp 6 Materialien in der Reihenfolge von BoxGeometry: +x, -x, +y (oben), -y (unten), +z, -z. */
export function createBlockMaterials(): Record<BlockId, THREE.Material[]> {
  const six = (m: THREE.Material) => [m, m, m, m, m, m];
  const dirtMat = material(dirt, 1);
  const grassTop = material((ctx, rng) => noiseRect(ctx, rng, 0, 0, S, S, GRASS), 2);
  const grassSideMat = material(grassSide, 3);
  const logSideMat = material(logSide, 6);
  const logTopMat = material(logTop, 7);

  return {
    grass: [grassSideMat, grassSideMat, grassTop, dirtMat, grassSideMat, grassSideMat],
    dirt: six(dirtMat),
    stone: six(material(stone, 4)),
    cobble: six(material(cobble, 5)),
    log: [logSideMat, logSideMat, logTopMat, logTopMat, logSideMat, logSideMat],
    leaves: six(material(leaves, 8, { alphaTest: 0.5 })),
    planks: six(material(planks, 9)),
  };
}
