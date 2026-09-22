import type { BlockId } from '../textures/blocks';

export type BiomeId = 'meadow' | 'desert' | 'cave' | 'snow' | 'nether';

/** Was das Zeichen `t` im Level-Raster im Hintergrund entstehen lässt. */
export type DecoKind = 'oak' | 'cactus' | 'spruce' | 'stalagmite' | 'nether';

export interface Biome {
  id: BiomeId;
  /** Farbe für die Levelauswahl. */
  color: string;
  /** `G` im Level-Raster wird zu diesem Block … */
  surface: BlockId;
  /** … und `D` zu diesem. */
  subsoil: BlockId;
  /** Unter dem Level: erst `underground[0]`, tiefer `underground[1]`. */
  underground: [BlockId, BlockId];
  /** Himmel von oben nach unten. */
  sky: [string, string, string];
  fog: { color: string; near: number; far: number };
  ambient: { sky: string; ground: string; intensity: number };
  sun: { color: string; intensity: number } | null;
  clouds: boolean;
  deco: DecoKind;
  /** Höhle: Die Spielebene wird nach hinten verlängert, dahinter eine Felswand, oben Fels. */
  enclosed: boolean;
  /** Steve trägt ein kleines Licht mit sich (für dunkle Level). */
  playerLight: boolean;
  /** Ein Lavameer unter dem ganzen Level, in dieser Blockreihe. Wer hineinfällt, fängt neu an. */
  lavaSea: number | null;
  /** Partikel in der Luft. */
  particles: 'snow' | 'ash' | null;
}

export const BIOMES: Record<BiomeId, Biome> = {
  meadow: {
    id: 'meadow',
    color: '#67ad3c',
    surface: 'grass',
    subsoil: 'dirt',
    underground: ['dirt', 'stone'],
    sky: ['#5fa8ff', '#cfe7ff', '#eef6ff'],
    fog: { color: '#cfe7ff', near: 30, far: 85 },
    ambient: { sky: '#dcefff', ground: '#7a6440', intensity: 1.4 },
    sun: { color: '#fff3dc', intensity: 2.4 },
    clouds: true,
    deco: 'oak',
    enclosed: false,
    playerLight: false,
    lavaSea: null,
    particles: null,
  },
  desert: {
    id: 'desert',
    color: '#e0c872',
    surface: 'sand',
    subsoil: 'sandstone',
    underground: ['sandstone', 'stone'],
    sky: ['#79b4f0', '#f3e7c4', '#fbf3dc'],
    fog: { color: '#f3e7c4', near: 26, far: 75 },
    ambient: { sky: '#fff4d8', ground: '#b89a5a', intensity: 1.5 },
    sun: { color: '#fff0c8', intensity: 2.9 },
    clouds: false,
    deco: 'cactus',
    enclosed: false,
    playerLight: false,
    lavaSea: null,
    particles: null,
  },
  cave: {
    id: 'cave',
    color: '#6b6b73',
    surface: 'stone',
    subsoil: 'stone',
    underground: ['stone', 'stone'],
    sky: ['#050506', '#0b0b0e', '#101014'],
    fog: { color: '#0b0b0e', near: 18, far: 45 },
    ambient: { sky: '#8a8fa8', ground: '#3a3530', intensity: 0.9 },
    sun: null,
    clouds: false,
    deco: 'stalagmite',
    enclosed: true,
    playerLight: true,
    lavaSea: null,
    particles: null,
  },
  snow: {
    id: 'snow',
    color: '#dfe9f5',
    surface: 'snowGrass',
    subsoil: 'dirt',
    underground: ['dirt', 'stone'],
    sky: ['#8fb4de', '#e3edf7', '#f5f9fd'],
    fog: { color: '#e3edf7', near: 24, far: 70 },
    ambient: { sky: '#e6f0ff', ground: '#8a8f9a', intensity: 1.5 },
    sun: { color: '#eef4ff', intensity: 2.2 },
    clouds: true,
    deco: 'spruce',
    enclosed: false,
    playerLight: false,
    lavaSea: null,
    particles: 'snow',
  },
  nether: {
    id: 'nether',
    color: '#8a2a1e',
    surface: 'netherrack',
    subsoil: 'netherrack',
    underground: ['netherrack', 'netherrack'],
    sky: ['#1a0504', '#4a120c', '#6a1e12'],
    fog: { color: '#4a120c', near: 20, far: 60 },
    ambient: { sky: '#ff9a70', ground: '#5a1a10', intensity: 1.3 },
    sun: null,
    clouds: false,
    deco: 'nether',
    enclosed: false,
    playerLight: false,
    lavaSea: 2,
    particles: 'ash',
  },
};
