import type { Level } from './format';
import hoehle from './hoehle';
import wiese from './wiese';
import wueste from './wueste';

/** Alle Level in der Reihenfolge, in der sie freigeschaltet werden. */
export const LEVELS: Level[] = [wiese, wueste, hoehle];
