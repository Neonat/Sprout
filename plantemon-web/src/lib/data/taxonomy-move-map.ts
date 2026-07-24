import taxonomyJson from "./taxonomy.json";
import type { Taxonomy } from "./taxonomy";

interface TaxonomyGroupRecord {
  id: number;
  group: string;
  moves: number[];
}

/** Group ids as they appear in taxonomy.json. */
const GROUP = {
  NON_VASCULAR: 0,
  SPORE_VASCULAR: 1,
  GYMNOSPERM: 2,
  ANGIOSPERM: 3,
} as const;

const VASCULAR = "Tracheophyta";
const FERNS = new Set(["Polypodiopsida", "Lycopodiopsida", "Equisetopsida"]);
const CONIFERS = new Set(["Pinopsida", "Cycadopsida", "Ginkgoopsida", "Gnetopsida"]);

const groups = taxonomyJson as TaxonomyGroupRecord[];

const moveIdsByGroup: ReadonlyMap<number, readonly number[]> = new Map(
  groups.map((record) => [record.id, record.moves]),
);

export const groupNames: ReadonlyMap<number, string> = new Map(
  groups.map((record) => [record.id, record.group]),
);

/**
 * Port of TaxonomyMoveMapBase.getMoves — a decision tree mapping a plant's
 * Linnaean taxonomy onto one of four move pools.
 */
export function getMoveIdsForTaxonomy(taxonomy: Taxonomy): readonly number[] {
  const groupId = resolveGroupId(taxonomy);
  const moveIds = moveIdsByGroup.get(groupId);
  if (!moveIds) throw new Error(`No move pool for taxonomy group ${groupId}`);
  return moveIds;
}

export function resolveGroupId(taxonomy: Taxonomy): number {
  // Non-vascular -> mosses.
  if (taxonomy.phylum !== VASCULAR) return GROUP.NON_VASCULAR;
  // Spore-bearing vascular -> ferns and allies.
  if (FERNS.has(taxonomy.class)) return GROUP.SPORE_VASCULAR;
  // Gymnosperms -> conifers and allies.
  if (CONIFERS.has(taxonomy.class)) return GROUP.GYMNOSPERM;
  // Everything else is treated as a flowering plant.
  return GROUP.ANGIOSPERM;
}
