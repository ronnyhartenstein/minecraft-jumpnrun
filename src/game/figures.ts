import { Chicken, Fox, Sheep, Strider, Warden, Wolf } from './animals';
import { BoxSteve, type Character } from './character';
import type { Physics } from './player';

export type FigureId = 'steve' | 'sheep' | 'chicken' | 'fox' | 'wolf' | 'strider' | 'warden';

export interface Figure {
  id: FigureId;
  label: string;
  icon: string;
  /** Wer diese Welt auf Mittel schafft, bekommt die Figur. `null` = von Anfang an da. */
  world: number | null;
  /** Was die Figur besser kann als Steve. */
  trait: string;
  /**
   * Abweichungen von Steves Werten. Nur Vorteile, damit jedes Level,
   * das mit Steve schaffbar ist, auch mit jedem Tier schaffbar bleibt.
   */
  physics: Partial<Physics>;
  /** So langsam sinkt die Figur mit gehaltener Sprungtaste, `null` = kann nicht gleiten. */
  glide: number | null;
  /** Läuft über Lava, ohne Schaden zu nehmen. */
  lavaWalker: boolean;
  /** Schallwelle beim Landen: besiegt Gegner in diesem Umkreis, `null` = keine. */
  sonicBoom: number | null;
  create(): Character;
}

export const FIGURE_ORDER: FigureId[] = ['steve', 'sheep', 'chicken', 'fox', 'wolf', 'strider', 'warden'];

export const FIGURES: Record<FigureId, Figure> = {
  steve: {
    id: 'steve', label: 'Steve', icon: '🧍', world: null,
    trait: 'Der Klassiker', physics: {}, glide: null, lavaWalker: false, sonicBoom: null, create: () => new BoxSteve(),
  },
  sheep: {
    id: 'sheep', label: 'Schaf', icon: '🐑', world: 1,
    trait: 'Federt weich: springt von Gegnern höher ab', physics: { stompBounce: 13 }, glide: null, lavaWalker: false, sonicBoom: null, create: () => new Sheep(),
  },
  chicken: {
    id: 'chicken', label: 'Huhn', icon: '🐔', world: 2,
    trait: 'Flattert: Sprungtaste gedrückt halten, dann sinkt es langsam', physics: {}, glide: 4, lavaWalker: false, sonicBoom: null, create: () => new Chicken(),
  },
  fox: {
    id: 'fox', label: 'Fuchs', icon: '🦊', world: 3,
    trait: 'Flink: läuft schneller', physics: { maxSpeed: 7 }, glide: null, lavaWalker: false, sonicBoom: null, create: () => new Fox(),
  },
  wolf: {
    id: 'wolf', label: 'Wolf', icon: '🐺', world: 4,
    trait: 'Springt höher', physics: { jumpHeight: 3.1 }, glide: null, lavaWalker: false, sonicBoom: null, create: () => new Wolf(),
  },
  strider: {
    id: 'strider', label: 'Schreiter', icon: '🔥', world: 5,
    trait: 'Hitzefest: läuft über Lava, ohne Schaden', physics: {}, glide: null, lavaWalker: true, sonicBoom: null, create: () => new Strider(),
  },
  warden: {
    id: 'warden', label: 'Warden', icon: '💥', world: 6,
    trait: 'Schallwelle: Landet er nach einem Sprung, sind Gegner in der Nähe besiegt',
    physics: {}, glide: null, lavaWalker: false, sonicBoom: 3, create: () => new Warden(),
  },
};
