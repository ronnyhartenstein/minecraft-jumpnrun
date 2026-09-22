import * as THREE from 'three';
import type { Point } from '../levels/format';
import { pixelTexture } from '../textures/pixel';

const POLE_HEIGHT = 5;

/** Ziel-Fahne mit Schachbrettmuster. Steve läuft vorne an der Stange vorbei. */
export class GoalFlag {
  readonly object = new THREE.Group();
  private readonly flag: THREE.Group;
  private time = 0;

  constructor(readonly at: Point) {
    const poleMat = new THREE.MeshLambertMaterial({ color: '#e8e8e8' });
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, POLE_HEIGHT, 0.15), poleMat);
    pole.position.y = POLE_HEIGHT / 2;
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: '#f2c230' }));
    knob.position.y = POLE_HEIGHT + 0.15;

    const cloth = pixelTexture(8, 6, 1, (ctx) => {
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 8; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#1d1d1d' : '#f5f5f5';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    const flagMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.05), new THREE.MeshLambertMaterial({ map: cloth }));
    flagMesh.position.x = 0.8;
    this.flag = new THREE.Group();
    this.flag.position.y = POLE_HEIGHT - 0.7;
    this.flag.add(flagMesh);

    for (const mesh of [pole, knob, flagMesh]) mesh.castShadow = true;
    this.object.add(pole, knob, this.flag);
    this.object.position.set(at.x + 0.5, at.y, -0.35);
  }

  /** Hat Steve die Stange erreicht? */
  reached(playerX: number): boolean {
    return playerX >= this.at.x + 0.5;
  }

  update(dt: number): void {
    this.time += dt;
    this.flag.rotation.y = Math.sin(this.time * 3) * 0.25;
  }
}
