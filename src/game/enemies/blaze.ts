import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy, type EnemyContext } from './base';
import { box, dots, P, skin } from './models';
import { Projectile } from './projectile';

const RANGE = 10;
/** Die Lohe schwebt so hoch, dass Steve unter ihr durchlaufen kann; gefährlich sind nur ihre Feuerbälle. */
const HOVER = 2.3;
const DRIFT_SPEED = 1;
/** So weit entfernt sie sich höchstens von ihrem Platz. */
const DRIFT_RANGE = 3;
const BURST_GAP = 0.35;

/**
 * Lohe (Blaze): schwebt über dem Boden, dreht glühende Stäbe und schießt Feuerbälle geradeaus.
 * Man kann unter ihr durchlaufen und von einer höheren Stelle aus auf sie springen.
 */
export class Blaze extends Enemy {
  override readonly harmlessTouch = true;
  private readonly rods = new THREE.Group();
  private cooldown = 1.5;
  private shotsLeft = 0;
  private burstTimer = 0;

  constructor(start: Point, world: World, difficulty: Difficulty) {
    super('blaze', 0.35, 1.8, start, world, difficulty);
    const yellow = ['#f7c531', '#f0a820', '#ffd650'];
    const dark = '#6a3a00';
    const glow = (m: THREE.MeshLambertMaterial) => {
      m.emissive.set('#a86a00');
      return m;
    };
    const head = box(8, 8, 8, [glow(skin(yellow)), glow(skin(yellow)), glow(skin(yellow)), glow(skin(yellow)),
      glow(skin(yellow, (ctx) => dots(ctx, [[1, 3, dark], [2, 3, '#fff'], [5, 3, '#fff'], [6, 3, dark], [2, 6, dark], [3, 6, dark], [4, 6, dark], [5, 6, dark]]))),
      glow(skin(yellow))]);
    head.position.y = 24 * P;
    this.model.add(head, this.rods);
    // Zwölf glühende Stäbe in drei Ringen um den Körper
    const rod = new THREE.MeshBasicMaterial({ color: '#ffb020' });
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + ring * 0.4;
        const r = (6 - ring) * P;
        const stick = box(2, 8, 2, rod);
        stick.castShadow = false;
        stick.position.set(Math.cos(angle) * r * 1.4, (16 - ring * 6) * P, Math.sin(angle) * r * 1.4);
        stick.userData.ring = ring;
        this.rods.add(stick);
      }
    }
    this.reset();
  }

  override reset(): void {
    super.reset();
    this.pos.y = this.start.y + HOVER;
    this.shotsLeft = 0;
  }

  /** Die Lohe schwebt: keine Schwerkraft, sie stößt nirgends an. */
  protected override physics(dt: number) {
    this.pos.x += this.vel.x * dt;
    this.pos.y = this.start.y + HOVER + Math.sin(this.timer * 1.6) * 0.25;
  }

  protected think(dt: number, ctx: EnemyContext) {
    this.cooldown -= dt;
    const home = this.start.x + 0.5;
    const sees = this.sees(ctx.player, RANGE, 5);
    // Langsam zu Steve hin treiben, aber in der Nähe des eigenen Platzes bleiben
    const wanted = sees ? THREE.MathUtils.clamp(ctx.player.x, home - DRIFT_RANGE, home + DRIFT_RANGE) : home;
    this.vel.x = Math.abs(wanted - this.pos.x) > 0.2 ? Math.sign(wanted - this.pos.x) * DRIFT_SPEED : 0;
    if (sees) this.face(ctx.player);

    if (this.shotsLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) this.fire(ctx);
      return;
    }
    if (sees && this.cooldown <= 0) {
      this.cooldown = this.difficulty.blazeCooldown;
      this.shotsLeft = this.difficulty.blazeBurst;
      this.fire(ctx);
    }
  }

  private fire(ctx: EnemyContext) {
    this.shotsLeft--;
    this.burstTimer = BURST_GAP;
    const from = new THREE.Vector2(this.pos.x + this.dir * 0.4, this.pos.y + 1.4);
    // Auf Steves Füße zielen: Der Feuerball kommt schräg von oben, man kann drüberspringen
    const dir = new THREE.Vector2(ctx.player.x - from.x, ctx.player.y + 0.3 - from.y).normalize();
    ctx.shoot(new Projectile('fireball', from, dir.multiplyScalar(this.difficulty.fireballSpeed), 0));
    ctx.sound('fireball');
  }

  protected animate(dt: number) {
    this.rods.rotation.y += dt * 2.5;
    this.rods.children.forEach((stick) => (stick.position.y += Math.sin(this.timer * 4 + stick.userData.ring) * 0.002));
  }
}
