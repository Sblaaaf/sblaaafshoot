import type { LevelConfig } from './types';

/**
 * Niveau de test du jalon 1 (~1 min 30, cible du niveau 1). Valeurs provisoires,
 * remplacées par les niveaux générés et équilibrés au jalon 6.
 */
export const prototypeLevel: LevelConfig = {
  id: 'prototype',
  seed: 0x5b1aaaf,
  rules: ['base'],
  durationS: 90,
  baseHp: 20,
  enemyHp: 2,
  spawnRate: { start: 0.6, end: 1.5 },
  maxGroupSize: 3,
};
