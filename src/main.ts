import Phaser from 'phaser';
import { computeRenderScale, LOGICAL_WIDTH, MIN_LOGICAL_HEIGHT } from './render/layout';
import { palette } from './render/palette';
import { BootScene } from './render/scenes/BootScene';
import { GameScene } from './render/scenes/GameScene';
import { HudScene } from './render/scenes/HudScene';
import { RENDER_SCALE_KEY } from './render/scenes/LogicalScene';

/**
 * Rendu plafonné à 60 FPS par défaut (SPEC §2). Phaser déclenche une frame quand
 * `delta >= 1000 / limite` : à 120 Hz, deux frames font 16,666 ms, parfois juste
 * sous 16,667 ms, et le limiteur tomberait alors à 40 FPS. La marge de 2 % l'évite ;
 * la frame en trop qu'elle laisse passer de temps en temps est invisible grâce à
 * l'interpolation du rendu.
 */
const RENDER_FPS_CAP = 60 * 1.02;

const parent = document.getElementById('game');
if (parent === null) throw new Error('#game introuvable dans index.html');

// Le canvas est dimensionné en pixels physiques (≈ 1080 px de large sur le S23 FE) :
// sans ça, le navigateur étire un canvas de 360 px et l'image est floue.
const renderScale = computeRenderScale(parent.clientWidth, window.devicePixelRatio);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  backgroundColor: palette.sage,
  fps: { limit: RENDER_FPS_CAP },
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
  scene: [BootScene, GameScene, HudScene],
});

// Accès depuis la console pour le débogage à distance (Chrome DevTools).
if (import.meta.env.DEV) Object.assign(window, { game });
