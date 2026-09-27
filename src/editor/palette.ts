import * as THREE from 'three';
import { BIOMES, type BiomeId } from '../levels/biomes';
import { BLOCK_CHARS } from '../levels/format';
import { blockMaterials, type BlockId } from '../textures/blocks';

/** Ein Feld in der Palette des Level-Editors. */
export interface PaletteEntry {
  char: string;
  label: string;
  /** Block mit echter Pixel-Textur … */
  block?: BlockId | 'surface' | 'subsoil';
  /** … oder ein Emoji, optional mit kleinem Zusatz (z. B. „M“ für „ab Mittel“). */
  emoji?: string;
  badge?: string;
}

export interface PaletteGroup {
  title: string;
  entries: PaletteEntry[];
}

const BLOCK_LABELS: Record<string, string> = {
  '#': 'Stein', C: 'Bruchstein', H: 'Holzstamm', L: 'Laub', P: 'Holzbretter', A: 'Sand', Y: 'Sandstein', K: 'Kaktus',
  M: 'Schnee', E: 'Eis (rutschig)', '1': 'Kohle-Erz', '2': 'Eisen-Erz', '3': 'Gold-Erz', '4': 'Diamant-Erz',
  R: 'Netherrack', N: 'Nether-Ziegel', O: 'Glowstone', W: 'Seelensand (langsam)', U: 'Purpur', V: 'Obsidian', '~': 'Lava (heiß!)',
};

const BLOCK_ORDER = ['#', 'C', 'H', 'L', 'P', 'A', 'Y', 'K', 'M', 'E', '1', '2', '3', '4', 'R', 'N', 'O', 'W', 'U', 'V', '~'];

/** Alle Zeichen des Level-Formats, sortiert für den Editor. Der Radierer ist „.“. */
export const PALETTE: PaletteGroup[] = [
  {
    title: 'Blöcke',
    entries: [
      { char: 'G', label: 'Boden oben (je nach Biom)', block: 'surface' },
      { char: 'D', label: 'Boden unten (je nach Biom)', block: 'subsoil' },
      // Feste Reihenfolge (bei Object.entries kämen die Erze „1“–„4“ als Zahlen zuerst)
      ...BLOCK_ORDER.map((char) => ({ char, label: BLOCK_LABELS[char], block: BLOCK_CHARS[char] })),
    ],
  },
  {
    title: 'Besonderes',
    entries: [
      { char: '.', label: 'Radierer (Luft)', emoji: '⌫' },
      { char: 'S', label: 'Start (nur einmal)', emoji: '🧍' },
      { char: 'Z', label: 'Ziel-Fahne (nur einmal)', emoji: '🏁' },
      { char: 'X', label: 'Checkpoint', emoji: '🚩' },
      { char: '*', label: 'Diamant', emoji: '💎' },
      { char: 't', label: 'Deko im Hintergrund (Baum, Kaktus …)', emoji: '🌳' },
      { char: 'f', label: 'Fackel', emoji: '🕯️' },
    ],
  },
  {
    title: 'Gegner',
    entries: [
      { char: 'c', label: 'Creeper', emoji: '🟩' },
      { char: 's', label: 'Slime', emoji: '🟢' },
      { char: 'z', label: 'Zombie', emoji: '🧟' },
      { char: 'p', label: 'Spinne', emoji: '🕷️' },
      { char: 'k', label: 'Skelett', emoji: '💀' },
      { char: 'h', label: 'Waldhexe', emoji: '🧙' },
      { char: 'b', label: 'Lohe', emoji: '🔥' },
      { char: 'e', label: 'Enderman', emoji: '🕴️' },
      { char: 'q', label: 'Shulker', emoji: '📦' },
      { char: 'm', label: 'Endermite', emoji: '🐛' },
      { char: '5', label: 'Creeper ab Mittel', emoji: '🟩', badge: 'M' },
      { char: '6', label: 'Slime ab Mittel', emoji: '🟢', badge: 'M' },
      { char: '7', label: 'Creeper nur Schwer', emoji: '🟩', badge: 'S' },
      { char: '8', label: 'Slime nur Schwer', emoji: '🟢', badge: 'S' },
    ],
  },
];

export const ENTRIES = new Map(PALETTE.flatMap((g) => g.entries).map((e) => [e.char, e]));

/** Biom-Namen für die Auswahl, so wie sie in die Datei geschrieben werden. */
export const BIOME_CHOICES: { name: string; id: BiomeId }[] = [
  { name: 'Wiese', id: 'meadow' },
  { name: 'Wüste', id: 'desert' },
  { name: 'Höhle', id: 'cave' },
  { name: 'Schnee', id: 'snow' },
  { name: 'Nether', id: 'nether' },
  { name: 'End', id: 'end' },
];

export function biomeByName(name: string): BiomeId {
  const lower = name.toLowerCase();
  return BIOME_CHOICES.find((b) => b.name.toLowerCase() === lower)?.id
    ?? ({ wueste: 'desert', hoehle: 'cave', schneeberge: 'snow' } as Record<string, BiomeId>)[lower]
    ?? 'meadow';
}

/** Das Bild eines Blocks: die Seiten-Textur aus dem Spiel (bei Lava nur das oberste Stück). */
export function blockImage(entry: PaletteEntry, biome: BiomeId): CanvasImageSource | null {
  if (!entry.block) return null;
  const id: BlockId = entry.block === 'surface' ? BIOMES[biome].surface : entry.block === 'subsoil' ? BIOMES[biome].subsoil : entry.block;
  const material = blockMaterials()[id][0] as THREE.MeshBasicMaterial;
  return (material.map?.image as CanvasImageSource | undefined) ?? null;
}
