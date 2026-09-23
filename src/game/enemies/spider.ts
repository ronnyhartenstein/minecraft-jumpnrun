import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy, type EnemyContext } from './base';
import { box, dots, P, skin } from './models';

const JUMP = 9;
const POUNCE_X = 5;
const POUNCE_Y = 6.5;
/** So nah muss Steve (vor ihr) sein, damit die Spinne ihn anspringt. */
const POUNCE_RANGE = 4;

/** Spinne (in Höhlen die kleinere Höhlenspinne): schnell, springt über 1er-Blöcke und springt Steve an. */
export class Spider extends Enemy {
  private readonly legs: THREE.Object3D[] = [];
  private cooldown = 0;

  constructor(start: Point, world: World, difficulty: Difficulty, cave: boolean) {
    const scale = cave ? 0.7 : 1;
    super(cave ? 'caveSpider' : 'spider', 0.7 * scale, 0.9 * scale, start, world, difficulty);
    const colors = cave ? ['#1f3a4a', '#244456', '#1a3140'] : ['#3a2f28', '#2d241e', '#44382f'];
    const red = '#d42020';
    const hide = skin(colors);
    const face = skin(colors, (ctx) => dots(ctx, [[1, 3, red], [2, 3, red], [5, 3, red], [6, 3, red], [2, 5, red], [5, 5, red]]));
    const parts = new THREE.Group();
    const head = box(8, 8, 8, [hide, hide, hide, hide, face, hide]);
    head.position.set(0, 7 * P, 8 * P);
    const thorax = box(6, 6, 6, hide);
    thorax.position.set(0, 7 * P, 2 * P);
    const abdomen = box(10, 8, 12, hide);
    abdomen.position.set(0, 8 * P, -7 * P);
    parts.add(head, thorax, abdomen);
    // Acht Beine, vier auf jeder Seite: vom Körper schräg nach oben zum Knie, dann hinunter bis zum Boden
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const hip = new THREE.Group();
        hip.position.set(side * 3 * P, 7 * P, (4 - i * 2.5) * P);
        const upper = box(8, 2, 2, hide);
        upper.position.x = side * 4 * P;
        const knee = new THREE.Group();
        knee.position.x = side * 8 * P;
        const lower = box(2, 12, 2, hide);
        lower.position.y = -6 * P;
        knee.add(lower);
        hip.add(upper, knee);
        // Oberschenkel nach oben, Unterschenkel wieder senkrecht und leicht nach außen
        hip.rotation.z = side * 0.5;
        knee.rotation.z = -side * 0.65;
        hip.userData.side = side;
        hip.userData.i = i;
        this.legs.push(hip);
        parts.add(hip);
      }
    }
    parts.scale.setScalar(scale);
    this.model.add(parts);
    this.reset();
  }

  protected think(dt: number, ctx: EnemyContext) {
    this.cooldown -= dt;
    if (!this.onGround) return;
    // Steve anspringen, wenn er nah ist und die Landung sicher ist
    const dx = ctx.player.x - this.pos.x;
    if (this.cooldown <= 0 && Math.abs(dx) < POUNCE_RANGE && Math.abs(ctx.player.y - this.pos.y) < 1.5) {
      this.face(ctx.player);
      if (!this.blockedAhead(this.pos.x + this.dir * 2.5)) {
        this.vel.set(this.dir * POUNCE_X, POUNCE_Y);
        this.cooldown = this.difficulty.spiderPounce;
        return;
      }
    }
    this.patrol(this.difficulty.spiderSpeed);
  }

  /** An einer Wand: Ist sie nur 1 Block hoch, springt die Spinne drüber, sonst dreht sie um. */
  protected override hitWall() {
    const col = Math.floor(this.pos.x + this.dir * (this.halfWidth + 0.1));
    const row = Math.round(this.pos.y);
    const lowWall = this.world.isSolid(col, row) && !this.world.isSolid(col, row + 1) && !this.world.isSolid(col, row + 2);
    // Im Sprung weiter vorwärts drücken, damit sie über die Kante kommt
    if (!this.onGround) {
      this.vel.x = this.dir * this.difficulty.spiderSpeed;
      return;
    }
    if (lowWall) this.vel.set(this.dir * this.difficulty.spiderSpeed, JUMP);
    else this.flip();
  }

  /**
   * Die Spinne ist der einzige Gegner, der treppauf und treppab kann:
   * Vor einer 1er-Stufe springt sie hinauf, an einer 1er-Kante hüpft sie hinunter.
   * In Lava oder in eine Lücke geht sie aber nie.
   */
  protected override blockedAhead(x: number): boolean {
    const col = Math.floor(x);
    const row = Math.round(this.pos.y);
    const { world } = this;
    const stepUp = world.isSolid(col, row) && !world.isSolid(col, row + 1) && !world.isSolid(col, row + 2);
    const stepDown = !world.isSolid(col, row) && !world.isSolid(col, row - 1) && world.blockAt(col, row - 1) !== 'lava'
      && world.isSolid(col, row - 2);
    if (stepUp || stepDown) return false;
    return super.blockedAhead(x);
  }

  protected animate() {
    const moving = Math.abs(this.vel.x) > 0.1;
    for (const leg of this.legs) {
      const wiggle = moving ? Math.sin(this.timer * 18 + leg.userData.i * 1.6) * 0.35 : 0;
      leg.rotation.y = wiggle * leg.userData.side;
    }
  }
}
