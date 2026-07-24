import { HealAction } from "./heal-action";
import { randomInt } from "./rng";
import type { Action, BattleController, BattleHandlerLike } from "./types";
import type { Player } from "./player";

/**
 * Port of logic/HumanController.java.
 *
 * Deliberately does nothing: the battle stalls in P1_MOVE until the UI calls
 * applyAction with the player's choice.
 */
export class HumanController implements BattleController {
  requestAction(_handler: BattleHandlerLike, _player: Player): void {
    // Waiting for human input.
  }
}

/** Port of logic/BotController.java */
export class BotController implements BattleController {
  requestAction(handler: BattleHandlerLike, player: Player): void {
    handler.applyAction(player, this.calculateBestMove(player));
  }

  private calculateBestMove(player: Player): Action | null {
    const plant = player.getCurrentPlant();
    if (plant === null) return null;

    // Heal below 40% HP, while heals remain.
    if (plant.getCurrentHealth() < plant.getMaxHealth() * 0.4 && player.getRemainingHeals() > 0) {
      return new HealAction();
    }

    const moves = plant.getMoves();
    return moves[randomInt(moves.length)];
  }
}
