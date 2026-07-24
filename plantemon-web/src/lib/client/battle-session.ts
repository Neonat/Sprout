"use client";

import { BattleHandler } from "@/lib/domain/battle-handler";
import { BotController, HumanController } from "@/lib/domain/controllers";
import { Plant } from "@/lib/domain/plant";
import { Player } from "@/lib/domain/player";
import { randomInt } from "@/lib/domain/rng";
import { BattleState } from "@/lib/domain/types";

export interface Battle {
  player: Player;
  opponent: Player;
  handler: BattleHandler;
}

/** A clone reset to full health — battles never touch the garden's real plants. */
function freshClone(plant: Plant): Plant {
  const clone = Plant.copyOf(plant);
  clone.setCurrentHealth(clone.getMaxHealth());
  return clone;
}

/**
 * Picks the opponent's plant: a random one from the garden that isn't the plant
 * the player chose, so the bot never mirrors the player's pick. Falls back to
 * the chosen plant only when it's the single plant in the garden.
 */
export function pickOpponentPlant(garden: Plant[], chosen: Plant): Plant {
  const others = garden.filter((plant) => plant.id !== chosen.id);
  const pool = others.length > 0 ? others : garden;
  return pool[randomInt(pool.length)];
}

/**
 * Builds a fresh 1-v-1 battle. Both plants are cloned at full health, so every
 * new battle is a clean session and the garden is left untouched.
 */
export function createBattle(chosen: Plant, opponentPlant: Plant): Battle {
  const playerPlant = freshClone(chosen);
  const wildPlant = freshClone(opponentPlant);

  const player = new Player("You", [playerPlant]);
  const opponent = new Player("Gary (BOT)", [wildPlant]);
  player.setCurrentPlant(playerPlant);
  opponent.setCurrentPlant(wildPlant);

  return {
    player,
    opponent,
    handler: new BattleHandler(player, opponent, new HumanController(), new BotController()),
  };
}

/**
 * In-memory hold for the current battle, so leaving and returning to Adventure
 * can resume it. Survives client navigation; a full page reload starts fresh,
 * which is acceptable.
 */
let current: Battle | null = null;

export function getBattleSession(): Battle | null {
  return current;
}

export function setBattleSession(battle: Battle | null): void {
  current = battle;
}

/** True only while a held battle is still in progress. */
export function hasResumableBattle(): boolean {
  return current !== null && current.handler.getState() !== BattleState.END;
}
