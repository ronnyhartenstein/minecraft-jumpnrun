import * as THREE from 'three';
import type { Point } from '../levels/format';
import { noiseRect, pixelTexture, px } from '../textures/pixel';
import type { World } from './world';

export type EnemyKind = 'creeper' | 'slime' | 'magma';

const GRAVITY = 30;
const CREEPER_SPEED = 1.3;
const HOP_SPEED_X = 2.4;
const HOP_SPEED_Y = 7.5;
const HOP_PAUSE = 0.9;
/** Creeper: So nah muss Steve kommen, damit er zündet … */
const FUSE_TRIGGER = 2;
/** … und so lange dauert es dann bis zur Explosion (wie im Original 1,5 s). Einmal gezündet, gibt es kein Zurück. */
const FUSE_TIME = 1.5;
/** Wer näher als das an der Explosion steht, fängt neu an. */
export const BLAST_RADIUS = 2.8;
const EPS = 1e-4;

const SIZE: Record<EnemyKind, { halfWidth: number; height: number }> = {
  creeper: { halfWidth: 0.3, height: 1.6 },
  slime: { halfWidth: 0.45, height: 0.9 },
  magma: { halfWidth: 0.45, height: 0.9 },
};

const CREEPER_GREEN = ['#4c9a3c', '#5fb04a', '#3f8a32', '#6cc05a', '#88d077'];

/** Eigenes Creeper-Gesicht: dunkle Augen und der typische Mund. */
function creeperFace() {
  return pixelTexture(8, 8, 11, (ctx, rng) => {
    noiseRect(ctx, rng, 0, 0, 8, 8, CREEPER_GREEN);
    const dark = '#1b2a16';
    for (const [x, y] of [[1, 2], [2, 2], [1, 3], [2, 3], [5, 2], [6, 2], [5, 3], [6, 3], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5], [5, 5], [2, 6], [5, 6]]) px(ctx, x, y, dark);
  });
}

function slimeFace(magma: boolean) {
  const skin = magma ? ['#6b1d0e', '#8a2a12', '#4a140a', '#b0461a'] : ['#79c05a', '#6ab04c', '#86cc66'];
  return pixelTexture(8, 8, magma ? 13 : 12, (ctx, rng) => {
    noiseRect(ctx, rng, 0, 0, 8, 8, skin);
    const eye = magma ? '#ffb030' : '#1f3a18';
    for (const [x, y] of [[1, 2], [2, 2], [5, 2], [6, 2], [1, 3], [6, 3], [3, 5], [4, 5]]) px(ctx, x, y, eye);
  });
}

function slimeSkin(magma: boolean) {
  const skin = magma ? ['#6b1d0e', '#8a2a12', '#4a140a', '#b0461a', '#f07a20'] : ['#79c05a', '#6ab04c', '#86cc66'];
  return pixelTexture(8, 8, magma ? 15 : 14, (ctx, rng) => noiseRect(ctx, rng, 0, 0, 8, 8, skin));
}

/** Explosion: ein heller Blitz in der Mitte und graue Rauchwürfel, die nach außen fliegen. */
function explosionEffect(): THREE.Group {
  const group = new THREE.Group();
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff6d0', transparent: true }));
  flash.userData.dir = new THREE.Vector3();
  group.add(flash);
  for (let i = 0; i < 24; i++) {
    const gray = 0.55 + Math.random() * 0.4;
    const puff = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(gray, gray, gray), transparent: true }),
    );
    puff.userData.dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
    group.add(puff);
  }
  return group;
}

const lambert = (map: THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ map, ...extra });

/** Gegner laufen oder hüpfen hin und her und drehen an Wänden, Kanten und Lava um. */
export class Enemy {
  readonly object = new THREE.Group();
  readonly pos = new THREE.Vector2();
  readonly vel = new THREE.Vector2();
  readonly halfWidth: number;
  readonly height: number;
  alive = true;
  /** Wird für genau einen Schritt true, wenn der Creeper explodiert. */
  exploded = false;
  /** Creeper: Sekunden seit dem Zünden, `null` = nicht gezündet. */
  fuse: number | null = null;
  private dir: 1 | -1 = -1;
  private onGround = false;
  private timer = 0;
  private dying = 0;
  private readonly model = new THREE.Group();
  private readonly legs: THREE.Object3D[] = [];
  private readonly flashMaterials: THREE.MeshLambertMaterial[] = [];
  private blast: THREE.Group | null = null;
  private blastTime = 0;

