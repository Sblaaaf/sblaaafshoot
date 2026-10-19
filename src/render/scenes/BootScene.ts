import { generateDefaultSkin, type Skin } from '../skins/default';
import { LogicalScene } from './LogicalScene';

export const SKIN_KEY = 'skin';

/** Génère les textures du skin une fois pour toutes, puis lance la partie. */
export class BootScene extends LogicalScene {
  constructor() {
    super('boot');
  }

  create(): void {
    const skin: Skin = generateDefaultSkin(this, this.renderScale);
    this.registry.set(SKIN_KEY, skin);
    this.scene.start('game');
    this.scene.launch('hud');
  }
}
