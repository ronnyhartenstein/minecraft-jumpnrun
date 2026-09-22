import { parseLevelFile, type Level } from './format';

/*
 * Alle Level kommen aus Textdateien im Ordner `levels/`, sortiert nach Dateinamen.
 * Selbst gebaute Level in `levels/eigene/` erscheinen im Menü unter „Eigene Level“.
 * Neue Dateien tauchen automatisch im Spiel auf, dafür muss hier nichts geändert werden.
 */
const main = import.meta.glob('/levels/*.txt', { query: '?raw', import: 'default', eager: true });
const own = import.meta.glob('/levels/eigene/*.txt', { query: '?raw', import: 'default', eager: true });

function load(files: Record<string, unknown>, custom: boolean): Level[] {
  return Object.keys(files)
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
    .map((path) => parseLevelFile(files[path] as string, path.split('/').pop()!, custom));
}

/** Erst die Welten in der Reihenfolge, in der sie freigeschaltet werden, dann die eigenen Level. */
export const LEVELS: Level[] = [...load(main, false), ...load(own, true)];
