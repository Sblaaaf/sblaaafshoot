import { EPSILON, STEP_MS } from './constants';

/** Au-delà, on abandonne le retard plutôt que d'enchaîner des centaines de ticks. */
const MAX_STEPS_PER_FRAME = 8;

/**
 * Boucle à pas fixe avec accumulateur (« Fix Your Timestep », G. Fiedler).
 * Le rendu appelle `advance` avec le temps réel écoulé ; la simulation avance par
 * ticks de 1/60 s exactement, 0, 1 ou plusieurs fois selon le temps accumulé.
 * `alpha` (0..1) est la fraction de tick restante, pour interpoler l'affichage.
 */
export class FixedStepper {
  private accumulator = 0;
  private readonly stepMs: number;

  constructor(stepMs: number = STEP_MS) {
    this.stepMs = stepMs;
  }

  /** Exécute les ticks dus et renvoie leur nombre. */
  advance(elapsedMs: number, step: () => void): number {
    this.accumulator += Math.max(0, elapsedMs);
    let steps = 0;
    while (this.accumulator >= this.stepMs - EPSILON) {
      if (steps === MAX_STEPS_PER_FRAME) {
        // Spirale de la mort évitée : l'appareil ne suit pas, on lâche le retard.
        this.accumulator = 0;
        break;
      }
      step();
      this.accumulator -= this.stepMs;
      steps++;
    }
    return steps;
  }

  get alpha(): number {
    return Math.max(0, this.accumulator / this.stepMs);
  }

  reset(): void {
    this.accumulator = 0;
  }
}
