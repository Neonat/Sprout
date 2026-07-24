import { Plant } from "./plant";
import { Move } from "./move";
import { randomInt, shuffled } from "./rng";
import { getMove } from "@/lib/data/move-base";
import { getMoveIdsForTaxonomy } from "@/lib/data/taxonomy-move-map";
import { toTaxonomy } from "@/lib/data/taxonomy";
import type { PlantIdentification } from "./plant-identification";

/** Every plant gets exactly this many moves. */
const MOVES_PER_PLANT = 4;

/**
 * Fallback moveset for hand-named plants, taken from
 * ScanActivity.buildFallbackPlant. Note these stats differ from the ones in
 * the README — the code is authoritative.
 */
const FALLBACK_MOVES: readonly Move[] = [
  new Move("Tackle", 15, 0, 90),
  new Move("Vine Whip", 20, 0, 85),
  new Move("Leaf Shield", 0, 10, 100),
  new Move("Solar Blast", 35, -5, 75),
];

/** Identified plants roll speed in [5, 20] (PlantFactory). */
function rollSpeed(): number {
  return randomInt(16) + 5;
}

/**
 * Hand-named plants roll speed in [5, 24] — ScanActivity used a different
 * bound than PlantFactory. Preserved rather than unified, since changing it
 * would alter who moves first in existing battles.
 */
function rollFallbackSpeed(): number {
  return randomInt(20) + 5;
}

/** Port of logic/PlantFactory.createFromApi. */
export function createFromApi(data: PlantIdentification, spritePath: string | null): Plant {
  const plant = new Plant(data.name || "Unknown Plant", rollSpeed(), spritePath);

  plant.commonNames = data.common_names ?? null;
  plant.description = data.description_value ?? null;
  // Stored as a JSON string, matching the Java field type.
  plant.taxonomy = data.taxonomy ? JSON.stringify(data.taxonomy) : null;
  plant.bestLightCondition = data.best_light_condition ?? null;
  plant.bestSoilType = data.best_soil_type ?? null;
  plant.commonUses = data.common_uses ?? null;
  plant.culturalSignificance = data.cultural_significance ?? null;
  plant.toxicity = data.toxicity ?? null;
  plant.bestWatering = data.best_watering ?? null;

  const moveIds = getMoveIdsForTaxonomy(toTaxonomy(data.taxonomy));
  if (moveIds.length < MOVES_PER_PLANT) {
    throw new Error(
      `Move pool has ${moveIds.length} moves, need ${MOVES_PER_PLANT}. Check taxonomy.json.`,
    );
  }

  for (const id of shuffled(moveIds).slice(0, MOVES_PER_PLANT)) {
    plant.addMove(getMove(id));
  }
  return plant;
}

/**
 * Port of the buildFallbackPlant path: used when Plant.id can't identify the
 * photo and the user types a name instead, so there is no taxonomy to map.
 */
export function buildFallbackPlant(name: string, spritePath: string | null): Plant {
  const plant = new Plant(name, rollFallbackSpeed(), spritePath);
  for (const move of FALLBACK_MOVES) {
    plant.addMove(move);
  }
  return plant;
}
