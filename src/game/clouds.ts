import * as THREE from 'three';
import { mulberry32 } from '../textures/pixel';

/** Flache Blockwolken, die langsam über den Himmel ziehen. */
export class Clouds {
  readonly object = new THREE.Group();
  private readonly span: number;

  constructor(levelWidth: number, height: number) {
    const rng = mulberry32(42);
    const material = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#dfe9f5', transparent: true, opacity: 0.92 });
    this.span = levelWidth + 80;
    for (let i = 0; i < Math.ceil(this.span / 14); i++) {
      const cloud = new THREE.Group();
      const parts = 2 + Math.floor(rng() * 3);
      for (let p = 0; p < parts; p++) {
        const w = 4 + Math.floor(rng() * 6);
        const d = 3 + Math.floor(rng() * 4);
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), material);
        box.position.set(p * 3 + rng() * 2, 0, (rng() - 0.5) * 3);
        cloud.add(box);
      }
      cloud.position.set(i * 14 + rng() * 8 - 40, height + 5 + rng() * 5, -18 - rng() * 14);
      this.object.add(cloud);
    }
  }

  update(dt: number): void {
    for (const cloud of this.object.children) {
      cloud.position.x += dt * 0.6;
      if (cloud.position.x > this.span - 40) cloud.position.x -= this.span;
    }
  }
}
