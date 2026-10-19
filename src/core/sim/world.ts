import { BASE_ENEMY_SPEED, ENEMY_TYPES, type EnemyTypeId } from '../entities/enemies';
import {
  BASE_BULLET_DAMAGE,
  BASE_FIRE_RATE,
  BULLET_RADIUS,
  BULLET_SPEED,
  SHOOTER_RADIUS,
  SQUAD_FOLLOW,
} from '../entities/squad';
import { generateSpawns } from '../levels/spawns';
import type { LevelConfig, SpawnEvent } from '../levels/types';
import { baseDamage } from '../rules/base';
import {
  BASE_LINE_Y,
  BULLET_CAPACITY,
  CORRIDOR_LEFT,
  CORRIDOR_RIGHT,
  ENEMY_CAPACITY,
  EPSILON,
  SPAWN_Y,
  SQUAD_Y,
  STEP_SECONDS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import { SpatialGrid } from './grid';
import { Pool, type Poolable } from './pool';

export type GameStatus = 'running' | 'won' | 'lost';

export interface Enemy extends Poolable {
  type: EnemyTypeId;
  x: number;
  y: number;
  /** Position au tick précédent, pour l'interpolation du rendu. */
  prevY: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  weight: number;
}

export interface Bullet extends Poolable {
  x: number;
  y: number;
  prevY: number;
  damage: number;
}

export interface Squad {
  x: number;
  prevX: number;
  /** Position visée, déplacée par les glissements du doigt (contrôle relatif). */
  targetX: number;
  count: number;
  /** Tirs par seconde et par tireur. */
  fireRate: number;
  damage: number;
  /** Fraction de tir accumulée entre deux ticks. */
  shotBudget: number;
}

export interface Base {
  hp: number;
  readonly maxHp: number;
  hitsTaken: number;
}

export type GameEvent =
  | { readonly kind: 'shot'; readonly x: number }
  | { readonly kind: 'enemyHit'; readonly slot: number }
  | { readonly kind: 'enemyKilled'; readonly x: number; readonly y: number }
  | { readonly kind: 'baseHit'; readonly x: number; readonly damage: number }
  | { readonly kind: 'won' }
  | { readonly kind: 'lost' };

export interface Stats {
  kills: number;
  damageDealt: number;
  maxSquad: number;
  /** Apparitions ignorées faute de place dans le pool (doit rester à 0). */
  droppedSpawns: number;
}

/** Entrée d'un tick : déplacement horizontal du doigt depuis le tick précédent. */
export interface TickInput {
  readonly moveX: number;
}

export const NO_INPUT: TickInput = { moveX: 0 };

export interface World {
  readonly level: LevelConfig;
  tick: number;
  status: GameStatus;
  readonly squad: Squad;
  readonly base: Base;
  readonly enemies: Pool<Enemy>;
  readonly bullets: Pool<Bullet>;
  readonly spawns: readonly SpawnEvent[];
  nextSpawn: number;
  /** Événements du dernier tick (sons, effets, HUD). Vidés à chaque tick. */
  readonly events: GameEvent[];
  readonly stats: Stats;
  readonly grid: SpatialGrid;
}

const SQUAD_MIN_X = CORRIDOR_LEFT + SHOOTER_RADIUS;
const SQUAD_MAX_X = CORRIDOR_RIGHT - SHOOTER_RADIUS;
/** Les balles partent du haut de l'escouade. */
const MUZZLE_Y = SQUAD_Y - 14;
/** Une balle sortie par le haut au-delà de cette ordonnée est recyclée. */
const BULLET_DESPAWN_Y = SPAWN_Y - 40;
const GRID_ORIGIN_Y = SPAWN_Y - 40;
const GRID_CELL = 40;
const MAX_ENEMY_RADIUS = Math.max(...Object.values(ENEMY_TYPES).map((type) => type.radius));

export const createWorld = (level: LevelConfig): World => ({
  level,
  tick: 0,
  status: 'running',
  squad: {
    x: WORLD_WIDTH / 2,
    prevX: WORLD_WIDTH / 2,
    targetX: WORLD_WIDTH / 2,
    count: 1,
    fireRate: BASE_FIRE_RATE,
    damage: BASE_BULLET_DAMAGE,
    shotBudget: 0,
  },
  base: { hp: level.baseHp, maxHp: level.baseHp, hitsTaken: 0 },
  enemies: new Pool<Enemy>(ENEMY_CAPACITY, (slot) => ({
    slot,
    active: false,
    type: 'basic',
    x: 0,
    y: 0,
    prevY: 0,
    hp: 0,
    maxHp: 0,
    speed: 0,
    radius: 0,
    weight: 0,
  })),
  bullets: new Pool<Bullet>(BULLET_CAPACITY, (slot) => ({
    slot,
    active: false,
    x: 0,
    y: 0,
    prevY: 0,
    damage: 0,
  })),
  spawns: generateSpawns(level),
  nextSpawn: 0,
  events: [],
  stats: { kills: 0, damageDealt: 0, maxSquad: 1, droppedSpawns: 0 },
  grid: new SpatialGrid(
    WORLD_WIDTH,
    WORLD_HEIGHT - GRID_ORIGIN_Y,
    GRID_CELL,
    GRID_ORIGIN_Y,
    ENEMY_CAPACITY,
  ),
});

/** Temps de jeu écoulé, en secondes. */
export const elapsedSeconds = (world: World): number => world.tick * STEP_SECONDS;

/**
 * Avance la simulation d'un tick (1/60 s). Fonction pure de (état, entrée) :
 * aucune horloge, aucun hasard global. Même état + mêmes entrées = même résultat.
 */
export const stepWorld = (world: World, input: TickInput): void => {
  world.events.length = 0;
  if (world.status !== 'running') return;

  savePreviousPositions(world);
  moveSquad(world.squad, input);
  spawnEnemies(world);
  moveEnemies(world);
  fire(world);
  moveBullets(world);
  resolveHits(world);
  resolveBaseLine(world);
  updateStatus(world);
  world.tick++;
};

const savePreviousPositions = (world: World): void => {
  world.squad.prevX = world.squad.x;
  for (const enemy of world.enemies.items) if (enemy.active) enemy.prevY = enemy.y;
  for (const bullet of world.bullets.items) if (bullet.active) bullet.prevY = bullet.y;
};

const moveSquad = (squad: Squad, input: TickInput): void => {
  squad.targetX = clamp(squad.targetX + input.moveX, SQUAD_MIN_X, SQUAD_MAX_X);
  squad.x += (squad.targetX - squad.x) * SQUAD_FOLLOW;
};

const spawnEnemies = (world: World): void => {
  const { level } = world;
  for (;;) {
    const spawn = world.spawns[world.nextSpawn];
    if (spawn === undefined || spawn.tick > world.tick) return;
    world.nextSpawn++;

    const enemy = world.enemies.acquire();
    if (enemy === undefined) {
      world.stats.droppedSpawns++;
      continue;
    }
    const type = ENEMY_TYPES[spawn.type];
    enemy.type = type.id;
    enemy.x = spawn.x;
    enemy.y = SPAWN_Y;
    enemy.prevY = SPAWN_Y;
    enemy.maxHp = level.enemyHp * type.hpFactor;
    enemy.hp = enemy.maxHp;
    enemy.speed = BASE_ENEMY_SPEED * type.speedFactor;
    enemy.radius = type.radius;
    enemy.weight = type.weight;
  }
};

const moveEnemies = (world: World): void => {
  for (const enemy of world.enemies.items) {
    if (enemy.active) enemy.y += enemy.speed * STEP_SECONDS;
  }
};

/**
 * Tir automatique : chaque tireur tire `fireRate` fois par seconde. Le budget de
 * tirs accumule les fractions pour que la cadence moyenne soit exacte même quand
 * elle ne tombe pas juste sur le pas de 1/60 s.
 */
const fire = (world: World): void => {
  const { squad } = world;
  squad.shotBudget += squad.fireRate * squad.count * STEP_SECONDS;
  while (squad.shotBudget >= 1 - EPSILON) {
    squad.shotBudget -= 1;
    const bullet = world.bullets.acquire();
    if (bullet === undefined) return;
    bullet.x = squad.x;
    bullet.y = MUZZLE_Y;
    bullet.prevY = MUZZLE_Y;
    bullet.damage = squad.damage;
    world.events.push({ kind: 'shot', x: squad.x });
  }
};

const moveBullets = (world: World): void => {
  for (const bullet of world.bullets.items) {
    if (!bullet.active) continue;
    bullet.y -= BULLET_SPEED * STEP_SECONDS;
    if (bullet.y < BULLET_DESPAWN_Y) world.bullets.release(bullet);
  }
};

/**
 * Collisions balles → ennemis via la grille spatiale. Test « balayé » : une balle
 * parcourt 15 unités par tick, on teste donc tout le segment [y, prevY] pour
 * qu'elle ne traverse jamais un ennemi entre deux ticks. Parmi les ennemis touchés,
 * on retient le plus bas (le premier rencontré en montant), slot le plus petit
 * en cas d'égalité, pour rester déterministe.
 */
const resolveHits = (world: World): void => {
  const { grid, enemies } = world;
  grid.clear();
  for (const enemy of enemies.items) {
    if (enemy.active) grid.insert(enemy.slot, enemy.x, enemy.y);
  }

  for (const bullet of world.bullets.items) {
    if (!bullet.active) continue;
    const target = findTarget(world, bullet);
    if (target === undefined) continue;

    const damage = Math.min(bullet.damage, target.hp);
    target.hp -= damage;
    world.stats.damageDealt += damage;
    world.bullets.release(bullet);
    if (target.hp <= 0) {
      world.stats.kills++;
      world.events.push({ kind: 'enemyKilled', x: target.x, y: target.y });
      enemies.release(target);
    } else {
      world.events.push({ kind: 'enemyHit', slot: target.slot });
    }
  }
};

/** Tampon réutilisé par les requêtes de grille (aucune allocation par balle). */
const candidates: number[] = [];
const HIT_REACH = BULLET_RADIUS + MAX_ENEMY_RADIUS;

const findTarget = (world: World, bullet: Bullet): Enemy | undefined => {
  const { x, y, prevY } = bullet;
  world.grid.query(x - HIT_REACH, y - HIT_REACH, x + HIT_REACH, prevY + HIT_REACH, candidates);
  let target: Enemy | undefined;
  for (const slot of candidates) {
    const enemy = world.enemies.items[slot];
    if (enemy === undefined || !enemy.active) continue;
    const touch = enemy.radius + BULLET_RADIUS;
    if (Math.abs(enemy.x - x) > touch) continue;
    if (enemy.y + touch < y || enemy.y - touch > prevY) continue;
    if (
      target === undefined ||
      enemy.y > target.y ||
      (enemy.y === target.y && enemy.slot < target.slot)
    ) {
      target = enemy;
    }
  }
  return target;
};

/** Règle `base` : tout ennemi qui franchit la ligne blesse la base puis disparaît. */
const resolveBaseLine = (world: World): void => {
  for (const enemy of world.enemies.items) {
    if (!enemy.active || enemy.y < BASE_LINE_Y) continue;
    if (world.level.rules.includes('base')) {
      const damage = baseDamage(enemy.weight, enemy.hp, enemy.maxHp);
      world.base.hp = Math.max(0, world.base.hp - damage);
      world.base.hitsTaken++;
      world.events.push({ kind: 'baseHit', x: enemy.x, damage });
    }
    world.enemies.release(enemy);
  }
};

const updateStatus = (world: World): void => {
  if (world.base.hp <= 0) {
    world.status = 'lost';
    world.events.push({ kind: 'lost' });
    return;
  }
  const flowDone = world.nextSpawn >= world.spawns.length;
  if (flowDone && world.enemies.activeCount === 0) {
    world.status = 'won';
    world.events.push({ kind: 'won' });
  }
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
