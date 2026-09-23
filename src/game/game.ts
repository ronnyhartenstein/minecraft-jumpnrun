import * as THREE from 'three';
import { Sound } from '../audio/sound';
import type { Input } from '../engine/input';
import type { Level, Point } from '../levels/format';
import { animateBlocks } from '../textures/blocks';
import { Overlay, type FadeKind } from '../ui/overlay';
import { BASE_DISTANCE, CameraRig } from './cameraRig';
import { BLAST_RADIUS } from './enemy';
import { BoxSteve, type Character } from './character';
import { DIFFICULTIES, type Difficulty, type DifficultyId } from './difficulty';
import { LevelScene } from './levelScene';
import { PHYSICS, Player, type PlayerInput } from './player';
import { Progress } from './progress';
import type { Stage } from './scene';

/** Unterhalb dieser Höhe gilt Steve als heruntergefallen. */
const FALL_LIMIT = -4;
/** Dauer der Abblende beim Respawn, passend zur CSS-Transition. */
const FADE_TIME = 0.3;

const NO_INPUT: PlayerInput = { left: false, right: false, jumpHeld: false, jumpPressed: false };

export type State = 'menu' | 'playing' | 'respawning' | 'won';

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
  private readonly sound = new Sound();
  private state: State = 'menu';
  private stateTimer = 0;
  private playTime = 0;
  /** Hier startet Steve nach einem Sturz: am Levelstart oder am letzten Checkpoint. */
  private spawnPoint: Point = { x: 0, y: 0 };
  /** Gesammelte Diamanten bleiben nach einem Sturz erhalten, erst ein Neustart setzt sie zurück. */
  private diamonds = 0;
  private invulnerable = 0;
  /** Beim automatischen Prüfen der Level wird kein Fortschritt gespeichert. */
  testMode = false;

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
      toggleSound: () => this.toggleSound(),
      setDifficulty: (id) => this.setDifficulty(id),
    });
    this.overlay.setSoundIcon(this.sound.muted);
    input.onAnyInput = () => this.sound.unlock();
    this.lantern.position.set(0, 1.6, 1);
    this.character.object.add(this.lantern);
    stage.scene.add(this.character.object);
    this.bindKeys();
  }

  get level(): Level {
    return this.levels[this.index];
  }

  /** Für die Level-Prüfung: Zustand, geladenes Level und gesammelte Diamanten. */
  get status(): State {
    return this.state;
  }

  get levelScene(): LevelScene | null {
    return this.scene;
  }

  get collectedDiamonds(): number {
    return this.diamonds;
  }

  /** Die gewählte Schwierigkeit. Die automatische Level-Prüfung spielt immer auf Leicht. */
  get difficulty(): Difficulty {
    return this.testMode ? DIFFICULTIES.leicht : DIFFICULTIES[this.progress.difficulty];
  }

  private setDifficulty(id: DifficultyId) {
    this.progress.selectDifficulty(id);
    if (this.state === 'menu') this.overlay.showMenu(this.progress);
  }

  /** Das nächste Level in derselben Gruppe (Welten bzw. eigene Level), falls es eins gibt. */
  private get nextLevel(): Level | undefined {
    const next = this.levels[this.index + 1];
    return next?.custom === this.level.custom ? next : undefined;
  }

  /** Weiter geht es nur, wenn das nächste Level auf der gewählten Schwierigkeit spielbar ist. */
  private get hasNext(): boolean {
    return this.nextLevel !== undefined && this.progress.isAvailable(this.levels, this.index + 1, this.difficulty.id);
  }

  private bindKeys() {
    const { input } = this;
    input.onKey('KeyR', () => this.state !== 'menu' && this.restart());
    input.onKey('KeyM', () => this.toggleSound());
    input.onKey('Escape', () => this.state !== 'menu' && this.showMenu());
    input.onKey('Enter', () => {
      if (this.state === 'won') this.hasNext ? this.next() : this.restart();
      else if (this.state === 'menu') this.start(this.firstOpenLevel());
    });
  }

  /** Kurze Meldung oben im Bild. */
  notify(text: string): void {
    this.overlay.toast(text);
  }

  private toggleSound() {
    this.overlay.setSoundIcon(this.sound.toggleMute());
  }

  /** Das erste noch nicht geschaffte Level, sonst das letzte. */
  private firstOpenLevel(): number {
    const d = this.difficulty.id;
    const open = this.levels.findIndex((level, i) => this.progress.isAvailable(this.levels, i, d) && !this.progress.finished(level.name, d));
    return open === -1 ? this.levels.length - 1 : open;
  }

  showMenu(): void {
    this.load(this.scene ? this.index : 0);
    this.state = 'menu';
    this.resetCheckpoints();
    this.respawn();
    this.overlay.showMenu(this.progress);
    history.replaceState(null, '', location.pathname + location.search);
  }

  start(index: number): void {
    this.load(index);
    this.restart();
    history.replaceState(null, '', `#level=${this.level.code}`);
  }

  restart(): void {
    this.state = 'playing';
    this.playTime = 0;
    this.resetCheckpoints();
    this.respawn();
    this.overlay.levelStarted(this.index, this.difficulty.label);
  }

  next(): void {
    if (this.hasNext) this.start(this.index + 1);
  }

  private load(index: number) {
    if (this.scene && this.index === index && this.scene.difficulty === this.difficulty) return;
    this.scene?.dispose();
    this.index = index;
    const level = this.level;
    this.stage.applyBiome(level.biome);
    this.scene = new LevelScene(level, this.cameraRig.focus, this.difficulty);
    this.stage.scene.add(this.scene.object);
    this.player = new Player(this.scene.world);
    this.cameraRig.setLevel(level.width, level.start.y + 1);
    this.lantern.visible = level.biome.playerLight;
    this.sound.playMusic(level.biome.id);
  }

  private resetCheckpoints() {
    this.spawnPoint = this.level.start;
    for (const cp of this.scene!.checkpoints) cp.reset();
    for (const d of this.scene!.diamonds) d.reset();
    for (const e of this.scene!.enemies) e.reset();
    this.diamonds = 0;
    this.updateHud();
  }

  private updateHud() {
    const total = this.scene!.diamonds.length;
    this.overlay.setDiamonds(this.state === 'menu' ? null : total === 0 ? '' : `${this.diamonds}/${total}`, this.difficulty.label);
  }

  private respawn() {
    this.invulnerable = 0;
    this.player.spawn(this.spawnPoint);
    this.cameraRig.snap(this.player.pos);
    this.input.consumeJump();
  }

  private die(kind: FadeKind) {
    this.state = 'respawning';
    this.stateTimer = FADE_TIME;
    this.overlay.setFade(true, kind);
    if (kind !== 'boom') this.sound.play(kind);
  }

  private win() {
    this.state = 'won';
    const { name } = this.level;
    const d = this.difficulty.id;
    const best = this.progress.best(name, d);
    // Das erste Mal auf Mittel geschafft: Schwer ist jetzt offen
    const hardUnlocked = d === 'mittel' && !this.testMode && !this.progress.finished(name, 'mittel');
    const record = this.testMode ? false : this.progress.finish(name, d, this.playTime, this.diamonds);
    this.sound.play('win');
    this.overlay.showWin(this.index, {
      seconds: this.playTime,
      best,
      record,
      diamonds: this.diamonds,
      total: this.scene!.diamonds.length,
      hasNext: this.hasNext,
      nextNeedsMedium: this.nextLevel !== undefined && !this.hasNext,
      hardUnlocked,
      difficulty: this.difficulty.label,
    });
  }

  /**
   * Von oben draufspringen besiegt einen Gegner. Slimes seitlich berühren heißt Neustart.
   * Creeper sind fest wie eine Wand und gefährlich erst, wenn sie explodieren.
   */
  private checkEnemies() {
    const p = this.player;
    for (const e of this.scene!.enemies) {
      if (e.fuse !== null && e.fuse === 0) this.sound.play('fuse');
      if (e.exploded) {
        this.sound.play('boom');
        const distance = Math.hypot(p.pos.x - e.pos.x, p.pos.y + 0.9 - (e.pos.y + 0.8));
        if (distance < BLAST_RADIUS && this.invulnerable <= 0) {
          this.die('boom');
          return;
        }
      }
      if (!e.alive) continue;
      const overlaps = p.pos.x + 0.3 > e.pos.x - e.halfWidth && p.pos.x - 0.3 < e.pos.x + e.halfWidth
        && p.pos.y + 1.8 > e.pos.y && p.pos.y < e.pos.y + e.height;
      if (!overlaps) continue;
      const fromAbove = p.vel.y < 0 && p.prevPos.y >= e.pos.y + e.height * 0.5;
      if (fromAbove) {
        e.stomp();
        p.bounce();
        this.sound.play('stomp');
      } else if (e.kind === 'creeper') {
        // Nicht durchlaufen: Steve an die Seite schieben, von der er kam
        const left = p.prevPos.x < e.pos.x;
        p.pos.x = left ? e.pos.x - e.halfWidth - 0.3 - 0.001 : e.pos.x + e.halfWidth + 0.3 + 0.001;
        p.vel.x = 0;
      } else if (this.invulnerable <= 0) {
        this.die('hurt');
        return;
      }
    }
  }

  update(dt: number): void {
    if (!this.scene) return;
    const jumpPressed = this.input.consumeJump();
    const input: PlayerInput = this.state === 'playing'
      ? { left: this.input.left, right: this.input.right, jumpHeld: this.input.jumpHeld, jumpPressed }
      : NO_INPUT;
    this.player.update(dt, input);
    if (this.player.jumped) this.sound.play('jump');
    this.scene.update(dt, this.player.pos);

    const { pos } = this.player;
    switch (this.state) {
      case 'playing':
        this.playTime += dt;
        if (pos.x > this.level.start.x + 4) this.overlay.hideHint();
        for (const cp of this.scene.checkpoints) {
          if (cp.active || !cp.reached(pos.x) || !this.player.onGround) continue;
          cp.activate();
          this.spawnPoint = cp.at;
          this.overlay.toast('Checkpoint ✔');
          this.sound.play('checkpoint');
        }
        for (const d of this.scene.diamonds) {
          if (!d.touches(pos.x - 0.3, pos.y, pos.x + 0.3, pos.y + 1.8)) continue;
          d.collect();
          this.diamonds++;
          this.updateHud();
          this.overlay.bumpDiamonds();
          this.sound.play('diamond');
        }
        this.invulnerable -= dt;
        this.checkEnemies();
        if (this.state !== 'playing') break;
        if (this.scene.world.touchesLava(pos.x - 0.3, pos.y, pos.x + 0.3, pos.y + 1.8)) this.die('lava');
        else if (pos.y < FALL_LIMIT) this.die('fall');
        else if (this.scene.goal?.reached(pos.x)) this.win();
        break;
      case 'respawning':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.respawn();
          this.invulnerable = this.difficulty.invulnerable;
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
    // Nach dem Neustart kurz blinken, solange Steve unverwundbar ist
    this.character.object.visible = this.state !== 'playing' || this.invulnerable <= 0 || Math.floor(this.invulnerable * 10) % 2 === 0;
    this.character.update(dt, {
      speed: Math.abs(p.vel.x),
      maxSpeed: PHYSICS.maxSpeed,
      onGround: p.onGround,
      facing: p.facing,
    });
    // Beim Herunterfallen bleibt die Kamera oben, Steve fällt aus dem Bild
    if (this.state !== 'respawning') this.cameraRig.update(dt, pos, p.facing, Math.abs(p.vel.x) > 0.5);
    this.stage.setFogOffset(this.cameraRig.distance - BASE_DISTANCE);
    this.stage.followSun(this.cameraRig.focus);
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
  }
}
