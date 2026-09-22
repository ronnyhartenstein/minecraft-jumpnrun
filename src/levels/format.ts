import type { BlockId } from '../textures/blocks';

/**
 * Level-Format: ein Text-Raster, eine Zeile = eine Blockreihe, oben ist oben.
 *
 *   .  Luft
 *   G  Gras        D  Erde        #  Stein       C  Bruchstein
 *   H  Holzstamm   L  Laub        P  Holzbretter
 *   S  Start von Steve
 *   Z  Ziel-Fahne
 *   t  Baum im Hintergrund (nur Deko)
 *
 * Zeilen dürfen unterschiedlich lang sein, fehlende Stellen sind Luft.
 */
export const BLOCK_CHARS: Record<string, BlockId> = {
  G: 'grass',
  D: 'dirt',
  '#': 'stone',
  C: 'cobble',
  H: 'log',
  L: 'leaves',
  P: 'planks',
};

export interface Point {
  x: number;
  y: number;
}

export interface Level {
  name: string;
  width: number;
  height: number;
  /** blocks[y][x], y = 0 ist die unterste Reihe. */
  blocks: (BlockId | null)[][];
  start: Point;
  goal: Point | null;
  trees: Point[];
}

export function parseLevel(name: string, text: string): Level {
  const raw = text.split('\n').map((line) => line.trimEnd());
  // Leere Zeilen am Anfang und Ende ignorieren
  const lines = raw.slice(raw.findIndex((l) => l !== ''), raw.findLastIndex((l) => l !== '') + 1);

  const height = lines.length;
  const width = Math.max(...lines.map((l) => l.length));
  const blocks: (BlockId | null)[][] = Array.from({ length: height }, () => Array(width).fill(null));
  let start: Point | null = null;
  let goal: Point | null = null;
  const trees: Point[] = [];

  lines.forEach((line, row) => {
    const y = height - 1 - row;
    [...line].forEach((ch, x) => {
      if (ch in BLOCK_CHARS) blocks[y][x] = BLOCK_CHARS[ch];
      else if (ch === 'S') start = { x, y };
      else if (ch === 'Z') goal = { x, y };
      else if (ch === 't') trees.push({ x, y });
      else if (ch !== '.' && ch !== ' ') console.warn(`Level "${name}": unbekanntes Zeichen "${ch}" bei ${x},${y}`);
    });
  });

  return { name, width, height, blocks, start: start ?? { x: 1, y: height - 1 }, goal, trees };
}
