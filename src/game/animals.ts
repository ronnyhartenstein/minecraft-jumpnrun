import * as THREE from 'three';
import { damp, FACING_ANGLE, type Character, type CharacterState } from './character';
import { box, dots, limb, P, skin } from './enemies/models';

/*
 * Die freischaltbaren Tiere. Gebaut aus Pixel-Boxen wie die Gegner, in Minecraft-Pixeln (16 = 1 Block)
 * und dann vergrößert, damit sie neben den Gegnern nicht winzig wirken. Die Füße stehen im Ursprung,
 * der Kopf zeigt nach +z.
 */

const DARK = '#1f1f1f';

/** Hängt eine Box so an ein Gelenk, dass sie nach hinten (-z) herausragt, z. B. ein Schwanz. */
function tail(mesh: THREE.Mesh, pivot: [number, number, number], length: number): THREE.Group {
  const joint = new THREE.Group();
  joint.position.set(pivot[0] * P, pivot[1] * P, pivot[2] * P);
  mesh.position.z = (-length / 2) * P;
  joint.add(mesh);
  return joint;
}

/** Setzt eine Box an eine Stelle (in Pixeln). */
function at<T extends THREE.Object3D>(object: T, x: number, y: number, z: number): T {
  object.position.set(x * P, y * P, z * P);
  return object;
}

/** Materialien für eine Box, vorne (+z) mit eigenem Gesicht: Reihenfolge +x, -x, +y, -y, +z, -z. */
const withFace = (side: THREE.Material, face: THREE.Material, top = side) => [side, side, top, side, face, side];

/** Gemeinsames Verhalten: zur Laufrichtung drehen, Beine im Trab, in der Luft gestreckt, Schwanz wedelt. */
abstract class Animal implements Character {
  readonly object = new THREE.Group();
  protected readonly model = new THREE.Group();
  /** Vorderbeine und Hinterbeine; beim Huhn gibt es nur „vorne“. */
  protected front: THREE.Object3D[] = [];
  protected back: THREE.Object3D[] = [];
  protected tail: THREE.Object3D | null = null;
  protected tailLift = 0;
  protected walkPhase = 0;
  protected time = 0;

  constructor(scale: number) {
    this.model.scale.setScalar(scale);
    this.object.add(this.model);
    this.object.rotation.y = FACING_ANGLE;
  }

  update(dt: number, state: CharacterState): void {
    const { speed, maxSpeed, onGround, facing } = state;
    this.time += dt;
    this.object.rotation.y = damp(this.object.rotation.y, facing * FACING_ANGLE, 14, dt);

    // Negative x-Rotation = Bein nach vorn
    let swing = 0;
    let frontTarget = 0;
    let backTarget = 0;
    if (!onGround) {
      frontTarget = -0.7;
      backTarget = 0.7;
    } else if (speed > 0.1) {
      this.walkPhase += dt * speed * 2.6;
      swing = Math.sin(this.walkPhase) * Math.min(speed / maxSpeed, 1) * 0.8;
    } else {
      this.walkPhase = 0;
    }
    // Im Trab bewegen sich diagonale Beine gemeinsam
    const rate = 18;
    this.front.forEach((leg, i) => (leg.rotation.x = damp(leg.rotation.x, frontTarget + (i % 2 ? swing : -swing), rate, dt)));
    this.back.forEach((leg, i) => (leg.rotation.x = damp(leg.rotation.x, backTarget + (i % 2 ? -swing : swing), rate, dt)));
    if (this.tail) {
      this.tail.rotation.x = this.tailLift;
      this.tail.rotation.y = Math.sin(this.time * (speed > 0.1 ? 12 : 4)) * 0.3;
    }
    this.animate(dt, state);
  }

  protected animate(_dt: number, _state: CharacterState): void {}
}

/** Schaf: dicke Wolle, federt weich von Gegnern ab. */
export class Sheep extends Animal {
  constructor() {
    super(1);
    const wool = skin(['#ececec', '#dedede', '#f6f6f6']);
    const skinColors = ['#cdb39c', '#c0a58e', '#d8bfa8'];
    const face = skin(skinColors, (ctx) => dots(ctx, [[1, 3, DARK], [6, 3, DARK], [3, 6, '#d98f8f'], [4, 6, '#d98f8f']]));
    const legs = skin(skinColors);
    this.model.add(at(box(10, 9, 15, wool), 0, 12.5, 0));
    const head = at(box(6, 6, 7, withFace(skin(skinColors), face, wool)), 0, 15, 9);
    const cap = at(box(7, 2, 5, wool), 0, 18.5, 8);
    this.model.add(head, cap);
    this.front = [limb(box(3, 8, 3, legs), [-2.5, 8, 5], -4), limb(box(3, 8, 3, legs), [2.5, 8, 5], -4)];
    this.back = [limb(box(3, 8, 3, legs), [2.5, 8, -5], -4), limb(box(3, 8, 3, legs), [-2.5, 8, -5], -4)];
    this.model.add(...this.front, ...this.back);
  }
}

