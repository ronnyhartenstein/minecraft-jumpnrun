import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy, type EnemyContext } from './base';
import { box, dots, P, skin } from './models';
import { Projectile } from './projectile';

const RANGE = 8;
/** Aus nächster Nähe schießt er nicht, dem könnte man nicht ausweichen. */
const MIN_RANGE = 2;
/** So lange steht der Deckel offen, bevor die Kugel fliegt. */
const OPEN_TIME = 0.5;

/** Shulker: ein Purpur-Kasten, der aufklappt und langsame Kugeln geradeaus auf Steve schießt. */
export class Shulker extends Enemy {
  override readonly solid = true;
  private readonly lid: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private cooldown = 1.5;
  private opening = 0;

  constructor(start: Point, world: World, difficulty: Difficulty) {
    super('shulker', 0.5, 1, start, world, difficulty);
    const shell = skin(['#a97aa9', '#9c6e9c', '#b284b2'], (ctx) => {
      ctx.fillStyle = '#7a4f7a';
      ctx.fillRect(0, 7, 8, 1);
    });
    const base = box(16, 8, 16, shell);
    base.position.y = 4 * P;
    this.lid = box(16, 8, 16, shell);
    this.lid.position.y = 12 * P;
    const face = skin(['#e8e3a8', '#dcd79a'], (ctx) => dots(ctx, [[2, 3, '#2a2a2a'], [5, 3, '#2a2a2a']]));
    this.head = box(6, 6, 6, [face, face, face, face, face, face]);
    this.head.position.y = 8 * P;
    this.model.add(base, this.lid, this.head);
    this.reset();
  }

  override reset(): void {
    super.reset();
    this.cooldown = 1.5;
    this.opening = 0;
  }

  /** Der Shulker bewegt sich nicht. */
  protected override physics() {}

  protected think(dt: number, ctx: EnemyContext) {
    this.vel.x = 0;
    this.cooldown -= dt;
    // Nur auf ungefähr gleicher Höhe schießen, nicht auf jemanden, der gerade hochklettert
    if (!this.sees(ctx.player, RANGE, 1.6) || Math.abs(ctx.player.x - this.pos.x) < MIN_RANGE) {
      this.opening = 0;
      return;
    }
    this.face(ctx.player);
    if (this.cooldown > 0) return;
    this.opening += dt;
    if (this.opening < OPEN_TIME) return;
    this.opening = 0;
    this.cooldown = this.difficulty.shulkerCooldown;
    const from = new THREE.Vector2(this.pos.x + this.dir * 0.3, this.pos.y + 0.6);
    const dir = new THREE.Vector2(ctx.player.x - from.x, ctx.player.y + 0.7 - from.y).normalize();
    ctx.shoot(new Projectile('shulker', from, dir.multiplyScalar(this.difficulty.shulkerBulletSpeed), 0));
    ctx.sound('shulker');
  }

  protected animate(dt: number) {
    // Deckel hebt sich beim Zielen und schließt sich wieder
    const open = this.opening > 0 || this.cooldown > this.difficulty.shulkerCooldown - 0.4 ? 5 * P : 0;
    this.lid.position.y += (12 * P + open - this.lid.position.y) * (1 - Math.exp(-12 * dt));
    this.head.visible = this.lid.position.y > 13 * P;
  }
}
