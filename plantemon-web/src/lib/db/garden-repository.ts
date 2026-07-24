import "server-only";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "./client";
import { plantMoves, plants, spriteCache } from "./schema";
import type { PlantMoveRow, PlantRow } from "./schema";
import { Plant } from "@/lib/domain/plant";
import { Move } from "@/lib/domain/move";

/**
 * Server-side replacement for database/PlantJsonHandler.java.
 *
 * The Java version serialised the whole garden to TEMP.json on internal
 * storage on every change. Here each plant is a row scoped to a user id, so a
 * garden survives a lost phone and follows the player between devices.
 */

/** Normalises a plant name into a cache key, matching Java's cacheFile(). */
export function spriteCacheKey(plantName: string): string {
  return plantName.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/** Rebuilds a domain Plant (with its moves) from database rows. */
function toPlant(row: PlantRow, moveRows: PlantMoveRow[]): Plant {
  const plant = new Plant(row.name, row.speed, row.spriteUrl, row.id);
  plant.setScanDateTime(row.scannedAt);
  plant.commonNames = row.commonNames ?? null;
  plant.description = row.description;
  plant.taxonomy = row.taxonomy ? JSON.stringify(row.taxonomy) : null;
  plant.bestLightCondition = row.bestLightCondition;
  plant.bestSoilType = row.bestSoilType;
  plant.commonUses = row.commonUses;
  plant.culturalSignificance = row.culturalSignificance;
  plant.toxicity = row.toxicity;
  plant.bestWatering = row.bestWatering;

  for (const move of [...moveRows].sort((a, b) => a.slot - b.slot)) {
    plant.addMove(new Move(move.name, move.attack, move.defense, move.accuracy));
  }
  return plant;
}

/** Loads a user's full garden, moves included. */
export async function listGarden(userId: string): Promise<Plant[]> {
  const db = getDb();
  const rows = await db.query.plants.findMany({
    where: eq(plants.userId, userId),
    with: { moves: true },
    orderBy: asc(plants.createdAt),
  });
  return rows.map((row) => toPlant(row, row.moves));
}

/** Loads one plant, scoped to its owner so ids from other users 404. */
export async function getPlant(userId: string, plantId: string): Promise<Plant | null> {
  const db = getDb();
  const row = await db.query.plants.findFirst({
    where: and(eq(plants.userId, userId), eq(plants.id, plantId)),
    with: { moves: true },
  });
  return row ? toPlant(row, row.moves) : null;
}

/** Persists a freshly scanned plant and its moveset. */
export async function addPlant(userId: string, plant: Plant): Promise<Plant> {
  const db = getDb();

  const [row] = await db
    .insert(plants)
    .values({
      id: plant.id,
      userId,
      name: plant.getName(),
      speed: plant.getSpeed(),
      spriteUrl: plant.spritePath,
      scannedAt: plant.getScanDateTime(),
      commonNames: plant.commonNames ?? undefined,
      taxonomy: plant.taxonomy ? JSON.parse(plant.taxonomy) : undefined,
      description: plant.description,
      bestLightCondition: plant.bestLightCondition,
      bestSoilType: plant.bestSoilType,
      commonUses: plant.commonUses,
      culturalSignificance: plant.culturalSignificance,
      toxicity: plant.toxicity,
      bestWatering: plant.bestWatering,
    })
    .returning();

  const moves = plant.getMoves();
  if (moves.length > 0) {
    await db.insert(plantMoves).values(
      moves.map((move, slot) => ({
        plantId: row.id,
        slot,
        name: move.getName(),
        attack: move.getAttack(),
        defense: move.getDefense(),
        accuracy: move.getAccuracy(),
      })),
    );
  }

  return plant;
}

/** Removes a plant. Moves cascade. Returns false if it wasn't the user's. */
export async function deletePlant(userId: string, plantId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(plants)
    .where(and(eq(plants.userId, userId), eq(plants.id, plantId)))
    .returning({ id: plants.id });
  return deleted.length > 0;
}

/** Looks up a cached sprite URL for a species. */
export async function findCachedSprite(plantName: string): Promise<string | null> {
  const db = getDb();
  const row = await db.query.spriteCache.findFirst({
    where: eq(spriteCache.cacheKey, spriteCacheKey(plantName)),
  });
  return row?.url ?? null;
}

/** Records a generated sprite. Concurrent scans of one species race benignly. */
export async function cacheSprite(
  plantName: string,
  url: string,
  prompt: string | null,
): Promise<void> {
  const db = getDb();
  await db
    .insert(spriteCache)
    .values({ cacheKey: spriteCacheKey(plantName), url, prompt })
    .onConflictDoNothing({ target: spriteCache.cacheKey });
}