/** Huhn: sinkt flatternd, wenn man die Sprungtaste hält. */
export class Chicken extends Animal {
  private readonly wings: THREE.Group[];
  private flap = 0;

  constructor() {
    super(1.05);
    const white = skin(['#f4f4f4', '#e6e6e6', '#fbfbfb']);
    const orange = skin(['#f0a020', '#e39410', '#f7b030']);
    const feathers = skin(['#d6d6d6', '#c8c8c8', '#e0e0e0']);
    const face = skin(['#f4f4f4', '#e6e6e6', '#fbfbfb'], (ctx) => dots(ctx, [[1, 2, DARK], [6, 2, DARK]]));
    this.model.add(at(box(6, 6, 8, white), 0, 6, 0));
    this.model.add(at(box(4, 6, 3, withFace(white, face)), 0, 10.5, 4.5));
    this.model.add(at(box(4, 2, 2, orange), 0, 10.5, 7));
    this.model.add(at(box(2, 2, 2, skin(['#d02020', '#c01818', '#e03030'])), 0, 8.5, 6.5));
    this.wings = [-1, 1].map((side) => {
      const wing = limb(box(1, 4, 6, feathers), [side * 3.5, 8.5, 0], -2);
      wing.userData.side = side;
      return wing;
    });
    this.front = [limb(box(1, 3, 1, orange), [-1.5, 3, 0], -1.5), limb(box(1, 3, 1, orange), [1.5, 3, 0], -1.5)];
    this.model.add(...this.wings, ...this.front);
  }

  protected override animate(dt: number, { onGround, gliding }: CharacterState) {
    // Beim Gleiten schnell schlagen, beim Springen ausbreiten, am Boden angelegt
    this.flap += dt * 28;
    const open = gliding ? 0.9 + Math.sin(this.flap) * 0.7 : onGround ? 0 : 0.5;
    for (const wing of this.wings) wing.rotation.z = damp(wing.rotation.z, open * -wing.userData.side, 30, dt);
  }
}

/** Fuchs: flink, mit buschigem Schwanz. */
export class Fox extends Animal {
  constructor() {
    super(0.9);
    const orangeColors = ['#e2772b', '#d66b22', '#ea8638'];
    const orange = skin(orangeColors);
    const white = skin(['#f2ede6', '#e8e2da', '#f8f4ee']);
    const legs = skin(['#3b2a22', '#33241d', '#45332a']);
    const face = skin(orangeColors, (ctx) => {
      ctx.fillStyle = '#f2ede6';
      ctx.fillRect(0, 5, 8, 3);
      dots(ctx, [[1, 3, DARK], [6, 3, DARK]]);
    });
    this.model.add(at(box(6, 6, 12, orange), 0, 9, -1));
    this.model.add(at(box(8, 6, 6, withFace(orange, face)), 0, 12, 7));
    this.model.add(at(box(4, 2, 3, withFace(white, skin(['#f2ede6'], (ctx) => dots(ctx, [[3, 0, DARK], [4, 0, DARK], [3, 1, DARK], [4, 1, DARK]])))), 0, 10, 11.5));
    this.model.add(at(box(2, 3, 1, orange), -2.5, 16.5, 7), at(box(2, 3, 1, orange), 2.5, 16.5, 7));
    this.front = [limb(box(2, 6, 2, legs), [-2, 6, 3], -3), limb(box(2, 6, 2, legs), [2, 6, 3], -3)];
    this.back = [limb(box(2, 6, 2, legs), [2, 6, -5], -3), limb(box(2, 6, 2, legs), [-2, 6, -5], -3)];
    const brush = tail(box(4, 4, 9, orange), [0, 10, -7], 9);
    brush.add(at(box(4.2, 4.2, 2, white), 0, 0, -8.5));
    this.tail = brush;
    this.tailLift = -0.25;
    this.model.add(...this.front, ...this.back, brush);
  }
}

