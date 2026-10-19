/** Valeurs de départ de l'escouade (SPEC §4.3), à ajuster par le simulateur (jalon 6). */

/** Tirs par seconde et par tireur (1 tir/s × cadence de base). */
export const BASE_FIRE_RATE = 4;
export const BASE_BULLET_DAMAGE = 1;
/** Vitesse des balles, en unités du monde par seconde (vers le haut). */
export const BULLET_SPEED = 900;
export const BULLET_RADIUS = 3;
/** Rayon d'un tireur : sert à borner l'escouade aux murs du couloir. */
export const SHOOTER_RADIUS = 10;

/**
 * Lissage du mouvement : à chaque tick, l'escouade parcourt cette fraction de la
 * distance restante vers sa cible. 0,45 → 95 % du trajet en ~5 ticks (80 ms) :
 * absorbe les saccades du tactile sans inertie perceptible. Facteur constant
 * (et non exp(-dt/τ)) car le pas est fixe : on évite Math.exp, dont le dernier
 * bit peut varier d'un moteur JavaScript à l'autre.
 */
export const SQUAD_FOLLOW = 0.45;
