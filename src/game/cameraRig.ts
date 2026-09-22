import * as THREE from 'three';

const DISTANCE = 14;
const HEIGHT = 2.5;
const LOOK_AHEAD = 2;
/** Die Kamera schaut etwas über Steve, damit mehr Himmel und weniger Erde zu sehen ist. */
const FOCUS_ABOVE = 2.5;

const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/** Kamera folgt Steve weich von der Seite und bleibt innerhalb des Levels. */
export class CameraRig {
  private x = 0;
  private y = 0;
  private ahead = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly levelWidth: number,
    private readonly minY: number,
  ) {}

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

  get focus(): THREE.Vector3 {
    return new THREE.Vector3(this.x, this.y, 0);
  }

  /** Halbe sichtbare Breite auf der Spielebene. */
  private halfViewWidth(): number {
    return Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * DISTANCE * this.camera.aspect;
  }

  private clampX(x: number): number {
    const half = this.halfViewWidth();
    if (this.levelWidth < half * 2) return this.levelWidth / 2;
    return THREE.MathUtils.clamp(x, half, this.levelWidth - half);
  }

  private apply() {
    this.camera.position.set(this.x, this.y + HEIGHT, DISTANCE);
    this.camera.lookAt(this.x, this.y, 0);
  }
}
