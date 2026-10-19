import Phaser from 'phaser';

export const RENDER_SCALE_KEY = 'renderScale';

export interface LogicalSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Scène de base : le canvas est en pixels physiques, mais tout le code de rendu
 * travaille en unités logiques (360 de large). Toute scène du jeu en hérite.
 */
export abstract class LogicalScene extends Phaser.Scene {
  /** Pixels physiques par unité logique (fixé au démarrage dans main.ts). */
  protected get renderScale(): number {
    const value: unknown = this.registry.get(RENDER_SCALE_KEY);
    return typeof value === 'number' && value > 0 ? value : 1;
  }

  /** Taille visible en unités logiques (la hauteur dépend de l'écran). */
  protected get logicalSize(): LogicalSize {
    const { width, height } = this.scale.gameSize;
    return { width: width / this.renderScale, height: height / this.renderScale };
  }

  /** Zoom autour du coin haut-gauche : l'unité logique (0, 0) reste en haut à gauche. */
  protected setupLogicalCamera(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(this.renderScale);
  }

  /** Style de texte rendu à la résolution physique, sinon le zoom le rend flou. */
  protected textStyle(
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.Types.GameObjects.Text.TextStyle {
    return { ...style, resolution: this.renderScale };
  }
}
