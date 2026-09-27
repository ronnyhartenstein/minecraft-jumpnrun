import type { Level } from '../levels/format';
import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from '../game/difficulty';
import { FIGURE_ORDER, FIGURES, type FigureId } from '../game/figures';
import type { Progress } from '../game/progress';
import { isTouchDevice } from './touch';

export interface OverlayActions {
  start(index: number): void;
  restart(): void;
  next(): void;
  menu(): void;
  toggleSound(): void;
  toggleMusic(): void;
  setDifficulty(id: DifficultyId): void;
  setFigure(id: FigureId): void;
  /** Endlos-Lauf mit diesem Seed starten, `null` = neuer zufälliger Seed. */
  startEndless(seed: number | null): void;
}

/** Was die Anzeige im Endlos-Lauf zeigt. */
export interface EndlessHud {
  hearts: number;
  meters: number;
  diamonds: number;
  /** Restzeit in Sekunden, `null` = kein Zeitlimit (Leicht). */
  time: number | null;
  seed: number;
  difficulty: string;
}

/** Ergebnis eines Endlos-Laufs für das Ende-Fenster. */
export interface EndlessResult {
  reason: 'hearts' | 'time';
  meters: number;
  best: number | undefined;
  record: boolean;
  seed: number;
  difficulty: string;
}

/** So viele Herzen hat man zu Beginn; leere werden bis hierhin angezeigt, Extra-Herzen darüber hinaus. */
const START_HEARTS = 5;
/** So viele eigene Seeds stehen direkt im Menü. */
const TOP_SEEDS = 5;

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
  /** Gerade die ganze Welt auf Mittel geschafft und dafür ein Tier bekommen. */
  figureUnlocked: FigureId | null;
  difficulty: string;
}

export type FadeKind = 'fall' | 'lava' | 'hurt' | 'boom' | 'poison';

/** Pflicht-Hinweis laut den Minecraft-Nutzungsrichtlinien von Mojang. */
const DISCLAIMER = 'NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.';

