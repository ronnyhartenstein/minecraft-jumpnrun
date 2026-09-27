import * as THREE from 'three';
import { Sound } from '../audio/sound';
import type { Input } from '../engine/input';
import { CHUNK, randomSeed } from '../endless/generator';
import { EndlessRun } from '../endless/run';
import { BIOMES, type BiomeId } from '../levels/biomes';
import type { Level, Point } from '../levels/format';
import { animateBlocks } from '../textures/blocks';
import { Overlay, type FadeKind } from '../ui/overlay';
import { BASE_DISTANCE, CameraRig } from './cameraRig';
import { BLAST_RADIUS } from './enemies';
import { BoxSteve, type Character } from './character';
import { DIFFICULTIES, type Difficulty, type DifficultyId } from './difficulty';
import { FIGURE_ORDER, FIGURES, type FigureId } from './figures';
import { LevelScene } from './levelScene';
import { Player, type PlayerInput } from './player';
import { Progress } from './progress';
import type { Stage } from './scene';

/** Unterhalb dieser Höhe gilt Steve als heruntergefallen. */
const FALL_LIMIT = -4;
/** Dauer der Abblende beim Respawn, passend zur CSS-Transition. */
const FADE_TIME = 0.3;
/** Schallwelle des Wardens: so lange breitet sich der Ring aus, und so lange ist danach Pause. */
const SONIC_TIME = 0.4;
const SONIC_COOLDOWN = 0.5;

const NO_INPUT: PlayerInput = { left: false, right: false, jumpHeld: false, jumpPressed: false };

/** Endlos-Lauf: Herzen zu Beginn und höchstens, Diamanten pro Extra-Herz, alle so viele Blöcke gibt es Zeit dazu. */
const HEARTS = 5;
const MAX_HEARTS = 10;
const DIAMONDS_PER_HEART = 10;
const TIME_BONUS_EVERY = 300;

/** Zustand eines laufenden Endlos-Laufs. */
interface Endless {
  run: EndlessRun;
  level: Level;
  hearts: number;
  diamonds: number;
  meters: number;
  /** Restzeit in Sekunden, `null` = kein Zeitlimit. */
  time: number | null;
  nextBonus: number;
  /** Das Biom, dessen Himmel und Musik gerade laufen. */
  biome: BiomeId;
}

export type State = 'menu' | 'playing' | 'respawning' | 'won' | 'over';

