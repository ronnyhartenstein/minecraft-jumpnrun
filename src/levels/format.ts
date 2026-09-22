import type { BlockId } from '../textures/blocks';
import { BIOMES, type Biome, type BiomeId } from './biomes';

/**
 * Level-Format: ein Text-Raster, eine Zeile = eine Blockreihe, oben ist oben.
 * Die Level liegen als Textdateien im Ordner `levels/`, die Anleitung dazu steht in LEVELS.md.
 *
 *   .  Luft
 *   G  Boden oben   (je nach Biom: Gras, Sand, Schneegras, Stein, Netherrack)
 *   D  Boden unten  (je nach Biom: Erde, Sandstein, Stein, Netherrack)
 *   #  Stein        C  Bruchstein   H  Holzstamm    L  Laub        P  Holzbretter
 *   A  Sand         Y  Sandstein    K  Kaktus
 *   M  Schnee       E  Eis (rutschig!)
 *   1  Kohle-Erz    2  Eisen-Erz    3  Gold-Erz     4  Diamant-Erz
 *   R  Netherrack   N  Nether-Ziegel  O  Glowstone  W  Seelensand (langsam!)
 *   ~  Lava (heiß! Wer sie berührt, fängt neu an)
 *   S  Start von Steve
 *   Z  Ziel-Fahne
 *   X  Checkpoint (nach einem Sturz geht es hier weiter)
 *   *  Diamant zum Einsammeln
 *   c  Creeper (läuft hin und her)
 *   s  Slime (hüpft, im Nether ein Magmawürfel)
 *      Gegner besiegt man, indem man von oben draufspringt.
 *   t  Deko im Hintergrund (je nach Biom: Baum, Kaktus, Fichte, Stalagmit, …)
 *   f  Fackel (leuchtet, nur Deko)
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
  '~': 'lava',
};

export interface Point {
  x: number;
  y: number;
}

export interface EnemySpawn extends Point {
  kind: 'creeper' | 'slime';
}

export interface Level {
  name: string;
  /** Selbst gebautes Level aus `levels/eigene/`: immer spielbar, eigene Reihe im Menü. */
  custom: boolean;
  /** Hinweise auf Fehler im Level, die im Spiel angezeigt werden. */
  warnings: string[];
  biome: Biome;
  width: number;
  height: number;
  /** blocks[y][x], y = 0 ist die unterste Reihe. */
  blocks: (BlockId | null)[][];
  start: Point;
  goal: Point | null;
  checkpoints: Point[];
  diamonds: Point[];
  enemies: EnemySpawn[];
  deco: Point[];
  torches: Point[];
}

/** Biom-Namen, wie man sie in eine Level-Datei schreiben kann. */
const BIOME_NAMES: Record<string, BiomeId> = {
  wiese: 'meadow',
  wüste: 'desert',
  wueste: 'desert',
  höhle: 'cave',
  hoehle: 'cave',
  schnee: 'snow',
  schneeberge: 'snow',
  nether: 'nether',
};

/**
 * Liest eine Level-Datei: oben ein paar Zeilen wie `Name: Die Wiese` und `Biom: Wiese`,
 * nach einer Leerzeile das Raster.
 */
export function parseLevelFile(fileText: string, fileName: string, custom: boolean): Level {
  const lines = fileText.replace(/\r/g, '').split('\n');
  const header: Record<string, string> = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const match = /^\s*([A-Za-zÄÖÜäöüß]+)\s*:\s*(.*)$/.exec(lines[i]);
    if (!match) break;
    header[match[1].toLowerCase()] = match[2].trim();
  }
  const warnings: string[] = [];
  const name = header.name || fileName.replace(/\.txt$/, '');
  const biomeName = (header.biom ?? 'wiese').toLowerCase();
  const biome = BIOME_NAMES[biomeName];
  if (!biome) warnings.push(`Unbekanntes Biom „${header.biom}“. Erlaubt sind: Wiese, Wüste, Höhle, Schnee, Nether.`);
  const level = parseLevel(name, biome ?? 'meadow', lines.slice(i).join('\n'), { custom, firstLine: i + 1 });
  level.warnings.unshift(...warnings);
  return level;
}

export function parseLevel(
  name: string,
  biomeId: BiomeId,
  text: string,
  { custom = false, firstLine = 1 }: { custom?: boolean; firstLine?: number } = {},
): Level {
  const biome = BIOMES[biomeId];
  const raw = text.split('\n').map((line) => line.trimEnd());
  // Leere Zeilen am Anfang und Ende ignorieren
  const skipped = raw.findIndex((l) => l !== '');
  const lines = raw.slice(skipped, raw.findLastIndex((l) => l !== '') + 1);
  const warnings: string[] = [];

  const height = lines.length;
  const width = Math.max(...lines.map((l) => l.length));
  const blocks: (BlockId | null)[][] = Array.from({ length: height }, () => Array(width).fill(null));
  let start: Point | null = null;
  let goal: Point | null = null;
  const deco: Point[] = [];
  const checkpoints: Point[] = [];
  const torches: Point[] = [];
  const diamonds: Point[] = [];
  const enemies: EnemySpawn[] = [];
  const chars: Record<string, BlockId> = { ...BLOCK_CHARS, G: biome.surface, D: biome.subsoil };

  lines.forEach((line, row) => {
    const y = height - 1 - row;
    [...line].forEach((ch, x) => {
      if (ch in chars) blocks[y][x] = chars[ch];
      else if (ch === 'S') start = { x, y };
      else if (ch === 'Z') goal = { x, y };
      else if (ch === 'X') checkpoints.push({ x, y });
      else if (ch === '*') diamonds.push({ x, y });
      else if (ch === 'c') enemies.push({ kind: 'creeper', x, y });
      else if (ch === 's') enemies.push({ kind: 'slime', x, y });
      else if (ch === 't') deco.push({ x, y });
      else if (ch === 'f') torches.push({ x, y });
      else if (ch !== '.' && ch !== ' ') {
        warnings.push(`Zeile ${firstLine + skipped + row}, Spalte ${x + 1}: unbekanntes Zeichen „${ch}“`);
      }
    });
  });

  checkpoints.sort((a, b) => a.x - b.x);
  if (!start) warnings.push('Kein Start „S“ gefunden – Steve startet oben links.');
  if (!goal) warnings.push('Keine Ziel-Fahne „Z“ gefunden – das Level kann man nicht schaffen.');
  for (const w of warnings) console.warn(`Level „${name}“: ${w}`);
  return { name, custom, warnings, biome, width, height, blocks, start: start ?? { x: 1, y: height - 1 }, goal, checkpoints, diamonds, enemies, deco, torches };
}
