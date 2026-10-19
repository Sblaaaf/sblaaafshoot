import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './render/layout';
import { palette } from './render/palette';
import { HelloScene } from './render/scenes/HelloScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: palette.sage,
  scale: {
    // EXPAND : largeur logique fixe (360), la hauteur s'étend selon le ratio,
    // sans déformation ni bandes noires (SPEC §4.1).
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
  },
  scene: [HelloScene],
});
