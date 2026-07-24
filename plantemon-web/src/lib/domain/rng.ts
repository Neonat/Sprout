/**
 * Injectable randomness source.
 *
 * The Java original called `Math.random()` and `new Random()` directly inside
 * Move.execute, BotController and PlantFactory, which made those paths
 * untestable. Routing every draw through here keeps the public constructors
 * unchanged while letting tests pin outcomes.
 */
export type Rng = () => number;

let current: Rng = Math.random;

/** Returns a float in [0, 1) — the direct equivalent of Java's Math.random(). */
export function random(): number {
  return current();
}

/** Returns an int in [0, bound) — the equivalent of Java's Random.nextInt(bound). */
export function randomInt(bound: number): number {
  return Math.floor(current() * bound);
}

export function setRng(rng: Rng): void {
  current = rng;
}

export function resetRng(): void {
  current = Math.random;
}

/**
 * Fisher-Yates using the injected source, standing in for Collections.shuffle.
 * Returns a new array; does not mutate the input.
 */
export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
