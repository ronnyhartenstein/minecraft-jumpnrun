import * as THREE from 'three';
import type { Point } from '../levels/format';

const IDLE = '#9a9a9a';
const ACTIVE = '#4cc94c';

/** Checkpoint: ein Banner an einer Stange. Einmal berührt, startet Steve nach einem Sturz hier neu. */
export class Checkpoint {
  readonly object = new THREE.Group();
  active = false;
  private readonly banner: THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>;
  private readonly cloth: THREE.Group;
  private time = 0;

  constructor(readonly at: Point) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), new THREE.MeshLambertMaterial({ color: '#6b5230' }));
    pole.position.y = 1.2;
    this.banner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.05), new THREE.MeshLambertMaterial({ color: IDLE }));
    this.banner.position.set(0.4, -0.5, 0);
    this.cloth = new THREE.Group();
    this.cloth.position.y = 2.3;
    this.cloth.add(this.banner);
    pole.castShadow = this.banner.castShadow = true;
    this.object.add(pole, this.cloth);
    this.object.position.set(at.x + 0.5, at.y, -0.35);
  }

  /** Hat Steve den Checkpoint erreicht? */
  reached(playerX: number): boolean {
    return playerX >= this.at.x + 0.5;
  }

  activate(): void {
    this.active = true;
    this.banner.material.color.set(ACTIVE);
  }

  reset(): void {
    this.active = false;
    this.banner.material.color.set(IDLE);
  }

  update(dt: number): void {
    this.time += dt;
    this.cloth.rotation.y = Math.sin(this.time * 2.5 + this.at.x) * (this.active ? 0.3 : 0.1);
  }
}
