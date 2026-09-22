/**
 * Game-Loop mit festem Timestep: Die Logik läuft immer mit STEP Sekunden,
 * gerendert wird so oft, wie der Browser es erlaubt.
 */
export const STEP = 1 / 60;
const MAX_FRAME = 0.25;

export function startLoop(update: (dt: number) => void, render: (dt: number) => void): void {
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
    render(frameTime);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
