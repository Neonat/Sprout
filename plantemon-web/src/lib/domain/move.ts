import { random } from "./rng";
import type { Action } from "./types";
import type { Player } from "./player";
import { requireCurrentPlant } from "./require-plant";

/**
 * Port of logic/Move.java.
 *
 * By design, higher-attack moves carry lower accuracy.
 */
export class Move implements Action {
  readonly name: string;
  readonly attack: number;
  readonly defense: number;
  readonly accuracy: number;

  constructor(name: string, attack: number, defense: number, accuracy: number) {
    this.name = name;
    this.attack = attack;
    this.defense = defense;
    this.accuracy = accuracy;
  }

  execute(performer: Player, opponent: Player, opponentAction: Action | null): string {
    const attackerPlant = requireCurrentPlant(performer);
    const targetPlant = requireCurrentPlant(opponent);

    // Matches Java's `Math.random() * 100 <= accuracy`.
    if (random() * 100 <= this.accuracy) {
      const opponentDefense = opponentAction !== null ? opponentAction.getDefenseValue() : 0;

      // Damage variation, to keep turns from being deterministic.
      const variation = 0.7 + random() * 0.4;

      // Math.trunc reproduces Java's (int) cast, which truncates toward zero.
      // The clamp matters: without it a high opponent defense produced negative
      // damage, which healed the target.
      const damage = Math.max(0, Math.trunc((this.attack - opponentDefense * variation) * variation));

      targetPlant.takeDamage(damage);
      return `${performer.getUsername()}'s ${attackerPlant.getName()} used ${this.name} and dealt ${damage} damage!`;
    }

    return `${performer.getUsername()}'s ${attackerPlant.getName()} missed ${this.name}!`;
  }

  getDefenseValue(): number {
    return this.defense;
  }

  getName(): string {
    return this.name;
  }

  getAttack(): number {
    return this.attack;
  }

  getDefense(): number {
    return this.defense;
  }

  getAccuracy(): number {
    return this.accuracy;
  }
}
