import { DIFFICULTIES } from '../game/difficulty';
import { Player } from '../game/player';
import { World } from '../game/world';
import { BotBrain } from '../tools/bot';
import { checkRules } from '../tools/checker';
import { chunksToLevel } from './run';
import { CHUNK, flatChunk, generateChunk, type Chunk } from './generator';

const STEP = 1 / 60;
/** So lange darf der Bot für ein Stück brauchen. */
const TIMEOUT = 30;
/** So oft wird ein Stück neu gewürfelt, bevor ein flaches Ersatzstück kommt. */
const MAX_ATTEMPTS = 20;

/**
 * Sprungtest für ein neues Stück, zusammen mit dem vorigen (wegen des Übergangs):
 * erst die Level-Regeln, dann läuft der Bot ohne Gegner auf Leicht hindurch.
 */
export function chunkIsJumpable(previous: Chunk | null, chunk: Chunk): boolean {
  const parts = previous ? [previous, chunk] : [chunk];
  const level = chunksToLevel(parts, [], chunk.biome);
  if (checkRules(level).length > 0) return false;

  const world = new World(level, DIFFICULTIES.leicht, { render: false });
  const player = new Player(world);
  const brain = new BotBrain(level);
  // Im flachen Auslauf des vorigen Stücks starten, beim ersten Stück am Checkpoint
  const start = previous ? { x: CHUNK - 4, y: previous.exitHeight } : chunk.checkpoint;
  player.spawn(start);
  for (let t = 0; t < TIMEOUT / STEP; t++) {
    player.update(STEP, brain.step(player, [], []));
    const { x, y } = player.pos;
    if (y < -4 || world.touchesLava(x - 0.3, y, x + 0.3, y + 1.8)) return false;
    if (x > level.width - 2) return true;
  }
  return false;
}

/** Erzeugt das Stück `index` und würfelt so lange neu, bis es den Sprungtest besteht. */
export function buildChunk(seed: number, index: number, previous: Chunk | null): { chunk: Chunk; attempts: number } {
  const entry = previous ? previous.exitHeight : 4;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const chunk = generateChunk(seed, index, entry, attempt);
    if (chunkIsJumpable(previous, chunk)) return { chunk, attempts: attempt + 1 };
  }
  return { chunk: flatChunk(seed, index, entry), attempts: MAX_ATTEMPTS + 1 };
}
