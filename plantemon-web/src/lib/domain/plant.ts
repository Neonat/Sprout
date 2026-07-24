import type { Move } from "./move";

/** Metadata copied off the Plant.id response. Port of the fields on model/Plant.java. */
export interface PlantMetadata {
  commonNames?: string[] | null;
  description?: string | null;
  taxonomy?: string | null;
  bestLightCondition?: string | null;
  bestSoilType?: string | null;
  commonUses?: string | null;
  culturalSignificance?: string | null;
  toxicity?: string | null;
  bestWatering?: string | null;
}

/**
 * Port of model/Plant.java.
 *
 * maxHealth is fixed at 100 for every plant, as in the original.
 */
export class Plant {
  readonly id: string;
  readonly name: string;
  readonly maxHealth: number = 100;
  readonly spritePath: string | null;

  private currentHealth: number;
  private speed: number;
  private readonly moves: Move[] = [];
  private scanDateTime: Date;

  commonNames: string[] | null = null;
  description: string | null = null;
  taxonomy: string | null = null;
  bestLightCondition: string | null = null;
  bestSoilType: string | null = null;
  commonUses: string | null = null;
  culturalSignificance: string | null = null;
  toxicity: string | null = null;
  bestWatering: string | null = null;

  constructor(name: string, speed: number, spritePath: string | null, id?: string) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.currentHealth = this.maxHealth;
    this.speed = speed;
    this.spritePath = spritePath;
    this.scanDateTime = new Date();
  }

  /**
   * Deep-ish copy, matching the Java copy constructor — which deliberately
   * shares the `moves` list reference rather than cloning it.
   */
  static copyOf(other: Plant): Plant {
    const copy = new Plant(other.name, other.speed, other.spritePath, other.id);
    copy.currentHealth = other.currentHealth;
    copy.scanDateTime = new Date(other.scanDateTime.getTime());
    copy.moves.push(...other.moves);
    copy.commonNames = other.commonNames ? [...other.commonNames] : null;
    copy.description = other.description;
    copy.taxonomy = other.taxonomy;
    copy.bestLightCondition = other.bestLightCondition;
    copy.bestSoilType = other.bestSoilType;
    copy.commonUses = other.commonUses;
    copy.culturalSignificance = other.culturalSignificance;
    copy.toxicity = other.toxicity;
    copy.bestWatering = other.bestWatering;
    return copy;
  }

  getName(): string {
    return this.name;
  }

  getSpeed(): number {
    return this.speed;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getMoves(): Move[] {
    return this.moves;
  }

  addMove(move: Move): void {
    this.moves.push(move);
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getCurrentHealth(): number {
    return this.currentHealth;
  }

  /** Caps at maxHealth. Note the original applies no lower bound here. */
  setCurrentHealth(health: number): void {
    this.currentHealth = Math.min(health, this.maxHealth);
  }

  takeDamage(amount: number): void {
    this.currentHealth = Math.max(this.currentHealth - amount, 0);
  }

  isDead(): boolean {
    return this.currentHealth === 0;
  }

  getScanDateTime(): Date {
    return this.scanDateTime;
  }

  setScanDateTime(date: Date): void {
    this.scanDateTime = date;
  }

  applyMetadata(metadata: PlantMetadata): void {
    this.commonNames = metadata.commonNames ?? null;
    this.description = metadata.description ?? null;
    this.taxonomy = metadata.taxonomy ?? null;
    this.bestLightCondition = metadata.bestLightCondition ?? null;
    this.bestSoilType = metadata.bestSoilType ?? null;
    this.commonUses = metadata.commonUses ?? null;
    this.culturalSignificance = metadata.culturalSignificance ?? null;
    this.toxicity = metadata.toxicity ?? null;
    this.bestWatering = metadata.bestWatering ?? null;
  }
}
