import type { DifficultyId } from '../game/difficulty';
import { BIOMES, type BiomeId } from '../levels/biomes';
import type { EnemySpawn, Level } from '../levels/format';
import type { BlockId } from '../textures/blocks';
import { CHUNK, HEIGHT, placeMonsters, type Chunk } from './generator';
import { buildChunk } from './verify';

/** Oberfläche und Untergrund aller Biome zählen im Endlos-Lauf als Boden (für die Tiefe nach hinten). */
const GROUND_BLOCKS: BlockId[] = [...new Set(Object.values(BIOMES).flatMap((b) => [b.surface, b.subsoil]))];

/** Setzt mehrere Stücke nebeneinander zu einem Level zusammen. */
export function chunksToLevel(chunks: Chunk[], enemies: EnemySpawn[], biome: BiomeId): Level {
  const width = chunks.length * CHUNK;
  const blocks = Array.from({ length: HEIGHT }, (_, y) => chunks.flatMap((c) => c.blocks[y]));
  const shift = <T extends { x: number }>(list: T[], i: number) => list.map((p) => ({ ...p, x: p.x + i * CHUNK }));
  const checkpoints = chunks.map((c, i) => ({ x: c.checkpoint.x + i * CHUNK, y: c.checkpoint.y }));
  return {
    name: 'Endlos-Lauf',
    code: '∞',
    world: null,
    custom: false,
    warnings: [],
    // Kein Lavameer und keine Felsdecke: Das passt nicht zu Stücken aus verschiedenen Biomen
    biome: { ...BIOMES[biome], lavaSea: null, enclosed: false },
    width,
    height: HEIGHT,
    blocks,
    start: checkpoints[0],
    goal: null,
    checkpoints,
    diamonds: chunks.flatMap((c, i) => shift(c.diamonds, i)),
    enemies,
    deco: chunks.flatMap((c, i) => shift(c.deco, i)),
    torches: chunks.flatMap((c, i) => shift(c.torches, i)),
    groundBlocks: GROUND_BLOCKS,
    alwaysCheckpoints: true,
  };
}

/** Wie viele Stücke gleichzeitig geladen sind: das vorige, das aktuelle und das nächste. */
export const WINDOW = 3;

/**
 * Ein Endlos-Lauf: erzeugt die Stücke der Reihe nach und hält immer ein Fenster aus 3 Stücken bereit.
 * Die Koordinaten im Fenster beginnen bei 0; `offset` ist, wie viele Stücke schon herausgefallen sind.
 */
export class EndlessRun {
  readonly chunks: Chunk[] = [];
  /** Stücke, die schon links aus dem Fenster gefallen sind. */
  offset = 0;
  /** Besiegte Gegner und eingesammelte Diamanten, damit sie beim Nachladen nicht wiederkommen. */
  readonly defeated = new Set<string>();
  readonly collected = new Set<string>();
  /** Wie oft beim Erzeugen neu gewürfelt werden musste (für den Selbsttest). */
  attempts = 0;

  constructor(readonly seed: number, readonly difficulty: DifficultyId) {
    while (this.chunks.length < WINDOW) this.addChunk();
  }

  /** Das vorderste Stück fällt heraus, hinten kommt ein neues dazu. */
  advance(): void {
    this.chunks.shift();
    this.offset++;
    this.addChunk();
  }

  private addChunk() {
    const previous = this.chunks.at(-1) ?? null;
    const index = previous ? previous.index + 1 : 0;
    const { chunk, attempts } = buildChunk(this.seed, index, previous);
    this.attempts += attempts;
    this.chunks.push(chunk);
  }

  /** Das Stück im Fenster, in dem die Stelle x liegt. */
  chunkAt(x: number): Chunk {
    return this.chunks[Math.max(0, Math.min(this.chunks.length - 1, Math.floor(x / CHUNK)))];
  }

  /** Das aktuelle Fenster als Level, ohne schon besiegte Gegner und eingesammelte Diamanten. */
  level(biome: BiomeId): Level {
    const enemies = this.chunks.flatMap((c, i) =>
      placeMonsters(this.seed, c, this.difficulty)
        .filter((e) => !this.defeated.has(e.id!))
        .map((e) => ({ ...e, x: e.x + i * CHUNK })),
    );
    const level = chunksToLevel(this.chunks, enemies, biome);
    level.diamonds = level.diamonds.filter((d) => !this.collected.has(this.key(d.x, d.y)));
    return level;
  }

  /** Eindeutige Kennung einer Stelle über alle Stücke hinweg (x im Fenster). */
  key(x: number, y: number): string {
    return `${x + this.offset * CHUNK},${y}`;
  }

  /** Blöcke seit dem Start, x im Fenster. */
  distance(x: number): number {
    return x + this.offset * CHUNK;
  }
}
