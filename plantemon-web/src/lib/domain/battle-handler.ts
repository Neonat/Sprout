import { BattleState } from "./types";
import type { Action, BattleController } from "./types";
import type { Player } from "./player";
import { requireCurrentPlant } from "./require-plant";

/**
 * Port of logic/BattleHandler.java.
 *
 * Drives a two-player turn loop through a small state machine. advanceState()
 * is re-entrant by design: it recurses until it either lands on a state that
 * needs input (a HumanController simply returns, parking the battle) or reaches
 * END. Both players lock in an Action, then PROCESSING resolves them in speed
 * order.
 */
export class BattleHandler {
  private readonly player1: Player;
  private readonly player2: Player;
  private readonly p1Controller: BattleController;
  private readonly p2Controller: BattleController;

  private p1SelectedAction: Action | null = null;
  private p2SelectedAction: Action | null = null;
  private state: BattleState = BattleState.P1_MOVE;

  protected turnResults: string[] = [];

  constructor(
    player1: Player,
    player2: Player,
    p1Controller: BattleController,
    p2Controller: BattleController,
  ) {
    this.player1 = player1;
    this.player2 = player2;
    this.p1Controller = p1Controller;
    this.p2Controller = p2Controller;
    this.advanceState();
  }

  applyAction(player: Player, action: Action | null): void {
    if (player === this.player1) {
      this.p1SelectedAction = action;
    } else if (player === this.player2) {
      this.p2SelectedAction = action;
    }
    this.advanceState();
  }

  advanceState(): void {
    if (this.state === BattleState.END) return;

    if (this.checkWin()) {
      this.state = BattleState.END;
      this.handleEnd();
      return;
    }

    switch (this.state) {
      case BattleState.P1_MOVE:
        if (this.p1SelectedAction === null) {
          this.p1Controller.requestAction(this, this.player1);
        } else {
          this.state = BattleState.P2_MOVE;
          this.advanceState();
        }
        break;

      case BattleState.P2_MOVE:
        if (this.p2SelectedAction === null) {
          this.p2Controller.requestAction(this, this.player2);
        } else {
          this.state = BattleState.PROCESSING;
          this.advanceState();
        }
        break;

      case BattleState.PROCESSING:
        this.processTurn();
        this.resetRound();
        this.state = BattleState.P1_MOVE;
        this.advanceState();
        break;
    }
  }

  /** Log lines produced by the most recent turn, for the battle log UI. */
  getLatestTurnResults(): string[] {
    return this.turnResults;
  }

  processTurn(): void {
    this.turnResults.length = 0;
    const plant1 = requireCurrentPlant(this.player1);
    const plant2 = requireCurrentPlant(this.player2);

    // Ties go to player 1.
    if (plant1.getSpeed() >= plant2.getSpeed()) {
      this.turnResults.push(`--- ${this.player1.getUsername()}'s ${plant1.getName()} is faster! ---`);
      this.executeSequence(this.p1SelectedAction, this.p2SelectedAction, this.player1, this.player2);
    } else {
      this.turnResults.push(`--- ${this.player2.getUsername()}'s ${plant2.getName()} is faster! ---`);
      this.executeSequence(this.p2SelectedAction, this.p1SelectedAction, this.player2, this.player1);
    }
  }

  /**
   * Resolves both actions in order. Each action receives the opponent's action
   * so it can read its defense value.
   *
   * The Java version re-derived these two actions from p1SelectedAction /
   * p2SelectedAction via an identity check on the player; that always resolved
   * to firstAction and secondAction at both call sites, so they are used
   * directly here.
   */
  protected executeSequence(
    firstAction: Action | null,
    secondAction: Action | null,
    firstPlayer: Player,
    secondPlayer: Player,
  ): void {
    if (firstAction !== null && !requireCurrentPlant(firstPlayer).isDead()) {
      this.turnResults.push(firstAction.execute(firstPlayer, secondPlayer, secondAction));
    }

    if (requireCurrentPlant(secondPlayer).isDead()) {
      const fainted = requireCurrentPlant(secondPlayer);
      this.turnResults.push(`${secondPlayer.getUsername()}'s ${fainted.getName()} fainted!`);
      return;
    }

    if (secondAction !== null && !requireCurrentPlant(firstPlayer).isDead()) {
      this.turnResults.push(secondAction.execute(secondPlayer, firstPlayer, firstAction));

      if (requireCurrentPlant(firstPlayer).isDead()) {
        const fainted = requireCurrentPlant(firstPlayer);
        this.turnResults.push(`${firstPlayer.getUsername()}'s ${fainted.getName()} fainted!`);
      }
    }
  }

  checkWin(): boolean {
    return requireCurrentPlant(this.player1).isDead() || requireCurrentPlant(this.player2).isDead();
  }

  protected handleEnd(): void {
    if (requireCurrentPlant(this.player1).isDead()) {
      this.turnResults.push(`${this.player2.getUsername()} wins!`);
    } else {
      this.turnResults.push(`${this.player1.getUsername()} wins!`);
    }
    this.player1.restoreGarden();
    this.player2.restoreGarden();
  }

  resetRound(): void {
    this.p1SelectedAction = null;
    this.p2SelectedAction = null;
  }

  getState(): BattleState {
    return this.state;
  }
}
