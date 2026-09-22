import { parseLevelFile, type Level } from './format';

/*
 * Alle Level kommen aus Textdateien im Ordner `levels/`, sortiert nach Dateinamen.
 * Der Dateiname legt Welt und Nummer fest: `2-3-tempel.txt` ist Level 2-3.
 * Selbst gebaute Level in `levels/eigene/` erscheinen im Menü unter „Eigene Level“.
 * Neue Dateien tauchen automatisch im Spiel auf, dafür muss hier nichts geändert werden.
 */
const main = import.meta.glob('/levels/*.txt', { query: '?raw', import: 'default', eager: true });
const own = import.meta.glob('/levels/eigene/*.txt', { query: '?raw', import: 'default', eager: true });

function load(files: Record<string, unknown>, custom: boolean): Level[] {
  return Object.keys(files)
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
    .map((path, i) => {
      const fileName = path.split('/').pop()!;
      const level = parseLevelFile(files[path] as string, fileName, custom);
      const numbered = /^(\d+)-(\d+)/.exec(fileName);
      if (custom) level.code = `E${i + 1}`;
      else if (numbered) [level.code, level.world] = [`${numbered[1]}-${numbered[2]}`, Number(numbered[1])];
      else level.code = String(i + 1);
      return level;
    });
}

/** Erst die Welten in der Reihenfolge, in der sie freigeschaltet werden, dann die eigenen Level. */
export const LEVELS: Level[] = [...load(main, false), ...load(own, true)];