const INFO_HTML = `
  <h1>Über das Spiel</h1>
  <p><b>Steves Pixel Sprint</b> ist ein kostenloses Fan-Spiel für Minecraft-Fans. Es gibt keine Werbung und nichts zu kaufen. Das Spiel lädt nichts von fremden Servern nach, und Spielstand und Bestzeiten bleiben nur in deinem Browser.</p>
  <p class="disclaimer-big">${DISCLAIMER}</p>
  <p>Dies ist kein offizielles Minecraft-Produkt. Es ist nicht von Mojang oder Microsoft genehmigt und steht in keiner Verbindung zu ihnen. Minecraft ist eine Marke von Mojang Synergies AB.</p>
  <p>Alle Grafiken, Figuren, Sounds und die Musik sind selbst gemacht bzw. werden im Spiel erzeugt – es werden keine Dateien aus Minecraft verwendet.</p>
  <p>Verantwortlich: Ronny Hartenstein · Kontakt: <a href="https://blog.rh-flow.de/impressum/" target="_blank" rel="noopener">Impressum</a><br>
  Quellcode: <a href="https://github.com/ronnyhartenstein/minecraft-jumpnrun" target="_blank" rel="noopener">GitHub</a></p>
  <div class="buttons"><button type="button" class="primary">Zurück</button></div>`;

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
  private readonly infoPanel = el('div', 'panel info hidden', INFO_HTML);
  private readonly seedsPanel = el('div', 'panel info seeds hidden');
  private readonly soundButton = el('button', 'corner-button sound-toggle') as HTMLButtonElement;
  private readonly musicButton = el('button', 'corner-button music-toggle', '🎵') as HTMLButtonElement;
  private readonly menuButton = el('button', 'corner-button menu-button', '☰') as HTMLButtonElement;

  constructor(parent: HTMLElement, private readonly levels: Level[], private readonly actions: OverlayActions) {
    this.soundButton.type = 'button';
    this.soundButton.addEventListener('click', () => {
      this.soundButton.blur();
      actions.toggleSound();
    });
    this.musicButton.type = 'button';
    this.musicButton.addEventListener('click', () => {
      this.musicButton.blur();
      actions.toggleMusic();
    });
    this.infoPanel.querySelector('button')!.addEventListener('click', (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.infoPanel.classList.add('hidden');
      this.menuPanel.classList.remove('hidden');
    });
    this.menuButton.type = 'button';
    this.menuButton.title = 'Levelauswahl (Esc)';
    this.menuButton.addEventListener('click', () => {
      this.menuButton.blur();
      actions.menu();
    });
    parent.append(
      this.fade, this.hud, this.warningBox, this.hint, this.banner, this.toastEl,
      this.win, this.menuPanel, this.infoPanel, this.seedsPanel, this.soundButton, this.musicButton, this.menuButton,
    );
  }

  setSoundIcon(muted: boolean): void {
    this.soundButton.textContent = muted ? '🔇' : '🔊';
    this.soundButton.title = muted ? 'Ton an (M)' : 'Ton aus (M)';
  }

  setMusicIcon(off: boolean): void {
    this.musicButton.classList.toggle('off', off);
    this.musicButton.title = off ? 'Musik an (N)' : 'Musik aus (N)';
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

  /** Endlos-Lauf gestartet: Banner mit Seed. */
  endlessStarted(seed: number, difficulty: string): void {
    this.setScreen('play');
    this.win.classList.add('hidden');
    this.menuPanel.classList.add('hidden');
    this.hint.classList.add('hidden');
    this.warningBox.classList.add('hidden');
    this.setFade(false);
    this.banner.innerHTML = `<small>Seed ${seed} · ${difficulty}</small>∞ Endlos-Lauf`;
    restartAnimation(this.banner, 'show');
  }

  /** Anzeige oben links im Endlos-Lauf: Herzen, Meter, Diamanten, Restzeit. */
  setEndlessHud({ hearts, meters, diamonds, time, seed, difficulty }: EndlessHud): void {
    this.hud.classList.remove('hidden');
    const heartIcons = '❤'.repeat(hearts) + '<span class="lost">❤</span>'.repeat(Math.max(0, START_HEARTS - hearts));
    const clock = time === null ? '' : `<span class="clock${time < 10 ? ' low' : ''}">⏱ ${Math.ceil(time)} s</span>`;
    this.hud.innerHTML = `<span class="hearts">${heartIcons}</span> <span class="meters">📏 ${meters} m</span>
      <span class="gem">💎</span> ${diamonds} ${clock}<small class="hud-difficulty">Seed ${seed} · ${difficulty}</small>`;
  }

  /** Ende des Endlos-Laufs: Weite, Bestweite für den Seed, Wiederholen oder neu starten. */
  showEndlessOver({ reason, meters, best, record, seed, difficulty }: EndlessResult): void {
    this.win.innerHTML = `
      <h1>${reason === 'time' ? 'Zeit abgelaufen!' : 'Lauf vorbei!'}</h1>
      <p class="win-difficulty">${difficulty} · Seed <b class="seed">${seed}</b></p>
      <p class="endless-meters">📏 ${meters} m</p>
      <p class="best">${record ? '⭐ Neue Bestweite für diesen Seed! ⭐' : best !== undefined ? `Bestweite für diesen Seed: ${best} m` : ''}</p>
      <p class="next-locked">Sag deinen Freunden den Seed – dann laufen alle dieselbe Strecke.</p>
      <div class="buttons">
        <button type="button" data-endless="repeat" class="primary">Wiederholen <small>(Enter)</small></button>
        <button type="button" data-endless="new">Neu starten <small>(R)</small></button>
        <button type="button" data-action="menu">Menü <small>(Esc)</small></button>
      </div>`;
    this.bindButtons(this.win);
    this.win.querySelectorAll<HTMLButtonElement>('button[data-endless]').forEach((button) => {
      button.addEventListener('click', () => {
        button.blur();
        this.actions.startEndless(button.dataset.endless === 'repeat' ? seed : null);
      });
    });
    this.setScreen('win');
    this.hint.classList.add('hidden');
    this.win.classList.remove('hidden');
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
      ${stats.figureUnlocked ? `<p class="unlock figure-unlock">Neue Spielfigur: ${FIGURES[stats.figureUnlocked].icon} ${FIGURES[stats.figureUnlocked].label}!<small>Du findest sie in der Levelauswahl.</small></p>` : ''}
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
    // Endlos-Lauf: eigene Spalte mit Start-Knopf, Seed-Eingabe und den besten eigenen Seeds
    const endlessBest = progress.endlessBest(difficulty);
    const seeds = progress.endlessSeeds();
    const topSeeds = seeds
      .filter((s) => s.best[difficulty] !== undefined)
      .sort((a, b) => b.best[difficulty]! - a.best[difficulty]!)
      .slice(0, TOP_SEEDS)
      .map((s) => `<button type="button" class="seed-link" data-seed="${s.seed}"><b>${s.seed}</b> ${s.best[difficulty]} m</button>`)
      .join('');
    worlds.set('<small>Immer neu</small>∞ Endlos', [`
      <button type="button" class="card endless-card">
        <span class="num">∞</span>
        <span class="name">Endlos-Lauf</span>
        <span class="status">${endlessBest !== undefined ? `🏆 ${endlessBest} m` : 'Neu!'}</span>
      </button>
      <form class="seed-form">
        <input type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="Seed" aria-label="Seed (6 Ziffern)">
        <button type="submit">Los</button>
      </form>
      ${topSeeds ? `<div class="seed-list">${topSeeds}</div>` : ''}
      ${seeds.length ? `<button type="button" class="all-seeds">🏆 Alle Seeds (${seeds.length})</button>` : ''}`]);
    // Spielfiguren: Steve und die Tiere, die man für geschaffte Welten bekommt
    const current = progress.currentFigure(this.levels);
    const figures = FIGURE_ORDER.map((id) => {
      const f = FIGURES[id];
      const free = progress.isFigureUnlocked(this.levels, id);
      const lock = free ? '' : `<small>🔒 Welt ${f.world} auf Mittel</small>`;
      return `<button type="button" data-figure="${id}" class="${id === current ? 'active' : ''}" ${free ? '' : 'disabled'} title="${f.trait}">
        <span class="icon">${f.icon}</span>${f.label}${lock}</button>`;
    }).join('');
    const columns = [...worlds].map(([title, cards]) => `<div class="world"><h3>${title}</h3>${cards.join('')}</div>`);
    this.menuPanel.innerHTML = `
      <h1>Steves Pixel Sprint<small>Ein Fan-Jump-'n'-Run für Minecraft-Fans</small></h1>
      <p class="disclaimer">${DISCLAIMER} · <button type="button" class="info-button">ℹ Über das Spiel</button></p>
      <div class="difficulty-tabs">${DIFFICULTY_ORDER.map((d) => `
        <button type="button" data-difficulty="${d}" class="${d === difficulty ? 'active' : ''}">${DIFFICULTIES[d].label}</button>`).join('')}
      </div>
      <div class="figure-tabs">${figures}</div>
      <p class="figure-trait">${FIGURES[current].icon} ${FIGURES[current].label}: ${FIGURES[current].trait}</p>
      <div class="worlds">${columns.join('')}</div>
      <p class="keys">Level anklicken · Enter = weiterspielen</p>`;
    this.setScreen('menu');
    this.menuPanel.querySelector<HTMLButtonElement>('.info-button')!.addEventListener('click', (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.menuPanel.classList.add('hidden');
      this.infoPanel.classList.remove('hidden');
    });
    this.menuPanel.querySelectorAll<HTMLButtonElement>('.difficulty-tabs button').forEach((tab) => {
      tab.addEventListener('click', () => this.actions.setDifficulty(tab.dataset.difficulty as DifficultyId));
    });
    this.menuPanel.querySelectorAll<HTMLButtonElement>('.figure-tabs button').forEach((tab) => {
      tab.addEventListener('click', () => this.actions.setFigure(tab.dataset.figure as FigureId));
    });
    this.menuPanel.querySelectorAll<HTMLButtonElement>('.seed-link').forEach((link) => {
      link.addEventListener('click', () => {
        link.blur();
        this.actions.startEndless(Number(link.dataset.seed));
      });
    });
    this.menuPanel.querySelector<HTMLButtonElement>('.all-seeds')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.showSeeds(progress);
    });
    this.menuPanel.querySelector<HTMLButtonElement>('.endless-card')!.addEventListener('click', (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.actions.startEndless(null);
    });
    const seedForm = this.menuPanel.querySelector<HTMLFormElement>('.seed-form')!;
    const seedInput = seedForm.querySelector('input')!;
    // Tasten im Eingabefeld gehören nicht dem Spiel (sonst startet z. B. Enter ein Level)
    seedInput.addEventListener('keydown', (e) => e.stopPropagation());
    seedInput.addEventListener('input', () => (seedInput.value = seedInput.value.replace(/\D/g, '').slice(0, 6)));
    seedForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!/^\d{6}$/.test(seedInput.value)) {
        seedInput.classList.add('invalid');
        seedInput.focus();
        return;
      }
      seedInput.blur();
      this.actions.startEndless(Number(seedInput.value));
    });
    this.menuPanel.querySelectorAll<HTMLButtonElement>('.card:not(.endless-card)').forEach((card) => {
      card.addEventListener('click', () => {
        card.blur();
        this.actions.start(Number(card.dataset.level));
      });
    });
    this.win.classList.add('hidden');
    this.infoPanel.classList.add('hidden');
    this.seedsPanel.classList.add('hidden');
    this.hint.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.warningBox.classList.add('hidden');
    this.banner.classList.remove('show');
    this.setFade(false);
    this.menuPanel.classList.remove('hidden');
  }

  /** Tabelle aller gespielten Seeds mit Bestweite je Stufe. Ein Klick auf eine Weite spielt den Seed auf dieser Stufe. */
  private showSeeds(progress: Progress) {
    const current = progress.difficulty;
    const rows = progress.endlessSeeds()
      .sort((a, b) => (b.best[current] ?? -1) - (a.best[current] ?? -1) || Math.max(...Object.values(b.best)) - Math.max(...Object.values(a.best)))
      .map(({ seed, best }) => `<tr><th>${seed}</th>${DIFFICULTY_ORDER.map((d) => `
        <td><button type="button" data-seed="${seed}" data-difficulty="${d}" class="${best[d] !== undefined ? '' : 'empty'}">${best[d] !== undefined ? `${best[d]} m` : '–'}</button></td>`).join('')}</tr>`)
      .join('');
    this.seedsPanel.innerHTML = `
      <h1>🏆 Deine Seeds</h1>
      <p>Bestweite je Seed und Schwierigkeit. Klick auf eine Weite, um den Seed auf dieser Stufe zu spielen.</p>
      <table><thead><tr><th>Seed</th>${DIFFICULTY_ORDER.map((d) => `<th>${DIFFICULTIES[d].label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
      <div class="buttons"><button type="button" class="primary back">Zurück</button></div>`;
    this.seedsPanel.querySelector('.back')!.addEventListener('click', () => {
      this.seedsPanel.classList.add('hidden');
      this.menuPanel.classList.remove('hidden');
    });
    this.seedsPanel.querySelectorAll<HTMLButtonElement>('button[data-seed]').forEach((button) => {
      button.addEventListener('click', () => {
        button.blur();
        this.seedsPanel.classList.add('hidden');
        this.actions.setDifficulty(button.dataset.difficulty as DifficultyId);
        this.actions.startEndless(Number(button.dataset.seed));
      });
    });
    this.menuPanel.classList.add('hidden');
    this.seedsPanel.classList.remove('hidden');
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
