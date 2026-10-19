import type Phaser from 'phaser';
import { ENEMY_TYPES } from '../../../core/entities/enemies';
import { BULLET_RADIUS, SHOOTER_RADIUS } from '../../../core/entities/squad';
import { palette, toCss } from '../../palette';

/**
 * Skin par défaut (SPEC §7.1) : textures dessinées une seule fois au démarrage, puis
 * affichées comme de simples images. On ne redessine jamais de formes vectorielles
 * à chaque frame pour les entités nombreuses.
 *
 * Jalon 1 : formes géométriques provisoires. Les bonshommes 3D animés arrivent au
 * jalon 10, en remplaçant ce module sans toucher au core.
 */
export interface SkinTexture {
  readonly key: string;
  /** Origine du sprite (0..1), alignée sur la position du core. */
  readonly originX: number;
  readonly originY: number;
}

export interface Skin {
  readonly shooter: SkinTexture;
  readonly enemy: SkinTexture;
  readonly bullet: SkinTexture;
  /** Pixels de texture par unité du monde : les sprites s'affichent à l'échelle 1/resolution. */
  readonly resolution: number;
}

type Draw = (ctx: CanvasRenderingContext2D) => void;

/**
 * Dessine une texture de `width × height` unités du monde, rendue à `resolution`
 * pixels par unité pour rester nette une fois zoomée par la caméra.
 */
const bake = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  resolution: number,
  draw: Draw,
): void => {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(
    key,
    Math.ceil(width * resolution),
    Math.ceil(height * resolution),
  );
  if (texture === null) throw new Error(`Texture ${key} impossible à créer`);
  const ctx = texture.getContext();
  ctx.scale(resolution, resolution);
  draw(ctx);
  texture.refresh();
};

const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
};

export const generateDefaultSkin = (scene: Phaser.Scene, resolution: number): Skin => {
  const ink = toCss(palette.ink);
  const ally = toCss(palette.ally);

  // Tireur : corps rond blanc cassé cerné de foncé, petit fusil vers le haut.
  const r = SHOOTER_RADIUS;
  const shooterW = r * 2 + 4;
  const shooterH = r * 2 + 12;
  bake(scene, 'shooter', shooterW, shooterH, resolution, (ctx) => {
    ctx.fillStyle = ink;
    ctx.fillRect(shooterW / 2 - 2, 1, 4, 14);
    circle(ctx, shooterW / 2, shooterH - r - 2, r);
    ctx.fillStyle = ally;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ink;
    ctx.stroke();
  });

  // Ennemi : disque anthracite avec liseré clair.
  const er = ENEMY_TYPES.basic.radius;
  const enemySize = er * 2 + 4;
  bake(scene, 'enemy', enemySize, enemySize, resolution, (ctx) => {
    circle(ctx, enemySize / 2, enemySize / 2, er);
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = ally;
    ctx.stroke();
  });

  // Balle : capsule claire cernée de foncé, lisible sur la sauge.
  const br = BULLET_RADIUS;
  const bulletW = br * 2 + 2;
  const bulletH = br * 4 + 2;
  bake(scene, 'bullet', bulletW, bulletH, resolution, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(1, 1, br * 2, br * 4, br);
    ctx.fillStyle = ally;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = ink;
    ctx.stroke();
  });

  return {
    shooter: { key: 'shooter', originX: 0.5, originY: (shooterH - r - 2) / shooterH },
    enemy: { key: 'enemy', originX: 0.5, originY: 0.5 },
    bullet: { key: 'bullet', originX: 0.5, originY: 0.5 },
    resolution,
  };
};
