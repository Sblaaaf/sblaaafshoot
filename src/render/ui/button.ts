import Phaser from 'phaser';
import { palette, toCss } from '../palette';

/** Cible tactile minimale (SPEC §8.4 : ≥ 48 × 48 dp). */
export const MIN_TOUCH_SIZE = 48;

export interface ButtonOptions {
  readonly width?: number;
  readonly height?: number;
  /** Bouton principal : bordure bleue, pour le distinguer (en plus de sa position). */
  readonly primary?: boolean;
  /** Résolution du texte (pixels physiques par unité logique). */
  readonly resolution: number;
}

/**
 * Bouton de menu : fond anthracite et texte blanc cassé (contraste 12,2:1).
 * La zone tactile fait au moins 48 × 48 unités logiques.
 */
export const createButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions,
): Phaser.GameObjects.Container => {
  const width = Math.max(MIN_TOUCH_SIZE, options.width ?? 200);
  const height = Math.max(MIN_TOUCH_SIZE, options.height ?? 52);

  const background = scene.add.graphics();
  background.fillStyle(palette.ink, 1);
  background.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
  background.lineStyle(3, options.primary === true ? palette.bonus : palette.ally, 1);
  background.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: toCss(palette.ally),
      resolution: options.resolution,
    })
    .setOrigin(0.5);

  const button = scene.add.container(x, y, [background, text]);
  button.setSize(width, height);
  // Phaser décale le point testé de l'origine d'affichage (moitié de la taille pour
  // un Container) : la zone tactile s'exprime donc depuis le coin haut-gauche.
  button.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    (area: Phaser.Geom.Rectangle, px: number, py: number) => area.contains(px, py),
  );
  button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => button.setScale(0.96));
  button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => button.setScale(1));
  button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
    button.setScale(1);
    onClick();
  });
  return button;
};
