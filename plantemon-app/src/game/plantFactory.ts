import { movesForTaxonomy, pickRandomMoves } from "./moveBase";
import type { Plant, Taxonomy } from "./types";

/**
 * Port of PlantFactory.java. Three entrypoints:
 *   createFromApi   — happy path: Plant.id returned taxonomy + metadata
 *   createFromScan  — fallback: user typed a name, no taxonomy
 *   createFromSaved — hydrate from server/AsyncStorage
 */

const DEFAULT_MAX_HP = 100;

interface ApiPayload {
  name: string;
  spriteUrl: string;
  taxonomy?: Taxonomy;
  commonNames?: string[];
  description?: string | null;
  watering?: string | null;
  sunlight?: string | null;
  soil?: string | null;
  toxicity?: string | null;
  culturalSignificance?: string | null;
}

export function createFromApi(payload: ApiPayload): Plant {
  const pool = movesForTaxonomy(payload.taxonomy);
  return {
    id: localId(),
    name: payload.name,
    maxHp: DEFAULT_MAX_HP,
    hp: DEFAULT_MAX_HP,
    attack: rand(15, 25),
    speed: rand(15, 25),
    spriteUrl: payload.spriteUrl,
    moves: pickRandomMoves(pool, 4),
    taxonomy: payload.taxonomy,
    commonNames: payload.commonNames,
    description: payload.description,
    watering: payload.watering,
    sunlight: payload.sunlight,
    soil: payload.soil,
    toxicity: payload.toxicity,
    culturalSignificance: payload.culturalSignificance,
  };
}

export function createFromScan(name: string, spriteUrl: string): Plant {
  // Matches buildFallbackPlant: hard-coded default moveset
  return {
    id: localId(),
    name,
    maxHp: DEFAULT_MAX_HP,
    hp: DEFAULT_MAX_HP,
    attack: 20,
    speed: 20,
    spriteUrl,
    moves: pickRandomMoves(movesForTaxonomy(undefined), 4),
  };
}

export function createFromSaved(raw: Plant): Plant {
  // Defensive copy + sane defaults; server already has the shape right
  return { ...raw, hp: raw.hp ?? raw.maxHp };
}

function rand(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
function localId(): string {
  // Good enough for an unsynced row; server assigns the real UUID
  return "local-" + Math.random().toString(36).slice(2, 10);
}
