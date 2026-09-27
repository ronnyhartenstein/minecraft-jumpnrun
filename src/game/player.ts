import * as THREE from 'three';
import type { Point } from '../levels/format';
import type { BlockId } from '../textures/blocks';
import type { World } from './world';

/** Alle Stellschrauben fürs Spielgefühl an einem Ort. Einheiten: Blöcke und Sekunden. */
export const PHYSICS = {
  maxSpeed: 6,
  groundAccel: 60,
  groundDecel: 50,
  airAccel: 35,
  airDecel: 12,
  gravity: 40,
  /** Beim Fallen etwas stärkere Schwerkraft, das fühlt sich knackiger an. */
  fallGravityMultiplier: 1.4,
  jumpHeight: 2.6,
  /** Lässt man Springen früh los, wird die Aufwärtsgeschwindigkeit so stark gekürzt. */
  jumpCut: 0.45,
  /** So hoch geht jeder Sprung mindestens, auch bei ganz kurzem Antippen. */
  minJumpHeight: 1.3,
  maxFallSpeed: 22,
  /** So lange kann man nach dem Verlassen einer Kante noch springen. */
  coyoteTime: 0.1,
  /** So lange wird ein zu früher Sprung-Tastendruck vor der Landung gemerkt. */
  jumpBuffer: 0.12,
  /** Auf Eis kommt Steve nur langsam in Fahrt und rutscht lange nach. */
  iceAccel: 14,
  iceDecel: 3,
  /** Auf Seelensand läuft Steve langsamer. */
  soulSandSpeed: 0.45,
  /** So stark federt Steve nach dem Draufspringen auf einen Gegner ab. */
  stompBounce: 10,
};

export type Physics = typeof PHYSICS;

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
}

const HALF_WIDTH = 0.3;
const HEIGHT = 1.8;
const EPS = 1e-4;
/** Maximale Strecke pro Kollisions-Teilschritt, damit Steve nie durch einen Block rutscht. */
const MAX_SUBSTEP = 0.4;
/** So hohe Kanten läuft der Schreiter hinauf, z. B. vom Lavasee ans Ufer. */
const MAX_STEP_UP = 0.2;

/** Steves Position ist die Mitte seiner Füße. */
export class Player {
  readonly pos = new THREE.Vector2();
  readonly prevPos = new THREE.Vector2();
  readonly vel = new THREE.Vector2();
  onGround = false;
  /** Ist Steve in diesem Schritt abgesprungen? (für den Sound) */
  jumped = false;
  /** Der Block, auf dem Steve zuletzt gelandet ist. */
  ground: BlockId | null = null;
  facing: 1 | -1 = 1;
  /** Werte der gewählten Spielfigur: Die Tiere können jeweils etwas mehr als Steve. */
  physics: Physics = PHYSICS;
  /** So langsam sinkt die Figur mit gehaltener Sprungtaste (Huhn), `null` = kann nicht gleiten. */
  private glide: number | null = null;
  /** Gleitet die Figur gerade? (für die Flügel) */
  gliding = false;
  /** Trägt die Lava die Figur wie Boden (Schreiter)? */
  private lavaWalker = false;
  private coyote = 0;
  private buffer = 0;
  private jumpCutDone = true;
  private jumpStartY = 0;

  constructor(private readonly world: World) {}

  setFigure({ physics, glide, lavaWalker }: { physics: Partial<Physics>; glide: number | null; lavaWalker: boolean }): void {
    this.physics = { ...PHYSICS, ...physics };
    this.glide = glide;
    this.lavaWalker = lavaWalker;
  }

  spawn(at: Point): void {
    this.pos.set(at.x + 0.5, at.y);
    this.prevPos.copy(this.pos);
    this.vel.set(0, 0);
    this.facing = 1;
    this.onGround = false;
    this.buffer = 0;
  }

