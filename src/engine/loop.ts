/**
 * Game-Loop mit festem Timestep: Die Logik läuft immer mit STEP Sekunden,
 * gerendert wird so oft, wie der Browser es erlaubt. `alpha` (0..1) sagt,
 * wie weit wir zwischen dem letzten und dem nächsten Logik-Schritt sind.
 */
export const STEP = 1 / 60;
const MAX_FRAME = 0.25;

export function startLoop(update: (dt: number) => void, render: (dt: number, alpha: number) => void): void {
  let last = performance.now();
  let acc = 0;

  const frame = (now: number) => {
    const frameTime = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    acc += frameTime;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render(frameTime, acc / STEP);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
