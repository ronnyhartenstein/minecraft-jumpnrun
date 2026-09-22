import type { Input } from '../engine/input';
import type { Game } from '../game/game';
import type { Level } from '../levels/format';

/*
 * Level-Prüfung: Öffne das Spiel mit ?pruefen an der Adresse, z. B.
 * http://localhost:5173/minecraft-jumpnrun/?pruefen
 *
 * 1. Regeln: Anlauf nach hohen Stellen, Lücken nicht zu breit, Stufen nicht zu hoch,
 *    Platz nach oben vor Sprüngen, keine Gegner direkt hinter Sprüngen.
 * 2. Bot: Ein Roboter läuft nach rechts und springt an Hindernissen, Lücken, Lava und Gegnern.
 *    Schafft er das Level, ist es auf jeden Fall schaffbar. Scheitert er, lohnt sich ein genauer Blick.
 */

/** Wie weit und hoch Steve springen kann (in Blöcken). */
const MAX_GAP = 3;
const MAX_STEP = 2;
const MIN_RUNWAY = 5;
const MIN_HEADROOM = 5;
/** Platz zwischen einem kleinen Hindernis und der nächsten Lücke. */
const MIN_OBSTACLE_GAP = 4;
/** So nah hinter einem Sprung sollte kein Gegner stehen. */
const ENEMY_DISTANCE = 3;
const STEP = 1 / 60;
const BOT_TIMEOUT = 120;

interface BotResult {
  won: boolean;
  seconds: number;
  deaths: string[];
  diamonds: number;
  total: number;
}

/** Prüft die Level-Regeln und liefert verständliche Hinweise. */
export function checkRules(level: Level): string[] {
  const { width, height, blocks, biome } = level;
  // In Höhlen ist über dem Level Fels
  const at = (x: number, y: number) => (y < 0 ? null : y >= height ? (biome.enclosed ? 'stone' : null) : blocks[y][x]);
  const solid = (x: number, y: number) => { const b = at(x, y); return b !== null && b !== 'lava'; };

  /**
   * Höhe, auf der man in Spalte x steht: unterster Block mit genug Luft für Steve darüber (2 Blöcke).
   * 0 = Abgrund, -1 = Lava.
   */
  const top = (x: number): number => {
    for (let y = 0; y < height; y++) {
      if (at(x, y) === 'lava') return -1;
      if (solid(x, y) && !solid(x, y + 1) && !solid(x, y + 2)) return at(x, y + 1) === 'lava' ? -1 : y + 1;
    }
    return 0;
  };
  const tops = Array.from({ length: width }, (_, x) => top(x));
  const sea = biome.lavaSea;
  const hazard = (x: number) => tops[x] <= 0 || (sea !== null && tops[x] <= sea + 1);
  const what = (x: number) => (tops[x] === -1 || sea !== null ? 'Lava' : 'eine Lücke');
  /** Wie viel Platz über dem Boden ist (bis zur Decke oder bis oben). */
  const headroom = (x: number) => {
    let y = tops[x];
    while (y < height && !solid(x, y)) y++;
    return y >= height ? Infinity : y - tops[x];
  };

  const hints: string[] = [];
  const landing = new Set<number>();
  for (let x = 1; x < width; x++) {
    // Zu breite Lücke oder Lava
    if (hazard(x) && !hazard(x - 1)) {
      let end = x;
      while (end + 1 < width && hazard(end + 1)) end++;
      if (end - x + 1 > MAX_GAP) hints.push(`x=${x}–${end}: ${what(x)} ist ${end - x + 1} Blöcke breit, mehr als ${MAX_GAP} schafft Steve nicht.`);
      if (headroom(x - 1) < MIN_HEADROOM || headroom(x - 2) < MIN_HEADROOM) {
        hints.push(`x=${x - 1}: Vor ${what(x)} ist die Decke zu niedrig, Steve stößt sich beim Absprung den Kopf.`);
      }
      for (let k = end + 1; k <= end + ENEMY_DISTANCE && k < width; k++) landing.add(k);
    }
    if (hazard(x) || hazard(x - 1)) continue;
    // Zu hohe Stufe
    if (tops[x] - tops[x - 1] > MAX_STEP) hints.push(`x=${x}: Die Stufe ist ${tops[x] - tops[x - 1]} Blöcke hoch, mehr als ${MAX_STEP} schafft Steve nicht.`);
    // Hohe Stelle (z. B. Säule oder Stufe nach unten): danach genug Anlauf bis zur nächsten Gefahr?
    const next = [x + 1, x + 2].find((k) => k < width && !hazard(k));
    if (next !== undefined && tops[x] - tops[next] >= 2) {
      for (let k = x + 1; k <= x + MIN_RUNWAY + 1 && k < width; k++) {
        if (hazard(k)) {
          hints.push(`x=${x}: Nach der hohen Stelle kommt schon bei x=${k} ${what(k)}. Lass mindestens ${MIN_RUNWAY} Blöcke Anlauf.`);
          break;
        }
      }
      for (let k = x + 1; k <= x + ENEMY_DISTANCE && k < width; k++) landing.add(k);
    } else if (next !== undefined && tops[x] - tops[next] === 1 && tops[x] > tops[x - 1]) {
      // Auch hinter einem kleinen Hindernis (links und rechts niedriger) landet man ein Stück weiter
      for (let k = x + 1; k <= x + MIN_OBSTACLE_GAP && k < width; k++) {
        if (hazard(k)) {
          hints.push(`x=${x}: Direkt hinter dem Hindernis kommt bei x=${k} ${what(k)}. Wer drüberspringt, landet darin – lass mindestens ${MIN_OBSTACLE_GAP} Blöcke Platz.`);
          break;
        }
      }
    }
  }
  for (const enemy of level.enemies) {
    if (landing.has(enemy.x)) hints.push(`x=${enemy.x}: Der Gegner steht genau da, wo man nach einem Sprung landet.`);
  }
  return hints;
}

