import type { Enemy, Projectile } from '../game/enemies';
import type { Player, PlayerInput } from '../game/player';
import type { Level } from '../levels/format';

/** So viele Schritte hält der Bot die Sprungtaste: gut 1/3 Sekunde = voller Sprung. */
const HOLD = 21;

/**
 * Der Prüf-Roboter: läuft immer nach rechts und springt, wenn etwas im Weg ist –
 * eine Wand, eine Lücke, Lava, ein Gegner oder ein heranfliegendes Geschoss.
 * Wird von `?pruefen` und vom Sprungtest des Endlos-Laufs benutzt.
 */
export class BotBrain {
  private hold = 0;

  constructor(private readonly level: Level) {}

  /** Entscheidet für einen Spielschritt. `canJump` = Steve ist gerade im Spiel (nicht beim Respawn). */
  step(p: Player, enemies: readonly Enemy[], projectiles: readonly Projectile[], canJump = true): PlayerInput {
    let jumpPressed = false;
    if (this.hold === 0 && p.onGround && canJump && this.wantsJump(p, enemies, projectiles)) {
      jumpPressed = true;
      this.hold = HOLD;
    }
    const jumpHeld = this.hold > 0;
    if (this.hold > 0) this.hold--;
    return { left: false, right: true, jumpHeld, jumpPressed };
  }

  private wantsJump(p: Player, enemies: readonly Enemy[], projectiles: readonly Projectile[]): boolean {
    const { level } = this;
    // Links und rechts vom Level zählt wie eine Wand (wie `World.isSolid`)
    const at = (x: number, y: number) => (x < 0 || x >= level.width ? 'stone' : y >= 0 && y < level.height ? level.blocks[y][x] : null);
    const solid = (x: number, y: number) => { const b = at(x, y); return b !== null && b !== 'lava'; };
    const lava = (x: number, y: number) => at(x, y) === 'lava';
    const gy = Math.round(p.pos.y);
    const front = Math.floor(p.pos.x + 0.55);
    const blocked = solid(front, gy) || solid(front, gy + 1);
    const sea = level.biome.lavaSea !== null && !solid(front, gy - 1);
    const danger = sea || lava(front, gy - 1) || lava(front, gy - 2) || (!solid(front, gy - 1) && !solid(front, gy - 2));
    const enemy = enemies.some((e) => e.alive && e.pos.x > p.pos.x && e.pos.x - p.pos.x < 2.2 && Math.abs(e.pos.y - p.pos.y) < 1.5);
    // Geschosse: abschätzen, wann und in welcher Höhe sie ankommen, und kurz vorher drüberspringen
    const incoming = projectiles.some((q) => {
      if (!q.flying || Math.abs(q.vel.x) < 0.1) return false;
      const dx = q.pos.x - p.pos.x;
      if (Math.sign(q.vel.x) !== -Math.sign(dx)) return false;
      const t = Math.abs(dx / q.vel.x);
      const yAtArrival = q.pos.y + q.vel.y * t;
      return t < 0.4 && yAtArrival < p.pos.y + 1.8 && yAtArrival > p.pos.y - 0.5;
    });
    return blocked || danger || enemy || incoming;
  }
}