  constructor(readonly kind: EnemyKind, private readonly start: Point, private readonly world: World) {
    ({ halfWidth: this.halfWidth, height: this.height } = SIZE[kind]);
    if (kind === 'creeper') this.buildCreeper();
    else this.buildSlime(kind === 'magma');
    this.object.add(this.model);
    this.reset();
  }

  reset(): void {
    this.pos.set(this.start.x + 0.5, this.start.y);
    this.vel.set(0, 0);
    this.dir = -1;
    this.alive = true;
    this.dying = 0;
    this.fuse = null;
    this.exploded = false;
    this.setFlash(false);
    this.blast?.removeFromParent();
    this.blast = null;
    this.timer = Math.random() * HOP_PAUSE;
    this.object.visible = true;
    this.model.visible = true;
    this.model.scale.set(1, 1, 1);
  }

  /** Von oben draufgesprungen: plattdrücken und verschwinden. */
  stomp(): void {
    this.alive = false;
    this.dying = 0.3;
    this.fuse = null;
    this.setFlash(false);
  }

  /** `target` ist Steves Position, damit der Creeper zünden kann. */
  update(dt: number, target: THREE.Vector2): void {
    this.exploded = false;
    if (this.blast) this.updateBlast(dt);
    if (!this.alive) {
      if (this.blast) return;
      this.dying -= dt;
      this.model.scale.set(1 + (0.3 - this.dying), Math.max(0.1, this.dying / 0.3), 1 + (0.3 - this.dying));
      this.object.visible = this.dying > 0;
      return;
    }
    this.timer += dt;
    if (this.kind === 'creeper') {
      this.updateFuse(dt, target);
      if (!this.alive) return;
      if (this.fuse === null) this.walk();
      else this.vel.x = 0;
    } else {
      this.hop();
    }

    this.vel.y = Math.max(this.vel.y - GRAVITY * dt, -20);
    this.moveX(this.vel.x * dt);
    this.onGround = false;
    this.moveY(this.vel.y * dt);
    if (this.onGround && this.kind !== 'creeper') this.vel.x = 0;
    this.animate(dt);
  }

  private updateFuse(dt: number, target: THREE.Vector2) {
    const distance = Math.hypot(target.x - this.pos.x, target.y - this.pos.y);
    if (this.fuse === null) {
      if (distance < FUSE_TRIGGER) this.fuse = 0;
      return;
    }
    this.fuse += dt;
    // Immer schneller weiß blinken und dabei anschwellen
    this.setFlash(Math.sin(this.fuse * this.fuse * 14) > 0);
    const swell = 1 + (this.fuse / FUSE_TIME) * 0.25;
    this.model.scale.set(swell, 1 + (swell - 1) * 0.5, swell);
    if (this.fuse >= FUSE_TIME) this.explode();
  }

  private explode() {
    this.alive = false;
    this.exploded = true;
    this.dying = 0;
    this.object.visible = true;
    this.model.visible = false;
    this.blast = explosionEffect();
    this.blast.position.set(0, 0.8, 0);
    this.object.add(this.blast);
    this.blastTime = 0;
  }

