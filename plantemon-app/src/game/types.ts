/**
 * Shapes mirroring com.g4ng.model.* and the JSON the server returns.
 * Plant and Player are kept as plain objects (not classes) so they
 * serialise cleanly through fetch/AsyncStorage.
 */

export interface Taxonomy {
  class?: string;
  genus?: string;
  order?: string;
  family?: string;
  phylum?: string;
}

export interface Plant {
  /** Server-assigned UUID once persisted; locally-generated before sync. */
  id: string;
  ownerId?: string;
  name: string;

  maxHp: number;
  hp: number;
  attack: number;
  speed: number;

  spriteUrl: string;
  /** IDs into MoveBase. Stored as IDs so we don't duplicate Move data per plant. */
  moves: number[];

  taxonomy?: Taxonomy;

  // Metadata surfaced on the info screen
  description?: string | null;
  commonNames?: string[];
  watering?: string | null;
  sunlight?: string | null;
  soil?: string | null;
  toxicity?: string | null;
  culturalSignificance?: string | null;
}

export interface Player {
  username: string;
  garden: Plant[];
  activePlantId: string | null;
  healCharges: number;
}

export type BattlePhase = "P1_MOVE" | "P2_MOVE" | "PROCESSING" | "END";
