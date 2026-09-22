import * as THREE from 'three';

export interface ParticleStyle {
  count: number;
  color: string;
  size: number;
  /** Lebensdauer in Sekunden, zufällig zwischen den beiden Werten. */
  life: [number, number];
  gravity: number;
  glow?: boolean;
}

/** Setzt Startpunkt und Geschwindigkeit eines neuen Partikels. `false` = gerade keins erzeugen. */
export type Spawner = (pos: THREE.Vector3, vel: THREE.Vector3) => boolean;

const HIDDEN = -1e4;

/** Einfache Pixel-Partikel: Funken, Schneeflocken, Asche. */
export class Particles {
  readonly object: THREE.Points;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly lives: Float32Array;
  private readonly pos = new THREE.Vector3();
  private readonly vel = new THREE.Vector3();

  constructor(private readonly style: ParticleStyle, private readonly spawn: Spawner) {
    this.positions = new Float32Array(style.count * 3).fill(HIDDEN);
    this.velocities = new Float32Array(style.count * 3);
    // Zufällig verteilt starten, damit nicht alle gleichzeitig neu erscheinen
    this.lives = Float32Array.from({ length: style.count }, () => Math.random() * style.life[1]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({
      color: style.color,
      size: style.size,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: style.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.object = new THREE.Points(geometry, material);
    this.object.frustumCulled = false;
  }

  update(dt: number): void {
    const { positions: p, velocities: v, lives, style } = this;
    for (let i = 0; i < lives.length; i++) {
      const j = i * 3;
      lives[i] -= dt;
      if (lives[i] <= 0) {
        if (this.spawn(this.pos.set(0, 0, 0), this.vel.set(0, 0, 0))) {
          this.pos.toArray(p, j);
          this.vel.toArray(v, j);
          lives[i] = style.life[0] + Math.random() * (style.life[1] - style.life[0]);
        } else {
          p[j + 1] = HIDDEN;
          lives[i] = 0.2 + Math.random() * 0.5;
        }
        continue;
      }
      v[j + 1] -= style.gravity * dt;
      p[j] += v[j] * dt;
      p[j + 1] += v[j + 1] * dt;
      p[j + 2] += v[j + 2] * dt;
    }
    this.object.geometry.attributes.position.needsUpdate = true;
  }
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Funken, die aus Lava in der Nähe von `focus` aufsteigen. */
export function lavaSparks(surfaces: Map<number, THREE.Vector3[]>, focus: THREE.Vector3): Particles {
  return new Particles({ count: 70, color: '#ffb347', size: 0.12, life: [0.5, 1.3], gravity: 3, glow: true }, (pos, vel) => {
    const cells = surfaces.get(Math.floor(focus.x + rand(-16, 16)));
    if (!cells) return false;
    const cell = cells[Math.floor(Math.random() * cells.length)];
    pos.set(cell.x + rand(-0.45, 0.45), cell.y, cell.z + rand(-0.45, 0.45));
    vel.set(rand(-0.4, 0.4), rand(1.5, 3.5), rand(-0.3, 0.3));
    return true;
  });
}

/** Schneeflocken, die langsam durchs Bild fallen. */
export function snowfall(focus: THREE.Vector3): Particles {
  return new Particles({ count: 500, color: '#ffffff', size: 0.1, life: [7, 11], gravity: 0 }, (pos, vel) => {
    pos.set(focus.x + rand(-24, 24), focus.y + rand(8, 12), rand(-12, 3));
    vel.set(rand(0.2, 0.6), rand(-1.6, -0.9), 0);
    return true;
  });
}

/** Asche, die im Nether langsam nach oben treibt. */
export function netherAsh(focus: THREE.Vector3): Particles {
  return new Particles({ count: 250, color: '#b8a89a', size: 0.08, life: [4, 8], gravity: -0.05 }, (pos, vel) => {
    pos.set(focus.x + rand(-24, 24), focus.y + rand(-8, 8), rand(-12, 3));
    vel.set(rand(0.1, 0.4), rand(0.1, 0.4), 0);
    return true;
  });
}
