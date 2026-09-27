import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy, type EnemyContext } from './base';
import { box, dots, humanoid, P, skin, walkLegs, type Humanoid } from './models';

const WALK_SPEED = 0.8;
/** So nah muss Steve kommen, damit der Enderman sich teleportiert. */
const RANGE = 6;
/** Wohin er springt: so weit von seinem Platz weg … */
const HOP_MIN = 2;
const HOP_MAX = 4;
/** … aber nie näher als so viele Blöcke an Steve. */
const KEEP_AWAY = 2.5;
/** So lange ist er beim Teleportieren unsichtbar, danach starrt er kurz. */
const VANISH = 0.25;
const STARE = 0.6;
const HEIGHT = 2.6;
/** Getroffen wird er nur bis hier: Steve kann über ihn springen, der Kopf ragt darüber hinaus. */
const HITBOX = 2;

/**
 * Enderman: groß, schwarz, lila Augen. Er verfolgt Steve nicht, bleibt aber stehen und starrt ihn an.
 * Kommt Steve nah, teleportiert er sich ein Stück weiter – nie direkt neben Steve.
 */
export class Enderman extends Enemy {
  private readonly body: Humanoid;
  private readonly puff = new THREE.Group();
  private cooldown = 1;
  private vanish = 0;
  private stare = 0;
  private target = new THREE.Vector2();

  constructor(start: Point, world: World, difficulty: Difficulty) {
    super('enderman', 0.3, HITBOX, start, world, difficulty);
    const black = ['#161616', '#101010', '#1c1c1c'];
    const purple = '#d77dff';
    this.body = humanoid(this.model, {
      head: skin(black),
      face: skin(black, (ctx) => dots(ctx, [[1, 4, '#f0c8ff'], [2, 4, purple], [3, 4, purple], [4, 4, purple], [5, 4, purple], [6, 4, '#f0c8ff']])),
      body: skin(black),
      arm: skin(black),
      leg: skin(black),
    }, 2);
    // Lange dünne Gliedmaßen: Beine und Arme strecken, Körper und Kopf höher setzen
    this.body.legs.forEach((leg) => {
      leg.scale.y = 1.9;
      leg.position.y = 22.6 * P;
    });
    this.body.arms.forEach((arm) => {
      arm.scale.y = 1.9;
      arm.position.y += 10.6 * P;
    });
    this.model.children.forEach((child) => {
      if (!this.body.legs.includes(child as THREE.Group) && !this.body.arms.includes(child as THREE.Group)) child.position.y += 10.6 * P;
    });
    const material = new THREE.MeshBasicMaterial({ color: '#c77dff', transparent: true });
    for (let i = 0; i < 10; i++) {
      const bit = box(2, 2, 2, material);
      bit.castShadow = false;
      this.puff.add(bit);
    }
    this.puff.visible = false;
    this.object.add(this.puff);
    this.reset();
  }

  override reset(): void {
    super.reset();
    this.cooldown = 1;
    this.vanish = 0;
    this.stare = 0;
  }

  protected think(dt: number, ctx: EnemyContext) {
    this.cooldown -= dt;
    if (this.vanish > 0) {
      this.vel.x = 0;
      this.vanish -= dt;
      if (this.vanish <= 0) this.appear();
      return;
    }
    if (this.stare > 0) {
      this.stare -= dt;
      this.vel.x = 0;
      this.face(ctx.player);
      return;
    }
    if (!this.sees(ctx.player, RANGE, 2)) {
      this.patrol(WALK_SPEED);
      return;
    }
    this.face(ctx.player);
    if (this.cooldown <= 0 && this.findSpot(ctx.player)) {
      this.cooldown = this.difficulty.endermanTeleport;
      this.vanish = VANISH;
      this.model.visible = false;
      this.showPuff();
      ctx.sound('teleport');
      return;
    }
    this.vel.x = 0;
  }

  /** Sucht eine freie Stelle mit Boden in der Nähe seines Platzes, nicht zu nah an Steve. */
  private findSpot(player: THREE.Vector2): boolean {
    const home = this.start.x + 0.5;
    const row = Math.round(this.pos.y);
    const spots: THREE.Vector2[] = [];
    for (let dx = -HOP_MAX; dx <= HOP_MAX; dx++) {
      const x = Math.floor(this.pos.x) + dx;
      const cx = x + 0.5;
      if (Math.abs(dx) < HOP_MIN || Math.abs(cx - home) > HOP_MAX + 1 || Math.abs(cx - player.x) < KEEP_AWAY) continue;
      for (let y = row - 2; y <= row + 2; y++) {
        const floor = this.world.blockAt(x, y - 1);
        if (!this.world.isSolid(x, y - 1) || floor === 'lava') continue;
        if ([0, 1].some((k) => this.world.isSolid(x, y + k) || this.world.blockAt(x, y + k) === 'lava')) continue;
        spots.push(new THREE.Vector2(cx, y));
      }
    }
    if (spots.length === 0) return false;
    this.target.copy(spots[Math.floor(Math.random() * spots.length)]);
    return true;
  }

  private appear() {
    this.pos.copy(this.target);
    this.vel.set(0, 0);
    this.model.visible = true;
    this.stare = STARE;
    this.showPuff();
  }

  private showPuff() {
    this.puff.visible = true;
    this.puff.userData.age = 0;
    this.puff.children.forEach((bit) => {
      bit.position.set((Math.random() - 0.5) * 0.8, Math.random() * HEIGHT, (Math.random() - 0.5) * 0.8);
      bit.userData.v = new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.2, (Math.random() - 0.5) * 1.5);
    });
  }

  protected animate(dt: number) {
    if (this.puff.visible) {
      const age = (this.puff.userData.age += dt);
      this.puff.children.forEach((bit) => bit.position.addScaledVector(bit.userData.v as THREE.Vector3, dt));
      ((this.puff.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / 0.6);
      if (age > 0.6) this.puff.visible = false;
    }
    walkLegs(this.body.legs, this.timer * 4, Math.abs(this.vel.x) > 0.1 ? 0.35 : 0);
    // Arme hängen lang herunter und pendeln leicht
    this.body.arms.forEach((arm, i) => (arm.rotation.x = Math.sin(this.timer * 4 + i * Math.PI) * (Math.abs(this.vel.x) > 0.1 ? 0.2 : 0.03)));
  }
}
