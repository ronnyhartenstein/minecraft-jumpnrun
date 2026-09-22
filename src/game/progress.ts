import type { Level } from '../levels/format';

const KEY = 'minecraft-jumpnrun';

interface Saved {
  /** Bestzeiten in Sekunden, nach Level-Name. Wer eine Bestzeit hat, hat das Level geschafft. */
  best: Record<string, number>;
  /** Meiste gesammelte Diamanten in einem Durchlauf, nach Level-Name. */
  diamonds: Record<string, number>;
}

/** Fortschritt und Bestzeiten, im Browser gespeichert. Geht das nicht (privates Fenster), gilt er nur bis zum Neuladen. */
export class Progress {
  private data: Saved = { best: {}, diamonds: {} };

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
      if (saved) this.data = { best: saved.best ?? {}, diamonds: saved.diamonds ?? {} };
    } catch {
      // Ohne Speicher geht es trotzdem
    }
  }

  /**
   * Offen ist ein Level, wenn es das erste ist, das vorige geschafft wurde oder man es selbst schon geschafft hat.
   * Eigene Level sind immer offen.
   */
  isUnlocked(levels: Level[], index: number): boolean {
    const level = levels[index];
    if (level.custom || index === 0 || this.finished(level.name)) return true;
    return this.finished(levels[index - 1].name);
  }

  finished(levelName: string): boolean {
    return this.data.best[levelName] !== undefined;
  }

  best(levelName: string): number | undefined {
    return this.data.best[levelName];
  }

  diamonds(levelName: string): number {
    return this.data.diamonds[levelName] ?? 0;
  }

  /** Merkt sich ein geschafftes Level. Liefert true bei neuer Bestzeit. */
  finish(levelName: string, seconds: number, diamonds: number): boolean {
    const previous = this.data.best[levelName];
    const record = previous === undefined || seconds < previous;
    if (record) this.data.best[levelName] = seconds;
    this.data.diamonds[levelName] = Math.max(this.diamonds(levelName), diamonds);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Ohne Speicher geht es trotzdem
    }
    return record;
  }
}
