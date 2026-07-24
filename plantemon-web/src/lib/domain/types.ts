import type { Player } from "./player";

/** Port of model/BattleState.java */
export enum BattleState {
  P1_MOVE = "P1_MOVE",
  P2_MOVE = "P2_MOVE",
  PROCESSING = "PROCESSING",
  END = "END",
}

/** Port of logic/Action.java */
export interface Action {
  /** Executes the action and returns a string describing what happened. */
  execute(performer: Player, opponent: Player, opponentAction: Action | null): string;

  /** Returns the defense value provided by this action. */
  getDefenseValue(): number;
}

/** Port of logic/BattleController.java */
export interface BattleController {
  requestAction(handler: BattleHandlerLike, player: Player): void;
}

/**
 * Narrow view of BattleHandler that controllers depend on, declared here to
 * break the Java circular import between BattleHandler and its controllers.
 */
export interface BattleHandlerLike {
  applyAction(player: Player, action: Action | null): void;
}
