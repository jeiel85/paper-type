/**
 * Ink seed algorithm v1 (docs/05 §2.1, ADR-005). Must match
 * fixtures/ink-seed-v1.json bit for bit; Android implements the same contract.
 */
export const SEED_ALGORITHM_VERSION = 1;

const utf8 = new TextEncoder();

export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (const byte of utf8.encode(input)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Returns a generator of unsigned 32-bit outputs (divide by 2^32 for [0, 1)). */
export function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

export const seedKey = (inkSeed: string, paragraph: number, codePointOffset: number, codePoint: number) =>
  `v1:${inkSeed}:${paragraph}:${codePointOffset}:${codePoint}`;

/** Three draws in [0, 1), in the contract order: opacity, x, y. */
export function glyphRandoms(inkSeed: string, paragraph: number, codePointOffset: number, codePoint: number) {
  const next = mulberry32(fnv1a32(seedKey(inkSeed, paragraph, codePointOffset, codePoint)));
  const scale = 2 ** 32;
  return [next() / scale, next() / scale, next() / scale] as const;
}

export function isCjk(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x11ff) ||
    (codePoint >= 0x3130 && codePoint <= 0x318f) ||
    (codePoint >= 0xa960 && codePoint <= 0xa97f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
    (codePoint >= 0xd7b0 && codePoint <= 0xd7ff) ||
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0x3040 && codePoint <= 0x30ff)
  );
}

export type InkPreset = {
  latin: { opacityLow: number; x: number; y: number };
  cjk: { opacityLow: number; x: number; y: number };
};

/** Normal ink (docs/05 §2.2). x/y are in em. */
export const NORMAL_INK: InkPreset = {
  latin: { opacityLow: 0.8, x: 0.025, y: 0.02 },
  cjk: { opacityLow: 0.86, x: 0.015, y: 0.012 },
};

export type GlyphInk = { opacity: number; dx: number; dy: number };

export function glyphInk(
  preset: InkPreset,
  inkSeed: string,
  paragraph: number,
  codePointOffset: number,
  codePoint: number,
): GlyphInk {
  const [r1, r2, r3] = glyphRandoms(inkSeed, paragraph, codePointOffset, codePoint);
  const range = isCjk(codePoint) ? preset.cjk : preset.latin;
  return {
    opacity: range.opacityLow + r1 * (1 - range.opacityLow),
    dx: (r2 * 2 - 1) * range.x,
    dy: (r3 * 2 - 1) * range.y,
  };
}
