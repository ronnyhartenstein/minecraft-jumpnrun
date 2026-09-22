const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const JUMP = ['Space', 'KeyW', 'ArrowUp'];
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...JUMP, 'ArrowDown']);

/** Tastatur-Eingabe. Ein Sprung-Tastendruck wird gemerkt, bis das Spiel ihn abholt. */
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
