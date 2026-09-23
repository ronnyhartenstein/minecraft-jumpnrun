import type { Level } from '../levels/format';
import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from '../game/difficulty';
import type { Progress } from '../game/progress';
import { isTouchDevice } from './touch';

export interface OverlayActions {
  start(index: number): void;
  restart(): void;
  next(): void;
  menu(): void;
  toggleSound(): void;
  setDifficulty(id: DifficultyId): void;
}

/** Was die Ziel-Anzeige über den Durchlauf wissen muss. */
export interface WinStats {
  seconds: number;
  best: number | undefined;
  record: boolean;
  diamonds: number;
  total: number;
  hasNext: boolean;
  /** Es gibt ein nächstes Level, aber auf Schwer muss man es erst auf Mittel schaffen. */
  nextNeedsMedium: boolean;
  /** Gerade zum ersten Mal auf Mittel geschafft. */
  hardUnlocked: boolean;
  difficulty: string;
}

export type FadeKind = 'fall' | 'lava' | 'hurt' | 'boom';

export const formatTime = (seconds: number) => `${seconds.toFixed(1).replace('.', ',')} s`;

/** Alles, was als HTML über dem 3D-Bild liegt: Menü, Überblendung, Hinweise, Ziel-Anzeige. */
export class Overlay {
  private readonly fade = el('div', 'fade');
  private readonly hint = el('div', 'hint hidden', isTouchDevice
    ? 'Links <span class="keys">◀ ▶</span> laufen &nbsp;·&nbsp; rechts <span class="keys">⬆</span> springen'
    : '<span class="keys">← →</span> laufen &nbsp;·&nbsp; Leertaste springen');
  private readonly banner = el('div', 'banner');
  private readonly toastEl = el('div', 'toast');
  private readonly hud = el('div', 'hud hidden');
  private readonly warningBox = el('div', 'warnings hidden');
  private readonly win = el('div', 'panel win hidden');
  private readonly menuPanel = el('div', 'panel menu hidden');
  private readonly soundButton = el('button', 'corner-button sound-toggle') as HTMLButtonElement;
  private readonly menuButton = el('button', 'corner-button menu-button', '☰') as HTMLButtonElement;

  constructor(parent: HTMLElement, private readonly levels: Level[], private readonly actions: OverlayActions) {
    this.soundButton.type = 'button';
    this.soundButton.addEventListener('click', () => {
      this.soundButton.blur();
      actions.toggleSound();
    });
    this.menuButton.type = 'button';
    this.menuButton.title = 'Levelauswahl (Esc)';
    this.menuButton.addEventListener('click', () => {
      this.menuButton.blur();
      actions.menu();
    });
    parent.append(
      this.fade, this.hud, this.warningBox, this.hint, this.banner, this.toastEl,
      this.win, this.menuPanel, this.soundButton, this.menuButton,
    );
  }

  setSoundIcon(muted: boolean): void {
    this.soundButton.textContent = muted ? '🔇' : '🔊';
    this.soundButton.title = muted ? 'Ton an (M)' : 'Ton aus (M)';
  }

  setFade(dark: boolean, kind: FadeKind = 'fall'): void {
    this.fade.className = `fade ${kind}${dark ? ' dark' : ''}`;
  }

  hideHint(): void {
    this.hint.classList.add('hidden');
  }

  /** Beim Start eines Levels: Titel einblenden, Tastenhinweis nur im ersten Level. */
  /** Welcher Bildschirm gerade zu sehen ist; danach richten sich z. B. die Touch-Knöpfe. */
  private setScreen(screen: 'menu' | 'play' | 'win') {
    document.body.dataset.screen = screen;
  }

  levelStarted(index: number, difficulty: string): void {
    this.setScreen('play');
    this.win.classList.add('hidden');
    this.menuPanel.classList.add('hidden');
    this.hint.classList.toggle('hidden', index > 0);
    this.setFade(false);
    const level = this.levels[index];
    const label = level.custom ? 'Eigenes Level' : level.world !== null ? `Welt ${level.code}` : `Level ${level.code}`;
    this.banner.innerHTML = `<small>${label} · ${difficulty}</small>${escapeHtml(level.name)}`;
    restartAnimation(this.banner, 'show');
    this.showWarnings(level.warnings);
  }

