import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import type { Projectile } from './projectile';

const GRAVITY = 30;
const EPS = 1e-4;

/** Was ein Gegner über das Spiel wissen darf. */
export interface EnemyContext {
  /** Steves Position (Mitte der Füße). */
  player: THREE.Vector2;
  /** Ein Geschoss abfeuern (Pfeil, Gift, Feuerball). */
  shoot(projectile: Projectile): void;
  /** Einen Sound abspielen. */
  sound(name: 'bow' | 'throw' | 'fireball'): void;
}

/**
 * Gemeinsame Grundlage aller Gegner: Laufen mit Schwerkraft und Kollision gegen die Blöcke,
 * Umdrehen an Wänden, Kanten und Lava, Plattdrücken beim Draufspringen.
 */
export abstract class Enemy {
  readonly object = new THREE.Group();
  readonly pos = new THREE.Vector2();
  readonly vel = new THREE.Vector2();
  alive = true;
  /** Creeper: Sekunden seit dem Zünden, `null` = nicht gezündet. */
  fuse: number | null = null;
  /** Wird für genau einen Schritt true, wenn ein Creeper explodiert. */
  exploded = false;
  /** Durch feste Gegner (Creeper) kann Steve nicht hindurchlaufen, sie tun bei Berührung aber nichts. */
  readonly solid: boolean = false;
  /** Harmlos bei Berührung, gefährlich sind nur die Geschosse (Lohe). */
  readonly harmlessTouch: boolean = false;
  protected dir: 1 | -1 = -1;
  protected onGround = false;
  protected timer = 0;
  protected dying = 0;
  protected readonly model = new THREE.Group();

  constructor(
    readonly kind: string,
    readonly halfWidth: number,
    readonly height: number,
    protected readonly start: Point,
    protected readonly world: World,
    protected readonly difficulty: Difficulty,
  ) {
    this.object.add(this.model);
  }

  reset(): void {
    this.pos.set(this.start.x + 0.5, this.start.y);
    this.vel.set(0, 0);
    this.dir = -1;
    this.alive = true;
    this.dying = 0;
    this.timer = Math.random();
    this.object.visible = true;
    this.model.visible = true;
    this.model.scale.set(1, 1, 1);
  }

  /** Von oben draufgesprungen: plattdrücken und verschwinden. */
  stomp(): void {
    this.alive = false;
    this.dying = 0.3;
  }

  update(dt: number, ctx: EnemyContext): void {
    if (!this.alive) {
      this.dying -= dt;
      this.model.scale.set(1 + (0.3 - this.dying), Math.max(0.1, this.dying / 0.3), 1 + (0.3 - this.dying));
      this.object.visible = this.dying > 0;
      return;
    }
    this.timer += dt;
    this.think(dt, ctx);
    if (this.alive) this.physics(dt);
    this.object.position.set(this.pos.x, this.pos.y, 0);
    this.turn(dt);
    this.animate(dt);
  }

  /** Was der Gegner in diesem Schritt tun will: Geschwindigkeit setzen, zielen, schießen … */
  protected abstract think(dt: number, ctx: EnemyContext): void;

  protected abstract animate(dt: number): void;

  protected physics(dt: number) {
    this.vel.y = Math.max(this.vel.y - GRAVITY * dt, -20);
    this.moveX(this.vel.x * dt);
    this.onGround = false;
    this.moveY(this.vel.y * dt);
  }

  /** Zur Laufrichtung drehen, etwas zur Kamera hin, damit man das Gesicht sieht. */
  protected turn(dt: number) {
    const facing = this.dir * (Math.PI / 2 - 0.45);
    this.object.rotation.y += (facing - this.object.rotation.y) * (1 - Math.exp(-10 * dt));
  }

  /** Hin und her laufen, an Wänden, Kanten und Lava umdrehen. */
  protected patrol(speed: number) {
    if (this.onGround && this.blockedAhead(this.pos.x + this.dir * (this.halfWidth + 0.05))) this.flip();
    this.vel.x = this.dir * speed;
  }

  protected flip() {
    this.dir = -this.dir as 1 | -1;
  }

  /** Steve in Reichweite und ungefähr auf gleicher Höhe? */
  protected sees(player: THREE.Vector2, range: number, height = 2.5): boolean {
    return Math.abs(player.x - this.pos.x) < range && Math.abs(player.y - this.pos.y) < height;
  }

  protected face(player: THREE.Vector2) {
    this.dir = player.x < this.pos.x ? -1 : 1;
  }

  /** Wand vorne oder kein fester Boden darunter (Kante, Lava)? */
  protected blockedAhead(x: number): boolean {
    const col = Math.floor(x);
    const row = Math.round(this.pos.y);
    return this.world.isSolid(col, row) || this.world.isSolid(col, row + 1) || !this.world.isSolid(col, row - 1);
  }

  protected moveX(dx: number) {
    if (dx === 0) return;
    this.pos.x += dx;
    const edge = Math.floor(dx > 0 ? this.pos.x + this.halfWidth : this.pos.x - this.halfWidth);
    for (let y = Math.floor(this.pos.y + EPS); y <= Math.floor(this.pos.y + this.height - EPS); y++) {
      if (this.world.isSolid(edge, y)) {
        this.pos.x = dx > 0 ? edge - this.halfWidth - EPS : edge + 1 + this.halfWidth + EPS;
        this.vel.x = 0;
        this.hitWall();
        return;
      }
    }
  }

  /** Beim Anstoßen an eine Wand: normalerweise umdrehen. */
  protected hitWall() {
    this.flip();
  }

  protected moveY(dy: number) {
    this.pos.y += dy;
    const row = Math.floor(dy > 0 ? this.pos.y + this.height : this.pos.y);
    for (let x = Math.floor(this.pos.x - this.halfWidth + EPS); x <= Math.floor(this.pos.x + this.halfWidth - EPS); x++) {
      if (!this.world.isSolid(x, row)) continue;
      if (dy < 0) {
        this.pos.y = row + 1;
        this.onGround = true;
      } else {
        this.pos.y = row - this.height - EPS;
      }
      this.vel.y = 0;
      return;
    }
  }
}
