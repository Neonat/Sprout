import { pgTable, text, integer, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Mirrors com.g4ng.model.Player — one row per signed-in user.
 * `clerkId` is the Clerk subject (sub claim on the JWT) and is the only
 * identifier the client knows about. `id` is our internal PK.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  username: text("username").notNull().default("Trainer"),
  activePlantId: uuid("active_plant_id"),
  healCharges: integer("heal_charges").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Mirrors com.g4ng.model.Plant. Moves and the taxonomy blob stay JSON
 * because they're already serialised that way client-side and we never
 * need to query inside them server-side.
 */
export const plants = pgTable("plants", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  hp: integer("hp").notNull(),
  maxHp: integer("max_hp").notNull(),
  attack: integer("attack").notNull(),
  speed: integer("speed").notNull(),

  spriteUrl: text("sprite_url").notNull(),
  moves: jsonb("moves").notNull().$type<number[]>(), // move IDs
  taxonomy: jsonb("taxonomy").$type<{
    class?: string;
    genus?: string;
    order?: string;
    family?: string;
    phylum?: string;
  }>(),

  // Free-text metadata fields that today live on Plant.java
  description: text("description"),
  commonNames: jsonb("common_names").$type<string[]>(),
  watering: text("watering"),
  sunlight: text("sunlight"),
  soil: text("soil"),
  toxicity: text("toxicity"),
  culturalSignificance: text("cultural_significance"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