  /** Fehler im Level gut sichtbar anzeigen, damit man sie beim Level-Bauen sofort findet. */
  private showWarnings(warnings: string[]) {
    this.warningBox.classList.toggle('hidden', warnings.length === 0);
    const shown = warnings.slice(0, 5).map((w) => `<li>${escapeHtml(w)}</li>`).join('');
    const more = warnings.length > 5 ? `<li>… und ${warnings.length - 5} weitere</li>` : '';
    this.warningBox.innerHTML = `<strong>⚠ Im Level stimmt etwas nicht:</strong><ul>${shown}${more}</ul>`;
  }

  /** Anzeige oben links: Diamanten und Schwierigkeit. `null` blendet sie aus. */
  setDiamonds(text: string | null, difficulty: string): void {
    this.hud.classList.toggle('hidden', text === null);
    if (text === null) return;
    const gems = text ? `<span class="gem">💎</span> ${text} &nbsp;` : '';
    this.hud.innerHTML = `${gems}<small class="hud-difficulty">${difficulty}</small>`;
  }

  /** Kleiner Hüpfer des Zählers beim Einsammeln. */
  bumpDiamonds(): void {
    restartAnimation(this.hud, 'bump');
  }

  /** Kurze Meldung oben, z. B. beim Checkpoint. */
  toast(text: string): void {
    this.toastEl.textContent = text;
    restartAnimation(this.toastEl, 'show');
  }

  showWin(index: number, stats: WinStats): void {
    const { seconds, best, record, diamonds, total, hasNext } = stats;
    const level = this.levels[index];
    // Das nächste Level derselben Gruppe, auch wenn es auf dieser Stufe noch gesperrt ist
    const following = this.levels[index + 1];
    const next = following?.custom === level.custom ? following : undefined;
    // Pokal nach der letzten Welt, nicht nach eigenen Leveln
    const last = next === undefined && !level.custom;
    const worldDone = level.world !== null && !last && next?.world !== level.world;
    const title = last ? 'Alle Welten geschafft!' : worldDone ? `Welt ${level.world} geschafft!` : 'Geschafft!';
    const nextWorld = worldDone && next && hasNext ? `<p class="next-world">Weiter geht's in Welt ${next.world}: ${next.biome.name}</p>` : '';
    const gems = total === 0 ? '' : diamonds === total
      ? `<p class="gems"><span class="gem">💎</span> ${diamonds}/${total} &nbsp;Alle gefunden! ⭐</p>`
      : `<p class="gems"><span class="gem">💎</span> ${diamonds}/${total}</p>`;
    this.win.innerHTML = `
      <h1>${title}</h1>
      <p class="win-difficulty">${stats.difficulty}</p>
      ${stats.hardUnlocked ? '<p class="unlock">🔥 Schwer freigeschaltet! 🔥</p>' : ''}
      ${last ? '<p class="trophy">🏆</p>' : ''}
      ${nextWorld}
      <p class="time">Zeit: ${formatTime(seconds)}</p>
      ${gems}
      <p class="best">${record ? '⭐ Neue Bestzeit! ⭐' : best !== undefined ? `Bestzeit: ${formatTime(best)}` : ''}</p>
      ${stats.nextNeedsMedium ? '<p class="next-locked">Das nächste Level gibt es auf Schwer erst, wenn du es auf Mittel geschafft hast.</p>' : ''}
      <div class="buttons">
        ${hasNext ? '<button type="button" data-action="next" class="primary">Weiter <small>(Enter)</small></button>' : ''}
        <button type="button" data-action="restart">Nochmal <small>(R)</small></button>
        <button type="button" data-action="menu">Levelauswahl <small>(Esc)</small></button>
      </div>`;
    this.bindButtons(this.win);
    this.setScreen('win');
    this.hint.classList.add('hidden');
    this.warningBox.classList.add('hidden');
    this.win.classList.remove('hidden');
  }

