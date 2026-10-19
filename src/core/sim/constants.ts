/** Pas fixe de la simulation (SPEC §5.1). */
export const TICKS_PER_SECOND = 60;
export const STEP_SECONDS = 1 / TICKS_PER_SECOND;
export const STEP_MS = 1000 / TICKS_PER_SECOND;

/**
 * Tolérance des accumulateurs : 1/60 n'est pas représentable exactement en flottant,
 * et 180 additions de 4/60 donnent 11,999… au lieu de 12. Sans elle, un tir ou un
 * tick serait décalé d'un cran.
 */
export const EPSILON = 1e-9;

/**
 * Monde de simulation fixe, indépendant de l'écran : même difficulté sur tous les
 * appareils, et le simulateur joue exactement le jeu. Ratio du S23 FE.
 */
export const WORLD_WIDTH = 360;
export const WORLD_HEIGHT = 800;

/** Épaisseur des murs du couloir (bords sable). */
export const WALL_WIDTH = 6;
export const CORRIDOR_LEFT = WALL_WIDTH;
export const CORRIDOR_RIGHT = WORLD_WIDTH - WALL_WIDTH;

/** Ligne de l'escouade, à ~85 % de la hauteur (SPEC §4.1). */
export const SQUAD_Y = 680;
/** Ligne de la base, sous l'escouade : un ennemi qui la franchit touche la base. */
export const BASE_LINE_Y = 740;
/** Les ennemis apparaissent au-dessus du bord haut, hors de vue. */
export const SPAWN_Y = -24;

/** Plafonds des pools (SPEC §7.5). */
export const ENEMY_CAPACITY = 250;
export const BULLET_CAPACITY = 300;
