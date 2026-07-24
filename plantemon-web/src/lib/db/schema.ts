import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Replaces PlantJsonHandler's TEMP.json, which stored a single device-local
 * garden. Rows are scoped by the auth provider's user id so a garden follows
 * the player across devices.
 */
export const plants = pgTable(
  "plants",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Auth provider subject id. Text, not a FK — the provider owns identity. */
    userId: text("user_id").notNull(),

    name: text("name").notNull(),
    speed: integer("speed").notNull(),

    /** Public URL of the generated sprite in blob storage. */
    spriteUrl: text("sprite_url"),

    /** Named scanDateTime in the Java model. */
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),

    // Metadata carried over from the Plant.id response.
    commonNames: jsonb("common_names").$type<string[]>(),
    description: text("description"),
    /** Raw Plant.id taxonomy block; drives the move-pool decision tree. */
    taxonomy: jsonb("taxonomy").$type<Record<string, unknown>>(),
    bestLightCondition: text("best_light_condition"),
    bestSoilType: text("best_soil_type"),
    commonUses: text("common_uses"),
    culturalSignificance: text("cultural_significance"),
    toxicity: text("toxicity"),
    bestWatering: text("best_watering"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The garden view lists a user's plants; this is the only read pattern.
    uniqueIndex("plants_user_id_id_idx").on(table.userId, table.id),
  ],
);

/**
 * A plant's four moves, stored per plant rather than as ids into moves.json.
 * The Java save file embedded full move objects, so a plant keeps the moves it
 * was created with even if the move table is later rebalanced.
 */
export const plantMoves = pgTable("plant_moves", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plants.id, { onDelete: "cascade" }),
  /** Position in the plant's moveset, 0-3, so ordering survives a round trip. */
  slot: integer("slot").notNull(),
  name: text("name").notNull(),
  attack: integer("attack").notNull(),
  defense: integer("defense").notNull(),
  accuracy: integer("accuracy").notNull(),
});

/**
 * Caches generated sprites by plant name, replacing the on-device
 * sprite_cache directory. Shared across users: the same species always yields
 * the same sprite, and generation is the slowest, costliest step in a scan.
 */
export const spriteCache = pgTable(
  "sprite_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Normalised plant name, matching the Java cacheFile() slug rules. */
    cacheKey: text("cache_key").notNull(),
    url: text("url").notNull(),
    prompt: text("prompt"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("sprite_cache_key_idx").on(table.cacheKey)],
);

export const plantsRelations = relations(plants, ({ many }) => ({
  moves: many(plantMoves),
}));

export const plantMovesRelations = relations(plantMoves, ({ one }) => ({
  plant: one(plants, { fields: [plantMoves.plantId], references: [plants.id] }),
}));

export type PlantRow = typeof plants.$inferSelect;
export type NewPlantRow = typeof plants.$inferInsert;
export type PlantMoveRow = typeof plantMoves.$inferSelect;
