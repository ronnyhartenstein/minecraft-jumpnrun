import * as THREE from 'three';
import type { World } from '../world';

export type ProjectileKind = 'arrow' | 'poison' | 'fireball';

const LIFETIME = 5;

const MODELS: Record<ProjectileKind, () => THREE.Object3D> = {
  arrow: () => {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), new THREE.MeshLambertMaterial({ color: '#8a6a3e' }));
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshLambertMaterial({ color: '#cfcfcf' }));
    tip.position.x = 0.32;
    group.add(shaft, tip);
    return group;
  },
  poison: () => {
    const group = new THREE.Group();
    const bottle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), new THREE.MeshBasicMaterial({ color: '#5bd13a' }));
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), new THREE.MeshLambertMaterial({ color: '#d8e8f0' }));
    neck.position.y = 0.18;
    group.add(bottle, neck);
    return group;
  },
  fireball: () => new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshBasicMaterial({ color: '#ff8a1a' })),
};

/** Wie das Geschoss beim Aufprall aussieht: kleine Würfel, die auseinanderfliegen. */
const SPLASH: Record<ProjectileKind, string> = { arrow: '#b0b0b0', poison: '#5bd13a', fireball: '#ffb030' };

/** Ein Geschoss: Pfeil (leichter Bogen), Giftflasche (hoher Bogen) oder Feuerball (geradeaus). */
export class Projectile {
  readonly object: THREE.Object3D;
  alive = true;
  private age = 0;
  private splash: THREE.Group | null = null;

  constructor(
    readonly kind: ProjectileKind,
    readonly pos: THREE.Vector2,
    readonly vel: THREE.Vector2,
    private readonly gravity: number,
  ) {
    this.object = MODELS[kind]();
    this.object.position.set(pos.x, pos.y, 0);
  }

  /** Ist das Geschoss noch unterwegs (und kann treffen)? */
  get flying(): boolean {
    return this.alive && this.splash === null;
  }

  /** Trifft das Geschoss Steves Hitbox? */
  hits(minX: number, minY: number, maxX: number, maxY: number): boolean {
    const r = 0.15;
    return this.flying && this.pos.x + r > minX && this.pos.x - r < maxX && this.pos.y + r > minY && this.pos.y - r < maxY;
  }

  update(dt: number, world: World): void {
    this.age += dt;
    if (this.splash) {
      this.splash.children.forEach((bit) => {
        bit.position.addScaledVector(bit.userData.v as THREE.Vector3, dt);
        bit.scale.multiplyScalar(0.9);
      });
      if (this.age > 0.4) this.alive = false;
      return;
    }
    this.vel.y -= this.gravity * dt;
    this.pos.addScaledVector(this.vel, dt);
    this.object.position.set(this.pos.x, this.pos.y, 0);
    this.object.rotation.z = Math.atan2(this.vel.y, this.vel.x);
    if (this.kind === 'fireball') this.object.rotation.x += dt * 8;
    if (world.isSolid(Math.floor(this.pos.x), Math.floor(this.pos.y))) this.burst();
    if (this.age > LIFETIME) this.alive = false;
  }

  /** Zerplatzen: an einem Block oder an Steve. */
  burst(): void {
    if (this.splash) return;
    this.age = 0;
    this.splash = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: SPLASH[this.kind] });
    for (let i = 0; i < 8; i++) {
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), material);
      bit.userData.v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(4);
      this.splash.add(bit);
    }
    this.object.clear();
    this.object.rotation.set(0, 0, 0);
    this.object.add(this.splash);
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    });
  }
}

/** Wurf im Bogen: Startgeschwindigkeit, damit das Geschoss nach `time` Sekunden bei `target` ankommt. */
export function aimArc(from: THREE.Vector2, target: THREE.Vector2, time: number, gravity: number): THREE.Vector2 {
  return new THREE.Vector2((target.x - from.x) / time, (target.y - from.y) / time + 0.5 * gravity * time);
}
