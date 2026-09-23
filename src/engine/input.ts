// Neben echten Tasten gibt es „virtuelle“ für Touch-Buttons (Touch…) und Gamepads (Pad…)
const LEFT = ['ArrowLeft', 'KeyA', 'TouchLeft', 'PadLeft'];
const RIGHT = ['ArrowRight', 'KeyD', 'TouchRight', 'PadRight'];
const JUMP = ['Space', 'KeyW', 'ArrowUp', 'TouchJump', 'PadJump'];
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...JUMP, 'ArrowDown']);

/** Tastatur, Touch und Gamepad. Ein Sprung-Tastendruck wird gemerkt, bis das Spiel ihn abholt. */
export class Input {
  private readonly down = new Set<string>();
  private jumpQueued = false;
  private readonly listeners = new Map<string, () => void>();
  /** Wird bei jeder Eingabe aufgerufen, z. B. um den Ton freizuschalten. */
  onAnyInput: () => void = () => {};

  constructor() {
    window.addEventListener('pointerdown', () => this.onAnyInput());
    window.addEventListener('keydown', (e) => {
      this.onAnyInput();
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!e.repeat) {
        if (JUMP.includes(e.code)) this.jumpQueued = true;
        this.listeners.get(e.code)?.();
      }
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  get left(): boolean {
    return LEFT.some((k) => this.down.has(k));
  }

  get right(): boolean {
    return RIGHT.some((k) => this.down.has(k));
  }

  get jumpHeld(): boolean {
    return JUMP.some((k) => this.down.has(k));
  }

  /** Tasten per Programm drücken und loslassen (für die automatische Level-Prüfung). */
  press(code: string): void {
    if (JUMP.includes(code) && !this.down.has(code)) this.jumpQueued = true;
    this.down.add(code);
  }

  release(code: string): void {
    this.down.delete(code);
  }

  /** Virtuelle Taste an- oder ausschalten, nur bei Änderung. */
  setVirtual(code: string, on: boolean): void {
    if (on && !this.down.has(code)) {
      this.onAnyInput();
      this.press(code);
    } else if (!on && this.down.has(code)) {
      this.release(code);
    }
  }

  /** Löst aus, was sonst ein Tastendruck auslöst, z. B. „Enter“ über die A-Taste am Gamepad. */
  trigger(code: string): void {
    this.listeners.get(code)?.();
  }

  /** Liefert true, wenn seit dem letzten Aufruf Springen gedrückt wurde. */
  consumeJump(): boolean {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  onKey(code: string, fn: () => void): void {
    this.listeners.set(code, fn);
  }
}
