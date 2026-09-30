import { BIOMES } from '../levels/biomes';
import { BIOME_CHOICES, biomeByName, blockImage, ENTRIES, PALETTE, type PaletteEntry } from './palette';
import { docToText, fileNameFor, type LevelDoc } from './store';

/** Was der Editor vom Spiel braucht. */
export interface EditorActions {
  /** Speichert den Text, liefert die Kennung im Browser-Speicher. */
  save(text: string, id: string | null): string;
  /** Speichern und das Level spielen. */
  play(id: string): void;
  /** Level-Regeln und Bot: liefert Hinweise, leer = alles in Ordnung. */
  check(id: string): string[];
  delete(id: string): void;
  close(): void;
}

const MIN_WIDTH = 10;
const MIN_HEIGHT = 6;
const MAX_UNDO = 50;
const ZOOMS = [12, 16, 20, 26, 32];

/**
 * Der Level-Editor: Klötzchen in ein Raster malen, mit Palette, Rückgängig, Prüfen und Export.
 * Ein Vollbild-Panel über dem Spiel; Tasten gehen nicht ans Spiel, solange er offen ist.
 */
export class LevelEditor {
  private readonly root = document.createElement('div');
  private readonly canvas = document.createElement('canvas');
  private readonly dialog = document.createElement('div');
  private doc!: LevelDoc;
  private id: string | null = null;
  private brush = 'G';
  private zoom = 2;
  private undo: string[][] = [];
  private dirty = false;
  private painting: string | null = null;
  /** Zuletzt gemalte Zelle, damit schnelle Striche keine Lücken haben. */
  private last: { x: number; row: number } | null = null;

  constructor(parent: HTMLElement, private readonly actions: EditorActions) {
    this.root.className = 'editor hidden';
    this.root.innerHTML = `
      <header class="editor-head">
        <label>Name <input class="ed-name" maxlength="40"></label>
        <label>Biom <select class="ed-biome">${BIOME_CHOICES.map((b) => `<option>${b.name}</option>`).join('')}</select></label>
        <label class="ed-info-label">Info <input class="ed-info" maxlength="120" placeholder="Worum geht's?"></label>
        <span class="ed-size">
          Breite <button type="button" data-size="w-">−</button><b class="ed-w"></b><button type="button" data-size="w+">+</button>
          Höhe <button type="button" data-size="h-">−</button><b class="ed-h"></b><button type="button" data-size="h+">+</button>
          Zoom <button type="button" data-zoom="-1">−</button><button type="button" data-zoom="1">+</button>
        </span>
      </header>
      <div class="editor-body">
        <aside class="ed-palette">${PALETTE.map((g) => `
          <h4>${g.title}</h4>
          <div class="ed-group">${g.entries.map((e) => `<button type="button" class="ed-tile" data-char="${escapeHtml(e.char)}" title="${e.label} (${e.char})"></button>`).join('')}</div>`).join('')}
          <p class="ed-brush"></p>
          <p class="ed-tip">Linke Maustaste malt, rechte radiert. Auf dem Tablet: Radierer wählen.</p>
        </aside>
        <div class="ed-grid"></div>
      </div>
      <footer class="editor-foot">
        <button type="button" data-cmd="undo" title="Strg+Z">↶ Rückgängig</button>
        <button type="button" data-cmd="save" class="primary">💾 Speichern</button>
        <button type="button" data-cmd="play">▶ Probespielen</button>
        <button type="button" data-cmd="check">✔ Prüfen</button>
        <button type="button" data-cmd="export">⇩ Exportieren</button>
        <button type="button" data-cmd="delete" class="danger">🗑 Löschen</button>
        <button type="button" data-cmd="close">✕ Zurück</button>
        <span class="ed-status"></span>
      </footer>`;
    this.root.querySelector('.ed-grid')!.append(this.canvas);
    this.dialog.className = 'ed-dialog hidden';
    this.root.append(this.dialog);
    parent.append(this.root);
    this.bind();
    window.addEventListener('keydown', (e) => this.onKey(e), true);
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  /** Öffnet ein Level zum Bearbeiten. `id` = Browser-Level, `null` = neu (oder Kopie eines Datei-Levels). */
  open(doc: LevelDoc, id: string | null): void {
    // Unbekannte Biome (Tippfehler in der Datei) werden zur Wiese, so wie das Spiel sie auch lädt
    const biome = BIOME_CHOICES.find((b) => b.id === biomeByName(doc.biome))!.name;
    this.doc = { ...doc, biome, rows: [...doc.rows] };
    this.id = id;
    this.undo = [];
    this.dirty = id === null;
    this.q<HTMLInputElement>('.ed-name').value = doc.name;
    this.q<HTMLSelectElement>('.ed-biome').value = biome;
    this.q<HTMLInputElement>('.ed-info').value = doc.info;
    this.hideDialog();
    this.root.classList.remove('hidden');
    this.refreshPalette();
    this.draw();
    this.status(id ? '' : 'Neu – noch nicht gespeichert');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  private q<T extends HTMLElement>(selector: string): T {
    return this.root.querySelector<T>(selector)!;
  }

  private bind() {
    this.q<HTMLInputElement>('.ed-name').addEventListener('input', (e) => this.change(() => (this.doc.name = (e.target as HTMLInputElement).value)));
    this.q<HTMLInputElement>('.ed-info').addEventListener('input', (e) => this.change(() => (this.doc.info = (e.target as HTMLInputElement).value)));
    this.q<HTMLSelectElement>('.ed-biome').addEventListener('change', (e) => {
      this.change(() => (this.doc.biome = (e.target as HTMLSelectElement).value));
      this.refreshPalette();
      this.draw();
    });
    this.root.querySelectorAll<HTMLButtonElement>('.ed-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        this.brush = tile.dataset.char!;
        this.refreshPalette();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-size]').forEach((b) => b.addEventListener('click', () => this.resize(b.dataset.size!)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      this.zoom = Math.max(0, Math.min(ZOOMS.length - 1, this.zoom + Number(b.dataset.zoom)));
      this.draw();
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((b) => b.addEventListener('click', () => {
      b.blur();
      this.command(b.dataset.cmd!);
    }));
    // Malen mit Maus, Stift oder Finger; Rechtsklick radiert
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      this.pushUndo();
      this.painting = e.button === 2 ? '.' : this.brush;
      this.paintAt(e);
    });
    this.canvas.addEventListener('pointermove', (e) => this.painting && this.paintAt(e));
    const stop = () => {
      this.painting = null;
      this.last = null;
    };
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointercancel', stop);
  }