export class Game {
  player!: Player;
  private scene: LevelScene | null = null;
  private index = 0;
  private character: Character = new BoxSteve();
  private figureId: FigureId = 'steve';
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
  /** Laufende Schallwellen des Wardens (nur der Effekt) und die Pause bis zur nächsten. */
  private waves: { mesh: THREE.Mesh; age: number; radius: number }[] = [];
  private sonicCooldown = 0;
  /** Läuft gerade ein Endlos-Lauf? Sonst wird ein festes Level gespielt. */
  private endless: Endless | null = null;
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
      toggleMusic: () => this.toggleMusic(),
      setDifficulty: (id) => this.setDifficulty(id),
      setFigure: (id) => this.setFigure(id),
      startEndless: (seed) => this.startEndless(seed),
    });
    this.overlay.setSoundIcon(this.sound.muted);
    this.overlay.setMusicIcon(this.sound.musicOff);
    input.onAnyInput = () => this.sound.unlock();
    this.lantern.position.set(0, 1.6, 1);
    this.character.object.add(this.lantern);
    stage.scene.add(this.character.object);
    this.bindKeys();
  }

  get level(): Level {
    return this.endless?.level ?? this.levels[this.index];
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

  /** Die gewählte Spielfigur. Die automatische Level-Prüfung spielt immer mit Steve. */
  get figure(): FigureId {
    return this.testMode ? 'steve' : this.progress.currentFigure(this.levels);
  }

  private setFigure(id: FigureId) {
    this.progress.selectFigure(id);
    this.applyFigure();
    if (this.state === 'menu') this.overlay.showMenu(this.progress);
  }

  /** Tauscht das Modell aus, falls nötig, und gibt dem Spieler die Werte der Figur. */
  private applyFigure() {
    const figure = FIGURES[this.figure];
    if (figure.id !== this.figureId) {
      this.stage.scene.remove(this.character.object);
      this.character = figure.create();
      this.character.object.add(this.lantern);
      this.stage.scene.add(this.character.object);
      this.figureId = figure.id;
    }
    this.player.setFigure(figure);
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
    input.onKey('KeyR', () => {
      if (this.state === 'over') this.startEndless(null);
      else if (this.state !== 'menu') this.restart();
    });
    input.onKey('KeyM', () => this.toggleSound());
    input.onKey('KeyN', () => this.toggleMusic());
    input.onKey('Escape', () => this.state !== 'menu' && this.showMenu());
    input.onKey('Enter', () => {
      if (this.state === 'over') this.startEndless(this.endless!.run.seed);
      else if (this.state === 'won') this.hasNext ? this.next() : this.restart();
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

  private toggleMusic() {
    this.overlay.setMusicIcon(this.sound.toggleMusic());
  }

  /** Das erste noch nicht geschaffte Level, sonst das letzte. */
  private firstOpenLevel(): number {
    const d = this.difficulty.id;
    const open = this.levels.findIndex((level, i) => this.progress.isAvailable(this.levels, i, d) && !this.progress.finished(level.name, d));
    return open === -1 ? this.levels.length - 1 : open;
  }

  showMenu(): void {
    this.leaveEndless();
    this.load(this.scene ? this.index : 0);
    this.applyFigure();
    this.state = 'menu';
    this.resetCheckpoints();
    this.respawn();
    this.overlay.showMenu(this.progress);
    history.replaceState(null, '', location.pathname + location.search);
  }

  start(index: number): void {
    this.leaveEndless();
    this.load(index);
    this.restart();
    history.replaceState(null, '', `#level=${this.level.code}`);
  }

  restart(): void {
    if (this.endless) return this.startEndless(this.endless.run.seed);
    this.applyFigure();
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
    this.scene!.clearProjectiles();
    this.diamonds = 0;
    this.updateHud();
  }

  private updateHud() {
    const e = this.endless;
    if (e) {
      return this.overlay.setEndlessHud({
        hearts: e.hearts, meters: e.meters, diamonds: e.diamonds, time: e.time, seed: e.run.seed, difficulty: this.difficulty.label,
      });
    }
    const total = this.scene!.diamonds.length;
    this.overlay.setDiamonds(this.state === 'menu' ? null : total === 0 ? '' : `${this.diamonds}/${total}`, this.difficulty.label);
  }

  private respawn() {
    this.invulnerable = 0;
    this.scene?.clearProjectiles();
    this.player.spawn(this.spawnPoint);
    this.cameraRig.snap(this.player.pos);
    this.input.consumeJump();
  }

  private die(kind: FadeKind) {
    // Endlos-Lauf: Jeder Treffer kostet ein Herz
    if (this.endless) {
      this.endless.hearts--;
      this.updateHud();
    }
    this.state = 'respawning';
    this.stateTimer = FADE_TIME;
    this.overlay.setFade(true, kind);
    if (kind !== 'boom') this.sound.play(kind === 'poison' ? 'hurt' : kind);
  }

  private win() {
    this.state = 'won';
    const { name } = this.level;
    const d = this.difficulty.id;
    const best = this.progress.best(name, d);
    // Das erste Mal auf Mittel geschafft: Schwer ist jetzt offen
    const hardUnlocked = d === 'mittel' && !this.testMode && !this.progress.finished(name, 'mittel');
    // Die ganze Welt zum ersten Mal auf Mittel geschafft: Es gibt ein neues Tier
    const reward = this.level.custom ? undefined : FIGURE_ORDER.find((f) => FIGURES[f].world === this.level.world);
    const hadReward = reward === undefined || this.progress.isFigureUnlocked(this.levels, reward);
    const record = this.testMode ? false : this.progress.finish(name, d, this.playTime, this.diamonds);
    const figureUnlocked = !hadReward && this.progress.isFigureUnlocked(this.levels, reward) ? reward : null;
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
      figureUnlocked,
      difficulty: this.difficulty.label,
    });
  }

  /** Startet einen Endlos-Lauf. `null` = neuer zufälliger Seed. */
  startEndless(seed: number | null): void {
    const run = new EndlessRun(seed ?? randomSeed(), this.difficulty.id);
    const biome = run.chunks[0].biome;
    this.endless = {
      run,
      level: run.level(biome),
      hearts: HEARTS,
      diamonds: 0,
      meters: 0,
      time: this.difficulty.endlessTime,
      nextBonus: TIME_BONUS_EVERY,
      biome,
    };
    this.buildEndlessScene();
    this.player = new Player(this.scene!.world);
    this.applyEndlessBiome(biome);
    this.applyFigure();
    this.state = 'playing';
    this.playTime = 0;
    this.resetCheckpoints();
    this.respawn();
    this.overlay.endlessStarted(run.seed, this.difficulty.label);
    this.updateHud();
    history.replaceState(null, '', `#endlos=${run.seed}`);
  }

  /** Baut die Szene aus dem aktuellen Fenster des Endlos-Laufs (neu). */
  private buildEndlessScene() {
    const e = this.endless!;
    e.level = e.run.level(e.biome);
    this.scene?.dispose();
    this.scene = new LevelScene(e.level, this.cameraRig.focus, this.difficulty);
    this.stage.scene.add(this.scene.object);
    this.cameraRig.setLevel(e.level.width, 2);
  }

  /** Himmel, Musik und Laterne passend zum Biom, in dem Steve gerade ist. */
  private applyEndlessBiome(biome: BiomeId) {
    this.endless!.biome = biome;
    const b = BIOMES[biome];
    this.stage.applyBiome({ ...b, lavaSea: null, enclosed: false });
    this.lantern.visible = b.playerLight;
    this.sound.playMusic(biome);
  }

  /** Endlos-Lauf: Meter, Zeit, Biomwechsel und Nachladen. */
  private updateEndless(dt: number) {
    const e = this.endless!;
    const { pos } = this.player;
    // Gezählt ab dem Start (Mitte des ersten Checkpoints)
    const meters = Math.max(e.meters, Math.floor(e.run.distance(pos.x) - e.level.start.x - 0.5));
    if (meters !== e.meters) {
      e.meters = meters;
      this.updateHud();
    }
    // Alle 300 Blöcke gibt es Zeit dazu
    while (e.meters >= e.nextBonus) {
      e.nextBonus += TIME_BONUS_EVERY;
      if (e.time !== null) {
        e.time += this.difficulty.endlessBonus;
        this.overlay.toast(`⏱ +${this.difficulty.endlessBonus} s`);
        this.sound.play('checkpoint');
      }
    }
    if (e.time !== null) {
      const before = Math.ceil(e.time);
      e.time -= dt;
      if (Math.ceil(e.time) !== before) this.updateHud();
      if (e.time <= 0) return this.endEndless('time');
    }
    const biome = e.run.chunkAt(pos.x).biome;
    if (biome !== e.biome) this.applyEndlessBiome(biome);
    // Im dritten Stück angekommen: vorn fällt eins weg, hinten kommt eins dazu
    if (pos.x >= 2 * CHUNK) this.shiftEndless();
  }

  /** Nachladen: Welt neu bauen, alles um ein Stück nach links rücken. Soll man nicht merken. */
  private shiftEndless() {
    const e = this.endless!;
    const scene = this.scene!;
    for (const enemy of scene.enemies) if (!enemy.alive && enemy.id) e.run.defeated.add(enemy.id);
    for (const d of scene.diamonds) if (d.collected) e.run.collected.add(e.run.key(d.at.x, d.at.y));
    e.run.advance();
    this.buildEndlessScene();
    this.player.moveToWorld(this.scene!.world, -CHUNK);
    this.cameraRig.shift(-CHUNK, e.level.width);
    this.spawnPoint = { x: Math.max(e.level.start.x, this.spawnPoint.x - CHUNK), y: this.spawnPoint.y };
    // Schon erreichte Checkpoints bleiben erreicht
    for (const cp of this.scene!.checkpoints) if (cp.at.x <= this.spawnPoint.x) cp.activate();
  }

  /** Ein Diamant im Endlos-Lauf: Je 10 gibt es ein Herz zurück. */
  private endlessDiamond() {
    const e = this.endless!;
    e.diamonds++;
    if (e.diamonds % DIAMONDS_PER_HEART === 0 && e.hearts < MAX_HEARTS) {
      e.hearts++;
      this.overlay.toast('❤ +1');
    }
  }

  /** Lauf vorbei: keine Herzen mehr oder Zeit abgelaufen. */
  private endEndless(reason: 'hearts' | 'time') {
    const e = this.endless!;
    this.state = 'over';
    this.overlay.setFade(false);
    const d = this.difficulty.id;
    const best = this.progress.endlessBest(d, e.run.seed);
    const record = this.testMode ? false : this.progress.saveEndless(e.run.seed, d, e.meters);
    this.sound.play(record ? 'win' : 'fall');
    this.overlay.showEndlessOver({ reason, meters: e.meters, best, record, seed: e.run.seed, difficulty: this.difficulty.label });
  }

  /** Zurück zu den festen Leveln: die Szene des Endlos-Laufs wegwerfen. */
  private leaveEndless() {
    if (!this.endless) return;
    this.endless = null;
    this.scene?.dispose();
    this.scene = null;
  }

  /** Warden: Landet er nach einem Sprung, sind Gegner und Geschosse in der Nähe besiegt. */
  private sonicBoom() {
    const radius = FIGURES[this.figureId].sonicBoom;
    if (radius === null || this.sonicCooldown > 0) return;
    this.sonicCooldown = SONIC_COOLDOWN;
    const center = new THREE.Vector2(this.player.pos.x, this.player.pos.y + 0.9);
    for (const e of this.scene!.enemies) {
      if (e.alive && Math.abs(e.pos.x - center.x) < radius + e.halfWidth && Math.abs(e.pos.y + e.height / 2 - center.y) < radius) e.stomp();
    }
    for (const p of this.scene!.projectiles) if (p.flying && p.pos.distanceTo(center) < radius) p.burst();
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 48),
      new THREE.MeshBasicMaterial({ color: '#4ff0ea', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    mesh.position.set(center.x, center.y, 0.2);
    this.stage.scene.add(mesh);
    this.waves.push({ mesh, age: 0, radius });
    this.sound.play('sonic');
  }

  /** Der Ring der Schallwelle wird größer und blasser, dann verschwindet er. */
  private updateWaves(dt: number) {
    for (const wave of this.waves) {
      wave.age += dt;
      const t = Math.min(wave.age / SONIC_TIME, 1);
      wave.mesh.scale.setScalar(0.3 + t * (wave.radius - 0.3));
      (wave.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
    }
    for (const wave of this.waves.filter((w) => w.age >= SONIC_TIME)) {
      wave.mesh.removeFromParent();
      wave.mesh.geometry.dispose();
      (wave.mesh.material as THREE.Material).dispose();
    }
    this.waves = this.waves.filter((w) => w.age < SONIC_TIME);
  }

  /** Pfeile, Gift und Feuerbälle: Treffer heißt Neustart. */
  private checkProjectiles() {
    const { pos } = this.player;
    for (const p of this.scene!.projectiles) {
      if (!p.hits(pos.x - 0.3, pos.y, pos.x + 0.3, pos.y + 1.8)) continue;
      p.burst();
      if (this.invulnerable > 0) continue;
      this.die(p.kind === 'poison' ? 'poison' : p.kind === 'fireball' ? 'lava' : 'hurt');
      return;
    }
  }

  /**
   * Von oben draufspringen besiegt einen Gegner. Seitlich berühren heißt Neustart.
   * Creeper, Skelett und Lohe sind fest wie eine Wand und bei Berührung harmlos:
   * Gefährlich sind nur die Explosion bzw. die Geschosse.
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
      } else if (e.solid) {
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
    this.updateWaves(dt);
    this.scene.update(dt, { player: this.player.pos, sound: (name) => this.sound.play(name) });

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
          if (this.endless) this.endlessDiamond();
          this.updateHud();
          this.overlay.bumpDiamonds();
          this.sound.play('diamond');
        }
        this.invulnerable -= dt;
        this.sonicCooldown -= dt;
        if (this.player.landed) this.sonicBoom();
        this.checkEnemies();
        if (this.state === 'playing') this.checkProjectiles();
        if (this.state !== 'playing') break;
        const lava = !FIGURES[this.figureId].lavaWalker && this.scene.world.touchesLava(pos.x - 0.3, pos.y, pos.x + 0.3, pos.y + 1.8);
        if (lava) this.die('lava');
        else if (pos.y < FALL_LIMIT) this.die('fall');
        else if (this.scene.goal?.reached(pos.x)) this.win();
        else if (this.endless) this.updateEndless(dt);
        break;
      case 'respawning':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0 && this.endless && this.endless.hearts <= 0) {
          this.endEndless('hearts');
        } else if (this.stateTimer <= 0) {
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
      maxSpeed: p.physics.maxSpeed,
      onGround: p.onGround,
      facing: p.facing,
      gliding: p.gliding,
    });
    // Beim Herunterfallen bleibt die Kamera oben, Steve fällt aus dem Bild
    if (this.state !== 'respawning') this.cameraRig.update(dt, pos, p.facing, Math.abs(p.vel.x) > 0.5);
    this.stage.setFogOffset(this.cameraRig.distance - BASE_DISTANCE);
    this.stage.followSun(this.cameraRig.focus);
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
  }
}
