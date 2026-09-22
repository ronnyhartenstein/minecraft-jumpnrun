import type { BlockId } from '../textures/blocks';
import { BIOMES, type Biome, type BiomeId } from './biomes';

/**
 * Level-Format: ein Text-Raster, eine Zeile = eine Blockreihe, oben ist oben.
 *
 *   .  Luft
 *   G  Boden oben   (je nach Biom: Gras, Sand, Schneegras, Stein, Netherrack)
 *   D  Boden unten  (je nach Biom: Erde, Sandstein, Stein, Netherrack)
 *   #  Stein        C  Bruchstein   H  Holzstamm    L  Laub        P  Holzbretter
 *   A  Sand         Y  Sandstein    K  Kaktus
 *   M  Schnee       E  Eis (rutschig!)
 *   1  Kohle-Erz    2  Eisen-Erz    3  Gold-Erz     4  Diamant-Erz
 *   R  Netherrack   N  Nether-Ziegel  O  Glowstone  W  Seelensand (langsam!)
 *   S  Start von Steve
 *   Z  Ziel-Fahne
 *   t  Deko im Hintergrund (je nach Biom: Baum, Kaktus, Fichte, Stalagmit, …)
 *
 * Zeilen dürfen unterschiedlich lang sein, fehlende Stellen sind Luft.
 */
export const BLOCK_CHARS: Record<string, BlockId> = {
  '#': 'stone',
  C: 'cobble',
  H: 'log',
  L: 'leaves',
  P: 'planks',
  A: 'sand',
  Y: 'sandstone',
  K: 'cactus',
  M: 'snow',
  E: 'ice',
  '1': 'coalOre',
  '2': 'ironOre',
  '3': 'goldOre',
  '4': 'diamondOre',
  R: 'netherrack',
  N: 'netherBricks',
  O: 'glowstone',
  W: 'soulSand',
};

export interface Point {
  x: number;
  y: number;
}

export interface Level {
  name: string;
  biome: Biome;
  width: number;
  height: number;
  /** blocks[y][x], y = 0 ist die unterste Reihe. */
  blocks: (BlockId | null)[][];
  start: Point;
  goal: Point | null;
  deco: Point[];
}

export function parseLevel(name: string, biomeId: BiomeId, text: string): Level {
  const biome = BIOMES[biomeId];
  const raw = text.split('\n').map((line) => line.trimEnd());
  // Leere Zeilen am Anfang und Ende ignorieren
  const lines = raw.slice(raw.findIndex((l) => l !== ''), raw.findLastIndex((l) => l !== '') + 1);

  const height = lines.length;
  const width = Math.max(...lines.map((l) => l.length));
  const blocks: (BlockId | null)[][] = Array.from({ length: height }, () => Array(width).fill(null));
  let start: Point | null = null;
  let goal: Point | null = null;
  const deco: Point[] = [];
  const chars: Record<string, BlockId> = { ...BLOCK_CHARS, G: biome.surface, D: biome.subsoil };

  lines.forEach((line, row) => {
    const y = height - 1 - row;
    [...line].forEach((ch, x) => {
      if (ch in chars) blocks[y][x] = chars[ch];
      else if (ch === 'S') start = { x, y };
      else if (ch === 'Z') goal = { x, y };
      else if (ch === 't') deco.push({ x, y });
      else if (ch !== '.' && ch !== ' ') console.warn(`Level "${name}": unbekanntes Zeichen "${ch}" bei ${x},${y}`);
    });
  });

  return { name, biome, width, height, blocks, start: start ?? { x: 1, y: height - 1 }, goal, deco };
}
