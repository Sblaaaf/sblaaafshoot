import { WORLD_HEIGHT, WORLD_WIDTH } from '../core/sim/constants';

/** Largeur logique de conception (SPEC §4.1). La hauteur suit le ratio de l'écran. */
export const LOGICAL_WIDTH = 360;

/**
 * Hauteur logique minimale (ratio 16:9). Scale.EXPAND étend la dimension « en trop » :
 * tout écran portrait au moins aussi allongé que 16:9 garde donc exactement 360 de large
 * et gagne en hauteur. Avec une base plus haute (ex. 780), un écran moins allongé
 * élargirait le couloir. Le CSS de #game garantit ce ratio minimal.
 */
export const MIN_LOGICAL_HEIGHT = 640;

/** Plafond du facteur de rendu, pour borner la mémoire GPU sur les grands écrans. */
export const MAX_RENDER_SCALE = 4;

/**
 * Nombre de pixels physiques par unité logique. Le canvas est dimensionné en pixels
 * physiques (net), et la caméra zoome de ce facteur pour que le jeu raisonne en 360 unités.
 */
export const computeRenderScale = (cssWidth: number, devicePixelRatio: number): number => {
  const scale = (cssWidth * devicePixelRatio) / LOGICAL_WIDTH;
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_RENDER_SCALE, Math.max(1, scale));
};

export interface WorldView {
  /** Unités logiques d'écran par unité du monde (≤ 1). */
  readonly scale: number;
  /** Position du coin haut-gauche du monde, en unités logiques d'écran. */
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * Place le monde fixe (360×800) dans la vue logique, sans déformation.
 * Écran plus court que le monde : le monde est réduit et centré, avec des bandes
 * sur les côtés. Écran plus long : le monde est collé en bas (escouade près du
 * pouce) et l'espace en trop reste en haut, sous le HUD.
 */
export const computeWorldView = (viewWidth: number, viewHeight: number): WorldView => {
  const scale = Math.min(1, viewWidth / WORLD_WIDTH, viewHeight / WORLD_HEIGHT);
  return {
    scale,
    offsetX: (viewWidth - WORLD_WIDTH * scale) / 2,
    offsetY: viewHeight - WORLD_HEIGHT * scale,
  };
};
