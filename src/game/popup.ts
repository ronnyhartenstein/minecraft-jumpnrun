import * as THREE from 'three';

/** So lange ist die Anzeige zu sehen (Sekunden). */
const LIFE = 1.6;
/** Anteil der Zeit, in der sie von klein nach groß zoomt. */
const GROW = 0.35;

/** Eine kurze Text-Anzeige in der Spielwelt, z. B. „+20 s“ über einem Checkpoint: zoomt auf, steigt und blendet aus. */
export class Popup {
  readonly object: THREE.Sprite;
  private age = 0;
  private readonly size: THREE.Vector2;

  constructor(text: string, at: THREE.Vector3, color = '#ffe14d') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = "32px 'Press Start 2P', monospace";
    ctx.font = font;
    canvas.width = Math.ceil(ctx.measureText(text).width) + 16;
    canvas.height = 48;
    ctx.font = font;
    ctx.textBaseline = 'middle';
    // Dunkler Schatten, damit die Schrift auch vor hellem Himmel lesbar ist
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText(text, 12, 28);
    ctx.fillStyle = color;
    ctx.fillText(text, 8, 24);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.object = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    this.object.renderOrder = 10;
    this.object.position.copy(at);
    // Endgröße in Blöcken: 1 Block hoch, Breite passend zum Text
    this.size = new THREE.Vector2(canvas.width / canvas.height, 1);
    this.update(0);
  }

  get done(): boolean {
    return this.age >= LIFE;
  }

  update(dt: number): void {
    this.age += dt;
    const t = this.age / LIFE;
    // Erst schnell von klein auf groß (mit leichtem Überschwingen), dann langsam hochsteigen und ausblenden
    const grow = Math.min(1, t / GROW);
    const scale = 0.2 + 1.1 * (1 - (1 - grow) ** 3) - (grow >= 1 ? 0.1 * Math.min(1, (t - GROW) * 4) : 0);
    this.object.scale.set(this.size.x * scale, this.size.y * scale, 1);
    this.object.position.y += dt * 0.6;
    this.object.material.opacity = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.material.map?.dispose();
    this.object.material.dispose();
  }
}
