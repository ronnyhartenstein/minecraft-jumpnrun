import type { Level } from '../levels/format';
import type { Progress } from '../game/progress';

export interface OverlayActions {
  start(index: number): void;
  restart(): void;
  next(): void;
  menu(): void;
  toggleSound(): void;
}

export type FadeKind = 'fall' | 'lava';

export const formatTime = (seconds: number) => `${seconds.toFixed(1).replace('.', ',')} s`;

/** Alles, was als HTML über dem 3D-Bild liegt: Menü, Überblendung, Hinweise, Ziel-Anzeige. */
export class Overlay {
  private readonly fade = el('div', 'fade');
  private readonly hint = el('div', 'hint hidden', '<span class="keys">← →</span> laufen &nbsp;·&nbsp; Leertaste springen');
  private readonly banner = el('div', 'banner');
  private readonly toastEl = el('div', 'toast');
  private readonly hud = el('div', 'hud hidden');
  private readonly win = el('div', 'panel win hidden');
  private readonly menuPanel = el('div', 'panel menu hidden');
  private readonly soundButton = el('button', 'sound-toggle') as HTMLButtonElement;

  constructor(parent: HTMLElement, private readonly levels: Level[], private readonly actions: OverlayActions) {
    this.soundButton.type = 'button';
    this.soundButton.addEventListener('click', () => {
      this.soundButton.blur();
      actions.toggleSound();
    });
    parent.append(this.fade, this.hud, this.hint, this.banner, this.toastEl, this.win, this.menuPanel, this.soundButton);
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
  levelStarted(index: number): void {
    this.win.classList.add('hidden');
    this.menuPanel.classList.add('hidden');
    this.hint.classList.toggle('hidden', index > 0);
    this.setFade(false);
    this.banner.innerHTML = `<small>Level ${index + 1}</small>${this.levels[index].name}`;
    restartAnimation(this.banner, 'show');
  }

  /** Diamanten-Zähler oben links, `null` blendet ihn aus. */
  setDiamonds(text: string | null): void {
    this.hud.classList.toggle('hidden', text === null);
    if (text !== null) this.hud.innerHTML = `<span class="gem">💎</span> ${text}`;
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

  showWin(index: number, seconds: number, best: number | undefined, record: boolean, diamonds: number, total: number): void {
    const last = index === this.levels.length - 1;
    const gems = total === 0 ? '' : diamonds === total
      ? `<p class="gems"><span class="gem">💎</span> ${diamonds}/${total} &nbsp;Alle gefunden! ⭐</p>`
      : `<p class="gems"><span class="gem">💎</span> ${diamonds}/${total}</p>`;
    this.win.innerHTML = `
      <h1>${last ? 'Alle Level geschafft!' : 'Geschafft!'}</h1>
      ${last ? '<p class="trophy">🏆</p>' : ''}
      <p class="time">Zeit: ${formatTime(seconds)}</p>
      ${gems}
      <p class="best">${record ? '⭐ Neue Bestzeit! ⭐' : best !== undefined ? `Bestzeit: ${formatTime(best)}` : ''}</p>
      <div class="buttons">
        ${last ? '' : '<button type="button" data-action="next" class="primary">Weiter <small>(Enter)</small></button>'}
        <button type="button" data-action="restart">Nochmal <small>(R)</small></button>
        <button type="button" data-action="menu">Levelauswahl <small>(Esc)</small></button>
      </div>`;
    this.bindButtons(this.win);
    this.hint.classList.add('hidden');
    this.win.classList.remove('hidden');
  }

  showMenu(progress: Progress): void {
    const cards = this.levels.map((level, i) => {
      const locked = !progress.isUnlocked(i);
      const best = progress.best(level.name);
      const total = level.diamonds.length;
      const found = progress.diamonds(level.name);
      const gems = total ? `<span class="gem">💎</span> ${found}/${total}${found === total ? ' ⭐' : ''}` : '';
      const status = locked
        ? '<span class="lock">🔒</span>'
        : best !== undefined ? `⏱ ${formatTime(best)}<br>${gems}` : 'Neu!';
      return `
        <button type="button" class="card" data-level="${i}" ${locked ? 'disabled' : ''} style="--biome: ${level.biome.color}">
          <span class="num">${i + 1}</span>
          <span class="name">${level.name}</span>
          <span class="status">${status}</span>
        </button>`;
    });
    this.menuPanel.innerHTML = `
      <h1>Minecraft<br>Jump 'n' Run</h1>
      <div class="cards">${cards.join('')}</div>
      <p class="keys">Level anklicken oder Taste 1–${this.levels.length}</p>`;
    this.menuPanel.querySelectorAll<HTMLButtonElement>('.card').forEach((card) => {
      card.addEventListener('click', () => {
        card.blur();
        this.actions.start(Number(card.dataset.level));
      });
    });
    this.win.classList.add('hidden');
    this.hint.classList.add('hidden');
    this.hud.classList.add('hidden');
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
