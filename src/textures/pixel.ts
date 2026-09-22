import * as THREE from 'three';

export type Rng = () => number;

/** Kleiner Zufallsgenerator mit Seed, damit Texturen bei jedem Start gleich aussehen. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Erzeugt eine Pixel-Textur: scharfe Pixel ohne Weichzeichnen. */
export function pixelTexture(
  width: number,
  height: number,
  seed: number,
  draw: (ctx: CanvasRenderingContext2D, rng: Rng) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, mulberry32(seed));

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

/** Füllt ein Rechteck Pixel für Pixel mit zufälligen Farben aus der Palette. */
export function noiseRect(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: readonly string[],
): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) px(ctx, i, j, pick(rng, palette));
  }
}
