import * as THREE from 'three';
import { noiseRect, pixelTexture, px, type Rng } from './pixel';

/**
 * Eigener Skin im Steve-Stil, 64x64 im üblichen Minecraft-Skin-Layout.
 * Damit passen später auch echte Skin-PNGs auf dieselbe Figur.
 */
export interface SkinBox {
  u: number;
  v: number;
  w: number;
  h: number;
  d: number;
}

export const SKIN_PARTS = {
  head: { u: 0, v: 0, w: 8, h: 8, d: 8 },
  body: { u: 16, v: 16, w: 8, h: 12, d: 4 },
  rightArm: { u: 40, v: 16, w: 4, h: 12, d: 4 },
  leftArm: { u: 32, v: 48, w: 4, h: 12, d: 4 },
  rightLeg: { u: 0, v: 16, w: 4, h: 12, d: 4 },
  leftLeg: { u: 16, v: 48, w: 4, h: 12, d: 4 },
} satisfies Record<string, SkinBox>;

type Rect = [x: number, y: number, w: number, h: number];

/** Lage der sechs Flächen einer Box im Skin. */
export function faceRects({ u, v, w, h, d }: SkinBox) {
  return {
    top: [u + d, v, w, d] as Rect,
    bottom: [u + d + w, v, w, d] as Rect,
    right: [u, v + d, d, h] as Rect,
    front: [u + d, v + d, w, h] as Rect,
    left: [u + d + w, v + d, d, h] as Rect,
    back: [u + 2 * d + w, v + d, w, h] as Rect,
  };
}

const HAIR = ['#3b2716', '#45301c', '#33210f'];
const SKIN = ['#c8956b', '#c08a61', '#cf9c72'];
const SHIRT = ['#12a5a8', '#0f9699', '#18b0b3'];
const PANTS = ['#3d3aa3', '#36338f', '#4643b0'];
const SHOES = ['#5f5f5f', '#696969', '#555555'];

function fill(ctx: CanvasRenderingContext2D, rng: Rng, [x, y, w, h]: Rect, palette: string[]) {
  noiseRect(ctx, rng, x, y, w, h, palette);
}

function drawHead(ctx: CanvasRenderingContext2D, rng: Rng) {
  const f = faceRects(SKIN_PARTS.head);
  fill(ctx, rng, f.top, HAIR);
  fill(ctx, rng, f.back, HAIR);
  fill(ctx, rng, f.bottom, SKIN);

  // Seiten: oben Haare, unten Haut, hinten Haare
  for (const [side, backX] of [[f.right, 0], [f.left, 6]] as const) {
    fill(ctx, rng, side, SKIN);
    fill(ctx, rng, [side[0], side[1], 8, 3], HAIR);
    fill(ctx, rng, [side[0] + backX, side[1] + 3, 2, 3], HAIR);
  }

  const [fx, fy] = f.front;
  fill(ctx, rng, f.front, SKIN);
  fill(ctx, rng, [fx, fy, 8, 2], HAIR);
  px(ctx, fx, fy + 2, HAIR[0]);
  px(ctx, fx + 7, fy + 2, HAIR[0]);
  // Augen: weiß + blau, wie man es kennt
  px(ctx, fx + 1, fy + 4, '#ffffff');
  px(ctx, fx + 2, fy + 4, '#3d56c4');
  px(ctx, fx + 5, fy + 4, '#3d56c4');
  px(ctx, fx + 6, fy + 4, '#ffffff');
  // Nase, Mund, Bart
  px(ctx, fx + 3, fy + 5, '#955f3e');
  px(ctx, fx + 4, fy + 5, '#955f3e');
  for (let x = 2; x <= 5; x++) px(ctx, fx + x, fy + 6, x === 2 || x === 5 ? '#6e4127' : '#5a3320');
  for (let x = 1; x <= 6; x++) px(ctx, fx + x, fy + 7, '#7a4a2e');
}

function drawBody(ctx: CanvasRenderingContext2D, rng: Rng) {
  const f = faceRects(SKIN_PARTS.body);
  for (const rect of Object.values(f)) fill(ctx, rng, rect, SHIRT);
  // Kleiner Ausschnitt am Hals
  const [fx, fy] = f.front;
  px(ctx, fx + 3, fy, SKIN[0]);
  px(ctx, fx + 4, fy, SKIN[0]);
}

function drawArm(ctx: CanvasRenderingContext2D, rng: Rng, box: SkinBox) {
  const f = faceRects(box);
  for (const side of [f.front, f.back, f.left, f.right]) {
    fill(ctx, rng, side, SKIN);
    fill(ctx, rng, [side[0], side[1], side[2], 4], SHIRT);
  }
  fill(ctx, rng, f.top, SHIRT);
  fill(ctx, rng, f.bottom, SKIN);
}

function drawLeg(ctx: CanvasRenderingContext2D, rng: Rng, box: SkinBox) {
  const f = faceRects(box);
  for (const side of [f.front, f.back, f.left, f.right]) {
    fill(ctx, rng, side, PANTS);
    fill(ctx, rng, [side[0], side[1] + 10, side[2], 2], SHOES);
  }
  fill(ctx, rng, f.top, PANTS);
  fill(ctx, rng, f.bottom, SHOES);
}

export function createSkinTexture(): THREE.CanvasTexture {
  return pixelTexture(64, 64, 7, (ctx, rng) => {
    drawHead(ctx, rng);
    drawBody(ctx, rng);
    drawArm(ctx, rng, SKIN_PARTS.rightArm);
    drawArm(ctx, rng, SKIN_PARTS.leftArm);
    drawLeg(ctx, rng, SKIN_PARTS.rightLeg);
    drawLeg(ctx, rng, SKIN_PARTS.leftLeg);
  });
}
