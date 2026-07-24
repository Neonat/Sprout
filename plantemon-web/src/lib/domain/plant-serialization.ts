import { Plant } from "./plant";
import { Move } from "./move";

/**
 * Wire/storage format for a plant. Port of the JSON shape written by
 * database/PlantJsonHandler.java, with two changes:
 *  - `spritePath` becomes `spriteUrl` (a URL or data URL, not a device path)
 *  - `scanDateTime` stays an epoch millisecond value, as before
 */
export interface SerializedMove {
  name: string;
  attack: number;
  defense: number;
  accuracy: number;
}

export interface SerializedPlant {
  id: string;
  name: string;
  maxHealth: number;
  speed: number;
  spriteUrl: string | null;
  scanDateTime: number;
  moves: SerializedMove[];
  commonNames?: string[] | null;
  description?: string | null;
  taxonomy?: string | null;
  bestLightCondition?: string | null;
  bestSoilType?: string | null;
  commonUses?: string | null;
  culturalSignificance?: string | null;
  toxicity?: string | null;
  bestWatering?: string | null;
}

export function serializePlant(plant: Plant): SerializedPlant {
  return {
    id: plant.id,
    name: plant.getName(),
    maxHealth: plant.getMaxHealth(),
    speed: plant.getSpeed(),
    spriteUrl: plant.spritePath,
    scanDateTime: plant.getScanDateTime().getTime(),
    moves: plant.getMoves().map((move) => ({
      name: move.getName(),
      attack: move.getAttack(),
      defense: move.getDefense(),
      accuracy: move.getAccuracy(),
    })),
    commonNames: plant.commonNames,
    description: plant.description,
    taxonomy: plant.taxonomy,
    bestLightCondition: plant.bestLightCondition,
    bestSoilType: plant.bestSoilType,
    commonUses: plant.commonUses,
    culturalSignificance: plant.culturalSignificance,
    toxicity: plant.toxicity,
    bestWatering: plant.bestWatering,
  };
}

export function deserializePlant(data: SerializedPlant): Plant {
  const plant = new Plant(data.name, data.speed, data.spriteUrl ?? null, data.id);
  plant.setScanDateTime(new Date(data.scanDateTime));
  plant.commonNames = data.commonNames ?? null;
  plant.description = data.description ?? null;
  plant.taxonomy = data.taxonomy ?? null;
  plant.bestLightCondition = data.bestLightCondition ?? null;
  plant.bestSoilType = data.bestSoilType ?? null;
  plant.commonUses = data.commonUses ?? null;
  plant.culturalSignificance = data.culturalSignificance ?? null;
  plant.toxicity = data.toxicity ?? null;
  plant.bestWatering = data.bestWatering ?? null;

  for (const move of data.moves ?? []) {
    plant.addMove(new Move(move.name, move.attack, move.defense, move.accuracy));
  }
  return plant;
}
