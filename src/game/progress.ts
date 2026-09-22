const KEY = 'minecraft-jumpnrun';

interface Saved {
  /** So viele Level sind freigeschaltet (mindestens 1). */
  unlocked: number;
  /** Bestzeiten in Sekunden, nach Level-Name. */
  best: Record<string, number>;
}

/** Fortschritt und Bestzeiten, im Browser gespeichert. Geht das nicht (privates Fenster), gilt er nur bis zum Neuladen. */
export class Progress {
  private data: Saved = { unlocked: 1, best: {} };

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
      if (saved) this.data = { unlocked: Math.max(1, saved.unlocked ?? 1), best: saved.best ?? {} };
    } catch {
      // Ohne Speicher geht es trotzdem
    }
  }

  isUnlocked(index: number): boolean {
    return index < this.data.unlocked;
  }

  best(levelName: string): number | undefined {
    return this.data.best[levelName];
  }

  /** Merkt sich ein geschafftes Level. Liefert true bei neuer Bestzeit. */
  finish(index: number, levelName: string, seconds: number): boolean {
    const previous = this.data.best[levelName];
    const record = previous === undefined || seconds < previous;
    if (record) this.data.best[levelName] = seconds;
    this.data.unlocked = Math.max(this.data.unlocked, index + 2);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Ohne Speicher geht es trotzdem
    }
    return record;
  }
}
