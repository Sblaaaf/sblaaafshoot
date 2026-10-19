/**
 * Générateur pseudo-aléatoire à seed (mulberry32). Rapide, 32 bits d'état, période 2^32 :
 * largement suffisant pour du jeu (pas pour de la cryptographie).
 * Seules des opérations entières 32 bits sont utilisées : le résultat est identique
 * sur tous les moteurs JavaScript.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Flottant dans [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Flottant dans [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Entier dans [min, max] (bornes incluses). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** État courant, pour sauvegarder / rejouer une simulation. */
  getState(): number {
    return this.state;
  }
}
