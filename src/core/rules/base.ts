/**
 * Règle `base` (SPEC §4.7) : un ennemi qui franchit la ligne inflige des dégâts
 * proportionnels à son poids et à ses PV restants. Entamer un ennemi qui passe
 * quand même réduit donc les dégâts, sans que l'échelle des PV de la base n'explose
 * quand les PV ennemis grimpent au fil des niveaux.
 */
export const baseDamage = (weight: number, hp: number, maxHp: number): number => {
  if (hp <= 0 || maxHp <= 0) return 0;
  return Math.max(1, Math.ceil((weight * hp) / maxHp));
};
