/**
 * Types d'ennemis définis en données (SPEC §4.6). Les multiplicateurs s'appliquent
 * aux valeurs de base du niveau (PV, vitesse). Les autres types arrivent au jalon 5.
 */
export type EnemyTypeId = 'basic';

export interface EnemyType {
  readonly id: EnemyTypeId;
  /** Multiplicateur de PV appliqué aux PV de base du niveau. */
  readonly hpFactor: number;
  /** Multiplicateur de vitesse appliqué à la vitesse de base. */
  readonly speedFactor: number;
  /** Poids : dégâts à la base (pondérés par les PV restants), tireurs tués au contact. */
  readonly weight: number;
  /** Rayon de collision, en unités du monde. */
  readonly radius: number;
}

export const ENEMY_TYPES: Readonly<Record<EnemyTypeId, EnemyType>> = {
  basic: { id: 'basic', hpFactor: 1, speedFactor: 1, weight: 1, radius: 10 },
};

/** Vitesse de base de descente, en unités du monde par seconde. */
export const BASE_ENEMY_SPEED = 70;
