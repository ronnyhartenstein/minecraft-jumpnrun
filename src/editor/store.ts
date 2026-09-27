/*
 * Eigene Level aus dem Level-Editor, im Browser gespeichert.
 * Gespeichert wird genau das Level-Dateiformat (Kopfzeilen + Raster), damit man den Text
 * 1:1 als Datei nach `levels/eigene/` legen kann.
 */

const KEY = 'minecraft-jumpnrun-custom';

export interface StoredLevel {
  id: string;
  text: string;
}

/** Ein Level, wie der Editor es bearbeitet: Kopfzeilen und Raster als Zeilen aus Zeichen. */
export interface LevelDoc {
  name: string;
  /** Biom-Name wie in der Datei, z. B. „Wiese“. */
  biome: string;
  info: string;
  /** Oben ist oben; alle Zeilen gleich lang. */
  rows: string[];
}

export function loadStoredLevels(): StoredLevel[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    if (!Array.isArray(list)) return [];
    // Kaputte Einträge überspringen statt abzustürzen
    return list.filter((e): e is StoredLevel => typeof e?.id === 'string' && typeof e?.text === 'string');
  } catch {
    return [];
  }
}

function saveAll(list: StoredLevel[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Ohne Speicher gehen die Level beim Neuladen verloren
  }
}

/** Speichert ein Level (neu oder überschreibt das mit gleicher `id`). Liefert die `id`. */
export function saveStoredLevel(text: string, id?: string): string {
  const list = loadStoredLevels();
  const levelId = id ?? `l${Date.now().toString(36)}`;
  const existing = list.find((e) => e.id === levelId);
  if (existing) existing.text = text;
  else list.push({ id: levelId, text });
  saveAll(list);
  return levelId;
}

export function deleteStoredLevel(id: string): void {
  saveAll(loadStoredLevels().filter((e) => e.id !== id));
}

/** Liest den Level-Text in Kopfzeilen und Raster (für den Editor). */
export function parseDoc(text: string): LevelDoc {
  const lines = text.replace(/\r/g, '').split('\n');
  const header: Record<string, string> = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const match = /^\s*([A-Za-zÄÖÜäöüß]+)\s*:\s*(.*)$/.exec(lines[i]);
    if (!match) break;
    header[match[1].toLowerCase()] = match[2].trim();
  }
  const raw = lines.slice(i).map((l) => l.trimEnd());
  const first = raw.findIndex((l) => l !== '');
  const last = raw.findLastIndex((l) => l !== '');
  const grid = first === -1 ? [] : raw.slice(first, last + 1);
  const width = Math.max(1, ...grid.map((l) => l.length));
  return {
    name: header.name ?? 'Mein Level',
    biome: header.biom ?? 'Wiese',
    info: header.info ?? '',
    rows: grid.map((l) => l.replace(/ /g, '.').padEnd(width, '.')),
  };
}

/** Schreibt das Level im Dateiformat. Leere Stellen am Zeilenende werden weggelassen. */
export function docToText(doc: LevelDoc): string {
  const rows = doc.rows.map((r) => r.replace(/\.+$/, '') || '.');
  const info = doc.info.trim() ? `Info: ${doc.info.trim()}\n` : '';
  return `Name: ${doc.name.trim() || 'Mein Level'}\nBiom: ${doc.biome}\n${info}\n${rows.join('\n')}\n`;
}

/** Vorlage für ein neues Level: Boden, Start links, Ziel rechts. */
export function newDoc(): LevelDoc {
  const width = 60;
  const height = 12;
  const rows = Array.from({ length: height }, (_, row) => {
    const y = height - 1 - row;
    if (y < 2) return 'D'.repeat(width);
    if (y === 2) return 'G'.repeat(width);
    if (y === 3) return '...S' + '.'.repeat(width - 10) + 'Z.....';
    return '.'.repeat(width);
  });
  return { name: 'Mein neues Level', biome: 'Wiese', info: '', rows };
}

/** Dateiname zum Herunterladen, z. B. „Meine Burg!“ → „meine-burg.txt“. */
export function fileNameFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'mein-level'}.txt`;
}
