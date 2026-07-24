import type { Action } from "./types";
import type { Plant } from "./plant";
import type { Player } from "./player";
import { requireCurrentPlant } from "./require-plant";

/** Port of logic/HealAction.java */
export class HealAction implements Action {
  static calculateHealAmount(plant: Plant | null): number {
    if (plant === null) return 0;
    return Math.trunc(plant.getMaxHealth() * 0.2) + 10;
  }

  execute(performer: Player, _opponent: Player, _opponentAction: Action | null): string {
    if (performer.getRemainingHeals() <= 0) {
      return `${performer.getUsername()} has no more heals left!`;
    }

    const targetPlant = requireCurrentPlant(performer);
    const oldHealth = targetPlant.getCurrentHealth();
    const healAmount = HealAction.calculateHealAmount(targetPlant);

    // The 100 ceiling is hardcoded in the original; setCurrentHealth also caps
    // at maxHealth, so the two agree while maxHealth stays 100.
    targetPlant.setCurrentHealth(Math.min(targetPlant.getCurrentHealth() + healAmount, 100));
    performer.useHeal();

    const actualHeal = targetPlant.getCurrentHealth() - oldHealth;
    return `${performer.getUsername()}'s ${targetPlant.getName()} healed ${actualHeal} HP! (${performer.getRemainingHeals()} left)`;
  }

  getDefenseValue(): number {
    // While healing, the plant prepares a defense.
    return 15;
  }
}