  update(dt: number, input: PlayerInput): void {
    this.prevPos.copy(this.pos);
    this.jumped = false;
    this.walk(dt, input);
    this.jump(dt, input);

    const gravity = this.physics.gravity * (this.vel.y < 0 ? this.physics.fallGravityMultiplier : 1);
    this.gliding = this.glide !== null && input.jumpHeld && this.vel.y < 0;
    const maxFall = this.gliding ? this.glide! : this.physics.maxFallSpeed;
    this.vel.y = Math.max(this.vel.y - gravity * dt, -maxFall);

    const dx = this.vel.x * dt;
    const dy = this.vel.y * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_SUBSTEP));
    this.onGround = false;
    for (let i = 0; i < steps; i++) {
      this.moveX(dx / steps);
      this.moveY(dy / steps);
    }
  }

  /** Abfedern nach dem Draufspringen auf einen Gegner. */
  bounce(): void {
    this.vel.y = this.physics.stompBounce;
    this.jumpCutDone = true;
  }

  private walk(dt: number, input: PlayerInput) {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) this.facing = dir as 1 | -1;

    const onIce = this.onGround && this.ground === 'ice';
    const onSoulSand = this.onGround && this.ground === 'soulSand';
    const accel = onIce ? this.physics.iceAccel : this.onGround ? this.physics.groundAccel : this.physics.airAccel;
    const decel = onIce ? this.physics.iceDecel : this.onGround ? this.physics.groundDecel : this.physics.airDecel;
    const turning = dir !== 0 && Math.sign(this.vel.x) === -dir;
    const rate = dir === 0 ? decel : turning ? accel + decel : accel;
    const target = dir * this.physics.maxSpeed * (onSoulSand ? this.physics.soulSandSpeed : 1);
    const diff = target - this.vel.x;
    this.vel.x += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
  }

  private jump(dt: number, input: PlayerInput) {
    this.coyote = this.onGround ? this.physics.coyoteTime : this.coyote - dt;
    this.buffer = input.jumpPressed ? this.physics.jumpBuffer : this.buffer - dt;

    if (this.buffer > 0 && this.coyote > 0) {
      this.vel.y = Math.sqrt(2 * this.physics.gravity * this.physics.jumpHeight);
      this.buffer = 0;
      this.coyote = 0;
      this.jumpCutDone = false;
      this.jumpStartY = this.pos.y;
      this.jumped = true;
    }
    // Variable Sprunghöhe: kurz tippen = kleiner Sprung, aber nie niedriger als minJumpHeight
    const minReached = this.pos.y - this.jumpStartY >= this.physics.minJumpHeight;
    if (!this.jumpCutDone && !input.jumpHeld && this.vel.y > 0 && minReached) {
      this.vel.y *= this.physics.jumpCut;
      this.jumpCutDone = true;
    }
  }

  private rowsCovered(): [number, number] {
    return [Math.floor(this.pos.y + EPS), Math.floor(this.pos.y + HEIGHT - EPS)];
  }

  private colsCovered(): [number, number] {
    return [Math.floor(this.pos.x - HALF_WIDTH + EPS), Math.floor(this.pos.x + HALF_WIDTH - EPS)];
  }

  private moveX(dx: number) {
    if (dx === 0) return;
    this.pos.x += dx;
    const [y0, y1] = this.rowsCovered();
    const edge = dx > 0 ? this.pos.x + HALF_WIDTH : this.pos.x - HALF_WIDTH;
    const col = Math.floor(edge);
    for (let y = y0; y <= y1; y++) {
      if (this.world.isSolid(col, y)) {
        if (y === y0 && this.stepUp(col, y + 1)) return;
        this.pos.x = dx > 0 ? col - HALF_WIDTH - EPS : col + 1 + HALF_WIDTH + EPS;
        this.vel.x = 0;
        return;
      }
    }
  }

  /**
   * Der Schreiter steht auf Lava etwas tiefer als auf Boden. Die kleine Kante am Ufer
   * läuft er einfach hinauf, statt daran hängen zu bleiben.
   */
  private stepUp(col: number, top: number): boolean {
    const step = top - this.pos.y;
    if (!this.lavaWalker || step <= 0 || step > MAX_STEP_UP) return false;
    for (let y = top; y < top + HEIGHT; y++) if (this.world.isSolid(col, Math.floor(y))) return false;
    this.pos.y = top;
    return true;
  }

  private moveY(dy: number) {
    if (dy === 0) return;
    this.pos.y += dy;
    const [x0, x1] = this.colsCovered();
    const row = Math.floor(dy > 0 ? this.pos.y + HEIGHT : this.pos.y);
    for (let x = x0; x <= x1; x++) {
      if (this.world.isSolid(x, row)) {
        if (dy < 0) {
          this.pos.y = row + 1;
          this.onGround = true;
          // Maßgeblich ist der Block unter Steves Mitte, sonst der, auf dem er gerade noch steht
          const center = Math.floor(this.pos.x);
          this.ground = this.world.isSolid(center, row) ? this.world.blockAt(center, row) : this.world.blockAt(x, row);
        } else {
          this.pos.y = row - HEIGHT - EPS;
          this.jumpCutDone = true;
        }
        this.vel.y = 0;
        return;
      }
    }
    // Der Schreiter landet auf der Lava-Oberfläche, die etwas tiefer liegt als ein Block
    if (dy > 0 || !this.lavaWalker) return;
    for (let x = x0; x <= x1; x++) {
      const surface = this.world.lavaSurface(x, row);
      if (surface === null || this.pos.y >= surface || this.pos.y - dy < surface - EPS) continue;
      this.pos.y = surface;
      this.onGround = true;
      this.ground = 'lava';
      this.vel.y = 0;
      return;
    }
  }
}
