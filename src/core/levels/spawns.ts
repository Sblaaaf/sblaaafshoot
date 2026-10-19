import { ENEMY_TYPES } from '../entities/enemies';
import { Rng } from '../rng';
import { CORRIDOR_LEFT, CORRIDOR_RIGHT, STEP_SECONDS, TICKS_PER_SECOND } from '../sim/constants';
import type { LevelConfig, SpawnEvent } from './types';

/** Écart horizontal entre deux ennemis d'un même groupe. */
const GROUP_SPACING = 26;

/**
 * Génère tout le flux d'ennemis d'un niveau à partir de sa seed : le même niveau
 * donne toujours exactement la même liste, triée par tick.
 *
 * Densité : un « budget » d'apparition grossit de `taux × dt` à chaque tick, et
 * chaque unité de budget consommée fait apparaître un ennemi. Le taux suit une
 * rampe linéaire du début à la fin. Les ennemis arrivent par petits groupes : la
 * taille du prochain groupe est tirée d'avance, et il apparaît dès que le budget
 * la couvre (le débit moyen reste donc exactement celui de la rampe).
 */
export const generateSpawns = (level: LevelConfig): SpawnEvent[] => {
  const rng = new Rng(level.seed);
  const radius = ENEMY_TYPES.basic.radius;
  const totalTicks = Math.round(level.durationS * TICKS_PER_SECOND);
  const spawns: SpawnEvent[] = [];
  let budget = 0;
  let groupSize = rng.int(1, level.maxGroupSize);

  for (let tick = 0; tick < totalTicks; tick++) {
    const progress = tick / totalTicks;
    const rate = level.spawnRate.start + (level.spawnRate.end - level.spawnRate.start) * progress;
    budget += rate * STEP_SECONDS;
    if (budget < groupSize) continue;

    budget -= groupSize;
    const groupWidth = (groupSize - 1) * GROUP_SPACING;
    const left = rng.range(CORRIDOR_LEFT + radius, CORRIDOR_RIGHT - radius - groupWidth);
    for (let i = 0; i < groupSize; i++) {
      spawns.push({ tick, type: 'basic', x: left + i * GROUP_SPACING });
    }
    groupSize = rng.int(1, level.maxGroupSize);
  }
  return spawns;
};
