import Phaser from 'phaser';
import { computeRenderScale, LOGICAL_WIDTH, MIN_LOGICAL_HEIGHT } from './render/layout';
import { palette } from './render/palette';
import { HelloScene } from './render/scenes/HelloScene';
import { RENDER_SCALE_KEY } from './render/scenes/LogicalScene';

const parent = document.getElementById('game');
if (parent === null) throw new Error('#game introuvable dans index.html');

// Le canvas est dimensionné en pixels physiques (≈ 1080 px de large sur le S23 FE) :
// sans ça, le navigateur étire un canvas de 360 px et l'image est floue.
const renderScale = computeRenderScale(parent.clientWidth, window.devicePixelRatio);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  backgroundColor: palette.sage,
  scale: {
    // EXPAND : largeur fixe, la hauteur s'étend selon le ratio de l'écran,
    // sans déformation ni bandes (SPEC §4.1).
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH * renderScale,
    height: MIN_LOGICAL_HEIGHT * renderScale,
  },
  callbacks: {
    preBoot: (bootingGame) => {
      bootingGame.registry.set(RENDER_SCALE_KEY, renderScale);
    },
  },
  scene: [HelloScene],
});

// Accès depuis la console pour le débogage à distance (Chrome DevTools).
if (import.meta.env.DEV) Object.assign(window, { game });
