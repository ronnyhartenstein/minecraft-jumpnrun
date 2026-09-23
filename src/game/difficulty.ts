export type DifficultyId = 'leicht' | 'mittel' | 'schwer';

export interface Difficulty {
  id: DifficultyId;
  label: string;
  /** So lange zischt ein Creeper, bevor er explodiert (Sekunden). */
  creeperFuse: number;
  /** Pause zwischen zwei Sprüngen eines Slimes (Sekunden) … */
  slimePause: number;
  /** … und wie weit er dabei springt (Blöcke pro Sekunde). */
  slimeHop: number;
  /** Gibt es Checkpoints? */
  checkpoints: boolean;
  /** Die gefährliche Zone der Lava: seitlicher Abstand zum Blockrand und Höhe der Oberkante. */
  lavaInset: number;
  lavaTop: number;
  /** So lange ist Steve nach einem Treffer unverwundbar (Sekunden). */
  invulnerable: number;
}

/** Alle Werte je Schwierigkeit an einem Ort. Leicht entspricht dem ursprünglichen Spiel. */
export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  leicht: {
    id: 'leicht',
    label: 'Leicht',
    creeperFuse: 1.5,
    slimePause: 0.9,
    slimeHop: 2.4,
    checkpoints: true,
    lavaInset: 0.1,
    lavaTop: 0.7,
    invulnerable: 1.5,
  },
  mittel: {
    id: 'mittel',
    label: 'Mittel',
    creeperFuse: 1.2,
    slimePause: 0.65,
    slimeHop: 2.8,
    checkpoints: true,
    lavaInset: 0.05,
    lavaTop: 0.8,
    invulnerable: 1,
  },
  schwer: {
    id: 'schwer',
    label: 'Schwer',
    creeperFuse: 0.9,
    slimePause: 0.45,
    slimeHop: 3.2,
    checkpoints: false,
    lavaInset: 0,
    lavaTop: 0.875,
    invulnerable: 0.5,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['leicht', 'mittel', 'schwer'];

/** Ist `id` mindestens so schwer wie `min`? */
export function atLeast(id: DifficultyId, min: DifficultyId): boolean {
  return DIFFICULTY_ORDER.indexOf(id) >= DIFFICULTY_ORDER.indexOf(min);
}
