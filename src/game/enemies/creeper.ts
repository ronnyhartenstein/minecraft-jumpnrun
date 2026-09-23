import * as THREE from 'three';
import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy, type EnemyContext } from './base';
import { box, dots, limb, P, skin, walkLegs } from './models';

const SPEED = 1.3;
/** So nah muss Steve kommen, damit der Creeper zündet. Einmal gezündet, gibt es kein Zurück. */
const FUSE_TRIGGER = 2;
/** Wer näher als das an der Explosion steht, fängt neu an. */
export const BLAST_RADIUS = 2.8;

const GREEN = ['#4c9a3c', '#5fb04a', '#3f8a32', '#6cc05a', '#88d077'];
const DARK = '#1b2a16';

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

/** Creeper: läuft herum, zündet in Steves Nähe, blinkt weiß und explodiert. Man kann nicht durch ihn hindurch. */
export class Creeper extends Enemy {
  override readonly solid = true;
  private readonly legs: THREE.Object3D[] = [];
  private readonly flashMaterials: THREE.MeshLambertMaterial[] = [];
  private blast: THREE.Group | null = null;
  private blastTime = 0;

  constructor(start: Point, world: World, difficulty: Difficulty) {
    super('creeper', 0.3, 1.6, start, world, difficulty);
    const body = skin(GREEN);
    const face = skin(GREEN, (ctx) => dots(ctx, [
      [1, 2, DARK], [2, 2, DARK], [1, 3, DARK], [2, 3, DARK], [5, 2, DARK], [6, 2, DARK], [5, 3, DARK], [6, 3, DARK],
      [3, 4, DARK], [4, 4, DARK], [2, 5, DARK], [3, 5, DARK], [4, 5, DARK], [5, 5, DARK], [2, 6, DARK], [5, 6, DARK],
    ]));
    this.flashMaterials.push(body, face);
    const torso = box(8, 12, 4, body);
    torso.position.y = 12 * P;
    const head = box(8, 8, 8, [body, body, body, body, face, body]);
    head.position.y = 22 * P;
    this.model.add(torso, head);
    for (const [x, z] of [[-2, 4], [2, 4], [-2, -4], [2, -4]]) {
      const leg = limb(box(4, 6, 4, body), [x, 6, z], -3);
      this.legs.push(leg);
      this.model.add(leg);
    }
    this.reset();
  }

  override reset(): void {
    super.reset();
    this.fuse = null;
    this.exploded = false;
    this.setFlash(false);
    this.blast?.removeFromParent();
    this.blast = null;
  }

  override stomp(): void {
    super.stomp();
    this.fuse = null;
    this.setFlash(false);
  }

  override update(dt: number, ctx: EnemyContext): void {
    this.exploded = false;
    if (this.blast) {
      this.updateBlast(dt);
      return;
    }
    super.update(dt, ctx);
  }

  protected think(dt: number, ctx: EnemyContext) {
    const distance = Math.hypot(ctx.player.x - this.pos.x, ctx.player.y - this.pos.y);
    if (this.fuse === null && distance < FUSE_TRIGGER) this.fuse = 0;
    if (this.fuse === null) {
      this.patrol(SPEED);
      return;
    }
    this.vel.x = 0;
    this.fuse += dt;
    // Immer schneller weiß blinken und dabei anschwellen
    this.setFlash(Math.sin(this.fuse * this.fuse * 14) > 0);
    const swell = 1 + (this.fuse / this.difficulty.creeperFuse) * 0.25;
    this.model.scale.set(swell, 1 + (swell - 1) * 0.5, swell);
    if (this.fuse >= this.difficulty.creeperFuse) this.explode();
  }

  protected animate() {
    walkLegs(this.legs, this.timer * 8, this.fuse === null ? 0.5 : 0);
  }

  private explode() {
    this.alive = false;
    this.exploded = true;
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
    if (t < 1) return;
    this.blast!.removeFromParent();
    this.blast!.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    });
    this.blast = null;
    this.object.visible = false;
  }

  private setFlash(on: boolean) {
    for (const m of this.flashMaterials) m.emissive.setScalar(on ? 0.9 : 0);
  }
}
