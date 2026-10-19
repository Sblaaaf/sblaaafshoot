import { describe, expect, it } from 'vitest';
import { ENEMY_TYPES } from '../../src/core/entities/enemies';
import { generateSpawns } from '../../src/core/levels/spawns';
import { prototypeLevel } from '../../src/core/levels/prototype';
import { baseDamage } from '../../src/core/rules/base';
import { CORRIDOR_LEFT, CORRIDOR_RIGHT } from '../../src/core/sim/constants';

describe('baseDamage (règle base, poids pondéré)', () => {
  it('un ennemi intact inflige son poids', () => {
    expect(baseDamage(3, 60, 60)).toBe(3);
  });

  it('un ennemi entamé inflige moins, arrondi au supérieur', () => {
    expect(baseDamage(25, 300, 1000)).toBe(8); // 7,5 → 8
  });

  it('inflige au moins 1 tant que l’ennemi est vivant', () => {
    expect(baseDamage(1, 1, 100)).toBe(1);
  });

  it('un ennemi mort n’inflige rien', () => {
    expect(baseDamage(5, 0, 10)).toBe(0);
  });
});

describe('generateSpawns', () => {
  const spawns = generateSpawns(prototypeLevel);

  it('génère toujours le même flux pour un même niveau', () => {
    expect(generateSpawns(prototypeLevel)).toEqual(spawns);
  });

  it('change de flux avec la seed', () => {
    expect(generateSpawns({ ...prototypeLevel, seed: 1 })).not.toEqual(spawns);
  });

  it('respecte le débit moyen de la rampe (0,6 → 1,5 ennemi/s sur 90 s ≈ 94)', () => {
    const { start, end } = prototypeLevel.spawnRate;
    const expected = ((start + end) / 2) * prototypeLevel.durationS;
    // Le reliquat de budget est inférieur à la taille d'un groupe.
    expect(spawns.length).toBeGreaterThan(expected - prototypeLevel.maxGroupSize);
    expect(spawns.length).toBeLessThanOrEqual(expected);
  });

  it('produit un flux trié dans le temps, entièrement dans le couloir', () => {
    const radius = ENEMY_TYPES.basic.radius;
    spawns.forEach((spawn, i) => {
      expect(spawn.tick).toBeGreaterThanOrEqual(spawns[i - 1]?.tick ?? 0);
      expect(spawn.x).toBeGreaterThanOrEqual(CORRIDOR_LEFT + radius);
      expect(spawn.x).toBeLessThanOrEqual(CORRIDOR_RIGHT - radius);
    });
  });

  it('fait apparaître des groupes de plusieurs ennemis', () => {
    const ticks = spawns.map((spawn) => spawn.tick);
    expect(new Set(ticks).size).toBeLessThan(ticks.length);
  });
});
