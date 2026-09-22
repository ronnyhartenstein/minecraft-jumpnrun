import { startLoop } from './engine/loop';
import { Clouds } from './game/clouds';
import { createStage } from './game/scene';
import { World } from './game/world';
import level from './levels/wiese';

const stage = createStage(document.getElementById('app')!);
const world = new World(level);
const clouds = new Clouds(level.width, level.height);
stage.scene.add(world.object, clouds.object);

// Vorläufig: Kamera fährt langsam durchs Level
let camX = 8;
startLoop(
  (dt) => {
    camX = (camX + dt * 4) % level.width;
    clouds.update(dt);
  },
  () => {
    stage.camera.position.set(camX, 8, 16);
    stage.camera.lookAt(camX, 5, 0);
    stage.followSun(stage.camera.position.clone().setZ(0));
    stage.renderer.render(stage.scene, stage.camera);
  },
);
