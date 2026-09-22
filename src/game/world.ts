import * as THREE from 'three';
import type { Level } from '../levels/format';
import { createBlockMaterials, type BlockId } from '../textures/blocks';

/** So viele Blockreihen werden hinter der Spielebene als Deko ergänzt. */
const DECO_DEPTH = 6;
/** Unter dem Level wird der Boden sichtbar weitergeführt (nur Deko). */
const UNDERGROUND = 6;
/** Bäume stehen so weit hinten, dass ihr Laub nicht in die Spielebene ragt. */
const TREE_Z = -3;

/**
 * Die Blockwelt. Block (x, y) belegt den Würfel von x..x+1 und y..y+1,
 * die Spielebene liegt bei z = 0 (Blöcke von -0.5 bis 0.5).
 */
export class World {
  readonly object = new THREE.Group();

  constructor(readonly level: Level) {
    const positions = new Map<BlockId, THREE.Vector3[]>();
    const add = (id: BlockId, x: number, y: number, z: number) => {
      if (!positions.has(id)) positions.set(id, []);
      positions.get(id)!.push(new THREE.Vector3(x + 0.5, y + 0.5, z));
    };

    // Spielebene
    level.blocks.forEach((row, y) => row.forEach((id, x) => id && add(id, x, y, 0)));

    // Boden nach hinten und nach unten fortsetzen
    for (let x = 0; x < level.width; x++) {
      const ground = this.groundHeight(x);
      if (ground === 0) continue;
      for (let z = -DECO_DEPTH; z <= 0; z++) {
        if (z < 0) for (let y = 0; y < ground; y++) add(level.blocks[y][x]!, x, y, z);
        for (let y = 1; y <= UNDERGROUND; y++) add(y > 3 ? 'stone' : 'dirt', x, -y, z);
      }
    }

    for (const tree of level.trees) this.addTree(add, tree.x, this.groundHeight(tree.x));

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const materials = createBlockMaterials();
    const matrix = new THREE.Matrix4();
    for (const [id, list] of positions) {
      const mesh = new THREE.InstancedMesh(geometry, materials[id], list.length);
      list.forEach((p, i) => mesh.setMatrixAt(i, matrix.makeTranslation(p)));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.object.add(mesh);
    }
  }

  /** Höhe des durchgehenden Gras-/Erdbodens ab der untersten Reihe (0 = Abgrund). */
  groundHeight(x: number): number {
    let y = 0;
    while (y < this.level.height && (this.level.blocks[y][x] === 'grass' || this.level.blocks[y][x] === 'dirt')) y++;
    return y;
  }

  /** Links und rechts vom Level ist eine unsichtbare Wand, nach unten geht es ins Leere. */
  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.level.width) return true;
    if (y < 0 || y >= this.level.height) return false;
    return this.level.blocks[y][x] !== null;
  }

  private addTree(add: (id: BlockId, x: number, y: number, z: number) => void, x: number, ground: number) {
    const trunk = 4;
    for (let y = 0; y < trunk; y++) add('log', x, ground + y, TREE_Z);
    const top = ground + trunk;
    // Zwei breite Laub-Schichten, darüber eine schmale mit Plus-Form
    for (let dy = -1; dy <= 0; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
          if ((dx === 0 && dz === 0 && dy < 0) || (corner && (x + dy) % 2 === 0)) continue;
          add('leaves', x + dx, top + dy, TREE_Z + dz);
        }
      }
    }
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) add('leaves', x + dx, top + 1, TREE_Z + dz);
  }
}
