import Phaser from 'phaser';
import { prototypeLevel } from '../../core/levels/prototype';
import {
  BASE_LINE_Y,
  BULLET_CAPACITY,
  CORRIDOR_LEFT,
  CORRIDOR_RIGHT,
  ENEMY_CAPACITY,
  SQUAD_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../core/sim/constants';
import { FixedStepper } from '../../core/sim/fixedStep';
import { createWorld, stepWorld, type World } from '../../core/sim/world';
import { computeWorldView } from '../layout';
import { palette } from '../palette';
import type { Skin, SkinTexture } from '../skins/default';
import { SKIN_KEY } from './BootScene';
import { LogicalScene } from './LogicalScene';

/** Sensibilité du glissement (réglable de 0,5× à 2× au jalon 11). */
const SENSITIVITY = 1;
/** Marge de décor dessinée autour du monde, pour couvrir bandes et espace du haut. */
const DECOR_MARGIN = 2000;

/**
 * Affiche le monde du core et lui transmet les entrées. Ne contient aucune règle
 * de jeu : tout passe par `stepWorld` (SPEC §5.1).
 */
export class GameScene extends LogicalScene {
  private state!: World;
  private readonly stepper = new FixedStepper();
  private paused = false;
  /** Déplacement du doigt accumulé depuis le dernier tick, en unités du monde. */
  private pendingMoveX = 0;
  private trackedPointerId: number | undefined;
  private lastPointerX = 0;

  private skin!: Skin;
  private squadSprite!: Phaser.GameObjects.Image;
  private enemySprites: Phaser.GameObjects.Image[] = [];
  private bulletSprites: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('game');
  }

  get world(): World {
    return this.state;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  create(): void {
    const skin: unknown = this.registry.get(SKIN_KEY);
    if (skin === undefined) throw new Error('Skin non généré (BootScene)');
    this.skin = skin as Skin;

    this.drawDecor();
    this.enemySprites = this.createSprites(this.skin.enemy, ENEMY_CAPACITY);
    this.bulletSprites = this.createSprites(this.skin.bullet, BULLET_CAPACITY);
    this.squadSprite = this.createSprite(this.skin.shooter).setVisible(true);

    this.setupInput();
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera);
    // Pause automatique quand l'onglet ou l'app passe en arrière-plan (SPEC §7.5).
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pause);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.pause);
    });

    this.restart();
  }

  readonly pause = (): void => {
    if (this.state.status === 'running') this.paused = true;
  };

  readonly resume = (): void => {
    this.paused = false;
    // Le temps passé en pause ne doit pas être rattrapé par la simulation.
    this.stepper.reset();
    this.pendingMoveX = 0;
  };

  readonly restart = (): void => {
    this.state = createWorld(prototypeLevel);
    this.resume();
  };

  override update(_time: number, delta: number): void {
    if (!this.paused && this.state.status === 'running') {
      this.stepper.advance(delta, () => {
        stepWorld(this.state, { moveX: this.pendingMoveX });
        this.pendingMoveX = 0;
      });
    }
    this.syncSprites(this.paused ? 1 : this.stepper.alpha);
  }

  /**
   * Caméra du monde : fait tenir le monde 360×800 dans la vue (computeWorldView),
   * zoom = pixels physiques par unité logique × échelle du monde.
   */
  private readonly fitCamera = (): void => {
    const { width, height } = this.logicalSize;
    const view = computeWorldView(width, height);
    this.cameras.main
      .setOrigin(0, 0)
      .setZoom(this.renderScale * view.scale)
      .setScroll(-view.offsetX / view.scale, -view.offsetY / view.scale);
  };

  /**
   * Glissement relatif (SPEC §4.2) : seul le déplacement du doigt compte, pas sa
   * position. Un seul doigt suivi à la fois ; les autres sont ignorés.
   */
  private setupInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.trackedPointerId !== undefined) return;
      this.trackedPointerId = pointer.id;
      this.lastPointerX = pointer.x;
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.trackedPointerId) return;
      // pointer.x est en pixels du canvas : on convertit en unités du monde.
      const deltaPx = pointer.x - this.lastPointerX;
      this.lastPointerX = pointer.x;
      if (!this.paused) this.pendingMoveX += (deltaPx / this.cameras.main.zoom) * SENSITIVITY;
    });
    const release = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id === this.trackedPointerId) this.trackedPointerId = undefined;
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
  }

  /** Décor statique, dessiné une seule fois : murs sable, ligne et zone de la base. */
  private drawDecor(): void {
    const decor = this.add.graphics();
    const top = -DECOR_MARGIN;
    const fullHeight = WORLD_HEIGHT + DECOR_MARGIN;

    // Murs du couloir, prolongés pour remplir les bandes latérales et l'espace du haut.
    decor.fillStyle(palette.sand);
    decor.fillRect(-DECOR_MARGIN, top, DECOR_MARGIN + CORRIDOR_LEFT, fullHeight);
    decor.fillRect(CORRIDOR_RIGHT, top, WORLD_WIDTH - CORRIDOR_RIGHT + DECOR_MARGIN, fullHeight);

    // Zone de la base, sous la ligne : sable, séparée du couloir par un trait foncé.
    decor.fillRect(CORRIDOR_LEFT, BASE_LINE_Y, CORRIDOR_RIGHT - CORRIDOR_LEFT, 60);
    decor.lineStyle(2, palette.ink);
    decor.lineBetween(CORRIDOR_LEFT, BASE_LINE_Y, CORRIDOR_RIGHT, BASE_LINE_Y);
  }

  private createSprite(texture: SkinTexture): Phaser.GameObjects.Image {
    return this.add
      .image(0, 0, texture.key)
      .setOrigin(texture.originX, texture.originY)
      .setScale(1 / this.skin.resolution)
      .setVisible(false);
  }

  private createSprites(texture: SkinTexture, count: number): Phaser.GameObjects.Image[] {
    return Array.from({ length: count }, () => this.createSprite(texture));
  }

  /**
   * Recopie l'état du core dans les sprites (un sprite par slot de pool), en
   * interpolant entre les deux derniers ticks : le mouvement reste fluide même
   * quand une frame d'affichage tombe entre deux ticks.
   */
  private syncSprites(alpha: number): void {
    const { squad, enemies, bullets } = this.state;
    this.squadSprite.setPosition(lerp(squad.prevX, squad.x, alpha), SQUAD_Y);

    for (const enemy of enemies.items) {
      const sprite = this.enemySprites[enemy.slot];
      if (sprite === undefined) continue;
      sprite.setVisible(enemy.active);
      if (enemy.active) sprite.setPosition(enemy.x, lerp(enemy.prevY, enemy.y, alpha));
    }
    for (const bullet of bullets.items) {
      const sprite = this.bulletSprites[bullet.slot];
      if (sprite === undefined) continue;
      sprite.setVisible(bullet.active);
      if (bullet.active) sprite.setPosition(bullet.x, lerp(bullet.prevY, bullet.y, alpha));
    }
  }
}

const lerp = (from: number, to: number, alpha: number): number => from + (to - from) * alpha;
