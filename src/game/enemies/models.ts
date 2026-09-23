import * as THREE from 'three';
import { noiseRect, pixelTexture, px } from '../../textures/pixel';

/** Ein Pixel der Figuren in Blockgröße (wie bei Steve und in Minecraft: 16 Pixel = 1 Block). */
export const P = 1 / 16;

let seed = 100;

/** Pixel-Material aus einer Farbpalette, optional mit Gesicht o. Ä. obendrauf. */
export function skin(palette: string[], draw?: (ctx: CanvasRenderingContext2D) => void, extra: THREE.MeshLambertMaterialParameters = {}) {
  const map = pixelTexture(8, 8, seed++, (ctx, rng) => {
    noiseRect(ctx, rng, 0, 0, 8, 8, palette);
    draw?.(ctx);
  });
  return new THREE.MeshLambertMaterial({ map, ...extra });
}

/** Pixel setzen, z. B. für Augen: [x, y, Farbe]. */
export function dots(ctx: CanvasRenderingContext2D, list: [number, number, string][]) {
  for (const [x, y, c] of list) px(ctx, x, y, c);
}

/** Eine Box in Pixel-Maßen, mit Schatten. */
export function box(w: number, h: number, d: number, material: THREE.Material | THREE.Material[]): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), material);
  mesh.castShadow = true;
  return mesh;
}

/** Hängt eine Box an ein Gelenk, damit sie sich dort drehen kann (Arme, Beine). */
export function limb(mesh: THREE.Mesh, pivot: [number, number, number], offsetY: number): THREE.Group {
  const joint = new THREE.Group();
  joint.position.set(pivot[0] * P, pivot[1] * P, pivot[2] * P);
  mesh.position.y = offsetY * P;
  joint.add(mesh);
  return joint;
}

export interface Humanoid {
  head: THREE.Mesh;
  arms: [THREE.Group, THREE.Group];
  legs: [THREE.Group, THREE.Group];
}

/**
 * Figur wie Steve: Kopf, Körper, zwei Arme, zwei Beine (32 Pixel = 2 Blöcke hoch).
 * `limbWidth` 4 = normal, 2 = dünn (Skelett).
 */
export function humanoid(
  model: THREE.Group,
  materials: { head: THREE.Material; face: THREE.Material; body: THREE.Material; arm: THREE.Material; leg: THREE.Material },
  limbWidth = 4,
): Humanoid {
  const { head: h, face, body, arm, leg } = materials;
  const head = box(8, 8, 8, [h, h, h, h, face, h]);
  head.position.y = 28 * P;
  const torso = box(8, 12, 4, body);
  torso.position.y = 18 * P;
  const x = 4 + limbWidth / 2;
  const arms: [THREE.Group, THREE.Group] = [
    limb(box(limbWidth, 12, limbWidth, arm), [-x, 22, 0], -4),
    limb(box(limbWidth, 12, limbWidth, arm), [x, 22, 0], -4),
  ];
  const legs: [THREE.Group, THREE.Group] = [
    limb(box(limbWidth, 12, limbWidth, leg), [-2, 12, 0], -6),
    limb(box(limbWidth, 12, limbWidth, leg), [2, 12, 0], -6),
  ];
  model.add(head, torso, ...arms, ...legs);
  return { head, arms, legs };
}

/** Laufen: Beine schwingen gegenläufig. */
export function walkLegs(legs: THREE.Object3D[], phase: number, amount: number) {
  legs.forEach((leg, i) => (leg.rotation.x = Math.sin(phase) * amount * (i % 2 ? 1 : -1)));
}
