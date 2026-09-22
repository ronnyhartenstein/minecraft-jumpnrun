import * as THREE from 'three';
import type { Point } from '../levels/format';

const GEOMETRY = new THREE.OctahedronGeometry(0.28);
GEOMETRY.scale(1, 1.35, 1);
GEOMETRY.userData.shared = true;
const MATERIAL = new THREE.MeshLambertMaterial({ color: '#5decf5', emissive: '#1f8f9a', flatShading: true });
MATERIAL.userData.shared = true;

/** Ein Diamant, der sich dreht und leicht auf und ab schwebt. */
export class Diamond {
  readonly object: THREE.Mesh;
  collected = false;
  private time: number;

  constructor(readonly at: Point) {
    this.object = new THREE.Mesh(GEOMETRY, MATERIAL);
    this.object.castShadow = true;
    this.object.position.set(at.x + 0.5, at.y + 0.5, 0);
    this.time = at.x * 0.7; // nicht alle im Gleichtakt
  }

  /** Berührt Steves Hitbox den Diamanten? */
  touches(minX: number, minY: number, maxX: number, maxY: number): boolean {
    const { x, y } = this.at;
    return !this.collected && maxX > x + 0.2 && minX < x + 0.8 && maxY > y + 0.2 && minY < y + 0.8;
  }

  collect(): void {
    this.collected = true;
    this.object.visible = false;
  }

  reset(): void {
    this.collected = false;
    this.object.visible = true;
  }

  update(dt: number): void {
    this.time += dt;
    this.object.rotation.y = this.time * 2.2;
    this.object.position.y = this.at.y + 0.5 + Math.sin(this.time * 3) * 0.08;
  }
}
