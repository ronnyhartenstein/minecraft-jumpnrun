import * as THREE from 'three';
import type { Level } from '../levels/format';
import { Checkpoint } from './checkpoint';
import { Clouds } from './clouds';
import { Diamond } from './diamond';
import { atLeast, type Difficulty } from './difficulty';
import { createEnemy, type Enemy, type EnemyContext, type Projectile } from './enemies';
import { GoalFlag } from './goal';
import { lavaSparks, netherAsh, Particles, snowfall } from './particles';
import { World } from './world';

/** Alles, was zu einem geladenen Level gehört. Wird beim Levelwechsel komplett freigegeben. */
export class LevelScene {
  readonly object = new THREE.Group();
  readonly world: World;
  readonly goal: GoalFlag | null;
  readonly checkpoints: Checkpoint[];
  readonly diamonds: Diamond[];
  readonly enemies: Enemy[];
  /** Pfeile, Gift und Feuerbälle, die gerade unterwegs sind. */
  readonly projectiles: Projectile[] = [];
  private readonly clouds: Clouds | null;
  private readonly particles: Particles[] = [];

  /** `focus` ist die Stelle, auf die die Kamera schaut. Dort entstehen Schnee, Asche und Funken. */
  constructor(readonly level: Level, focus: THREE.Vector3, readonly difficulty: Difficulty) {
    this.world = new World(level, difficulty);
    this.object.add(this.world.object);

    this.clouds = level.biome.clouds ? new Clouds(level.width, level.height) : null;
    if (this.clouds) this.object.add(this.clouds.object);

    this.goal = level.goal ? new GoalFlag(level.goal) : null;
    if (this.goal) this.object.add(this.goal.object);

    // Auf Schwer gibt es keine Checkpoints
    this.checkpoints = difficulty.checkpoints ? level.checkpoints.map((at) => new Checkpoint(at)) : [];
    for (const cp of this.checkpoints) this.object.add(cp.object);

    this.diamonds = level.diamonds.map((at) => new Diamond(at));
    for (const d of this.diamonds) this.object.add(d.object);

    this.enemies = level.enemies
      .filter((e) => atLeast(difficulty.id, e.from))
      .map((e) => createEnemy(e, this.world, difficulty));
    for (const e of this.enemies) this.object.add(e.object);

    if (this.world.lavaSurfaces.size > 0) this.particles.push(lavaSparks(this.world.lavaSurfaces, focus));
    if (level.biome.particles === 'snow') this.particles.push(snowfall(focus));
    if (level.biome.particles === 'ash') this.particles.push(netherAsh(focus));
    for (const p of this.particles) this.object.add(p.object);
  }

  /** `ctx.player` ist Steves Position, damit Gegner ihn sehen und auf ihn zielen können. */
  update(dt: number, ctx: Omit<EnemyContext, 'shoot'>): void {
    this.clouds?.update(dt);
    this.goal?.update(dt);
    for (const cp of this.checkpoints) cp.update(dt);
    for (const d of this.diamonds) d.update(dt);
    const shoot = (p: Projectile) => {
      this.projectiles.push(p);
      this.object.add(p.object);
    };
    for (const e of this.enemies) e.update(dt, { ...ctx, shoot });
    for (const p of this.projectiles) p.update(dt, this.world);
    for (const p of this.projectiles.filter((q) => !q.alive)) p.dispose();
    this.projectiles.splice(0, this.projectiles.length, ...this.projectiles.filter((q) => q.alive));
    for (const p of this.particles) p.update(dt);
  }

  /** Alle Geschosse entfernen, z. B. beim Neustart. */
  clearProjectiles(): void {
    for (const p of this.projectiles) p.dispose();
    this.projectiles.length = 0;
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.traverse((node) => {
      if (node instanceof THREE.InstancedMesh) node.dispose();
      if (!(node instanceof THREE.Mesh || node instanceof THREE.Points)) return;
      if (!node.geometry.userData.shared) node.geometry.dispose();
      for (const material of [node.material].flat() as THREE.Material[]) {
        if (material.userData.shared) continue;
        (material as THREE.MeshBasicMaterial).map?.dispose();
        material.dispose();
      }
    });
  }
}
