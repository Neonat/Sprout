import type { Action } from "./types";
import type { Plant } from "./plant";
import type { Player } from "./player";

/** Port of logic/SwitchAction.java */
export class SwitchAction implements Action {
  private readonly nextPlant: Plant | null;

  constructor(nextPlant: Plant | null) {
    this.nextPlant = nextPlant;
  }

  execute(performer: Player, _opponent: Player, _opponentAction: Action | null): string {
    if (this.nextPlant !== null && !this.nextPlant.isDead()) {
      const result = `${performer.getUsername()} switched to ${this.nextPlant.getName()}!`;
      performer.setCurrentPlant(this.nextPlant);
      return result;
    }
    return `${performer.getUsername()} failed to switch!`;
  }

  getDefenseValue(): number {
    return 0;
  }
}
