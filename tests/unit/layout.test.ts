import { describe, expect, it } from 'vitest';
import { computeRenderScale, computeWorldView, MAX_RENDER_SCALE } from '../../src/render/layout';

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

describe('computeWorldView', () => {
  it('remplit exactement l’écran du S23 FE (360 × 800)', () => {
    expect(computeWorldView(360, 800)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });

  it('réduit et centre le monde sur un écran plus court (16:9)', () => {
    const view = computeWorldView(360, 640);
    expect(view.scale).toBe(0.8);
    expect(view.offsetX).toBeCloseTo(36, 6);
    expect(view.offsetY).toBeCloseTo(0, 6);
  });

  it('colle le monde en bas sur un écran plus long, sans l’agrandir', () => {
    expect(computeWorldView(360, 900)).toEqual({ scale: 1, offsetX: 0, offsetY: 100 });
  });
});
