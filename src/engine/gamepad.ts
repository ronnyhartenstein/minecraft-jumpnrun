import type { Input } from './input';

/** Ab dieser Auslenkung zählt der Analogstick als gedrückt. */
const STICK_DEADZONE = 0.5;
/** Tasten nach der Standard-Belegung der Gamepad-API (Xbox-, PlayStation- und Switch-Controller). */
const A = 0;
const START = 9;
const UP = 12;
const DOWN = 13;
const LEFT = 14;
const RIGHT = 15;

export type Direction = 'left' | 'right' | 'up' | 'down';

export interface GamepadHandlers {
  /** Steuerkreuz oder Stick wurde in eine Richtung gedrückt (für Menüs). */
  navigate(direction: Direction): void;
  /** A wurde gedrückt (zum Bestätigen in Menüs; im Spiel springt Steve ohnehin). */
  confirm(): void;
  /** Start wurde gedrückt. */
  menu(): void;
  /** Ein Gamepad wurde angeschlossen. */
  connected(): void;
}

/**
 * Gamepad-Steuerung über die Gamepad-API: Stick oder Steuerkreuz laufen, A springt.
 * In Menüs wählt das Steuerkreuz aus und A bestätigt. Start öffnet die Levelauswahl.
 */
export class GamepadInput {
  private readonly held = new Set<string>();

  constructor(private readonly input: Input, private readonly handlers: GamepadHandlers) {
    window.addEventListener('gamepadconnected', () => handlers.connected());
  }

  /** Einmal pro Spielschritt aufrufen. */
  poll(): void {
    const pads = navigator.getGamepads?.() ?? [];
    let left = false;
    let right = false;
    let up = false;
    let down = false;
    let a = false;
    let start = false;
    for (const pad of pads) {
      if (!pad) continue;
      const [x = 0, y = 0] = pad.axes;
      const pressed = (i: number) => !!pad.buttons[i]?.pressed;
      left ||= x < -STICK_DEADZONE || pressed(LEFT);
      right ||= x > STICK_DEADZONE || pressed(RIGHT);
      up ||= y < -STICK_DEADZONE || pressed(UP);
      down ||= y > STICK_DEADZONE || pressed(DOWN);
      a ||= pressed(A);
      start ||= pressed(START);
    }

    // Laufen und Springen wie mit der Tastatur
    this.input.setVirtual('PadLeft', left);
    this.input.setVirtual('PadRight', right);
    this.input.setVirtual('PadJump', a);

    // Einmalige Aktionen nur im Moment des Drückens
    if (this.pressedNow('left', left)) this.handlers.navigate('left');
    if (this.pressedNow('right', right)) this.handlers.navigate('right');
    if (this.pressedNow('up', up)) this.handlers.navigate('up');
    if (this.pressedNow('down', down)) this.handlers.navigate('down');
    if (this.pressedNow('a', a)) this.handlers.confirm();
    if (this.pressedNow('start', start)) this.handlers.menu();
  }

  private pressedNow(name: string, on: boolean): boolean {
    const was = this.held.has(name);
    if (on) this.held.add(name);
    else this.held.delete(name);
    return on && !was;
  }
}