/** Lässt den Bot das Level in einer schnellen Simulation durchspielen. */
export function runBot(game: Game, input: Input, index: number): BotResult {
  game.start(index);
  const level = game.level;
  const at = (x: number, y: number) => (y >= 0 && y < level.height ? level.blocks[y][x] : null);
  const solid = (x: number, y: number) => { const b = at(x, y); return b !== null && b !== 'lava'; };
  const lava = (x: number, y: number) => at(x, y) === 'lava';
  const deaths: string[] = [];
  let hold = 0;
  let steps = 0;
  let wasPlaying = true;

  while (steps < BOT_TIMEOUT / STEP && game.status !== 'won') {
    const p = game.player;
    const scene = game.levelScene!;
    if (hold === 0 && p.onGround && game.status === 'playing') {
      const gy = Math.round(p.pos.y);
      const front = Math.floor(p.pos.x + 0.55);
      const blocked = solid(front, gy) || solid(front, gy + 1);
      const sea = level.biome.lavaSea !== null && !solid(front, gy - 1);
      const danger = sea || lava(front, gy - 1) || lava(front, gy - 2) || (!solid(front, gy - 1) && !solid(front, gy - 2));
      const enemy = scene.enemies.some((e) => e.alive && e.pos.x > p.pos.x && e.pos.x - p.pos.x < 2.2 && Math.abs(e.pos.y - p.pos.y) < 1.5);
      if (blocked || danger || enemy) {
        input.release('Space');
        input.press('Space');
        hold = 21; // Sprungtaste gut 1/3 Sekunde halten = voller Sprung
      }
    }
    input.press('ArrowRight');
    if (hold > 0) hold--;
    else input.release('Space');
    game.update(STEP);
    if (game.status === 'respawning' && wasPlaying) deaths.push(`x=${game.player.pos.x.toFixed(0)}`);
    wasPlaying = game.status === 'playing';
    steps++;
  }
  input.release('ArrowRight');
  input.release('Space');
  return {
    won: game.status === 'won',
    seconds: steps * STEP,
    deaths,
    diamonds: game.collectedDiamonds,
    total: game.levelScene!.diamonds.length,
  };
}

/** Prüft alle Level und zeigt das Ergebnis als Tabelle über dem Spiel. */
export async function runChecks(game: Game, input: Input, levels: Level[]): Promise<void> {
  const panel = document.createElement('div');
  panel.className = 'checker';
  panel.innerHTML = `<h2>Level-Prüfung</h2><table><thead><tr><th>Level</th><th>Regeln</th><th>Bot</th></tr></thead><tbody></tbody></table>
    <p class="checker-note">Der Bot läuft nur nach rechts und springt, wenn etwas im Weg ist. Schafft er ein Level nicht, ist es trotzdem vielleicht schaffbar – aber schau es dir genau an.</p>
    <button type="button">Schließen</button>`;
  document.getElementById('app')!.append(panel);
  panel.querySelector('button')!.addEventListener('click', () => {
    panel.remove();
    game.showMenu();
  });
  const body = panel.querySelector('tbody')!;
  game.testMode = true;

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const hints = [...level.warnings, ...checkRules(level)];
    const bot = runBot(game, input, i);
    const botText = bot.won
      ? `✔ ${bot.seconds.toFixed(0)} s, 💎 ${bot.diamonds}/${bot.total}${bot.deaths.length ? `, gestorben bei ${bot.deaths.join(', ')}` : ''}`
      : `✘ nicht geschafft${bot.deaths.length ? `, gestorben bei ${bot.deaths.join(', ')}` : ''}`;
    const row = document.createElement('tr');
    row.className = bot.won && bot.deaths.length === 0 && hints.length === 0 ? 'ok' : 'warn';
    row.innerHTML = `<td><b>${level.code}</b> ${escapeHtml(level.name)}</td>
      <td>${hints.length ? `<ul>${hints.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>` : '✔'}</td>
      <td>${botText}</td>`;
    body.append(row);
    // Kurz Luft holen, damit die Tabelle Zeile für Zeile erscheint
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  game.testMode = false;
  const summary = document.createElement('p');
  const bad = body.querySelectorAll('tr.warn').length;
  summary.className = 'checker-summary';
  summary.textContent = bad === 0 ? `Alle ${levels.length} Level sind in Ordnung! 🎉` : `${bad} von ${levels.length} Leveln solltest du dir anschauen.`;
  panel.insertBefore(summary, panel.querySelector('table'));
  (window as unknown as { checkResult: string }).checkResult = [...body.querySelectorAll('tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ')).join('\n');
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
