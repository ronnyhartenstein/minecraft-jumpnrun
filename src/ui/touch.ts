import type { Input } from '../engine/input';

/** Gerät mit Touchscreen (Handy, Tablet)? Mit ?touch an der Adresse lässt sich das am Rechner ausprobieren. */
export const isTouchDevice =
  window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || new URLSearchParams(location.search).has('touch');

/** Finger festhalten, auch wenn er aus dem Knopf rutscht (klappt nicht bei jedem Ereignis, z. B. in Tests). */
function capture(el: HTMLElement, e: PointerEvent) {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    // ohne Festhalten geht es auch
  }
}

/**
 * Touch-Steuerung: links ein Bereich zum Laufen (◀ ▶, man kann mit dem Daumen hin- und herrutschen),
 * rechts ein großer Knopf zum Springen. Mehrere Finger gleichzeitig gehen.
 */
export function createTouchControls(parent: HTMLElement, input: Input): void {
  const root = document.createElement('div');
  root.className = 'touch-controls';
  root.innerHTML = `
    <div class="touch-move"><span class="touch-left">◀</span><span class="touch-right">▶</span></div>
    <div class="touch-jump">⬆</div>`;
  parent.append(root);

  const move = root.querySelector<HTMLElement>('.touch-move')!;
  const leftIcon = root.querySelector<HTMLElement>('.touch-left')!;
  const rightIcon = root.querySelector<HTMLElement>('.touch-right')!;
  const jump = root.querySelector<HTMLElement>('.touch-jump')!;

  // Laufen: Die linke Hälfte des Bereichs ist links, die rechte Hälfte rechts
  const steer = (e: PointerEvent | null) => {
    let dir = 0;
    if (e) {
      const box = move.getBoundingClientRect();
      dir = e.clientX < box.left + box.width / 2 ? -1 : 1;
    }
    input.setVirtual('TouchLeft', dir < 0);
    input.setVirtual('TouchRight', dir > 0);
    leftIcon.classList.toggle('active', dir < 0);
    rightIcon.classList.toggle('active', dir > 0);
  };
  move.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(move, e);
    steer(e);
  });
  move.addEventListener('pointermove', (e) => move.hasPointerCapture(e.pointerId) && steer(e));
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    move.addEventListener(type, () => steer(null));
  }

  // Springen: solange der Finger liegt, gilt die Sprungtaste als gehalten (hoher Sprung)
  jump.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(jump, e);
    input.setVirtual('TouchJump', true);
    jump.classList.add('active');
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    jump.addEventListener(type, () => {
      input.setVirtual('TouchJump', false);
      jump.classList.remove('active');
    });
  }
}
