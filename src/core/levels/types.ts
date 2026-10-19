import type { EnemyTypeId } from '../entities/enemies';

export type RuleId = 'base';

/**
 * Configuration d'un niveau. Version minimale du jalon 1 : le schéma complet
 * (courbes, portes, caisses, boss, étoiles) arrive avec le générateur (jalon 6).
 */
export interface LevelConfig {
  readonly id: string;
  readonly seed: number;
  readonly rules: readonly RuleId[];
  /** Durée du flux d'ennemis, en secondes. */
  readonly durationS: number;
  readonly baseHp: number;
  /** PV d'un ennemi basique (multipliés par le hpFactor de chaque type). */
  readonly enemyHp: number;
  /** Ennemis par seconde, interpolés linéairement du début à la fin du flux. */
  readonly spawnRate: { readonly start: number; readonly end: number };
  /** Taille maximale d'un groupe d'ennemis apparaissant côte à côte. */
  readonly maxGroupSize: number;
}

export interface SpawnEvent {
  readonly tick: number;
  readonly type: EnemyTypeId;
  readonly x: number;
}
