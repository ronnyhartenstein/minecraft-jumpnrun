import type { DifficultyId } from '../game/difficulty';
import { BIOMES, type BiomeId } from '../levels/biomes';
import type { DecoPoint, EnemySpawn, Point } from '../levels/format';
import type { BlockId } from '../textures/blocks';
import { mulberry32, pick, type Rng } from '../textures/pixel';

/*
 * Erzeugt die Strecke des Endlos-Laufs Stück für Stück aus einem Seed.
 * Gleicher Seed = gleiche Strecke; gleicher Seed + gleiche Schwierigkeit = gleiche Monster.
 * Die Bausteine halten sich an die Regeln aus LEVELS.md, der Sprungtest (verify.ts) prüft jedes Stück.
 */

/** Breite eines Stücks. 6 Stücke = 300 Blöcke, dann wechselt das Biom. */
export const CHUNK = 50;
export const CHUNKS_PER_BIOME = 6;
/** Höhe des Rasters in Blöcken. */
export const HEIGHT = 16;
const MIN_GROUND = 2;
const MAX_GROUND = 9;
/** Am Anfang jedes Stücks ein flaches Stück mit Checkpoint, am Ende ein flaches Stück als Übergang. */
const LEAD_IN = 6;
const LEAD_OUT = 4;
const CHECKPOINT_X = 2;
/** Gegner halten Abstand zum Checkpoint, damit man nach einem Treffer nicht sofort wieder getroffen wird. */
const MONSTER_FROM = 12;

export const ENDLESS_BIOMES: BiomeId[] = ['meadow', 'desert', 'cave', 'snow', 'nether', 'end'];

/** Welche Gegner in welchem Biom vorkommen. */
const MONSTERS: Record<BiomeId, EnemySpawn['kind'][]> = {
  meadow: ['zombie', 'creeper', 'slime', 'spider', 'skeleton', 'witch'],
  desert: ['zombie', 'creeper', 'skeleton', 'spider'],
  cave: ['spider', 'creeper', 'skeleton', 'witch', 'zombie'],
  snow: ['skeleton', 'creeper', 'spider', 'zombie'],
  nether: ['slime', 'blaze'],
  end: ['enderman', 'endermite', 'shulker'],
};

/** So viele Gegner pro Stück. */
const MONSTER_COUNT: Record<DifficultyId, number> = { leicht: 2, mittel: 3, schwer: 4 };

/** Hindernisse aus dem passenden Material. */
const OBSTACLE: Record<BiomeId, BlockId> = {
  meadow: 'cobble', desert: 'sandstone', cave: 'cobble', snow: 'snow', nether: 'netherBricks', end: 'obsidian',
};

/** In diesen Biomen gibt es Lavagruben. */
const LAVA_BIOMES = new Set<BiomeId>(['desert', 'cave', 'nether']);

/** Ein fertiges Stück Strecke, Koordinaten innerhalb des Stücks (x = 0 … CHUNK-1, y = 0 unten). */
export interface Chunk {
  index: number;
  biome: BiomeId;
  /** blocks[y][x] wie im Level-Format. */
  blocks: (BlockId | null)[][];
  /** Oberkante des Bodens je Spalte, 0 = Lücke, -1 = Lava. */
  tops: number[];
  exitHeight: number;
  checkpoint: Point;
  diamonds: Point[];
  deco: DecoPoint[];
  torches: Point[];
  /** Spalten, auf denen Gegner stehen dürfen (flach, nicht direkt hinter Sprüngen). */
  safe: number[];
}

