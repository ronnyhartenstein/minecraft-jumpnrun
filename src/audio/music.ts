import type { BiomeId } from '../levels/biomes';

/**
 * Kleine Chiptune-Melodien, eine pro Biom. Noten sind Stufen der Tonleiter
 * (0 = Grundton, 7 = eine Oktave höher), `null` ist eine Pause.
 * Jede Zeile hat 32 Achtel = 4 Takte, danach beginnt die Schleife von vorn.
 */
export interface Theme {
  bpm: number;
  /** MIDI-Nummer des Grundtons (60 = C4). */
  root: number;
  scale: number[];
  lead: (number | null)[];
  bass: (number | null)[];
  leadWave: OscillatorType;
  bassWave: OscillatorType;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PHRYGIAN_DOMINANT = [0, 1, 4, 5, 7, 8, 10];

const _ = null;

export const THEMES: Record<BiomeId, Theme> = {
  meadow: {
    bpm: 100, root: 60, scale: MAJOR, leadWave: 'triangle', bassWave: 'triangle',
    lead: [4, _, 2, _, 4, 5, 4, _, 2, _, 0, _, 1, 2, _, _, 4, _, 2, _, 4, 5, 7, _, 5, 4, 2, _, 1, 0, _, _],
    bass: [0, _, 4, _, 0, _, 4, _, 3, _, 7, _, 3, _, 7, _, 5, _, 2, _, 5, _, 2, _, 4, _, 1, _, 4, _, 6, _],
  },
  desert: {
    bpm: 92, root: 62, scale: PHRYGIAN_DOMINANT, leadWave: 'triangle', bassWave: 'triangle',
    lead: [0, _, 1, 2, _, 1, 0, _, 4, _, 3, 2, 1, _, _, _, 4, _, 5, 4, _, 2, 1, _, 2, _, 1, 0, _, _, _, _],
    bass: [0, _, _, 0, 4, _, _, _, 0, _, _, 0, 4, _, _, _, 5, _, _, 5, 4, _, _, _, 1, _, _, 1, 0, _, _, _],
  },
  cave: {
    bpm: 70, root: 57, scale: MINOR, leadWave: 'sine', bassWave: 'triangle',
    lead: [7, _, _, _, 4, _, _, _, 5, _, 4, _, 2, _, _, _, _, _, 7, _, 9, _, _, _, 8, _, 7, _, 4, _, _, _],
    bass: [0, _, _, _, _, _, _, _, 5, _, _, _, _, _, _, _, 3, _, _, _, _, _, _, _, 4, _, _, _, _, _, _, _],
  },
  snow: {
    bpm: 84, root: 65, scale: MAJOR, leadWave: 'sine', bassWave: 'triangle',
    lead: [7, _, 9, _, 11, _, 9, 7, 4, _, _, _, 5, _, 4, 2, 4, _, 7, _, 9, _, 7, 4, 5, _, _, _, 4, _, _, _],
    bass: [0, _, _, _, 4, _, _, _, 5, _, _, _, 3, _, _, _, 0, _, _, _, 4, _, _, _, 3, _, _, _, 4, _, _, _],
  },
  nether: {
    bpm: 108, root: 52, scale: MINOR, leadWave: 'square', bassWave: 'triangle',
    lead: [0, _, 0, 2, 3, _, 2, 0, 5, _, 4, 3, 2, _, _, _, 0, _, 0, 2, 3, _, 5, 7, 6, _, 5, 4, 5, _, _, _],
    bass: [0, 0, _, 0, _, 0, _, 0, 5, 5, _, 5, _, 5, _, 5, 3, 3, _, 3, _, 3, _, 3, 4, 4, _, 4, 6, _, 4, _],
  },
};

/** Frequenz einer Tonleiter-Stufe, `octave` verschiebt in ganzen Oktaven. */
export function noteFrequency(theme: Theme, degree: number, octave = 0): number {
  const len = theme.scale.length;
  const semitones = theme.scale[((degree % len) + len) % len] + 12 * (Math.floor(degree / len) + octave);
  return 440 * 2 ** ((theme.root + semitones - 69) / 12);
}
