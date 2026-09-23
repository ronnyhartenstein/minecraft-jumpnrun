import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy, type EnemyContext } from './base';
import { box, dots, humanoid, P, skin, walkLegs, type Humanoid } from './models';
import { Projectile } from './projectile';

const WALK_SPEED = 0.8;
const RANGE = 10;
/** So lange spannt das Skelett den Bogen, bevor der Pfeil fliegt (Zeit zum Ausweichen). */
const DRAW_TIME = 0.6;
const ARROW_GRAVITY = 6;

/**
 * Bogen für die rechte Hand: Griff, zwei schräge Wurfarme und die Sehne.
 * Er steht quer zum Arm, beim Zielen (Arm nach vorn) also senkrecht.
 */
function makeBow(): THREE.Group {
  const wood = new THREE.MeshLambertMaterial({ color: '#6b4a22' });
  const string = new THREE.MeshLambertMaterial({ color: '#e8e8e8' });
  const bow = new THREE.Group();
  const grip = box(2, 2, 4, wood);
  const upper = box(1.5, 1.5, 7, wood);
  upper.position.set(0, 1.2 * P, 5 * P);
  upper.rotation.x = -0.4;
  const lower = box(1.5, 1.5, 7, wood);
  lower.position.set(0, 1.2 * P, -5 * P);
  lower.rotation.x = 0.4;
  const cord = box(0.5, 0.5, 17, string);
  cord.position.y = 2.8 * P;
  bow.add(grip, upper, lower, cord);
  // In der Hand, am Ende des Arms
  bow.position.set(0, -11 * P, 0);
  return bow;
}

/** Skelett (im Schnee Eiswanderer): hält Abstand und schießt Pfeile in flachem Bogen. */
export class Skeleton extends Enemy {
  private readonly body: Humanoid;
  private cooldown = 1;
  private drawing = 0;

  constructor(start: Point, world: World, difficulty: Difficulty, stray: boolean) {
    super(stray ? 'stray' : 'skeleton', 0.3, 1.9, start, world, difficulty);
    const bone = stray ? ['#c9d6d9', '#b8c7cb', '#d5e0e2'] : ['#c8c8c8', '#b4b4b4', '#d2d2d2'];
    const dark = '#2a2a2a';
    this.body = humanoid(this.model, {
      head: skin(bone),
      face: skin(bone, (ctx) => dots(ctx, [[1, 3, dark], [2, 3, dark], [5, 3, dark], [6, 3, dark], [3, 5, dark], [4, 5, dark], [2, 6, dark], [5, 6, dark]])),
      body: skin(stray ? ['#6f8a8f', '#627b80', '#7a969b'] : bone, (ctx) => dots(ctx, [[3, 2, dark], [4, 4, dark], [3, 6, dark]])),
      arm: skin(bone),
      leg: skin(stray ? ['#6f8a8f', '#627b80'] : bone),
    }, 2);
    this.body.arms[0].add(makeBow());
    this.reset();
  }

  protected think(dt: number, ctx: EnemyContext) {
    this.cooldown -= dt;
    if (!this.sees(ctx.player, RANGE, 4)) {
      this.drawing = 0;
      this.patrol(WALK_SPEED);
      return;
    }
    // Stehen bleiben, zielen, Bogen spannen, schießen
    this.vel.x = 0;
    this.face(ctx.player);
    if (this.cooldown > 0) return;
    this.drawing += dt;
    if (this.drawing < DRAW_TIME) return;
    this.drawing = 0;
    this.cooldown = this.difficulty.skeletonCooldown;
    const from = new THREE.Vector2(this.pos.x + this.dir * 0.4, this.pos.y + 1.4);
    // Auf Kniehöhe zielen, damit man den Pfeil überspringen kann
    const target = new THREE.Vector2(ctx.player.x, ctx.player.y + 0.5);
    const time = Math.max(0.2, from.distanceTo(target) / this.difficulty.arrowSpeed);
    const vel = new THREE.Vector2((target.x - from.x) / time, (target.y - from.y) / time + 0.5 * ARROW_GRAVITY * time);
    ctx.shoot(new Projectile('arrow', from, vel, ARROW_GRAVITY));
    ctx.sound('bow');
  }

  protected animate() {
    const aiming = this.vel.x === 0;
    // Beim Zielen beide Arme nach vorn, beim Spannen ein bisschen zurück
    const pull = this.drawing / DRAW_TIME;
    this.body.arms[0].rotation.x = aiming ? -Math.PI / 2 : 0;
    this.body.arms[1].rotation.x = aiming ? -Math.PI / 2 + pull * 0.4 : 0;
    walkLegs(this.body.legs, this.timer * 6, aiming ? 0 : 0.5);
  }
}