/** Wolf: springt höher, gezähmt mit rotem Halsband und weißen Pixeln in den Augen. */
export class Wolf extends Animal {
  constructor() {
    super(0.95);
    const greyColors = ['#d4d0ca', '#c6c1ba', '#dedad4'];
    const grey = skin(greyColors);
    const mane = skin(['#c2bdb5', '#b5afa7', '#cdc8c1']);
    // Augen wie beim gezähmten Wolf: außen ein weißer Pixel, innen schwarz, dunkles Fell drumherum
    const brow = '#8a847c';
    const face = skin(greyColors, (ctx) => dots(ctx, [
      [0, 2, brow], [1, 2, brow], [2, 2, brow], [3, 2, brow], [4, 2, brow], [5, 2, brow], [6, 2, brow], [7, 2, brow],
      [0, 3, brow], [1, 3, '#ffffff'], [2, 3, DARK], [5, 3, DARK], [6, 3, '#ffffff'], [7, 3, brow],
    ]));
    const collar = skin(['#c8201c', '#b81a17', '#d42a24']);
    const snoutFace = skin(['#b5afa7'], (ctx) => dots(ctx, [[3, 0, DARK], [4, 0, DARK], [3, 1, DARK], [4, 1, DARK]]));
    this.model.add(at(box(6, 6, 10, grey), 0, 11, -2));
    this.model.add(at(box(8, 7, 6, mane), 0, 11.5, 3.5));
    // Halsband um den Hals, zwischen Mähne und Kopf
    this.model.add(at(box(8.6, 2.5, 3, collar), 0, 10.5, 5.2));
    this.model.add(at(box(6, 6, 4, withFace(grey, face)), 0, 13, 8));
    this.model.add(at(box(3, 3, 4, withFace(grey, snoutFace)), 0, 11.5, 12));
    this.model.add(at(box(2, 2, 1, grey), -2, 17, 7.5), at(box(2, 2, 1, grey), 2, 17, 7.5));
    this.front = [limb(box(2, 8, 2, grey), [-2, 8, 4], -4), limb(box(2, 8, 2, grey), [2, 8, 4], -4)];
    this.back = [limb(box(2, 8, 2, grey), [2, 8, -5], -4), limb(box(2, 8, 2, grey), [-2, 8, -5], -4)];
    this.tail = tail(box(2, 2, 8, grey), [0, 13, -7], 8);
    this.tailLift = 0.5;
    this.model.add(...this.front, ...this.back, this.tail);
  }
}

/** Schreiter (Strider) aus dem Nether: zwei lange Beine, Borsten auf dem Kopf, läuft über Lava. */
export class Strider extends Animal {
  private readonly bristles: THREE.Mesh[] = [];

  constructor() {
    super(0.8);
    const redColors = ['#c9483c', '#b83f35', '#d65446'];
    const red = skin(redColors);
    const face = skin(redColors, (ctx) => {
      dots(ctx, [[1, 2, DARK], [2, 2, '#f2f2f2'], [5, 2, '#f2f2f2'], [6, 2, DARK]]);
      ctx.fillStyle = '#5a1f1f';
      ctx.fillRect(1, 5, 6, 1);
    });
    const legs = skin(['#8e3448', '#7f2d40', '#9c3b50']);
    const bristle = skin(['#d9c2a0', '#ccb592', '#e3cdac']);
    this.model.add(at(box(12, 10, 12, withFace(red, face)), 0, 19, 0));
    for (const [x, z, tilt] of [[-4, -3, 0.3], [-1.5, 2, -0.2], [1.5, -2, 0.25], [4, 3, -0.3], [0, 4.5, 0.1], [-3, 4, -0.1]]) {
      const hair = at(box(1, 6, 1, bristle), x, 27, z);
      hair.rotation.z = tilt;
      this.bristles.push(hair);
    }
    this.model.add(...this.bristles);
    this.front = [limb(box(3, 14, 3, legs), [-3, 14, 0], -7), limb(box(3, 14, 3, legs), [3, 14, 0], -7)];
    this.model.add(...this.front);
  }

  protected override animate(_dt: number, { speed }: CharacterState) {
    // Die Borsten wippen beim Laufen
    this.bristles.forEach((hair, i) => (hair.rotation.x = Math.sin(this.time * (speed > 0.1 ? 10 : 3) + i) * 0.2));
  }
}
