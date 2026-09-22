import * as THREE from 'three';
import type { DecoKind } from '../levels/biomes';
import type { Level, Point } from '../levels/format';
import { blockMaterials, type BlockId } from '../textures/blocks';

/** So viele Blockreihen werden hinter der Spielebene als Deko ergänzt. */
const DECO_DEPTH = 6;
/** Unter dem Level wird der Boden sichtbar weitergeführt (nur Deko). */
const UNDERGROUND = 6;
/** In Höhlen liegt so viel Fels über dem Level. */
const ROCK_ABOVE = 6;
/** Deko steht so weit hinten, dass sie nicht in die Spielebene ragt. */
const DECO_Z = -3;
/** Die Lava-Oberfläche liegt etwas tiefer als ein voller Block … */
const LAVA_TOP = 0.875;
/** … und gefährlich ist sie erst ein Stück darunter, damit knappe Sprünge gut gehen. */
const LAVA_DEADLY_TOP = 0.7;
const LAVA_DEADLY_INSET = 0.1;
/** Das Lavameer reicht so weit links, rechts und nach hinten über das Level hinaus. */
const SEA_MARGIN = 30;
const SEA_DEPTH = 30;
/** Mehr Lichter machen das Rendern langsam. */
const MAX_LAVA_LIGHTS = 8;

/** `h` ist die Höhe des Blocks, nur bei Lava kleiner als 1. */
type AddBlock = (id: BlockId, x: number, y: number, z: number, h?: number) => void;

const BOX = new THREE.BoxGeometry(1, 1, 1);
BOX.userData.shared = true;

/**
 * Die Blockwelt. Block (x, y) belegt den Würfel von x..x+1 und y..y+1,
 * die Spielebene liegt bei z = 0 (Blöcke von -0.5 bis 0.5).
 */
export class World {
  readonly object = new THREE.Group();
  /** Lava-Oberflächen nahe der Spielebene, nach x-Spalte sortiert. Dort steigen Funken auf. */
  readonly lavaSurfaces = new Map<number, THREE.Vector3[]>();

  constructor(readonly level: Level) {
    const positions = new Map<BlockId, THREE.Vector4[]>();
    const add: AddBlock = (id, x, y, z, h = 1) => {
      if (!positions.has(id)) positions.set(id, []);
      positions.get(id)!.push(new THREE.Vector4(x, y, z, h));
      if (id === 'lava' && h < 1 && z >= -3) {
        if (!this.lavaSurfaces.has(x)) this.lavaSurfaces.set(x, []);
        this.lavaSurfaces.get(x)!.push(new THREE.Vector3(x + 0.5, y + h, z));
      }
    };

    // Spielebene
    level.blocks.forEach((row, y) => row.forEach((id, x) => id && this.addFront(add, id, x, y, 0)));

    for (let x = 0; x < level.width; x++) {
      if (level.biome.enclosed) this.extendCave(add, x);
      else this.extendGround(add, x);
    }

    for (const point of level.deco) this.addDeco(add, level.biome.deco, point);
    if (level.biome.lavaSea !== null) this.addLavaSea(add, level.biome.lavaSea);
    this.addLavaLights();

    const materials = blockMaterials();
    const matrix = new THREE.Matrix4();
    for (const [id, list] of positions) {
      const mesh = new THREE.InstancedMesh(BOX, materials[id], list.length);
      list.forEach(({ x, y, z, w: h }, i) => {
        mesh.setMatrixAt(i, matrix.makeScale(1, h, 1).setPosition(x + 0.5, y + h / 2, z));
      });
      // Lava leuchtet selbst und wirft keinen Schatten
      mesh.castShadow = mesh.receiveShadow = id !== 'lava';
      this.object.add(mesh);
    }
  }

  /** Blöcke aus der Spielebene; Lava ist oben etwas niedriger, außer es liegt Lava darüber. */
  private addFront(add: AddBlock, id: BlockId, x: number, y: number, z: number) {
    const lavaAbove = this.blockAt(x, y + 1) === 'lava';
    add(id, x, y, z, id === 'lava' && !lavaAbove ? LAVA_TOP : 1);
  }

