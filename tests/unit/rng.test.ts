import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';

const sequence = (rng: Rng, length: number): number[] => Array.from({ length }, () => rng.next());

describe('Rng (mulberry32)', () => {
  it('donne exactement la même suite pour la même seed', () => {
    expect(sequence(new Rng(42), 100)).toEqual(sequence(new Rng(42), 100));
  });

  it('donne des suites différentes pour des seeds différentes', () => {
    expect(sequence(new Rng(1), 10)).not.toEqual(sequence(new Rng(2), 10));
  });

  it('reste dans [0, 1)', () => {
    for (const value of sequence(new Rng(7), 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int inclut ses deux bornes et rien d’autre', () => {
    const rng = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(rng.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('est grossièrement uniforme (moyenne ≈ 0,5)', () => {
    const values = sequence(new Rng(99), 100_000);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean).toBeCloseTo(0.5, 2);
  });
});
