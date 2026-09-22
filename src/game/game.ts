import type { Input } from '../engine/input';
import type { Level } from '../levels/format';
import { CameraRig } from './cameraRig';
import { BoxSteve, type Character } from './character';
import { Clouds } from './clouds';
import { PHYSICS, Player } from './player';
import type { Stage } from './scene';
import { World } from './world';

export class Game {
  private readonly world: World;
  private readonly clouds: Clouds;
  readonly player: Player;
  private readonly character: Character = new BoxSteve();
  private readonly cameraRig: CameraRig;

  constructor(
    private readonly stage: Stage,
    private readonly input: Input,
    private readonly level: Level,
  ) {
    this.world = new World(level);
    this.clouds = new Clouds(level.width, level.height);
    this.player = new Player(this.world);
    this.cameraRig = new CameraRig(stage.camera, level.width, level.start.y + 1);
    stage.scene.add(this.world.object, this.clouds.object, this.character.object);
    this.restart();
  }

  restart(): void {
    this.player.spawn(this.level.start);
    this.cameraRig.snap(this.player.pos);
  }

  update(dt: number): void {
    this.player.update(dt, {
      left: this.input.left,
      right: this.input.right,
      jumpHeld: this.input.jumpHeld,
      jumpPressed: this.input.consumeJump(),
    });
    this.clouds.update(dt);
  }

  render(dt: number, alpha: number): void {
    const p = this.player;
    const pos = p.prevPos.clone().lerp(p.pos, alpha);
    this.character.object.position.set(pos.x, pos.y, 0);
    this.character.update(dt, {
      speed: Math.abs(p.vel.x),
      maxSpeed: PHYSICS.maxSpeed,
      onGround: p.onGround,
      facing: p.facing,
    });
    this.cameraRig.update(dt, pos, p.facing, Math.abs(p.vel.x) > 0.5);
    this.stage.followSun(this.cameraRig.focus);
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
  }
}
