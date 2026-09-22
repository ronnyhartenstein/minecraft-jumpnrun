import { Input } from './engine/input';
import { startLoop } from './engine/loop';
import { Game } from './game/game';
import { createStage } from './game/scene';
import { LEVELS } from './levels';
import { createTouchControls, isTouchDevice } from './ui/touch';

const stage = createStage(document.getElementById('app')!);
const input = new Input();
const game = new Game(stage, input, LEVELS);

if (isTouchDevice) {
  document.body.classList.add('touch');
  createTouchControls(document.getElementById('app')!, input);
}
// Safari: Zoomen per Zwei-Finger-Geste im Spiel verhindern
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Direkt-Link zu einem Level, z. B. #level=2-3 oder #level=E1
const code = /level=([\w-]+)/.exec(location.hash)?.[1];
const linked = LEVELS.findIndex((level) => level.code === code);
if (linked >= 0) game.start(linked);
else game.showMenu();

// Mit ?pruefen an der Adresse spielt ein Bot alle Level durch und prüft die Level-Regeln
if (new URLSearchParams(location.search).has('pruefen')) {
  void import('./tools/checker').then(({ runChecks }) => runChecks(game, input, LEVELS));
}

startLoop(
  (dt) => game.update(dt),
  (dt, alpha) => game.render(dt, alpha),
);

// Zum Ausprobieren in der Browser-Konsole (nur beim Entwickeln)
if (import.meta.env.DEV) Object.assign(window, { game });
