import type { Action } from "./actions";
import { healAction, moveAction } from "./actions";
import type { BattlePhase, Player } from "./types";

/**
 * Port of BattleHandler.java + BotController.java.
 *
 * Stateful object — one instance per battle. UI reads `phase`, `log`,
 * and the live player objects each render. Differences from Java:
 *   - The controllers are functions taking a snapshot instead of an
 *     interface — easier to drive from a React component than from a
 *     stateful BattleController instance.
 *   - End-of-battle does NOT auto-restore the gardens (the Java code
 *     does this in handleEnd) because the UI wants to display the
 *     final HP. Caller invokes `restoreAfterBattle()` when dismissing.
 */
export class Battle {
  phase: BattlePhase = "P1_MOVE";
  log: string[] = [];
  private p1Action: Action | null = null;
  private p2Action: Action | null = null;

  constructor(
    public p1: Player,
    public p2: Player,
    private p2Bot: (snapshot: Player) => Action = botPickAction,
  ) {}

  /** Called by UI when human picks a move; bot's move resolves automatically. */
  submitPlayerAction(action: Action): void {
    if (this.phase !== "P1_MOVE") return;
    this.p1Action = action;
    this.phase = "P2_MOVE";
    this.p2Action = this.p2Bot(this.p2);
    this.phase = "PROCESSING";
    this.processTurn();
    if (!this.isOver()) {
      this.p1Action = null;
      this.p2Action = null;
      this.phase = "P1_MOVE";
    } else {
      this.phase = "END";
      this.log.push(this.winner() === this.p1 ? `${this.p1.username} wins!` : `${this.p2.username} wins!`);
    }
  }

  private processTurn(): void {
    const a1 = this.p1Action!;
    const a2 = this.p2Action!;
    const p1Plant = activePlant(this.p1);
    const p2Plant = activePlant(this.p2);

    // Faster plant goes first; ties go to p1 (matches Java >=)
    const p1First = p1Plant.speed >= p2Plant.speed;

    if (p1First) {
      this.log.push(`--- ${this.p1.username}'s ${p1Plant.name} is faster! ---`);
      this.executeSequence(a1, a2, this.p1, this.p2);
    } else {
      this.log.push(`--- ${this.p2.username}'s ${p2Plant.name} is faster! ---`);
      this.executeSequence(a2, a1, this.p2, this.p1);
    }
  }

  private executeSequence(first: Action, second: Action, fp: Player, sp: Player): void {
    if (!isDead(fp)) this.log.push(first.execute(fp, sp, second));

    if (isDead(sp)) {
      this.log.push(`${sp.username}'s ${activePlant(sp).name} fainted!`);
      return;
    }
    if (!isDead(fp)) {
      this.log.push(second.execute(sp, fp, first));
      if (isDead(fp)) this.log.push(`${fp.username}'s ${activePlant(fp).name} fainted!`);
    }
  }

  isOver(): boolean {
    return isDead(this.p1) || isDead(this.p2);
  }

  winner(): Player | null {
    if (!this.isOver()) return null;
    return isDead(this.p1) ? this.p2 : this.p1;
  }

  /** Heal everyone back to full and reset heals — call when leaving the battle screen. */
  restoreAfterBattle(): void {
    for (const p of [this.p1, this.p2]) {
      p.healCharges = 3;
      for (const plant of p.garden) plant.hp = plant.maxHp;
    }
  }
}

function activePlant(p: Player) {
  const plant = p.garden.find((x) => x.id === p.activePlantId);
  if (!plant) throw new Error(`${p.username} has no active plant`);
  return plant;
}
function isDead(p: Player): boolean {
  return activePlant(p).hp <= 0;
}

/** Mirrors BotController.calculateBestMove. */
export function botPickAction(player: Player): Action {
  const plant = activePlant(player);
  if (plant.hp < plant.maxHp * 0.4 && player.healCharges > 0) {
    return healAction();
  }
  const moveId = plant.moves[Math.floor(Math.random() * plant.moves.length)];
  return moveAction(moveId);
}
