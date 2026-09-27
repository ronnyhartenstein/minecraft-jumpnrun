import { loadStoredLevels } from '../editor/store';
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
      if (custom) level.source = files[path] as string;
      const numbered = /^(\d+)-(\d+)/.exec(fileName);
      if (custom) level.code = `E${i + 1}`;
      else if (numbered) [level.code, level.world] = [`${numbered[1]}-${numbered[2]}`, Number(numbered[1])];
      else level.code = String(i + 1);
      return level;
    });
}

/** Eigene Level aus dem Level-Editor, im Browser gespeichert. */
function loadBrowserLevels(): Level[] {
  return loadStoredLevels().map(({ id, text }) => {
    const level = parseLevelFile(text, 'Mein Level', true);
    level.source = text;
    level.browserId = id;
    return level;
  });
}

const fileLevels = [...load(main, false), ...load(own, true)];

/**
 * Erst die Welten in der Reihenfolge, in der sie freigeschaltet werden, dann die eigenen Level
 * (erst die Dateien, dann die aus dem Editor).
 */
export const LEVELS: Level[] = [];
refreshCustomLevels();

/** Nach dem Speichern oder Löschen im Editor: die Liste neu aufbauen, im selben Array (Spiel und Menü teilen es). */
export function refreshCustomLevels(): void {
  LEVELS.splice(0, LEVELS.length, ...fileLevels, ...loadBrowserLevels());
  LEVELS.filter((l) => l.custom).forEach((level, i) => (level.code = `E${i + 1}`));
}
