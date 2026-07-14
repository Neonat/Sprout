import movesJson from "../../assets/data/moves.json";
import taxonomyJson from "../../assets/data/taxonomy.json";
import type { Taxonomy } from "./types";

export interface MoveDef {
  id: number;
  name: string;
  attack: number;
  defense: number;
  accuracy: number;
}

const moves = new Map<number, MoveDef>();
for (const m of movesJson as MoveDef[]) moves.set(m.id, m);

export const MoveBase = {
  get(id: number): MoveDef {
    const m = moves.get(id);
    if (!m) throw new Error(`Unknown move id ${id}`);
    return m;
  },
  all(): MoveDef[] {
    return Array.from(moves.values());
  },
};

/** Mirrors TaxonomyMoveMapBase.java decision tree. */
const VASCULAR = "Tracheophyta";
const FERNS = new Set(["Polypodiopsida", "Lycopodiopsida", "Equisetopsida"]);
const CONIFERS = new Set(["Pinopsida", "Cycadopsida", "Ginkgoopsida", "Gnetopsida"]);

interface TaxonomyGroup {
  id: number;
  group: string;
  moves: number[];
}
const groups = new Map<number, number[]>();
for (const g of taxonomyJson as TaxonomyGroup[]) groups.set(g.id, g.moves);

export function movesForTaxonomy(taxonomy: Taxonomy | undefined): number[] {
  if (!taxonomy) return groups.get(3)!;            // default: angiosperms
  if (taxonomy.phylum !== VASCULAR) return groups.get(0)!; // mosses
  if (taxonomy.class && FERNS.has(taxonomy.class)) return groups.get(1)!;
  if (taxonomy.class && CONIFERS.has(taxonomy.class)) return groups.get(2)!;
  return groups.get(3)!;                            // angiosperms
}

/** Shuffle a move pool and take 4 — matches PlantFactory.java behaviour. */
export function pickRandomMoves(pool: number[], count = 4): number[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}
