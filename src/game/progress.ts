import type { Level } from '../levels/format';
import { DIFFICULTY_ORDER, type DifficultyId } from './difficulty';

const KEY = 'minecraft-jumpnrun';
const DIFFICULTY_KEY = 'minecraft-jumpnrun-difficulty';

interface Saved {
  /** Bestzeiten in Sekunden. Wer eine Bestzeit hat, hat das Level auf dieser Stufe geschafft. */
  best: Record<string, number>;
  /** Meiste gesammelte Diamanten in einem Durchlauf. */
  diamonds: Record<string, number>;
}

/** Speicher-Schlüssel: „Leicht“ nur mit dem Level-Namen, damit ältere Spielstände weiter gelten. */
const key = (levelName: string, difficulty: DifficultyId) => (difficulty === 'leicht' ? levelName : `${levelName}|${difficulty}`);

/** Fortschritt und Bestzeiten, im Browser gespeichert. Geht das nicht (privates Fenster), gilt er nur bis zum Neuladen. */
export class Progress {
  private data: Saved = { best: {}, diamonds: {} };
  /** Die zuletzt gewählte Schwierigkeit. */
  difficulty: DifficultyId = 'leicht';

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
      if (saved) this.data = { best: saved.best ?? {}, diamonds: saved.diamonds ?? {} };
      const difficulty = localStorage.getItem(DIFFICULTY_KEY) as DifficultyId | null;
      if (difficulty && DIFFICULTY_ORDER.includes(difficulty)) this.difficulty = difficulty;
    } catch {
      // Ohne Speicher geht es trotzdem
    }
  }

  selectDifficulty(difficulty: DifficultyId): void {
    this.difficulty = difficulty;
    try {
      localStorage.setItem(DIFFICULTY_KEY, difficulty);
    } catch {
      // Ohne Speicher gilt die Auswahl nur bis zum Neuladen
    }
  }

  /**
   * Offen ist ein Level, wenn es das erste ist, das vorige (auf irgendeiner Stufe) geschafft wurde
   * oder man es selbst schon geschafft hat. Eigene Level sind immer offen.
   */
  isUnlocked(levels: Level[], index: number): boolean {
    const level = levels[index];
    if (level.custom || index === 0 || this.finished(level.name)) return true;
    return this.finished(levels[index - 1].name);
  }

  /** Spielbar auf dieser Stufe? Schwer gibt es erst, wenn das Level auf Mittel geschafft ist. */
  isAvailable(levels: Level[], index: number, difficulty: DifficultyId): boolean {
    if (!this.isUnlocked(levels, index)) return false;
    return difficulty !== 'schwer' || this.finished(levels[index].name, 'mittel');
  }

  /** Geschafft auf dieser Stufe, oder ohne Angabe auf irgendeiner. */
  finished(levelName: string, difficulty?: DifficultyId): boolean {
    const stages = difficulty ? [difficulty] : DIFFICULTY_ORDER;
    return stages.some((d) => this.data.best[key(levelName, d)] !== undefined);
  }

  best(levelName: string, difficulty: DifficultyId): number | undefined {
    return this.data.best[key(levelName, difficulty)];
  }

  diamonds(levelName: string, difficulty: DifficultyId): number {
    return this.data.diamonds[key(levelName, difficulty)] ?? 0;
  }

  /** Merkt sich ein geschafftes Level. Liefert true bei neuer Bestzeit. */
  finish(levelName: string, difficulty: DifficultyId, seconds: number, diamonds: number): boolean {
    const k = key(levelName, difficulty);
    const previous = this.data.best[k];
    const record = previous === undefined || seconds < previous;
    if (record) this.data.best[k] = seconds;
    this.data.diamonds[k] = Math.max(this.data.diamonds[k] ?? 0, diamonds);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Ohne Speicher geht es trotzdem
    }
    return record;
  }
}
