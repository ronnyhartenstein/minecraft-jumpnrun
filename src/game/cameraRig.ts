import * as THREE from 'three';

/** Normaler Abstand der Kamera zur Spielebene. */
export const BASE_DISTANCE = 14;
/** So viele Blöcke breit soll man mindestens sehen. Hochkant auf dem Handy zoomt die Kamera dafür weiter heraus. */
const MIN_VIEW_WIDTH = 12;
const HEIGHT = 2.5;
const LOOK_AHEAD = 2;
/** Die Kamera schaut etwas über Steve, damit mehr Himmel und weniger Erde zu sehen ist. */
const FOCUS_ABOVE = 2.5;

const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/** Kamera folgt Steve weich von der Seite und bleibt innerhalb des Levels. */
export class CameraRig {
  /** Der Punkt auf der Spielebene, auf den die Kamera schaut. */
  readonly focus = new THREE.Vector3();
  private x = 0;
  private y = 0;
  private ahead = 0;
  private levelWidth = 0;
  private minY = 0;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  setLevel(levelWidth: number, minY: number): void {
    this.levelWidth = levelWidth;
    this.minY = minY;
  }

  snap(target: THREE.Vector2): void {
    this.ahead = 0;
    this.x = this.clampX(target.x);
    this.y = Math.max(target.y + FOCUS_ABOVE, this.minY);
    this.apply();
  }

  update(dt: number, target: THREE.Vector2, facing: number, moving: boolean): void {
    if (moving) this.ahead = damp(this.ahead, facing * LOOK_AHEAD, 2, dt);
    this.x = damp(this.x, this.clampX(target.x + this.ahead), 5, dt);
    this.y = damp(this.y, Math.max(target.y + FOCUS_ABOVE, this.minY), 2.5, dt);
    this.apply();
  }

  /** Abstand der Kamera: normal, oder weiter weg, wenn der Bildschirm schmal ist. */
  get distance(): number {
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return Math.max(BASE_DISTANCE, MIN_VIEW_WIDTH / 2 / (tan * this.camera.aspect));
  }

  /** Halbe sichtbare Breite auf der Spielebene. */
  private halfViewWidth(): number {
    return Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.distance * this.camera.aspect;
  }

  private clampX(x: number): number {
    const half = this.halfViewWidth();
    if (this.levelWidth < half * 2) return this.levelWidth / 2;
    return THREE.MathUtils.clamp(x, half, this.levelWidth - half);
  }

  private apply() {
    this.focus.set(this.x, this.y, 0);
    this.camera.position.set(this.x, this.y + HEIGHT, this.distance);
    this.camera.lookAt(this.x, this.y, 0);
  }
}
