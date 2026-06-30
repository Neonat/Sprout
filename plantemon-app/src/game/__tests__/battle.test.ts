/**
 * TS port of BattleLogicTest.java. Same scenarios, same assertions.
 * SwitchAction is omitted — the Java version was a placeholder.
 */
import { Battle, botPickAction } from "../battle";
import { healAction, moveAction, type Action } from "../actions";
import type { Player, Plant } from "../types";

// Build a synthetic move at runtime without polluting the real MoveBase
function manualMove(name: string, attack: number, defense: number, accuracy: number): Action {
  return {
    label: name,
    defenseValue: defense,
    execute(performer, opponent, opponentAction) {
      const attackerPlant = active(performer);
      const target = active(opponent);
      if (Math.random() * 100 <= accuracy) {
        const oppDef = opponentAction?.defenseValue ?? 0;
        const variation = 0.7 + Math.random() * 0.4;
        const damage = Math.max(0, Math.floor((attack - oppDef * variation) * variation));
        target.hp = Math.max(0, target.hp - damage);
        return `${performer.username}'s ${attackerPlant.name} used ${name} and dealt ${damage} damage!`;
      }
      return `${performer.username}'s ${attackerPlant.name} missed ${name}!`;
    },
  };
}

function plant(name: string, speed: number): Plant {
  return {
    id: name.toLowerCase(),
    name,
    maxHp: 100,
    hp: 100,
    attack: 20,
    speed,
    spriteUrl: "",
    moves: [],
  };
}
function active(p: Player): Plant {
  return p.garden.find((x) => x.id === p.activePlantId)!;
}

function makePlayers() {
  const bulbasaur = plant("Bulbasaur", 50);
  const oddish = plant("Oddish", 30);
  const caterpie = plant("Caterpie", 40);
  const weedle = plant("Weedle", 20);

  const p1: Player = {
    username: "Ash",
    garden: [bulbasaur, oddish],
    activePlantId: bulbasaur.id,
    healCharges: 3,
  };
  const p2: Player = {
    username: "Gary",
    garden: [caterpie, weedle],
    activePlantId: caterpie.id,
    healCharges: 3,
  };
  return { p1, p2 };
}

describe("Battle", () => {
  test("both players tackling reduces HP on both sides", () => {
    const { p1, p2 } = makePlayers();
    // Bot always returns Tackle; both hit at 100% accuracy
    const bot = () => manualMove("Tackle", 20, 10, 100);
    const battle = new Battle(p1, p2, bot);

    battle.submitPlayerAction(manualMove("Tackle", 20, 10, 100));

    expect(active(p1).hp).toBeLessThan(active(p1).maxHp);
    expect(active(p2).hp).toBeLessThan(active(p2).maxHp);
  });

  test("HealAction restores exactly floor(maxHp*0.2)+10 = 30 HP", () => {
    const { p1, p2 } = makePlayers();
    active(p1).hp -= 50;
    const before = active(p1).hp;

    const bot = () => manualMove("Wait", 0, 0, 100);
    const battle = new Battle(p1, p2, bot);
    battle.submitPlayerAction(healAction());

    expect(active(p1).hp).toBe(before + 30);
    expect(p1.healCharges).toBe(2);
  });

  test("a 0% accuracy move never connects", () => {
    const { p1, p2 } = makePlayers();
    const before = active(p2).hp;
    const bot = () => manualMove("Wait", 0, 0, 100);
    const battle = new Battle(p1, p2, bot);
    battle.submitPlayerAction(manualMove("Missy", 50, 0, 0));
    expect(active(p2).hp).toBe(before);
  });

  test("Hyper Beam ends the battle and restoreAfterBattle resets HP", () => {
    const { p1, p2 } = makePlayers();
    active(p2).hp = 5;
    const bot = () => manualMove("Tackle", 20, 10, 100);
    const battle = new Battle(p1, p2, bot);

    battle.submitPlayerAction(manualMove("Hyper Beam", 100, 0, 100));

    expect(battle.phase).toBe("END");
    expect(battle.winner()).toBe(p1);

    battle.restoreAfterBattle();
    for (const pl of p2.garden) expect(pl.hp).toBe(pl.maxHp);
  });

  test("botPickAction heals when below 40% HP and has charges", () => {
    const { p1 } = makePlayers();
    active(p1).hp = 30; // below 40 of 100
    const action = botPickAction(p1);
    expect(action.label).toBe("Heal");
  });
});
