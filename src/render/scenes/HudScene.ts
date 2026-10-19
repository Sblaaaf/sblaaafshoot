import Phaser from 'phaser';
import { elapsedSeconds, type GameStatus, type World } from '../../core/sim/world';
import { formatDuration, formatNumber, t } from '../../i18n';
import { palette, toCss } from '../palette';
import { createButton, MIN_TOUCH_SIZE } from '../ui/button';
import type { GameScene } from './GameScene';
import { LogicalScene } from './LogicalScene';

const HUD_HEIGHT = 80;
const PADDING = 14;
const BAR_HEIGHT = 10;
const OVERLAY_DIM_SIZE = 4000;
/** Compteur FPS de débogage : ajouter `?debug` à l'URL. */
const DEBUG = new URLSearchParams(window.location.search).has('debug');

/**
 * HUD (en haut uniquement : le bas de l'écran est réservé au pouce, SPEC §8.1) et
 * écrans de pause et de fin. Scène superposée au jeu, en unités logiques.
 * Elle lit l'état du monde à chaque frame plutôt que d'écouter des événements :
 * aucun abonnement à nettoyer quand la partie redémarre.
 */
export class HudScene extends LogicalScene {
  private band!: Phaser.GameObjects.Graphics;
  private baseBar!: Phaser.GameObjects.Graphics;
  private squadText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private baseText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private fpsText: Phaser.GameObjects.Text | undefined;
  private pauseButton!: Phaser.GameObjects.Container;

  private pauseOverlay!: Phaser.GameObjects.Container;
  private endOverlay!: Phaser.GameObjects.Container;
  private endTitle!: Phaser.GameObjects.Text;
  private endDetails!: Phaser.GameObjects.Text;
  private shownStatus: GameStatus = 'running';

  constructor() {
    super('hud');
  }

  private get gameScene(): GameScene {
    return this.scene.get('game') as GameScene;
  }