  /** Höhe des durchgehenden Bodens ab der untersten Reihe (0 = Abgrund). Lava zählt dazu, so entstehen Lavaseen. */
  groundHeight(x: number): number {
    const ground: (BlockId | null)[] = [this.level.biome.surface, this.level.biome.subsoil, 'lava'];
    let y = 0;
    while (y < this.level.height && ground.includes(this.level.blocks[y][x])) y++;
    return y;
  }

  blockAt(x: number, y: number): BlockId | null {
    if (x < 0 || x >= this.level.width || y < 0 || y >= this.level.height) return null;
    return this.level.blocks[y][x];
  }

  /** Links und rechts vom Level ist eine unsichtbare Wand, nach unten geht es ins Leere. */
  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.level.width) return true;
    const id = this.blockAt(x, y);
    return id !== null && id !== 'lava';
  }

  /** Berührt ein Rechteck (Steves Hitbox) die gefährliche Zone eines Lava-Blocks? */
  touchesLava(minX: number, minY: number, maxX: number, maxY: number): boolean {
    for (let y = Math.floor(minY); y <= Math.floor(maxY); y++) {
      for (let x = Math.floor(minX); x <= Math.floor(maxX); x++) {
        if (this.blockAt(x, y) !== 'lava') continue;
        const top = this.blockAt(x, y + 1) === 'lava' ? 1 : LAVA_DEADLY_TOP;
        if (maxX > x + LAVA_DEADLY_INSET && minX < x + 1 - LAVA_DEADLY_INSET && minY < y + top && maxY > y) return true;
      }
    }
    const sea = this.level.biome.lavaSea;
    return sea !== null && minY < sea + LAVA_DEADLY_TOP;
  }

  /** Draußen: Boden nach hinten und nach unten fortsetzen, Hindernisse bleiben vorne. */
  private extendGround(add: AddBlock, x: number) {
    const ground = this.groundHeight(x);
    if (ground === 0) return;
    for (let z = -DECO_DEPTH; z <= 0; z++) {
      if (z < 0) for (let y = 0; y < ground; y++) this.addFront(add, this.level.blocks[y][x]!, x, y, z);
      this.addUnderground(add, x, z);
    }
  }

  /** Höhle: die ganze Spalte nach hinten verlängern, dahinter eine Felswand, oben Fels. */
  private extendCave(add: AddBlock, x: number) {
    const { height, blocks } = this.level;
    const top = height + ROCK_ABOVE;
    for (let z = -DECO_DEPTH + 1; z <= 0; z++) {
      if (z < 0) for (let y = 0; y < height; y++) if (blocks[y][x]) this.addFront(add, blocks[y][x]!, x, y, z);
      for (let y = height; y < top; y++) add('stone', x, y, z);
      if (blocks[0][x]) this.addUnderground(add, x, z);
    }
    for (let y = -UNDERGROUND; y < top; y++) add('stone', x, y, -DECO_DEPTH);
  }

  /** Ein Meer aus Lava rund um das Level, nur dort, wo kein Boden höher liegt. */
  private addLavaSea(add: AddBlock, y: number) {
    for (let x = -SEA_MARGIN; x < this.level.width + SEA_MARGIN; x++) {
      const island = x >= 0 && x < this.level.width && this.groundHeight(x) > y;
      for (let z = 1; z >= -SEA_DEPTH; z--) {
        if (island && z <= 0 && z >= -DECO_DEPTH) continue;
        add('lava', x, y, z, LAVA_TOP);
      }
    }
  }

  /** Ein warmes Licht über jeder zusammenhängenden Lavafläche in der Spielebene. */
  private addLavaLights() {
    const runs: { x0: number; x1: number; y: number }[] = [];
    this.level.blocks.forEach((row, y) => {
      row.forEach((id, x) => {
        if (id !== 'lava' || this.blockAt(x, y + 1) === 'lava') return;
        const last = runs.at(-1);
        if (last && last.y === y && last.x1 === x - 1) last.x1 = x;
        else runs.push({ x0: x, x1: x, y });
      });
    });
    const step = Math.max(1, Math.ceil(runs.length / MAX_LAVA_LIGHTS));
    for (let i = 0; i < runs.length; i += step) {
      const { x0, x1, y } = runs[i];
      const light = new THREE.PointLight('#ff7a1a', 8 + (x1 - x0) * 2, 8, 1);
      light.position.set((x0 + x1 + 1) / 2, y + 1.5, 0.8);
      this.object.add(light);
    }
  }

  private addUnderground(add: AddBlock, x: number, z: number) {
    const [upper, lower] = this.level.biome.underground;
    for (let y = 1; y <= UNDERGROUND; y++) add(y > 3 ? lower : upper, x, -y, z);
  }

  private addDeco(add: AddBlock, kind: DecoKind, { x, y }: Point) {
    switch (kind) {
      case 'oak':
        return this.addOak(add, x, y);
      case 'spruce':
        return this.addSpruce(add, x, y);
      case 'cactus':
        for (let dy = 0; dy < 2 + (x % 2); dy++) add('cactus', x, y + dy, DECO_Z + 1);
        return;
      case 'stalagmite':
        return this.addStalagmite(add, x, y);
      case 'nether':
        return this.addNetherDeco(add, x, y);
    }
  }

  private addOak(add: AddBlock, x: number, ground: number) {
    const trunk = 4;
    for (let y = 0; y < trunk; y++) add('log', x, ground + y, DECO_Z);
    const top = ground + trunk;
    // Zwei breite Laub-Schichten, darüber eine schmale mit Plus-Form
    for (let dy = -1; dy <= 0; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
          if ((dx === 0 && dz === 0 && dy < 0) || (corner && (x + dy) % 2 === 0)) continue;
          add('leaves', x + dx, top + dy, DECO_Z + dz);
        }
      }
    }
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) add('leaves', x + dx, top + 1, DECO_Z + dz);
  }

  /** Fichte: schmaler Kegel aus Nadeln, oben eine Schneehaube. */
  private addSpruce(add: AddBlock, x: number, ground: number) {
    const trunk = 6;
    for (let y = 0; y < trunk; y++) add('spruceLog', x, ground + y, DECO_Z);
    const radii = [2, 1, 2, 1, 0];
    radii.forEach((r, i) => {
      const y = ground + 2 + i;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > r || (dx === 0 && dz === 0 && y < ground + trunk)) continue;
          add('spruceLeaves', x + dx, y, DECO_Z + dz);
        }
      }
    });
    add('spruceLeaves', x, ground + trunk, DECO_Z);
    add('snow', x, ground + trunk + 1, DECO_Z);
  }

  /** Tropfsteine: einer wächst vom Boden, einer hängt von der Decke. */
  private addStalagmite(add: AddBlock, x: number, floor: number) {
    const z = DECO_Z + 1;
    for (let dy = 0; dy < 1 + (x % 3); dy++) add(dy ? 'stone' : 'cobble', x, floor + dy, z);
    let ceiling = floor;
    while (ceiling < this.level.height && !this.level.blocks[ceiling][x]) ceiling++;
    if (ceiling < this.level.height) for (let dy = 1; dy <= 1 + (x % 2); dy++) add('stone', x, ceiling - dy, z);
  }

  /** Nether: abwechselnd eine Säule mit Glowstone oder ein Lavafall aus dem Nichts. */
  private addNetherDeco(add: AddBlock, x: number, ground: number) {
    if (x % 2 === 0) {
      const h = 3 + (x % 3);
      for (let dy = 0; dy < h; dy++) add('netherrack', x, ground + dy, DECO_Z);
      add('glowstone', x, ground + h, DECO_Z);
    } else {
      const top = this.level.height + 4;
      add('netherrack', x, top, DECO_Z - 1);
      for (let y = ground; y < top; y++) add('lava', x, y, DECO_Z - 1);
    }
  }
}