/** Mischt mehrere Zahlen zu einem Startwert für den Zufall. */
export function hash(...parts: number[]): number {
  let h = 2166136261;
  for (const part of parts) {
    h = Math.imul(h ^ (part | 0), 16777619);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

/** Ein neuer 6-stelliger Seed. */
export function randomSeed(): number {
  return 100000 + Math.floor(Math.random() * 900000);
}

/** Das Biom eines Stücks: alle 6 Stücke ein zufälliges anderes, festgelegt durch den Seed. */
export function biomeAt(seed: number, index: number): BiomeId {
  let biome: BiomeId = pick(mulberry32(hash(seed, 0, 77)), ENDLESS_BIOMES);
  const segment = Math.floor(index / CHUNKS_PER_BIOME);
  for (let s = 1; s <= segment; s++) {
    biome = pick(mulberry32(hash(seed, s, 77)), ENDLESS_BIOMES.filter((b) => b !== biome));
  }
  return biome;
}

/** Baut ein Stück. `attempt` > 0 liefert eine andere Variante, falls die vorige den Sprungtest nicht bestanden hat. */
export function generateChunk(seed: number, index: number, entryHeight: number, attempt: number): Chunk {
  const biome = biomeAt(seed, index);
  const rng = mulberry32(hash(seed, index, attempt, 1));
  const tops: number[] = [];
  const obstacles = new Map<number, number>();
  const ice = new Set<number>();
  const soulSand = new Set<number>();
  const safe: number[] = [];
  let h = entryHeight;
  /** So viele Spalten muss es ab jetzt noch ohne Lücke oder Lava weitergehen. */
  let noHazard = 0;
  /** So viele Spalten sind noch Landezone (keine Gegner). */
  let landing = 0;

  const flat = (n: number) => {
    for (let i = 0; i < n && tops.length < CHUNK; i++) {
      tops.push(h);
      if (landing > 0) landing--;
      else safe.push(tops.length - 1);
      if (noHazard > 0) noHazard--;
    }
  };

  flat(LEAD_IN);
  while (tops.length < CHUNK - LEAD_OUT) {
    const room = CHUNK - LEAD_OUT - tops.length;
    const roll = rng();
    if (roll < 0.3 || room < 5) {
      flat(Math.min(room, 3 + Math.floor(rng() * 4)));
    } else if (roll < 0.5 && noHazard === 0) {
      // Lücke oder Lavagrube, 1–3 breit, danach Landezone
      const width = 1 + Math.floor(rng() * 3);
      const lava = LAVA_BIOMES.has(biome) && rng() < 0.5;
      for (let i = 0; i < width; i++) tops.push(lava ? -1 : 0);
      landing = 3;
      flat(3);
    } else if (roll < 0.62 && h < MAX_GROUND) {
      // Stufe hinauf
      h = Math.min(MAX_GROUND, h + 1 + Math.floor(rng() * 2));
      landing = 2;
      flat(3);
    } else if (roll < 0.74 && h > MIN_GROUND) {
      // Stufe hinunter: nach 2 Blöcken Fall braucht es Anlauf bis zur nächsten Gefahr
      const drop = Math.min(h - MIN_GROUND, 1 + Math.floor(rng() * 2));
      h -= drop;
      if (drop >= 2) noHazard = 7;
      landing = 3;
      flat(3);
    } else if (roll < 0.86) {
      // Hindernis 1–2 hoch, danach Platz bis zur nächsten Gefahr
      flat(2);
      const size = 1 + Math.floor(rng() * 2);
      tops.push(h);
      obstacles.set(tops.length - 1, size);
      noHazard = size >= 2 ? 7 : 5;
      landing = 3;
      flat(3);
    } else {
      // Rutschiges Eis oder langsamer Seelensand auf einem flachen Stück
      const start = tops.length;
      flat(Math.min(room, 4 + Math.floor(rng() * 4)));
      for (let x = start; x < tops.length; x++) {
        if (biome === 'snow') ice.add(x);
        if (biome === 'nether') soulSand.add(x);
      }
    }
  }
  flat(CHUNK - tops.length);

  // Blöcke setzen
  const { surface, subsoil } = BIOMES[biome];
  const blocks: (BlockId | null)[][] = Array.from({ length: HEIGHT }, () => Array<BlockId | null>(CHUNK).fill(null));
  tops.forEach((top, x) => {
    if (top === 0) return;
    // Lavagrube: Boden auf Höhe der Nachbarn, oben Lava
    const ground = top === -1 ? neighbourHeight(tops, x) : top;
    for (let y = 0; y < ground; y++) {
      const upper = y === ground - 1;
      blocks[y][x] = top === -1 && y >= ground - 2 ? 'lava' : upper ? (ice.has(x) ? 'ice' : soulSand.has(x) ? 'soulSand' : surface) : subsoil;
    }
    const obstacle = obstacles.get(x);
    if (obstacle) for (let y = ground; y < ground + obstacle; y++) blocks[y][x] = OBSTACLE[biome];
  });

  // Diamanten: über Lücken und Gruben zum Einsammeln im Sprung, sonst auf dem Weg
  const diamonds: Point[] = [];
  for (let x = 1; x < CHUNK - 1; x++) {
    if (tops[x] <= 0 && tops[x - 1] > 0 && rng() < 0.7) diamonds.push({ x: x + 1, y: tops[x - 1] + 2 });
  }
  while (diamonds.length < 5) {
    const x = safe[Math.floor(rng() * safe.length)];
    if (x > CHECKPOINT_X + 1 && !diamonds.some((d) => d.x === x)) diamonds.push({ x, y: tops[x] + 1 + Math.floor(rng() * 2) });
  }

  // Deko im Hintergrund und in der Höhle ein paar Fackeln
  const deco: DecoPoint[] = [];
  const torches: Point[] = [];
  for (let x = 1; x < CHUNK - 1; x += 4 + Math.floor(rng() * 4)) {
    if (tops[x] > 0 && !obstacles.has(x)) deco.push({ x, y: tops[x], kind: BIOMES[biome].deco });
  }
  if (biome === 'cave') for (let x = 4; x < CHUNK; x += 12) if (tops[x] > 0) torches.push({ x, y: tops[x] });

  return {
    index,
    biome,
    blocks,
    tops,
    exitHeight: h,
    checkpoint: { x: CHECKPOINT_X, y: entryHeight },
    diamonds,
    deco,
    torches,
    safe: safe.filter((x) => x >= MONSTER_FROM && x < CHUNK - 2 && !obstacles.has(x) && !obstacles.has(x - 1) && !obstacles.has(x + 1)),
  };
}

/** Ein sicheres, ganz flaches Stück, falls kein generiertes den Sprungtest besteht. */
export function flatChunk(seed: number, index: number, entryHeight: number): Chunk {
  const chunk = generateChunk(seed, index, entryHeight, 0);
  const { surface, subsoil } = BIOMES[chunk.biome];
  chunk.tops = Array(CHUNK).fill(entryHeight);
  chunk.blocks = Array.from({ length: HEIGHT }, (_, y) => Array<BlockId | null>(CHUNK).fill(y < entryHeight - 1 ? subsoil : y === entryHeight - 1 ? surface : null));
  chunk.exitHeight = entryHeight;
  chunk.diamonds = chunk.diamonds.map((d) => ({ x: d.x, y: entryHeight + 1 }));
  chunk.deco = chunk.deco.map((d) => ({ ...d, y: entryHeight }));
  chunk.torches = chunk.torches.map((t) => ({ ...t, y: entryHeight }));
  chunk.safe = Array.from({ length: CHUNK - 2 - MONSTER_FROM }, (_, i) => i + MONSTER_FROM);
  return chunk;
}

/** Verteilt die Gegner eines Stücks. Eigener Zufall aus Seed, Stück und Schwierigkeit. */
export function placeMonsters(seed: number, chunk: Chunk, difficulty: DifficultyId): EnemySpawn[] {
  const level = ['leicht', 'mittel', 'schwer'].indexOf(difficulty);
  const rng: Rng = mulberry32(hash(seed, chunk.index, 1000 + level));
  const kinds = MONSTERS[chunk.biome];
  const spots = [...chunk.safe];
  const monsters: EnemySpawn[] = [];
  for (let n = 0; n < MONSTER_COUNT[difficulty] && spots.length > 0; n++) {
    const x = spots[Math.floor(rng() * spots.length)];
    // Abstand zwischen den Gegnern
    for (let i = spots.length - 1; i >= 0; i--) if (Math.abs(spots[i] - x) < 5) spots.splice(i, 1);
    monsters.push({
      kind: pick(rng, kinds),
      from: 'leicht',
      x,
      y: chunk.tops[x],
      id: `${chunk.index}:${n}`,
      seed: hash(seed, chunk.index, 5000 + n, level),
    });
  }
  return monsters;
}

function neighbourHeight(tops: number[], x: number): number {
  for (let d = 1; d < tops.length; d++) {
    for (const k of [x - d, x + d]) if (tops[k] > 0) return tops[k];
  }
  return MIN_GROUND;
}
