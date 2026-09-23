import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy, type EnemyContext } from './base';
import { box, dots, humanoid, P, skin, walkLegs, type Humanoid } from './models';
import { aimArc, Projectile } from './projectile';

const WALK_SPEED = 0.6;
const RANGE = 9;
const POISON_GRAVITY = 20;
/** So lange fliegt die Giftflasche bis zum Ziel. */
const FLIGHT_TIME = 0.9;

/** Waldhexe: läuft gemächlich herum und wirft Gift im Bogen auf Steve. */
export class Witch extends Enemy {
  private readonly body: Humanoid;
  private cooldown = 1.2;
  private throwing = 0;

  constructor(start: Point, world: World, difficulty: Difficulty) {
    super('witch', 0.3, 2, start, world, difficulty);
    const robe = ['#4b2a5c', '#422452', '#553066'];
    const face = ['#b8906a', '#ad8660', '#c29a73'];
    const dark = '#1f1f1f';
    this.body = humanoid(this.model, {
      head: skin(face),
      face: skin(face, (ctx) => dots(ctx, [[1, 3, dark], [2, 3, '#3a8a3a'], [5, 3, '#3a8a3a'], [6, 3, dark], [2, 6, '#6b4a30'], [5, 6, '#6b4a30']])),
      body: skin(robe),
      arm: skin(robe),
      leg: skin(robe),
    });
    // Große Nase mit Warze
    const nose = box(2, 4, 2, skin(face, (ctx) => dots(ctx, [[3, 5, '#3a8a3a']])));
    nose.position.set(0, 26 * P, 5 * P);
    // Spitzer Hut aus immer kleineren Stufen
    const hat = new THREE.MeshLambertMaterial({ color: '#2a1a33' });
    const brim = box(10, 1, 10, hat);
    brim.position.y = 32.5 * P;
    this.model.add(nose, brim);
    [[7, 3], [5, 3], [3, 3], [1, 2]].reduce((y, [size, h]) => {
      const layer = box(size, h, size, hat);
      layer.position.y = (y + h / 2) * P;
      this.model.add(layer);
      return y + h;
    }, 33);
    this.reset();
  }

  protected think(dt: number, ctx: EnemyContext) {
    this.cooldown -= dt;
    this.throwing = Math.max(0, this.throwing - dt);
    if (!this.sees(ctx.player, RANGE, 5)) {
      this.patrol(WALK_SPEED);
      return;
    }
    this.vel.x = 0;
    this.face(ctx.player);
    if (this.cooldown > 0) return;
    this.cooldown = this.difficulty.witchCooldown;
    this.throwing = 0.3;
    const from = new THREE.Vector2(this.pos.x + this.dir * 0.3, this.pos.y + 1.7);
    const target = new THREE.Vector2(ctx.player.x, ctx.player.y + 0.6);
    ctx.shoot(new Projectile('poison', from, aimArc(from, target, FLIGHT_TIME, POISON_GRAVITY), POISON_GRAVITY));
    ctx.sound('throw');
  }

  protected animate() {
    // Wurf: rechter Arm schnellt nach vorn
    this.body.arms[0].rotation.x = this.throwing > 0 ? -2.2 : 0;
    walkLegs(this.body.legs, this.timer * 5, Math.abs(this.vel.x) > 0.1 ? 0.4 : 0);
  }
}