  /** Solange der Editor offen ist, gehören alle Tasten ihm (und den Eingabefeldern), nicht dem Spiel. */
  private onKey(e: KeyboardEvent) {
    if (!this.isOpen) return;
    e.stopImmediatePropagation();
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !typing) {
      e.preventDefault();
      this.command('undo');
    }
    if (e.key === 'Escape' && !this.dialog.classList.contains('hidden')) this.hideDialog();
  }

  private change(apply: () => void) {
    apply();
    this.dirty = true;
    this.status('Nicht gespeichert');
  }

  private pushUndo() {
    this.undo.push([...this.doc.rows]);
    if (this.undo.length > MAX_UNDO) this.undo.shift();
  }

  private paintAt(e: PointerEvent) {
    const size = ZOOMS[this.zoom];
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / size);
    const row = Math.floor((e.clientY - rect.top) / size);
    // Alle Zellen seit der letzten auf einer Linie malen, sonst hat ein schneller Strich Lücken
    const from = this.last ?? { x, row };
    const steps = Math.max(Math.abs(x - from.x), Math.abs(row - from.row), 1);
    for (let i = 1; i <= steps; i++) {
      this.paintCell(Math.round(from.x + ((x - from.x) * i) / steps), Math.round(from.row + ((row - from.row) * i) / steps));
    }
    this.last = { x, row };
    this.draw();
  }

  private paintCell(x: number, row: number) {
    if (row < 0 || row >= this.doc.rows.length || x < 0 || x >= this.doc.rows[0].length) return;
    const ch = this.painting!;
    if (this.doc.rows[row][x] === ch) return;
    // Start und Ziel gibt es nur einmal: den alten Platz räumen
    if (ch === 'S' || ch === 'Z') this.doc.rows = this.doc.rows.map((r) => r.replaceAll(ch, '.'));
    const line = this.doc.rows[row];
    this.doc.rows[row] = line.slice(0, x) + ch + line.slice(x + 1);
    this.dirty = true;
    this.status('Nicht gespeichert');
  }

  private resize(what: string) {
    const { rows } = this.doc;
    const width = rows[0].length;
    if (what === 'w+') this.doc.rows = rows.map((r) => r + '.');
    else if (what === 'w-' && width > MIN_WIDTH) this.doc.rows = rows.map((r) => r.slice(0, -1));
    else if (what === 'h+') this.doc.rows = ['.'.repeat(width), ...rows];
    else if (what === 'h-' && rows.length > MIN_HEIGHT) this.doc.rows = rows.slice(1);
    else return;
    this.dirty = true;
    this.status('Nicht gespeichert');
    this.draw();
  }

  private command(cmd: string) {
    switch (cmd) {
      case 'undo': {
        const previous = this.undo.pop();
        if (previous) {
          this.doc.rows = previous;
          this.dirty = true;
          this.draw();
        }
        return;
      }
      case 'save':
        this.save();
        return this.status('✔ Gespeichert');
      case 'play':
        return this.actions.play(this.save());
      case 'check': {
        const hints = this.actions.check(this.save());
        return this.showDialog(`
          <h2>${hints.length ? '⚠ Das solltest du dir anschauen' : '✔ Alles in Ordnung!'}</h2>
          ${hints.length ? `<ul>${hints.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>` : '<p>Die Regeln passen, und der Prüf-Roboter schafft dein Level.</p>'}
          <div class="buttons"><button type="button" class="primary" data-dlg="close">OK</button></div>`);
      }
      case 'export':
        return this.showExport();
      case 'delete':
        if (this.id === null) return this.status('Noch nicht gespeichert – nichts zu löschen');
        return this.showDialog(`
          <h2>„${escapeHtml(this.doc.name)}“ löschen?</h2>
          <p>Das Level ist dann weg. Exportiere es vorher, wenn du es behalten willst.</p>
          <div class="buttons"><button type="button" class="danger" data-dlg="delete">🗑 Ja, löschen</button><button type="button" data-dlg="close">Abbrechen</button></div>`);
      case 'close':
        if (!this.dirty) return this.actions.close();
        return this.showDialog(`
          <h2>Ungespeicherte Änderungen</h2>
          <p>Möchtest du vorher speichern?</p>
          <div class="buttons"><button type="button" class="primary" data-dlg="save-close">💾 Speichern</button><button type="button" class="danger" data-dlg="discard">Verwerfen</button><button type="button" data-dlg="close">Abbrechen</button></div>`);
    }
  }

  private save(): string {
    this.id = this.actions.save(docToText(this.doc), this.id);
    this.dirty = false;
    return this.id;
  }

  private showExport() {
    const text = docToText(this.doc);
    const file = fileNameFor(this.doc.name);
    this.showDialog(`
      <h2>⇩ Exportieren</h2>
      <p>Leg den Text als Datei <b>${file}</b> in den Ordner <code>levels/eigene/</code> – dann ist dein Level fest im Spiel, auch für alle anderen.</p>
      <textarea readonly spellcheck="false">${escapeHtml(text)}</textarea>
      <div class="buttons">
        <button type="button" class="primary" data-dlg="copy">📋 Kopieren</button>
        <button type="button" data-dlg="download">⇩ Herunterladen</button>
        <button type="button" data-dlg="close">Schließen</button>
      </div>`);
    this.dialog.querySelector('textarea')!.addEventListener('focus', (e) => (e.target as HTMLTextAreaElement).select());
  }

  private showDialog(html: string) {
    this.dialog.innerHTML = `<div class="ed-dialog-box">${html}</div>`;
    this.dialog.classList.remove('hidden');
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-dlg]').forEach((b) => b.addEventListener('click', () => this.dialogAction(b)));
  }

  private hideDialog() {
    this.dialog.classList.add('hidden');
  }

  private dialogAction(button: HTMLButtonElement) {
    const text = docToText(this.doc);
    switch (button.dataset.dlg) {
      case 'copy':
        void navigator.clipboard?.writeText(text).then(
          () => (button.textContent = '✔ Kopiert'),
          () => {
            // Ohne Zwischenablage (z. B. ohne HTTPS): Text markieren, damit man ihn selbst kopieren kann
            this.dialog.querySelector('textarea')!.select();
            button.textContent = 'Strg+C drücken';
          },
        );
        return;
      case 'download': {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        link.download = fileNameFor(this.doc.name);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        return;
      }
      case 'delete':
        this.hideDialog();
        return this.actions.delete(this.id!);
      case 'save-close':
        this.save();
        this.hideDialog();
        return this.actions.close();
      case 'discard':
        this.hideDialog();
        return this.actions.close();
      default:
        this.hideDialog();
    }
  }

  private status(text: string) {
    this.q('.ed-status').textContent = text;
  }

  /** Palette neu zeichnen: G/D je nach Biom, gewählter Pinsel hervorgehoben. */
  private refreshPalette() {
    const biome = biomeByName(this.doc.biome);
    this.root.querySelectorAll<HTMLButtonElement>('.ed-tile').forEach((tile) => {
      const entry = ENTRIES.get(tile.dataset.char!)!;
      tile.classList.toggle('active', entry.char === this.brush);
      tile.replaceChildren(tileIcon(entry, biome, 28));
    });
    this.q('.ed-brush').textContent = `Pinsel: ${ENTRIES.get(this.brush)!.label}`;
  }

  /** Das Raster zeichnen: Himmel, Blöcke mit echter Textur, Gegner und Besonderes als Emoji. */
  private draw() {
    const size = ZOOMS[this.zoom];
    const { rows } = this.doc;
    const width = rows[0].length;
    const biome = biomeByName(this.doc.biome);
    this.canvas.width = width * size;
    this.canvas.height = rows.length * size;
    const ctx = this.canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    const [top, middle] = BIOMES[biome].sky;
    sky.addColorStop(0, top);
    sky.addColorStop(1, middle);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    rows.forEach((line, row) => {
      [...line].forEach((ch, x) => {
        if (ch === '.') return;
        const entry = ENTRIES.get(ch);
        if (!entry) {
          // Unbekanntes Zeichen: rot markieren, damit man es findet
          ctx.fillStyle = '#e02020';
          ctx.fillRect(x * size, row * size, size, size);
          return;
        }
        drawEntry(ctx, entry, biome, x * size, row * size, size);
      });
    });
    // Feines Gitter
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x++) ctx.moveTo(x * size + 0.5, 0), ctx.lineTo(x * size + 0.5, this.canvas.height);
    for (let y = 0; y <= rows.length; y++) ctx.moveTo(0, y * size + 0.5), ctx.lineTo(this.canvas.width, y * size + 0.5);
    ctx.stroke();
    this.q('.ed-w').textContent = String(width);
    this.q('.ed-h').textContent = String(rows.length);
    this.q<HTMLButtonElement>('[data-cmd="delete"]').disabled = this.id === null;
  }
}

