import { MoveBase, type MoveDef } from "./moveBase";
import type { Player, Plant } from "./types";

/**
 * Action = the polymorphic Move | HealAction interface in com.g4ng.logic.
 * Ports Move.java and HealAction.java exactly.
 */
export interface Action {
  execute(performer: Player, opponent: Player, opponentAction: Action | null): string;
  defenseValue: number;
  label: string;
}

function plantOf(p: Player): Plant {
  const plant = p.garden.find((x) => x.id === p.activePlantId);
  if (!plant) throw new Error(`${p.username} has no active plant`);
  return plant;
}

export function moveAction(moveId: number): Action {
  const def: MoveDef = MoveBase.get(moveId);
  return {
    label: def.name,
    defenseValue: def.defense,
    execute(performer, opponent, opponentAction) {
      const attacker = plantOf(performer);
      const target = plantOf(opponent);

      if (Math.random() * 100 <= def.accuracy) {
        const opponentDefense = opponentAction?.defenseValue ?? 0;
        // Same damage formula as Move.java
        const variation = 0.7 + Math.random() * 0.4;
        const raw = (def.attack - opponentDefense * variation) * variation;
        const damage = Math.max(0, Math.floor(raw));
        target.hp = Math.max(0, target.hp - damage);
        return `${performer.username}'s ${attacker.name} used ${def.name} and dealt ${damage} damage!`;
      }
      return `${performer.username}'s ${attacker.name} missed ${def.name}!`;
    },
  };
}

export function healAction(): Action {
  return {
    label: "Heal",
    defenseValue: 15, // matches HealAction.java
    execute(performer) {
      if (performer.healCharges <= 0) {
        return `${performer.username} has no more heals left!`;
      }
      const plant = plantOf(performer);
      const amount = Math.floor(plant.maxHp * 0.2) + 10;
      const before = plant.hp;
      plant.hp = Math.min(plant.maxHp, plant.hp + amount);
      performer.healCharges -= 1;
      const actual = plant.hp - before;
      return `${performer.username}'s ${plant.name} healed ${actual} HP! (${performer.healCharges} left)`;
    },
  };
}
