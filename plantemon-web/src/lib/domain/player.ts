import type { Plant } from "./plant";

const MAX_HEALS = 3;

/** Port of model/Player.java */
export class Player {
  readonly username: string;
  readonly garden: Plant[];

  private currentPlant: Plant | null = null;
  private remainingHeals = MAX_HEALS;

  constructor(username: string, garden: Plant[]) {
    this.username = username;
    this.garden = garden;
  }

  getUsername(): string {
    return this.username;
  }

  getGarden(): Plant[] {
    return this.garden;
  }

  getCurrentPlant(): Plant | null {
    return this.currentPlant;
  }

  setCurrentPlant(plant: Plant | null): void {
    this.currentPlant = plant;
  }

  getRemainingHeals(): number {
    return this.remainingHeals;
  }

  useHeal(): void {
    if (this.remainingHeals > 0) {
      this.remainingHeals--;
    }
  }

  resetHeals(): void {
    this.remainingHeals = MAX_HEALS;
  }

  restoreGarden(): void {
    this.resetHeals();
    for (const plant of this.garden) {
      plant.setCurrentHealth(plant.getMaxHealth());
    }
  }
}