  private updateBlast(dt: number) {
    this.blastTime += dt;
    const t = this.blastTime / 0.8;
    this.blast!.children.forEach((puff, i) => {
      const dir = puff.userData.dir as THREE.Vector3;
      // Der Blitz ist schnell groß und schnell weg, der Rauch fliegt weit und wird langsam kleiner
      const out = 1 - (1 - t) ** 3;
      puff.position.copy(dir).multiplyScalar(i === 0 ? 0 : 0.6 + out * 3.2);
      puff.scale.setScalar(i === 0 ? 1 + out * 5 : Math.max(0.01, 1.4 - t));
      const material = (puff as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = i === 0 ? Math.max(0, 1 - t * 2.5) : Math.max(0, 1 - t);
    });
    if (t >= 1) {
      this.blast!.removeFromParent();
      this.blast!.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        (node.material as THREE.Material).dispose();
      });
      this.blast = null;
      this.object.visible = false;
      this.model.visible = true;
    }
  }

  private setFlash(on: boolean) {
    for (const m of this.flashMaterials) m.emissive.setScalar(on ? 0.9 : 0);
  }

  private walk() {
    if (this.onGround && this.blockedAhead(this.pos.x + this.dir * (this.halfWidth + 0.05))) this.dir = -this.dir as 1 | -1;
    this.vel.x = this.dir * CREEPER_SPEED;
  }

  private hop() {
    if (!this.onGround || this.timer < HOP_PAUSE) return;
    // Nur dorthin hüpfen, wo sicherer Boden ist; geht es in keine Richtung, hüpft er auf der Stelle
    const unsafe = () => this.blockedAhead(this.pos.x + this.dir * 1.2) || this.blockedAhead(this.pos.x + this.dir * (this.halfWidth + 0.05));
    if (unsafe()) this.dir = -this.dir as 1 | -1;
    this.vel.set(unsafe() ? 0 : this.dir * HOP_SPEED_X, HOP_SPEED_Y);
    this.timer = 0;
  }

  /** Wand vorne oder kein fester Boden darunter (Kante, Lava)? */
  private blockedAhead(x: number): boolean {
    const col = Math.floor(x);
    const row = Math.round(this.pos.y);
    return this.world.isSolid(col, row) || this.world.isSolid(col, row + 1) || !this.world.isSolid(col, row - 1);
  }

  private moveX(dx: number) {
    if (dx === 0) return;
    this.pos.x += dx;
    const edge = Math.floor(dx > 0 ? this.pos.x + this.halfWidth : this.pos.x - this.halfWidth);
    for (let y = Math.floor(this.pos.y + EPS); y <= Math.floor(this.pos.y + this.height - EPS); y++) {
      if (this.world.isSolid(edge, y)) {
        this.pos.x = dx > 0 ? edge - this.halfWidth - EPS : edge + 1 + this.halfWidth + EPS;
        this.vel.x = 0;
        this.dir = -this.dir as 1 | -1;
        return;
      }
    }
  }

  private moveY(dy: number) {
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

  private animate(dt: number) {
    this.object.position.set(this.pos.x, this.pos.y, 0);
    const facing = this.dir * (Math.PI / 2 - 0.45);
    this.object.rotation.y += (facing - this.object.rotation.y) * (1 - Math.exp(-10 * dt));
    if (this.kind === 'creeper') {
      const swing = Math.sin(this.timer * 8) * 0.5;
      this.legs.forEach((leg, i) => (leg.rotation.x = i % 2 ? swing : -swing));
    } else {
      // Beim Hüpfen strecken, beim Warten leicht wabbeln
      const stretch = this.onGround ? 1 - Math.sin(this.timer * 10) * 0.04 : 1 + Math.min(Math.abs(this.vel.y) * 0.03, 0.2);
      this.model.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
    }
  }

  private buildCreeper() {
    const P = 1 / 16;
    const skin = pixelTexture(8, 8, 10, (ctx, rng) => noiseRect(ctx, rng, 0, 0, 8, 8, CREEPER_GREEN));
    const body = lambert(skin);
    const face = lambert(creeperFace());
    this.flashMaterials.push(body, face);
    const box = (w: number, h: number, d: number, mat: THREE.Material | THREE.Material[]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), mat);
      mesh.castShadow = true;
      return mesh;
    };
    const torso = box(8, 12, 4, body);
    torso.position.y = 12 * P;
    const head = box(8, 8, 8, [body, body, body, body, face, body]);
    head.position.y = 22 * P;
    this.model.add(torso, head);
    for (const [x, z] of [[-2, 4], [2, 4], [-2, -4], [2, -4]]) {
      const joint = new THREE.Group();
      joint.position.set(x * P, 6 * P, z * P);
      const leg = box(4, 6, 4, body);
      leg.position.y = -3 * P;
      joint.add(leg);
      this.legs.push(joint);
      this.model.add(joint);
    }
  }

  private buildSlime(magma: boolean) {
    const size = 0.9;
    const skin = slimeSkin(magma);
    const outer = lambert(skin, magma ? {} : { transparent: true, opacity: 0.75 });
    const face = lambert(slimeFace(magma), magma ? {} : { transparent: true, opacity: 0.85 });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), [outer, outer, outer, outer, face, outer]);
    cube.position.y = size / 2;
    cube.castShadow = true;
    this.model.add(cube);
    if (!magma) {
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: '#4f8f3a' }));
      core.position.y = size / 2;
      this.model.add(core);
    }
  }
}
