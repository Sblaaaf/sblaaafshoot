export interface Poolable {
  /** Index fixe dans le pool : le rendu associe un sprite par slot. */
  readonly slot: number;
  active: boolean;
}

/**
 * Pool à capacité fixe : tous les objets sont créés d'avance, aucune allocation
 * pendant la partie (pas de pause du ramasse-miettes en plein combat).
 * Les slots libres sont gérés par une pile : l'ordre de réutilisation est
 * déterministe, donc la simulation aussi.
 */
export class Pool<T extends Poolable> {
  readonly items: readonly T[];
  private readonly free: number[];
  private count = 0;

  constructor(capacity: number, create: (slot: number) => T) {
    this.items = Array.from({ length: capacity }, (_, slot) => create(slot));
    // Pile inversée : le slot 0 sort en premier.
    this.free = Array.from({ length: capacity }, (_, i) => capacity - 1 - i);
  }

  /** Renvoie un objet libre (à réinitialiser par l'appelant), ou undefined si plein. */
  acquire(): T | undefined {
    const slot = this.free.pop();
    if (slot === undefined) return undefined;
    const item = this.items[slot];
    if (item === undefined) return undefined;
    item.active = true;
    this.count++;
    return item;
  }

  release(item: T): void {
    if (!item.active) return;
    item.active = false;
    this.free.push(item.slot);
    this.count--;
  }

  get activeCount(): number {
    return this.count;
  }
}
