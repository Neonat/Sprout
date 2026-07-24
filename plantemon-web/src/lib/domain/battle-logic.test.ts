import { beforeEach, afterEach, describe, expect, it } from "vitest";

import { Plant } from "./plant";
import { Player } from "./player";
import { Move } from "./move";
import { HealAction } from "./heal-action";
import { SwitchAction } from "./switch-action";
import { BattleHandler } from "./battle-handler";
import { HumanController } from "./controllers";
import { BattleState } from "./types";
import { resetRng, setRng } from "./rng";

/**
 * Port of app/src/test/java/com/g4ng/logic/BattleLogicTest.java.
 *
 * The Java suite leaned on real randomness and still passed because every
 * assertion held across the whole variation range. These tests pin the RNG to
 * the midpoint so failures are reproducible, and the damage-range test below
 * covers the spread explicitly instead.
 */
describe("battle logic", () => {
  let p1: Player;
  let p2: Player;
  let battleHandler: BattleHandler;

  beforeEach(() => {
    setRng(() => 0.5);

    const tackle = new Move("Tackle", 20, 10, 100);
    const vineWhip = new Move("Vine Whip", 25, 5, 90);

    // P1's garden — speeds: Bulbasaur(50), Oddish(30)
    const bulbasaur = new Plant("Bulbasaur", 50, null);
    bulbasaur.addMove(tackle);
    bulbasaur.addMove(vineWhip);

    const oddish = new Plant("Oddish", 30, null);
    oddish.addMove(tackle);

    p1 = new Player("Ash", [bulbasaur, oddish]);

    // P2's garden — speeds: Caterpie(40), Weedle(20)
    const caterpie = new Plant("Caterpie", 40, null);
    caterpie.addMove(tackle);

    const weedle = new Plant("Weedle", 20, null);
    weedle.addMove(tackle);

    p2 = new Player("Gary", [caterpie, weedle]);

    p1.setCurrentPlant(p1.getGarden()[0]);
    p2.setCurrentPlant(p2.getGarden()[0]);

    battleHandler = new BattleHandler(p1, p2, new HumanController(), new HumanController());
  });

  afterEach(() => {
    resetRng();
  });

  it("runs a full turn with both players attacking", () => {
    expect(battleHandler.getState()).toBe(BattleState.P1_MOVE);

    battleHandler.applyAction(p1, p1.getCurrentPlant()!.getMoves()[0]); // Tackle
    expect(battleHandler.getState()).toBe(BattleState.P2_MOVE);

    battleHandler.applyAction(p2, p2.getCurrentPlant()!.getMoves()[0]); // Tackle

    // The turn resolves and loops back, unless someone fainted.
    expect([BattleState.P1_MOVE, BattleState.END]).toContain(battleHandler.getState());

    expect(p1.getCurrentPlant()!.getCurrentHealth()).toBeLessThan(p1.getCurrentPlant()!.getMaxHealth());
    expect(p2.getCurrentPlant()!.getCurrentHealth()).toBeLessThan(p2.getCurrentPlant()!.getMaxHealth());
  });

  it("heals for exactly 30 HP", () => {
    p1.getCurrentPlant()!.takeDamage(50);
    const healthBefore = p1.getCurrentPlant()!.getCurrentHealth();

    // The UI spends the heal charge before handing the action to the battle,
    // so the test mirrors that ordering.
    p1.useHeal();
    battleHandler.applyAction(p1, new HealAction());
    battleHandler.applyAction(p2, new Move("Wait", 0, 0, 100)); // deals no damage

    const healthAfter = p1.getCurrentPlant()!.getCurrentHealth();
    expect(healthAfter).toBeGreaterThan(healthBefore);
    // (100 * 0.2) + 10 = 30
    expect(healthAfter).toBe(healthBefore + 30);
  });

  it("ends the battle and restores both gardens", () => {
    for (const plant of p2.getGarden()) {
      plant.takeDamage(95); // down to 5 HP
    }

    battleHandler.applyAction(p1, new Move("Hyper Beam", 100, 0, 100));
    battleHandler.applyAction(p2, new Move("Tackle", 20, 10, 100));

    if (battleHandler.getState() !== BattleState.END) {
      p2.setCurrentPlant(p2.getGarden()[1]); // Gary switches to Weedle
      battleHandler.applyAction(p1, new Move("Hyper Beam", 100, 0, 100));
      battleHandler.applyAction(p2, new Move("Tackle", 20, 10, 100));
    }

    expect(battleHandler.getState()).toBe(BattleState.END);

    for (const plant of p2.getGarden()) {
      expect(plant.isDead()).toBe(false);
      expect(plant.getCurrentHealth()).toBe(plant.getMaxHealth());
    }
  });

  it("switches the active plant", () => {
    const initialPlant = p1.getCurrentPlant();
    const nextPlant = p1.getGarden()[1]; // Oddish

    battleHandler.applyAction(p1, new SwitchAction(nextPlant));
    battleHandler.applyAction(p2, new Move("Wait", 0, 0, 100));

    expect(p1.getCurrentPlant()).toBe(nextPlant);
    expect(p1.getCurrentPlant()).not.toBe(initialPlant);
  });

  it("deals no damage when a move misses", () => {
    const target = p2.getCurrentPlant()!;
    const initialHealth = target.getCurrentHealth();

    // 0 accuracy always misses: random() * 100 <= 0 is unreachable for any
    // draw above zero.
    battleHandler.applyAction(p1, new Move("Missy", 50, 0, 0));
    battleHandler.applyAction(p2, new Move("Wait", 0, 0, 100));

    expect(target.getCurrentHealth()).toBe(initialHealth);
  });
});

describe("damage calculation", () => {
  afterEach(() => {
    resetRng();
  });

  /** Drives one Tackle-vs-Tackle exchange and reports the damage dealt. */
  function damageForVariation(draw: number, attack: number, opponentDefense: number): number {
    setRng(() => draw);
    const attacker = new Plant("Attacker", 50, null);
    const defender = new Plant("Defender", 10, null);
    const performer = new Player("A", [attacker]);
    const opponent = new Player("B", [defender]);
    performer.setCurrentPlant(attacker);
    opponent.setCurrentPlant(defender);

    new Move("Hit", attack, 0, 100).execute(
      performer,
      opponent,
      new Move("Guard", 0, opponentDefense, 100),
    );
    return defender.getMaxHealth() - defender.getCurrentHealth();
  }

  it("never heals the target, however high the opposing defense", () => {
    // Regression guard for the negative-damage bug fixed in 395b6fd: a weak
    // attack into a strong defense must floor at 0, not add health.
    for (const draw of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(damageForVariation(draw, 5, 99)).toBe(0);
    }
  });

  it("keeps Tackle in a narrow band across the whole variation range", () => {
    // variation = 0.7 + draw * 0.4, so this spans [0.7, 1.1).
    for (const draw of [0, 0.25, 0.5, 0.75, 0.999]) {
      const damage = damageForVariation(draw, 20, 10);
      expect(damage).toBeGreaterThan(0);
      expect(damage).toBeLessThanOrEqual(10);
    }
  });
});
