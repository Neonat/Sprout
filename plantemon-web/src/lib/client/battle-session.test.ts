import { afterEach, describe, expect, it } from "vitest";

import { createBattle, pickOpponentPlant } from "./battle-session";
import { Plant } from "@/lib/domain/plant";
import { Move } from "@/lib/domain/move";
import { resetRng, setRng } from "@/lib/domain/rng";

function plant(name: string): Plant {
  const p = new Plant(name, 10, null);
  p.addMove(new Move("Tackle", 15, 0, 90));
  return p;
}

describe("battle session", () => {
  afterEach(() => resetRng());

  it("picks an opponent that is never the chosen plant", () => {
    const a = plant("Fern");
    const b = plant("Rose");
    const c = plant("Cactus");
    const garden = [a, b, c];

    // Across the whole RNG range, the opponent is always someone else.
    for (const draw of [0, 0.34, 0.5, 0.67, 0.99]) {
      setRng(() => draw);
      expect(pickOpponentPlant(garden, a).id).not.toBe(a.id);
    }
  });

  it("falls back to the only plant when the garden has one", () => {
    const only = plant("Fern");
    expect(pickOpponentPlant([only], only).id).toBe(only.id);
  });

  it("starts both plants at full health, even from a damaged source", () => {
    const chosen = plant("Fern");
    const foe = plant("Rose");
    chosen.takeDamage(60); // 40/100 going in

    const battle = createBattle(chosen, foe);

    expect(battle.player.getCurrentPlant()!.getCurrentHealth()).toBe(100);
    expect(battle.opponent.getCurrentPlant()!.getCurrentHealth()).toBe(100);
  });

  it("does not mutate the garden's real plants", () => {
    const chosen = plant("Fern");
    const foe = plant("Rose");

    const battle = createBattle(chosen, foe);
    // Damage the battle's clone.
    battle.player.getCurrentPlant()!.takeDamage(50);

    // The original garden plant is untouched.
    expect(chosen.getCurrentHealth()).toBe(100);
    expect(battle.player.getCurrentPlant()).not.toBe(chosen);
  });

  it("fields the opponent plant it was given", () => {
    const chosen = plant("Fern");
    const foe = plant("Rose");
    const battle = createBattle(chosen, foe);
    expect(battle.opponent.getCurrentPlant()!.getName()).toBe("Rose");
  });
});
