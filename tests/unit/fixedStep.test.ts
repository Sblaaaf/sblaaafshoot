import { describe, expect, it } from 'vitest';
import { STEP_MS } from '../../src/core/sim/constants';
import { FixedStepper } from '../../src/core/sim/fixedStep';

describe('FixedStepper', () => {
  it('exécute un tick par frame à 60 FPS', () => {
    const stepper = new FixedStepper();
    let ticks = 0;
    for (let frame = 0; frame < 60; frame++) stepper.advance(STEP_MS, () => ticks++);
    expect(ticks).toBe(60);
  });

  it('accumule les frames courtes (120 Hz → un tick toutes les deux frames)', () => {
    const stepper = new FixedStepper();
    let ticks = 0;
    for (let frame = 0; frame < 120; frame++) stepper.advance(STEP_MS / 2, () => ticks++);
    expect(ticks).toBe(60);
  });

  it('rattrape une frame lente en plusieurs ticks', () => {
    const stepper = new FixedStepper();
    expect(stepper.advance(STEP_MS * 3, () => undefined)).toBe(3);
  });

  it('expose la fraction restante pour l’interpolation', () => {
    const stepper = new FixedStepper();
    stepper.advance(STEP_MS * 1.25, () => undefined);
    expect(stepper.alpha).toBeCloseTo(0.25, 6);
  });

  it('abandonne le retard au-delà de 8 ticks (spirale de la mort)', () => {
    const stepper = new FixedStepper();
    expect(stepper.advance(5000, () => undefined)).toBe(8);
    expect(stepper.alpha).toBe(0);
  });

  it('ignore un temps négatif', () => {
    const stepper = new FixedStepper();
    expect(stepper.advance(-100, () => undefined)).toBe(0);
  });
});
