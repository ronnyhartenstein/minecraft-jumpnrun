import { Input } from './engine/input';
import { startLoop } from './engine/loop';
import { Game } from './game/game';
import { createStage } from './game/scene';
import { LEVELS } from './levels';

const stage = createStage(document.getElementById('app')!);
const input = new Input();
const game = new Game(stage, input, LEVELS);

// Direkt-Link zu einem Level, z. B. #level=3
const linked = Number(/level=(\d+)/.exec(location.hash)?.[1]) - 1;
if (linked >= 0 && linked < LEVELS.length) game.start(linked);
else game.showMenu();

startLoop(
  (dt) => game.update(dt),
  (dt, alpha) => game.render(dt, alpha),
);

// Zum Ausprobieren in der Browser-Konsole (nur beim Entwickeln)
if (import.meta.env.DEV) Object.assign(window, { game });
