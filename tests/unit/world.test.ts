import { describe, expect, it } from 'vitest';
import { BASE_FIRE_RATE } from '../../src/core/entities/squad';
import { prototypeLevel } from '../../src/core/levels/prototype';
import type { LevelConfig } from '../../src/core/levels/types';
import { Rng } from '../../src/core/rng';
import {
  BASE_LINE_Y,
  CORRIDOR_LEFT,
  CORRIDOR_RIGHT,
  TICKS_PER_SECOND,
} from '../../src/core/sim/constants';
import {
  createWorld,
  NO_INPUT,
  stepWorld,
  type TickInput,
  type World,
} from '../../src/core/sim/world';

/** Niveau sans flux : seuls les ennemis placés à la main existent. */
const emptyLevel: LevelConfig = { ...prototypeLevel, spawnRate: { start: 0, end: 0 } };

const placeEnemy = (world: World, x: number, y: number, hp = 2): void => {
  const enemy = world.enemies.acquire();
  if (enemy === undefined) throw new Error('pool plein');
  Object.assign(enemy, { type: 'basic', x, y, prevY: y, hp, maxHp: hp, speed: 70 });
  Object.assign(enemy, { radius: 10, weight: 1 });
};

const run = (world: World, ticks: number, input: (w: World) => TickInput = () => NO_INPUT) => {
  for (let i = 0; i < ticks && world.status === 'running'; i++) stepWorld(world, input(world));
};

/** Bot simple : vise l'ennemi le plus proche de la base, doigt limité à 720 u/s. */
const aimBot = (world: World): TickInput => {
  let lowest: { x: number; y: number } | undefined;
  for (const enemy of world.enemies.items) {
    if (enemy.active && (lowest === undefined || enemy.y > lowest.y)) lowest = enemy;
  }
  if (lowest === undefined) return NO_INPUT;
  const wanted = lowest.x - world.squad.targetX;
  return { moveX: Math.max(-12, Math.min(12, wanted)) };
};

/** Capture tout l'état observable, pour comparer deux simulations. */
const snapshot = (world: World) => ({
  tick: world.tick,
  status: world.status,
  squad: { ...world.squad },
  base: { ...world.base },
  stats: { ...world.stats },
  enemies: world.enemies.items.filter((e) => e.active).map((e) => ({ ...e })),
  bullets: world.bullets.items.filter((b) => b.active).map((b) => ({ ...b })),
});

describe('escouade', () => {
  it('suit le glissement du doigt (contrôle relatif) avec lissage', () => {
    const world = createWorld(emptyLevel);
    placeEnemy(world, 20, -500); // garde la partie en cours
    const startX = world.squad.x;
    stepWorld(world, { moveX: 40 });
    expect(world.squad.targetX).toBe(startX + 40);
    expect(world.squad.x).toBeGreaterThan(startX);
    expect(world.squad.x).toBeLessThan(startX + 40);
    run(world, 30);
    expect(world.squad.x).toBeCloseTo(startX + 40, 3);
  });

  it('reste bornée aux murs du couloir', () => {
    const world = createWorld(emptyLevel);
    placeEnemy(world, 20, -500);
    run(world, 60, () => ({ moveX: -1000 }));
    expect(world.squad.x).toBeGreaterThan(CORRIDOR_LEFT);
    run(world, 60, () => ({ moveX: 1000 }));
    expect(world.squad.x).toBeLessThan(CORRIDOR_RIGHT);
  });

  it('tire automatiquement à la cadence prévue', () => {
    const world = createWorld(emptyLevel);
    placeEnemy(world, 20, -500);
    let shots = 0;
    for (let i = 0; i < TICKS_PER_SECOND * 3; i++) {
      stepWorld(world, NO_INPUT);
      shots += world.events.filter((e) => e.kind === 'shot').length;
    }
    expect(shots).toBe(BASE_FIRE_RATE * 3);
  });
});

describe('combat', () => {
  it('les balles tuent un ennemi dans l’axe', () => {
    const world = createWorld(emptyLevel);
    placeEnemy(world, world.squad.x, 300);
    run(world, TICKS_PER_SECOND * 2);
    expect(world.stats.kills).toBe(1);
    expect(world.status).toBe('won');
  });

  it('les balles ignorent un ennemi hors de l’axe', () => {
    const world = createWorld(emptyLevel);
    placeEnemy(world, world.squad.x + 60, 300);
    run(world, TICKS_PER_SECOND);
    expect(world.stats.kills).toBe(0);
  });
});

describe('règle base', () => {
  it('un ennemi qui franchit la ligne blesse la base selon son poids pondéré', () => {
    const world = createWorld(emptyLevel);
    placeEnemy(world, 20, BASE_LINE_Y - 1, 4);
    const enemy = world.enemies.items[0];
    if (enemy === undefined) throw new Error('ennemi absent');
    enemy.hp = 1; // entamé : 1 × 1/4 → arrondi à 1
    run(world, 5);
    expect(world.base.hp).toBe(emptyLevel.baseHp - 1);
    expect(world.base.hitsTaken).toBe(1);
  });

  it('la partie est perdue quand la base tombe à 0', () => {
    const world = createWorld({ ...emptyLevel, baseHp: 2 });
    placeEnemy(world, 20, BASE_LINE_Y - 1);
    placeEnemy(world, 300, BASE_LINE_Y - 1);
    run(world, 5);
    expect(world.base.hp).toBe(0);
    expect(world.status).toBe('lost');
  });

  it('plus rien ne bouge une fois la partie finie', () => {
    const world = createWorld({ ...emptyLevel, baseHp: 1 });
    placeEnemy(world, 20, BASE_LINE_Y - 1);
    run(world, 5);
    const frozen = snapshot(world);
    stepWorld(world, { moveX: 50 });
    expect(snapshot(world)).toEqual(frozen);
  });
});

describe('déterminisme', () => {
  const randomInputs = (seed: number, length: number): TickInput[] => {
    const rng = new Rng(seed);
    return Array.from({ length }, () => ({ moveX: rng.range(-8, 8) }));
  };

  it('même niveau + mêmes entrées = état strictement identique après 3 000 ticks', () => {
    const inputs = randomInputs(1234, 3000);
    const a = createWorld(prototypeLevel);
    const b = createWorld(prototypeLevel);
    inputs.forEach((input) => {
      stepWorld(a, input);
      stepWorld(b, input);
    });
    expect(snapshot(a)).toEqual(snapshot(b));
  });

  it('des entrées différentes donnent une partie différente', () => {
    const a = createWorld(prototypeLevel);
    const b = createWorld(prototypeLevel);
    randomInputs(1, 3000).forEach((input) => {
      stepWorld(a, input);
    });
    randomInputs(2, 3000).forEach((input) => {
      stepWorld(b, input);
    });
    expect(snapshot(a)).not.toEqual(snapshot(b));
  });
});

describe('niveau prototype (victoire / défaite)', () => {
  const maxTicks = (prototypeLevel.durationS + 30) * TICKS_PER_SECOND;

  it('un joueur qui vise gagne', () => {
    const world = createWorld(prototypeLevel);
    run(world, maxTicks, aimBot);
    expect(world.status).toBe('won');
    expect(world.stats.droppedSpawns).toBe(0);
    expect(world.stats.kills).toBeGreaterThan(world.spawns.length * 0.8);
  });

  it('un joueur immobile perd', () => {
    const world = createWorld(prototypeLevel);
    run(world, maxTicks);
    expect(world.status).toBe('lost');
  });
});
