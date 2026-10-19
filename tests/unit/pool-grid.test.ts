import { describe, expect, it } from 'vitest';
import { SpatialGrid } from '../../src/core/sim/grid';
import { Pool, type Poolable } from '../../src/core/sim/pool';

describe('Pool', () => {
  const createPool = (capacity: number) =>
    new Pool<Poolable>(capacity, (slot) => ({ slot, active: false }));

  it('distribue les slots dans un ordre déterministe, puis refuse au-delà de la capacité', () => {
    const pool = createPool(3);
    expect([pool.acquire()?.slot, pool.acquire()?.slot, pool.acquire()?.slot]).toEqual([0, 1, 2]);
    expect(pool.acquire()).toBeUndefined();
    expect(pool.activeCount).toBe(3);
  });

  it('réutilise un slot libéré, sans compter deux fois une double libération', () => {
    const pool = createPool(2);
    const first = pool.acquire();
    pool.acquire();
    if (first === undefined) throw new Error('pool vide');
    pool.release(first);
    pool.release(first);
    expect(pool.activeCount).toBe(1);
    expect(pool.acquire()?.slot).toBe(0);
  });
});

describe('SpatialGrid', () => {
  const out: number[] = [];

  it('trouve les objets proches et ignore les lointains', () => {
    const grid = new SpatialGrid(360, 800, 40, 0, 10);
    grid.insert(0, 100, 100);
    grid.insert(1, 110, 120);
    grid.insert(2, 300, 700);
    expect(grid.query(95, 95, 105, 105, out).sort()).toEqual([0, 1]);
  });

  it('borne les positions hors grille dans les cellules du bord', () => {
    const grid = new SpatialGrid(360, 800, 40, -40, 10);
    grid.insert(0, -50, -500);
    expect(grid.query(0, -40, 10, -30, out)).toEqual([0]);
  });

  it('se vide entre deux ticks', () => {
    const grid = new SpatialGrid(360, 800, 40, 0, 10);
    grid.insert(0, 100, 100);
    grid.clear();
    expect(grid.query(0, 0, 360, 800, out)).toEqual([]);
  });
});
