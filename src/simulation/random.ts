// random.ts -- Simple RNG utilities
// Ported from biosim4 random.h

/**
 * Returns a random integer in the range [min, max] inclusive.
 */
export function randomUint(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Returns a random float in the range [0, 1).
 */
export function randomFloat(): number {
  return Math.random();
}
