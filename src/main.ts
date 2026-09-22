import { Input } from './engine/input';
import { startLoop } from './engine/loop';
import { Game } from './game/game';
import { createStage } from './game/scene';
import level from './levels/wiese';

const stage = createStage(document.getElementById('app')!);
const input = new Input();
const game = new Game(stage, input, level);
input.onKey('KeyR', () => game.restart());

startLoop(
  (dt) => game.update(dt),
  (dt, alpha) => game.render(dt, alpha),
);

// Zum Ausprobieren in der Browser-Konsole (nur beim Entwickeln)
if (import.meta.env.DEV) Object.assign(window, { game });
