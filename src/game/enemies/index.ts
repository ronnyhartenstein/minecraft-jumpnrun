import type { EnemySpawn } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import type { Enemy } from './base';
import { Blaze } from './blaze';
import { Creeper } from './creeper';
import { Skeleton } from './skeleton';
import { Slime } from './slime';
import { Spider } from './spider';
import { Witch } from './witch';
import { Zombie } from './zombie';

export { BLAST_RADIUS } from './creeper';
export type { Enemy, EnemyContext } from './base';
export { Projectile } from './projectile';

/** Erzeugt den passenden Gegner; manche sehen je nach Biom anders aus (z. B. Wüstenzombie, Höhlenspinne). */
export function createEnemy(spawn: EnemySpawn, world: World, difficulty: Difficulty): Enemy {
  const biome = world.level.biome.id;
  switch (spawn.kind) {
    case 'creeper': return new Creeper(spawn, world, difficulty);
    case 'slime': return new Slime(spawn, world, difficulty, biome === 'nether');
    case 'zombie': return new Zombie(spawn, world, difficulty, biome === 'desert');
    case 'spider': return new Spider(spawn, world, difficulty, biome === 'cave');
    case 'skeleton': return new Skeleton(spawn, world, difficulty, biome === 'snow');
    case 'witch': return new Witch(spawn, world, difficulty);
    case 'blaze': return new Blaze(spawn, world, difficulty);
  }
}
