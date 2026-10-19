/** Palette SPEC §7.3. Valeurs numériques pour Phaser, chaînes pour le CSS. */
export const palette = {
  sage: 0x7e8c7a,
  sand: 0xd8cbb0,
  ally: 0xf4f1ea,
  ink: 0x2b2d33,
  bonus: 0x5b8fd9,
  malus: 0xe07a5f,
  wood: 0xc9a66b,
} as const;

export const toCss = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;
