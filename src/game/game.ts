import type { Input } from '../engine/input';
import type { Level } from '../levels/format';
import { Overlay } from '../ui/overlay';
import { CameraRig } from './cameraRig';
import { BoxSteve, type Character } from './character';
import { Clouds } from './clouds';
import { GoalFlag } from './goal';
import { PHYSICS, Player, type PlayerInput } from './player';
import type { Stage } from './scene';
import { World } from './world';

/** Unterhalb dieser Höhe gilt Steve als heruntergefallen. */
const FALL_LIMIT = -4;
/** Dauer der Abblende beim Respawn, passend zur CSS-Transition. */
const FADE_TIME = 0.3;

const NO_INPUT: PlayerInput = { left: false, right: false, jumpHeld: false, jumpPressed: false };

type State = 'playing' | 'respawning' | 'won';

export class Game {
  private readonly world: World;
  private readonly clouds: Clouds;
  readonly player: Player;
  private readonly character: Character = new BoxSteve();
  private readonly cameraRig: CameraRig;
  private readonly goal: GoalFlag | null;
  private readonly overlay: Overlay;
  private state: State = 'playing';
  private stateTimer = 0;
  private playTime = 0;

  constructor(
    private readonly stage: Stage,
    private readonly input: Input,
    private readonly level: Level,
  ) {
    this.world = new World(level);
    this.clouds = new Clouds(level.width, level.height);
    this.player = new Player(this.world);
    this.cameraRig = new CameraRig(stage.camera, level.width, level.start.y + 1);
    this.goal = level.goal ? new GoalFlag(level.goal) : null;
    this.overlay = new Overlay(stage.renderer.domElement.parentElement!, () => this.restart());
    stage.scene.add(this.world.object, this.clouds.object, this.character.object);
    if (this.goal) stage.scene.add(this.goal.object);

    input.onKey('KeyR', () => this.restart());
    input.onKey('Enter', () => this.state === 'won' && this.restart());
    this.restart();
  }

  restart(): void {
    this.state = 'playing';
    this.playTime = 0;
    this.overlay.reset();
    this.respawn();
  }

  private respawn(): void {
    this.player.spawn(this.level.start);
    this.cameraRig.snap(this.player.pos);
    this.input.consumeJump();
  }

  update(dt: number): void {
    const jumpPressed = this.input.consumeJump();
    const input: PlayerInput = this.state === 'playing'
      ? { left: this.input.left, right: this.input.right, jumpHeld: this.input.jumpHeld, jumpPressed }
      : NO_INPUT;
    this.player.update(dt, input);
    this.clouds.update(dt);
    this.goal?.update(dt);

    switch (this.state) {
      case 'playing':
        this.playTime += dt;
        if (this.player.pos.x > this.level.start.x + 4) this.overlay.hideHint();
        if (this.player.pos.y < FALL_LIMIT) {
          this.state = 'respawning';
          this.stateTimer = FADE_TIME;
          this.overlay.setFade(true);
        } else if (this.goal?.reached(this.player.pos.x)) {
          this.state = 'won';
          this.overlay.showWin(this.playTime);
        }
        break;
      case 'respawning':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.respawn();
          this.overlay.setFade(false);
          this.state = 'playing';
        }
        break;
      case 'won':
        break;
    }
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
    // Beim Herunterfallen bleibt die Kamera oben, Steve fällt aus dem Bild
    if (this.state !== 'respawning') this.cameraRig.update(dt, pos, p.facing, Math.abs(p.vel.x) > 0.5);
    this.stage.followSun(this.cameraRig.focus);
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
  }
}