  create(): void {
    this.setupLogicalCamera();
    const light = toCss(palette.ally);
    const hudText = (size: number, bold = false) =>
      this.textStyle({
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${size}px`,
        fontStyle: bold ? 'bold' : 'normal',
        color: light,
      });

    // Bandeau anthracite : texte clair à plus de 9:1 quel que soit le décor dessous.
    this.band = this.add.graphics();
    this.baseBar = this.add.graphics();
    this.squadText = this.add.text(PADDING, 10, '', hudText(18, true));
    this.timeText = this.add.text(0, 10, '', hudText(18, true)).setOrigin(0.5, 0);
    this.baseText = this.add.text(PADDING, 36, '', hudText(15));
    this.weaponText = this.add.text(PADDING, 58, '', hudText(14));
    if (DEBUG) this.fpsText = this.add.text(0, HUD_HEIGHT + 6, '', hudText(14)).setOrigin(1, 0);

    this.pauseButton = createButton(this, 0, 0, '', this.gameScene.pause, {
      width: MIN_TOUCH_SIZE,
      height: MIN_TOUCH_SIZE,
      resolution: this.renderScale,
    });
    // Icône pause dessinée (deux barres) plutôt qu'un caractère dépendant de la police.
    const icon = this.add.graphics();
    icon.fillStyle(palette.ally);
    icon.fillRoundedRect(-8, -10, 6, 20, 2);
    icon.fillRoundedRect(2, -10, 6, 20, 2);
    this.pauseButton.add(icon);

    this.pauseOverlay = this.createPauseOverlay(hudText);
    this.createEndOverlay(hudText);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout);
    });
  }

  override update(): void {
    if (!this.scene.isActive('game')) return;
    const { world, isPaused } = this.gameScene;
    this.updateHud(world);

    this.pauseOverlay.setVisible(isPaused && world.status === 'running');
    if (world.status !== this.shownStatus) {
      this.shownStatus = world.status;
      if (world.status !== 'running') this.fillEndOverlay(world);
      this.endOverlay.setVisible(world.status !== 'running');
    }
    this.pauseButton.setVisible(world.status === 'running' && !isPaused);
    this.fpsText?.setText(t('hud.fps', { fps: Math.round(this.game.loop.actualFps) }));
  }

  private updateHud(world: World): void {
    const { squad, base, level } = world;
    this.squadText.setText(t('hud.squad', { count: squad.count }));
    this.timeText.setText(
      t('hud.time', {
        elapsed: formatDuration(elapsedSeconds(world)),
        total: formatDuration(level.durationS),
      }),
    );
    this.baseText.setText(t('hud.base', { hp: base.hp, max: base.maxHp }));
    this.weaponText.setText(t('hud.weapon', { damage: squad.damage, rate: squad.fireRate }));

    // Jauge de la base : la valeur est aussi écrite en texte (jamais la couleur seule).
    const { width } = this.logicalSize;
    const barX = 120;
    const barWidth = width - barX - MIN_TOUCH_SIZE - PADDING * 2;
    const ratio = base.maxHp > 0 ? base.hp / base.maxHp : 0;
    this.baseBar.clear();
    this.baseBar.fillStyle(palette.sage);
    this.baseBar.fillRoundedRect(barX, 41, barWidth, BAR_HEIGHT, 4);
    if (ratio > 0) {
      this.baseBar.fillStyle(palette.bonus);
      this.baseBar.fillRoundedRect(barX, 41, Math.max(BAR_HEIGHT, barWidth * ratio), BAR_HEIGHT, 4);
    }
  }

  private readonly layout = (): void => {
    const { width, height } = this.logicalSize;
    this.band.clear();
    this.band.fillStyle(palette.ink, 0.88);
    this.band.fillRect(0, 0, width, HUD_HEIGHT);

    this.timeText.setX(width / 2);
    this.pauseButton.setPosition(width - PADDING - MIN_TOUCH_SIZE / 2, HUD_HEIGHT / 2);
    this.fpsText?.setX(width - PADDING);
    this.pauseOverlay.setPosition(width / 2, height / 2);
    this.endOverlay.setPosition(width / 2, height / 2);
  };

  private createOverlayBase(): Phaser.GameObjects.Container {
    // Voile plein écran : assombrit le jeu et intercepte les appuis.
    // Taille fixe très large, centrée sur l'overlay : couvre tout écran sans devoir
    // être redimensionné (la zone tactile, elle, ne suivrait pas un setSize).
    const dim = this.add
      .rectangle(0, 0, OVERLAY_DIM_SIZE, OVERLAY_DIM_SIZE, palette.ink, 0.72)
      .setInteractive();
    return this.add.container(0, 0, [dim]).setVisible(false).setDepth(10);
  }

  private createPauseOverlay(
    style: (size: number, bold?: boolean) => Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Container {
    const overlay = this.createOverlayBase();
    const title = this.add.text(0, -110, t('pause.title'), style(32, true)).setOrigin(0.5);
    const resume = createButton(this, 0, -20, t('pause.resume'), this.gameScene.resume, {
      primary: true,
      resolution: this.renderScale,
    });
    const restart = createButton(this, 0, 50, t('pause.restart'), this.gameScene.restart, {
      resolution: this.renderScale,
    });
    overlay.add([title, resume, restart]);
    return overlay;
  }

  private createEndOverlay(
    style: (size: number, bold?: boolean) => Phaser.Types.GameObjects.Text.TextStyle,
  ): void {
    this.endOverlay = this.createOverlayBase();
    this.endTitle = this.add.text(0, -130, '', style(36, true)).setOrigin(0.5);
    this.endDetails = this.add
      .text(0, -40, '', { ...style(18), align: 'center', lineSpacing: 8 })
      .setOrigin(0.5);
    const replay = createButton(this, 0, 60, t('end.replay'), this.gameScene.restart, {
      primary: true,
      resolution: this.renderScale,
    });
    this.endOverlay.add([this.endTitle, this.endDetails, replay]);
  }

  private fillEndOverlay(world: World): void {
    this.endTitle.setText(t(world.status === 'won' ? 'end.victory' : 'end.defeat'));
    this.endDetails.setText(
      [
        t('end.time', { time: formatDuration(elapsedSeconds(world)) }),
        t('end.kills', { kills: world.stats.kills }),
        t('end.base', { hp: formatNumber(world.base.hp), max: world.base.maxHp }),
      ].join('\n'),
    );
  }
}
