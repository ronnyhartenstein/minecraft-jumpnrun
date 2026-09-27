import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy } from './base';
import { box, P, skin } from './models';

const SPEED = 2.4;

/** Endermite: klein, lila-grau, huscht schnell hin und her. */
export class Endermite extends Enemy {
  private readonly segments: THREE.Mesh[] = [];

  constructor(start: Point, world: World, difficulty: Difficulty) {
    super('endermite', 0.35, 0.4, start, world, difficulty);
    const shell = skin(['#4a3a5a', '#56446a', '#3f324d']);
    const sizes: [number, number, number][] = [[4, 3, 2], [6, 4, 5], [4, 3, 2], [2, 2, 1]];
    let z = 4;
    for (const [w, h, d] of sizes) {
      const segment = box(w, h, d, shell);
      segment.position.set(0, (h / 2) * P, (z - d / 2) * P);
      z -= d;
      this.segments.push(segment);
      this.model.add(segment);
    }
    this.reset();
  }

  protected think() {
    this.patrol(SPEED);
  }

  protected animate() {
    // Die Glieder wackeln beim Laufen
    this.segments.forEach((segment, i) => (segment.rotation.y = Math.sin(this.timer * 18 + i) * 0.25));
  }
}