function drawEntry(ctx: CanvasRenderingContext2D, entry: PaletteEntry, biome: ReturnType<typeof biomeByName>, x: number, y: number, size: number) {
  const image = blockImage(entry, biome);
  if (image) {
    ctx.drawImage(image, 0, 0, 16, 16, x, y, size, size);
    return;
  }
  if (entry.shape) {
    ctx.fillStyle = entry.shape.color;
    if (entry.shape.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const pad = size * 0.12;
      ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    }
    if (entry.badge) drawBadge(ctx, entry.badge, x, y, size);
    return;
  }
  ctx.font = `${Math.round(size * 0.8)}px system-ui, sans-serif`;
  ctx.fillText(entry.emoji ?? entry.char, x + size / 2, y + size / 2 + 1);
  if (entry.badge) drawBadge(ctx, entry.badge, x, y, size);
}

/** Kleines gelbes „ab Mittel“/„nur Schwer“-Eckchen oben rechts auf einer Kachel. */
function drawBadge(ctx: CanvasRenderingContext2D, badge: string, x: number, y: number, size: number) {
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(x + size * 0.6, y, size * 0.4, size * 0.4);
  ctx.fillStyle = '#000';
  ctx.font = `bold ${Math.round(size * 0.35)}px system-ui, sans-serif`;
  ctx.fillText(badge, x + size * 0.8, y + size * 0.21);
}

/** Kleines Bild für ein Palettenfeld. */
function tileIcon(entry: PaletteEntry, biome: ReturnType<typeof biomeByName>, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawEntry(ctx, entry, biome, 0, 0, size);
  return canvas;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
