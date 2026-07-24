import movesJson from "./moves.json";
import { Move } from "@/lib/domain/move";

interface MoveRecord {
  id: number;
  name: string;
  attack: number;
  defense?: number;
  defence?: number;
  accuracy: number;
}

/**
 * Port of database/MoveBase.java.
 *
 * The Java version was a singleton wrapping a streaming JsonReader that had to
 * be primed with read(InputStream) before use — a footgun PlantFactory called
 * out in a comment. Bundling the JSON at build time removes the init step and
 * the failure mode along with it.
 *
 * Keyed by move id, which is not the same as array position: moves.json lists
 * id 11 out of order, between 8 and 9.
 */
export const moveBase: ReadonlyMap<number, Move> = new Map(
  (movesJson as MoveRecord[]).map((record) => [
    record.id,
    new Move(
      record.name ?? "Unknown Move",
      record.attack ?? 0,
      // The original tolerated both spellings.
      record.defense ?? record.defence ?? 0,
      record.accuracy ?? 100,
    ),
  ]),
);

export function getMove(id: number): Move {
  const move = moveBase.get(id);
  if (!move) throw new Error(`No move with id ${id}`);
  return move;
}
