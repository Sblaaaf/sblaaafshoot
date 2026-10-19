import { describe, expect, it } from 'vitest';
import { computeRenderScale, MAX_RENDER_SCALE } from '../../src/render/layout';

describe('computeRenderScale', () => {
  it('donne ≈ 3 pixels physiques par unité logique sur le S23 FE (412 px CSS, DPR 2,625)', () => {
    expect(computeRenderScale(412, 2.625)).toBeCloseTo(3.004, 3);
  });

  it('ne descend jamais sous 1', () => {
    expect(computeRenderScale(320, 1)).toBe(1);
  });

  it('est plafonné pour borner la mémoire GPU', () => {
    expect(computeRenderScale(1440, 3)).toBe(MAX_RENDER_SCALE);
  });

  it('retombe à 1 si la taille est inconnue', () => {
    expect(computeRenderScale(Number.NaN, 2)).toBe(1);
  });
});
