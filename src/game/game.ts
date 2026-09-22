import * as THREE from 'three';
import type { Input } from '../engine/input';
import type { Level } from '../levels/format';
import { animateBlocks } from '../textures/blocks';
import { Overlay, type FadeKind } from '../ui/overlay';
import { CameraRig } from './cameraRig';
import { BoxSteve, type Character } from './character';
import { LevelScene } from './levelScene';
import { PHYSICS, Player, type PlayerInput } from './player';
import { Progress } from './progress';
import type { Stage } from './scene';

/** Unterhalb dieser Höhe gilt Steve als heruntergefallen. */
const FALL_LIMIT = -4;
/** Dauer der Abblende beim Respawn, passend zur CSS-Transition. */
const FADE_TIME = 0.3;

const NO_INPUT: PlayerInput = { left: false, right: false, jumpHeld: false, jumpPressed: false };

type State = 'menu' | 'playing' | 'respawning' | 'won';

export class Game {
  player!: Player;
  private scene: LevelScene | null = null;
  private index = 0;
  private readonly character: Character = new BoxSteve();
  /** Kleines Licht, das Steve in dunklen Leveln mit sich trägt. */
  private readonly lantern = new THREE.PointLight('#ffd9a0', 10, 9, 1);
  private readonly cameraRig: CameraRig;
  private readonly overlay: Overlay;
  private readonly progress = new Progress();
  private state: State = 'menu';
  private stateTimer = 0;
  private playTime = 0;

  constructor(
    private readonly stage: Stage,
    private readonly input: Input,
    private readonly levels: Level[],
  ) {
    this.cameraRig = new CameraRig(stage.camera);
    this.overlay = new Overlay(stage.renderer.domElement.parentElement!, levels, {
      start: (i) => this.start(i),
      restart: () => this.restart(),
      next: () => this.next(),
      menu: () => this.showMenu(),
    });
    this.lantern.position.set(0, 1.6, 1);
    this.character.object.add(this.lantern);
    stage.scene.add(this.character.object);
    this.bindKeys();
  }

  get level(): Level {
    return this.levels[this.index];
  }

  private get hasNext(): boolean {
    return this.index + 1 < this.levels.length;
  }

  private bindKeys() {
    const { input } = this;
    input.onKey('KeyR', () => this.state !== 'menu' && this.restart());
    input.onKey('Escape', () => this.state !== 'menu' && this.showMenu());
    input.onKey('Enter', () => {
      if (this.state === 'won') this.hasNext ? this.next() : this.restart();
      else if (this.state === 'menu') this.start(this.firstOpenLevel());
    });
    this.levels.forEach((_, i) => {
      input.onKey(`Digit${i + 1}`, () => this.state === 'menu' && this.progress.isUnlocked(i) && this.start(i));
    });
  }

  /** Das erste noch nicht geschaffte Level, sonst das letzte. */
  private firstOpenLevel(): number {
    const open = this.levels.findIndex((level, i) => this.progress.isUnlocked(i) && this.progress.best(level.name) === undefined);
    return open === -1 ? this.levels.length - 1 : open;
  }

  showMenu(): void {
    this.load(this.scene ? this.index : 0);
    this.state = 'menu';
    this.respawn();
    this.overlay.showMenu(this.progress);
    history.replaceState(null, '', location.pathname);
  }

  start(index: number): void {
    this.load(index);
    this.restart();
    history.replaceState(null, '', `#level=${index + 1}`);
  }

  restart(): void {
    this.state = 'playing';
    this.playTime = 0;
    this.respawn();
    this.overlay.levelStarted(this.index);
  }

  next(): void {
    if (this.hasNext) this.start(this.index + 1);
  }

  private load(index: number) {
    if (this.scene && this.index === index) return;
    this.scene?.dispose();
    this.index = index;
    const level = this.level;
    this.stage.applyBiome(level.biome);
    this.scene = new LevelScene(level, this.cameraRig.focus);
    this.stage.scene.add(this.scene.object);
    this.player = new Player(this.scene.world);
    this.cameraRig.setLevel(level.width, level.start.y + 1);
    this.lantern.visible = level.biome.playerLight;
  }

  private respawn() {
    this.player.spawn(this.level.start);
    this.cameraRig.snap(this.player.pos);
    this.input.consumeJump();
  }

  private die(kind: FadeKind) {
    this.state = 'respawning';
    this.stateTimer = FADE_TIME;
    this.overlay.setFade(true, kind);
  }

  private win() {
    this.state = 'won';
    const best = this.progress.best(this.level.name);
    const record = this.progress.finish(this.index, this.level.name, this.playTime);
    this.overlay.showWin(this.index, this.playTime, best, record);
  }

  update(dt: number): void {
    if (!this.scene) return;
    const jumpPressed = this.input.consumeJump();
    const input: PlayerInput = this.state === 'playing'
      ? { left: this.input.left, right: this.input.right, jumpHeld: this.input.jumpHeld, jumpPressed }
      : NO_INPUT;
    this.player.update(dt, input);
    this.scene.update(dt);

    const { pos } = this.player;
    switch (this.state) {
      case 'playing':
        this.playTime += dt;
        if (pos.x > this.level.start.x + 4) this.overlay.hideHint();
        if (this.scene.world.touchesLava(pos.x - 0.3, pos.y, pos.x + 0.3, pos.y + 1.8)) this.die('lava');
        else if (pos.y < FALL_LIMIT) this.die('fall');
        else if (this.scene.goal?.reached(pos.x)) this.win();
        break;
      case 'respawning':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.respawn();
          this.overlay.setFade(false);
          this.state = 'playing';
        }
        break;
    }
  }

  render(dt: number, alpha: number): void {
    if (!this.scene) return;
    animateBlocks(dt);
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
