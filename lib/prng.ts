/** Deterministic PRNG from a 32-bit seed (mulberry32). */
export function mulberry32(seed: number): () => number {
  return () => {
    let mixed = (seed += 0x6d2b79f5);
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string to a 32-bit unsigned seed for the PRNG. */
export function seedStringToUint32(seed: string): number {
  let hash = 5381;
  for (let charIndex = 0; charIndex < seed.length; charIndex++) {
    hash = ((hash << 5) + hash) ^ (seed.codePointAt(charIndex) ?? 0);
  }
  return hash >>> 0;
}