  showMenu(progress: Progress): void {
    const difficulty = progress.difficulty;
    const card = (level: Level, i: number) => {
      const locked = !progress.isAvailable(this.levels, i, difficulty);
      // Auf Schwer gesperrt, obwohl das Level offen ist: erst auf Mittel schaffen
      const needsMedium = locked && progress.isUnlocked(this.levels, i);
      const best = progress.best(level.name, difficulty);
      const total = level.diamonds.length;
      const found = progress.diamonds(level.name, difficulty);
      const gems = total ? `<span class="gem">💎</span> ${found}/${total}${found === total ? ' ⭐' : ''}` : '';
      // Kleine Marken L M S: auf welchen Stufen ist das Level schon geschafft?
      const stages = DIFFICULTY_ORDER.map((d) => `<i class="${progress.finished(level.name, d) ? 'done' : ''}">${DIFFICULTIES[d].label[0]}</i>`).join('');
      const status = needsMedium
        ? '<span class="lock">🔒</span><br>erst Mittel'
        : locked
          ? '<span class="lock">🔒</span>'
          : best !== undefined ? `⏱ ${formatTime(best)}<br>${gems}` : 'Neu!';
      return `
        <button type="button" class="card" data-level="${i}" ${locked ? 'disabled' : ''} style="--biome: ${level.biome.color}">
          <span class="num">${level.code}</span>
          <span class="name">${escapeHtml(level.name)}</span>
          <span class="status">${status}</span>
          ${progress.finished(level.name) ? `<span class="stages">${stages}</span>` : ''}
        </button>`;
    };
    // Eine Spalte pro Welt, darin die Level untereinander
    const worlds = new Map<string, string[]>();
    const own: string[] = [];
    this.levels.forEach((level, i) => {
      if (level.custom) return own.push(card(level, i));
      const key = level.world !== null ? `<small>Welt ${level.world}</small>${level.biome.name}` : '<small>Weitere</small>Level';
      if (!worlds.has(key)) worlds.set(key, []);
      worlds.get(key)!.push(card(level, i));
    });
    // Eigene Level stehen als eigene Spalte neben den Welten
    if (own.length) worlds.set('<small>Selbst gebaut</small>Eigene', own);
    const columns = [...worlds].map(([title, cards]) => `<div class="world"><h3>${title}</h3>${cards.join('')}</div>`);
    this.menuPanel.innerHTML = `
      <h1>Minecraft Jump 'n' Run</h1>
      <div class="difficulty-tabs">${DIFFICULTY_ORDER.map((d) => `
        <button type="button" data-difficulty="${d}" class="${d === difficulty ? 'active' : ''}">${DIFFICULTIES[d].label}</button>`).join('')}
      </div>
      <div class="worlds">${columns.join('')}</div>
      <p class="keys">Level anklicken · Enter = weiterspielen</p>`;
    this.setScreen('menu');
    this.menuPanel.querySelectorAll<HTMLButtonElement>('.difficulty-tabs button').forEach((tab) => {
      tab.addEventListener('click', () => this.actions.setDifficulty(tab.dataset.difficulty as DifficultyId));
    });
    this.menuPanel.querySelectorAll<HTMLButtonElement>('.card').forEach((card) => {
      card.addEventListener('click', () => {
        card.blur();
        this.actions.start(Number(card.dataset.level));
      });
    });
    this.win.classList.add('hidden');
    this.hint.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.warningBox.classList.add('hidden');
    this.banner.classList.remove('show');
    this.setFade(false);
    this.menuPanel.classList.remove('hidden');
  }

  private bindButtons(root: HTMLElement) {
    root.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        button.blur(); // sonst löst die Leertaste zum Springen den Button erneut aus
        this.actions[button.dataset.action as 'next' | 'restart' | 'menu']();
      });
    });
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function restartAnimation(node: HTMLElement, className: string) {
  node.classList.remove(className);
  void node.offsetWidth; // erzwingt, dass die CSS-Animation von vorn beginnt
  node.classList.add(className);
}

function el(tag: string, className: string, html = ''): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.innerHTML = html;
  return node;
}
