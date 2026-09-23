import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy } from './base';
import { dots, skin } from './models';

const HOP_SPEED_Y = 7.5;
const SIZE = 0.9;

/** Slime (im Nether Magmawürfel): hüpft hin und her, nur dorthin, wo sicherer Boden ist. */
export class Slime extends Enemy {
  constructor(start: Point, world: World, difficulty: Difficulty, magma: boolean) {
    super(magma ? 'magma' : 'slime', 0.45, SIZE, start, world, difficulty);
    const colors = magma ? ['#6b1d0e', '#8a2a12', '#4a140a', '#b0461a', '#f07a20'] : ['#79c05a', '#6ab04c', '#86cc66'];
    const eye = magma ? '#ffb030' : '#1f3a18';
    const glassy = magma ? {} : { transparent: true, opacity: 0.75 };
    const outer = skin(colors, undefined, glassy);
    const face = skin(colors, (ctx) => dots(ctx, [[1, 2, eye], [2, 2, eye], [5, 2, eye], [6, 2, eye], [1, 3, eye], [6, 3, eye], [3, 5, eye], [4, 5, eye]]), glassy);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE), [outer, outer, outer, outer, face, outer]);
    cube.position.y = SIZE / 2;
    cube.castShadow = true;
    this.model.add(cube);
    if (!magma) {
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: '#4f8f3a' }));
      core.position.y = SIZE / 2;
      this.model.add(core);
    }
    this.reset();
  }

  override reset(): void {
    super.reset();
    this.timer = Math.random() * this.difficulty.slimePause;
  }

  protected think() {
    if (this.onGround) this.vel.x = 0;
    if (!this.onGround || this.timer < this.difficulty.slimePause) return;
    // Nur dorthin hüpfen, wo sicherer Boden ist; geht es in keine Richtung, hüpft er auf der Stelle
    const unsafe = () => this.blockedAhead(this.pos.x + this.dir * 1.2) || this.blockedAhead(this.pos.x + this.dir * (this.halfWidth + 0.05));
    if (unsafe()) this.flip();
    this.vel.set(unsafe() ? 0 : this.dir * this.difficulty.slimeHop, HOP_SPEED_Y);
    this.timer = 0;
  }

  protected animate() {
    // Beim Hüpfen strecken, beim Warten leicht wabbeln
    const stretch = this.onGround ? 1 - Math.sin(this.timer * 10) * 0.04 : 1 + Math.min(Math.abs(this.vel.y) * 0.03, 0.2);
    this.model.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
  }
}
