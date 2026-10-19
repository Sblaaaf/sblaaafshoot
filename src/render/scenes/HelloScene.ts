import Phaser from 'phaser';
import { t } from '../../i18n';
import { palette, toCss } from '../palette';
import { LogicalScene } from './LogicalScene';

const BORDER_WIDTH = 6;

/** Écran de validation du jalon 0 : vérifie le rendu, le scaling EXPAND et l'i18n. */
export class HelloScene extends LogicalScene {
  private borders!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private viewport!: Phaser.GameObjects.Text;
  private version!: Phaser.GameObjects.Text;

  constructor() {
    super('hello');
  }

  create(): void {
    this.setupLogicalCamera();
    this.borders = this.add.graphics();

    const ink = toCss(palette.ink);
    this.title = this.add
      .text(
        0,
        0,
        t('app.title'),
        this.textStyle({
          fontFamily: 'system-ui, sans-serif',
          fontSize: '40px',
          fontStyle: 'bold',
          color: toCss(palette.ally),
          stroke: ink,
          strokeThickness: 6,
        }),
      )
      .setOrigin(0.5);

    // L'anthracite seul sur la sauge ne donne que 3,9:1 (< 4,5:1 exigé, SPEC §8.4) :
    // texte clair cerné de foncé, lisible quel que soit le fond.
    const bodyStyle = this.textStyle({
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: toCss(palette.ally),
      stroke: ink,
      strokeThickness: 4,
    });
    this.subtitle = this.add.text(0, 0, t('hello.subtitle'), bodyStyle).setOrigin(0.5);
    this.viewport = this.add.text(0, 0, '', bodyStyle).setOrigin(0.5);
    this.version = this.add
      .text(0, 0, t('hello.version', { version: __APP_VERSION__ }), {
        ...bodyStyle,
        fontSize: '14px',
      })
      .setOrigin(0.5);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout);
    });
  }

  /** Avec Scale.EXPAND, la hauteur logique change selon l'écran : on replace tout. */
  private readonly layout = (): void => {
    const { width, height } = this.logicalSize;

    this.borders.clear();
    this.borders.fillStyle(palette.sand);
    this.borders.fillRect(0, 0, BORDER_WIDTH, height);
    this.borders.fillRect(width - BORDER_WIDTH, 0, BORDER_WIDTH, height);

    const centerX = width / 2;
    this.title.setPosition(centerX, height * 0.4);
    this.subtitle.setPosition(centerX, height * 0.4 + 48);
    this.viewport
      .setText(t('hello.viewport', { width: Math.round(width), height: Math.round(height) }))
      .setPosition(centerX, height * 0.4 + 80);
    this.version.setPosition(centerX, height - 32);
  };
}
