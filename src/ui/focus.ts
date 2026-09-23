import type { Direction } from '../engine/gamepad';

/*
 * Auswahl in Menüs ohne Maus, z. B. mit dem Gamepad: Das Steuerkreuz springt zum nächsten Knopf
 * in dieser Richtung (nach Lage auf dem Bildschirm), A drückt den ausgewählten Knopf.
 */

const FOCUS = 'pad-focus';

/** Knöpfe, die man gerade auswählen kann: in sichtbaren Panels und nicht gesperrt. */
function candidates(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('.panel:not(.hidden) button:not(:disabled)')];
}

function center(el: Element) {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function select(button: HTMLButtonElement) {
  document.querySelectorAll(`.${FOCUS}`).forEach((el) => el.classList.remove(FOCUS));
  button.classList.add(FOCUS);
  button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function moveFocus(direction: Direction): void {
  const buttons = candidates();
  const current = buttons.find((b) => b.classList.contains(FOCUS));
  if (!current) {
    if (buttons[0]) select(buttons[0]);
    return;
  }
  const from = center(current);
  let best: HTMLButtonElement | undefined;
  let bestScore = Infinity;
  for (const button of buttons) {
    if (button === current) continue;
    const to = center(button);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // Wie weit liegt der Knopf in Pfeilrichtung, und wie weit daneben?
    const [ahead, aside] = { left: [-dx, dy], right: [dx, dy], up: [-dy, dx], down: [dy, dx] }[direction];
    if (ahead <= 1) continue;
    const score = ahead + Math.abs(aside) * 2;
    if (score < bestScore) [best, bestScore] = [button, score];
  }
  if (best) select(best);
}

/** Drückt den ausgewählten Knopf. Liefert false, wenn keiner ausgewählt ist. */
export function confirmFocus(): boolean {
  const button = candidates().find((b) => b.classList.contains(FOCUS));
  button?.click();
  return button !== undefined;
}
