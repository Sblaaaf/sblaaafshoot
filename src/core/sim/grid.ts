/**
 * Grille spatiale uniforme pour les collisions (SPEC §7.5), sans allocation par tick.
 * Chaque cellule contient une liste chaînée de slots, stockée dans deux tableaux typés :
 * `head[cellule]` → premier slot, `next[slot]` → slot suivant (-1 = fin).
 * Reconstruite à chaque tick : O(n) pour n ennemis, au lieu de O(balles × ennemis).
 */
export class SpatialGrid {
  readonly columns: number;
  readonly rows: number;
  private readonly cellSize: number;
  private readonly originY: number;
  private readonly head: Int32Array;
  private readonly next: Int32Array;

  /**
   * @param originY ordonnée du haut de la grille (négative pour couvrir la zone d'apparition)
   * @param capacity nombre maximal de slots (taille du pool)
   */
  constructor(width: number, height: number, cellSize: number, originY: number, capacity: number) {
    this.cellSize = cellSize;
    this.originY = originY;
    this.columns = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.head = new Int32Array(this.columns * this.rows).fill(-1);
    this.next = new Int32Array(capacity).fill(-1);
  }

  clear(): void {
    this.head.fill(-1);
  }

  /** Insère un slot dans la cellule contenant le point (x, y), bornée à la grille. */
  insert(slot: number, x: number, y: number): void {
    const cell = this.cellIndex(this.column(x), this.row(y));
    this.next[slot] = this.head[cell] ?? -1;
    this.head[cell] = slot;
  }

  /**
   * Remplit `out` (vidé au préalable, réutilisé pour ne rien allouer) avec les slots
   * des cellules recouvrant le rectangle. Les objets doivent être plus petits qu'une
   * cellule : on élargit la recherche d'une cellule pour attraper ceux dont le
   * centre est voisin. L'appelant fait le test de collision précis.
   */
  query(minX: number, minY: number, maxX: number, maxY: number, out: number[]): number[] {
    out.length = 0;
    const c0 = Math.max(0, this.column(minX) - 1);
    const c1 = Math.min(this.columns - 1, this.column(maxX) + 1);
    const r0 = Math.max(0, this.row(minY) - 1);
    const r1 = Math.min(this.rows - 1, this.row(maxY) + 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        let slot = this.head[this.cellIndex(c, r)] ?? -1;
        while (slot !== -1) {
          out.push(slot);
          slot = this.next[slot] ?? -1;
        }
      }
    }
    return out;
  }

  private column(x: number): number {
    return clamp(Math.floor(x / this.cellSize), 0, this.columns - 1);
  }

  private row(y: number): number {
    return clamp(Math.floor((y - this.originY) / this.cellSize), 0, this.rows - 1);
  }

  private cellIndex(column: number, row: number): number {
    return row * this.columns + column;
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
