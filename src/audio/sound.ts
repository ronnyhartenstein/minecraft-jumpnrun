import type { BiomeId } from '../levels/biomes';
import { noteFrequency, THEMES, type Theme } from './music';

export type Sfx =
  | 'jump' | 'diamond' | 'checkpoint' | 'lava' | 'fall' | 'win' | 'stomp' | 'hurt' | 'fuse' | 'boom'
  | 'bow' | 'throw' | 'fireball';

const STORAGE_KEY = 'minecraft-jumpnrun-sound';
const SFX_VOLUME = 0.8;
const MUSIC_VOLUME = 0.12;
/** So weit im Voraus werden Musiknoten eingeplant (Sekunden). */
const LOOKAHEAD = 0.15;

/**
 * Alle Geräusche und die Musik werden im Browser erzeugt, es gibt keine Audiodateien.
 * Browser erlauben Ton erst nach einer Eingabe, deshalb startet `unlock()` alles beim ersten Tastendruck.
 */
export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private theme: Theme | null = null;
  private step = 0;
  private nextStepTime = 0;

  constructor() {
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === 'off';
    } catch {
      // Ohne Speicher ist der Ton eben an
    }
  }

  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = SFX_VOLUME;
      this.music = this.ctx.createGain();
      this.music.gain.value = MUSIC_VOLUME;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      setInterval(() => this.scheduleMusic(), 25);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.master?.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx!.currentTime, 0.05);
    try {
      localStorage.setItem(STORAGE_KEY, this.muted ? 'off' : 'on');
    } catch {
      // Ohne Speicher gilt die Einstellung nur bis zum Neuladen
    }
    return this.muted;
  }

  /** Wechselt die Hintergrundmusik zum Biom, `null` stoppt sie. */
  playMusic(biome: BiomeId | null): void {
    const theme = biome ? THEMES[biome] : null;
    if (theme === this.theme) return;
    this.theme = theme;
    this.step = 0;
    if (this.ctx) this.nextStepTime = this.ctx.currentTime + 0.1;
  }

  play(name: Sfx): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'jump':
        this.tone(t, 0.12, 'square', 0.12, 300, 620);
        break;
      case 'diamond':
        [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.06, 0.12, 'triangle', 0.25, f));
        break;
      case 'checkpoint':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.08, 0.14, 'square', 0.1, f));
        break;
      case 'lava':
        this.noise(t, 0.6, 0.35, 2500, 300);
        this.tone(t, 0.5, 'sawtooth', 0.12, 160, 60);
        break;
      case 'fall':
        this.tone(t, 0.55, 'square', 0.1, 620, 90);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.12, 0.16, 'square', 0.12, f));
        [523, 659, 784].forEach((f) => this.tone(t + 0.5, 0.7, 'triangle', 0.14, f));
        break;
      case 'stomp':
        this.tone(t, 0.12, 'square', 0.15, 220, 70);
        this.noise(t, 0.12, 0.2, 1200, 400);
        break;
      case 'hurt':
        this.tone(t, 0.3, 'sawtooth', 0.12, 420, 140);
        break;
      case 'fuse':
        // Zischen wie eine Zündschnur
        this.noise(t, 1.4, 0.18, 6000, 3000);
        break;
      case 'bow':
        // Sehne schnalzt
        this.tone(t, 0.12, 'triangle', 0.25, 700, 220);
        this.noise(t, 0.08, 0.15, 4000, 1500);
        break;
      case 'throw':
        this.noise(t, 0.25, 0.12, 900, 2500);
        break;
      case 'fireball':
        this.noise(t, 0.4, 0.25, 700, 150);
        this.tone(t, 0.3, 'sawtooth', 0.08, 180, 90);
        break;
      case 'boom':
        this.noise(t, 1.2, 0.6, 1800, 60);
        this.tone(t, 0.8, 'sine', 0.5, 110, 30);
        break;
    }
  }

  /** Ein Ton mit kurzer Hüllkurve, optional mit Tonhöhen-Rutsch von `from` nach `to`. */
  private tone(start: number, duration: number, type: OscillatorType, volume: number, from: number, to = from, out = this.sfx) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** Rauschen durch einen Tiefpass, dessen Grenze von `from` nach `to` wandert (Zischen, Plopp). */
  private noise(start: number, duration: number, volume: number, from: number, to: number) {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(filter).connect(gain).connect(this.sfx);
    src.start(start);
  }

  /** Plant die nächsten Achtelnoten der Musik ein, solange sie kurz bevorstehen. */
  private scheduleMusic() {
    const ctx = this.ctx!;
    const theme = this.theme;
    if (!theme) return;
    if (this.nextStepTime < ctx.currentTime) this.nextStepTime = ctx.currentTime + 0.05;
    const stepLength = 60 / theme.bpm / 2;
    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD) {
      const i = this.step % theme.lead.length;
      const lead = theme.lead[i];
      const bass = theme.bass[i];
      if (lead !== null) this.tone(this.nextStepTime, stepLength * 1.8, theme.leadWave, 0.3, noteFrequency(theme, lead), undefined, this.music);
      if (bass !== null) this.tone(this.nextStepTime, stepLength * 1.6, theme.bassWave, 0.35, noteFrequency(theme, bass, -2), undefined, this.music);
      this.nextStepTime += stepLength;
      this.step++;
    }
  }
}
