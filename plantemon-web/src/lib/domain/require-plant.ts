import type { Plant } from "./plant";
import type { Player } from "./player";

/**
 * The Java code dereferenced getCurrentPlant() without null checks and would
 * have thrown an NPE in the same situations. This turns that into an explicit
 * error rather than letting `undefined` leak into damage arithmetic.
 */
export function requireCurrentPlant(player: Player): Plant {
  const plant = player.getCurrentPlant();
  if (plant === null) {
    throw new Error(`${player.getUsername()} has no active plant`);
  }
  return plant;
}
