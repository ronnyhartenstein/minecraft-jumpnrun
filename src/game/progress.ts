const KEY = 'minecraft-jumpnrun';

interface Saved {
  /** So viele Level sind freigeschaltet (mindestens 1). */
  unlocked: number;
  /** Bestzeiten in Sekunden, nach Level-Name. */
  best: Record<string, number>;
  /** Meiste gesammelte Diamanten in einem Durchlauf, nach Level-Name. */
  diamonds: Record<string, number>;
}

/** Fortschritt und Bestzeiten, im Browser gespeichert. Geht das nicht (privates Fenster), gilt er nur bis zum Neuladen. */
export class Progress {
  private data: Saved = { unlocked: 1, best: {}, diamonds: {} };

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
      if (saved) {
        this.data = { unlocked: Math.max(1, saved.unlocked ?? 1), best: saved.best ?? {}, diamonds: saved.diamonds ?? {} };
      }
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

  diamonds(levelName: string): number {
    return this.data.diamonds[levelName] ?? 0;
  }

  /** Merkt sich ein geschafftes Level. Liefert true bei neuer Bestzeit. */
  finish(index: number, levelName: string, seconds: number, diamonds: number): boolean {
    const previous = this.data.best[levelName];
    const record = previous === undefined || seconds < previous;
    if (record) this.data.best[levelName] = seconds;
    this.data.diamonds[levelName] = Math.max(this.diamonds(levelName), diamonds);
    this.data.unlocked = Math.max(this.data.unlocked, index + 2);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Ohne Speicher geht es trotzdem
    }
    return record;
  }
}
