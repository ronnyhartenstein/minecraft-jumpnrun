import * as THREE from 'three';
import { createSkinTexture, faceRects, SKIN_PARTS, type SkinBox } from '../textures/skin';

/** Was die Figur zum Animieren über den Spieler wissen muss. */
export interface CharacterState {
  speed: number;
  maxSpeed: number;
  onGround: boolean;
  facing: 1 | -1;
}

/**
 * Austauschbare Spielfigur. Heute Steve aus Boxen, später ein Blockbench-Modell (#13).
 * `object` steht mit den Füßen im Ursprung und schaut nach +z.
 */
export interface Character {
  readonly object: THREE.Object3D;
  update(dt: number, state: CharacterState): void;
}

/** Ein Skin-Pixel in Weltgröße: Steve ist 32 Pixel = 1,8 Blöcke groß. */
const P = 1.8 / 32;

/** Seitlich laufen, aber etwas zur Kamera gedreht, damit man das Gesicht sieht. */
const FACING_ANGLE = Math.PI / 2 - 0.45;

function skinBox(box: SkinBox, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(box.w * P, box.h * P, box.d * P);
  const f = faceRects(box);
  // Flächen-Reihenfolge von BoxGeometry: +x, -x, +y, -y, +z, -z.
  // Steve schaut nach +z, seine rechte Seite ist also -x.
  const rects = [f.left, f.right, f.top, f.bottom, f.front, f.back];
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  rects.forEach(([x, y, w, h], face) => {
    for (let i = face * 4; i < face * 4 + 4; i++) {
      uv.setXY(i, (x + uv.getX(i) * w) / 64, 1 - (y + (1 - uv.getY(i)) * h) / 64);
    }
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

/** Hängt eine Box an ein Gelenk: `pivot` ist der Drehpunkt, `offsetY` der Versatz der Box dazu. */
function limb(box: SkinBox, material: THREE.Material, pivot: [number, number], offsetY: number): THREE.Group {
  const joint = new THREE.Group();
  joint.position.set(pivot[0] * P, pivot[1] * P, 0);
  const mesh = skinBox(box, material);
  mesh.position.y = offsetY * P;
  joint.add(mesh);
  return joint;
}

const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

export class BoxSteve implements Character {
  readonly object = new THREE.Group();
  private readonly head: THREE.Group;
  private readonly rightArm: THREE.Group;
  private readonly leftArm: THREE.Group;
  private readonly rightLeg: THREE.Group;
  private readonly leftLeg: THREE.Group;
  private walkPhase = 0;
  private time = 0;

  constructor() {
    const material = new THREE.MeshLambertMaterial({ map: createSkinTexture() });
    const body = skinBox(SKIN_PARTS.body, material);
    body.position.y = 18 * P;

    this.head = limb(SKIN_PARTS.head, material, [0, 24], 4);
    this.rightArm = limb(SKIN_PARTS.rightArm, material, [-6, 22], -4);
    this.leftArm = limb(SKIN_PARTS.leftArm, material, [6, 22], -4);
    this.rightLeg = limb(SKIN_PARTS.rightLeg, material, [-2, 12], -6);
    this.leftLeg = limb(SKIN_PARTS.leftLeg, material, [2, 12], -6);

    this.object.add(body, this.head, this.rightArm, this.leftArm, this.rightLeg, this.leftLeg);
    this.object.rotation.y = FACING_ANGLE;
  }

  update(dt: number, { speed, maxSpeed, onGround, facing }: CharacterState): void {
    this.time += dt;
    this.object.rotation.y = damp(this.object.rotation.y, facing * FACING_ANGLE, 14, dt);

    // Zielwinkel je Zustand. Negative x-Rotation = Arm/Bein nach vorn.
    let rightArm = 0;
    let leftArm = 0;
    let rightLeg = 0;
    let leftLeg = 0;
    let spread = 0.04 + Math.sin(this.time * 2) * 0.03; // leichtes „Atmen“
    let headTilt = 0;

    if (!onGround) {
      rightArm = -0.9;
      leftArm = -0.3;
      rightLeg = -0.5;
      leftLeg = 0.2;
      spread = 0.35;
      headTilt = -0.15;
    } else if (speed > 0.1) {
      this.walkPhase += dt * speed * 2.2;
      const swing = Math.sin(this.walkPhase) * Math.min(speed / maxSpeed, 1) * 0.9;
      rightArm = swing;
      leftArm = -swing;
      rightLeg = -swing;
      leftLeg = swing;
    } else {
      this.walkPhase = 0;
    }

    const rate = 18;
    this.rightArm.rotation.x = damp(this.rightArm.rotation.x, rightArm, rate, dt);
    this.leftArm.rotation.x = damp(this.leftArm.rotation.x, leftArm, rate, dt);
    this.rightArm.rotation.z = damp(this.rightArm.rotation.z, -spread, rate, dt);
    this.leftArm.rotation.z = damp(this.leftArm.rotation.z, spread, rate, dt);
    this.rightLeg.rotation.x = damp(this.rightLeg.rotation.x, rightLeg, rate, dt);
    this.leftLeg.rotation.x = damp(this.leftLeg.rotation.x, leftLeg, rate, dt);
    this.head.rotation.x = damp(this.head.rotation.x, headTilt, rate, dt);
  }
}
