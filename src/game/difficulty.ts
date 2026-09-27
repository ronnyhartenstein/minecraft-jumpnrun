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
  /** Tempo eines Zombies, der Steve verfolgt (Blöcke pro Sekunde). */
  zombieSpeed: number;
  /** Tempo einer Spinne und Pause zwischen zwei Sprüngen auf Steve (Sekunden). */
  spiderSpeed: number;
  spiderPounce: number;
  /** Pause zwischen zwei Pfeilen eines Skeletts und Tempo der Pfeile. */
  skeletonCooldown: number;
  arrowSpeed: number;
  /** Pause zwischen zwei Giftwürfen einer Hexe … */
  witchCooldown: number;
  /** … und so lange zielt sie, nachdem sie Steve entdeckt oder sich zu ihm umgedreht hat (Sekunden). */
  witchAim: number;
  /** Pause zwischen zwei Feuer-Salven einer Lohe und Anzahl der Feuerbälle pro Salve. */
  blazeCooldown: number;
  blazeBurst: number;
  /** Tempo der Feuerbälle einer Lohe. */
  fireballSpeed: number;
  /** So oft kann sich ein Enderman in Steves Nähe teleportieren (Sekunden) … */
  endermanTeleport: number;
  /** … und so schnell greift er an (Blöcke pro Sekunde). */
  endermanSpeed: number;
  /** Pause zwischen zwei Kugeln eines Shulkers und Tempo der Kugeln. */
  shulkerCooldown: number;
  shulkerBulletSpeed: number;
  /** Endlos-Lauf: Startzeit in Sekunden (`null` = kein Zeitlimit) und Zeit dazu an jedem Checkpoint (alle 50 Blöcke). */
  endlessTime: number | null;
  endlessBonus: number;
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
    zombieSpeed: 1.5,
    spiderSpeed: 2.2,
    spiderPounce: 3,
    skeletonCooldown: 4,
    arrowSpeed: 7,
    witchCooldown: 3.0,
    witchAim: 2,
    blazeCooldown: 4.5,
    blazeBurst: 1,
    fireballSpeed: 4.5,
    endermanTeleport: 3.5,
    endermanSpeed: 1.6,
    shulkerCooldown: 3.6,
    shulkerBulletSpeed: 3.5,
    endlessTime: null,
    endlessBonus: 0,
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
    zombieSpeed: 1.8,
    spiderSpeed: 2.6,
    spiderPounce: 1.6,
    skeletonCooldown: 2.4,
    arrowSpeed: 10,
    witchCooldown: 2.3,
    witchAim: 1,
    blazeCooldown: 2.8,
    blazeBurst: 2,
    fireballSpeed: 6,
    endermanTeleport: 2.5,
    endermanSpeed: 2.0,
    shulkerCooldown: 2.7,
    shulkerBulletSpeed: 4.5,
    endlessTime: 120,
    endlessBonus: 20,
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
    zombieSpeed: 2.2,
    spiderSpeed: 3.0,
    spiderPounce: 1.1,
    skeletonCooldown: 1.7,
    arrowSpeed: 12,
    witchCooldown: 1.7,
    witchAim: 0.5,
    blazeCooldown: 2.1,
    blazeBurst: 3,
    fireballSpeed: 7.5,
    endermanTeleport: 1.8,
    endermanSpeed: 2.4,
    shulkerCooldown: 2.0,
    shulkerBulletSpeed: 5.5,
    endlessTime: 100,
    endlessBonus: 18,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['leicht', 'mittel', 'schwer'];

/** Ist `id` mindestens so schwer wie `min`? */
export function atLeast(id: DifficultyId, min: DifficultyId): boolean {
  return DIFFICULTY_ORDER.indexOf(id) >= DIFFICULTY_ORDER.indexOf(min);
}
