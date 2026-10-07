import { mulberry32 } from '../rendering/inkSeed';

/**
 * Typewriter sounds synthesised from code (ADR-006): noise bursts, filters and
 * decaying sines. No recorded samples, so there is nothing to license or download.
 * Pure functions over Float32Array so they can be tested without Web Audio.
 */
export type SoundEvent = 'key' | 'space' | 'backspace' | 'enter' | 'bell';

type Rand = () => number;

const makeRand = (seed: number): Rand => {
  const next = mulberry32(seed);
  return () => next() / 2 ** 32;
};

/** RBJ biquad band-pass (constant 0 dB peak gain). */
function bandpass(input: Float32Array, sampleRate: number, freq: number, q: number): Float32Array {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const b2 = -alpha / a0;
  const a1 = (-2 * Math.cos(w0)) / a0;
  const a2 = (1 - alpha) / a0;
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i]!;
    const y0 = b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return out;
}

function lowpass(input: Float32Array, sampleRate: number, freq: number): Float32Array {
  const k = 1 - Math.exp((-2 * Math.PI * freq) / sampleRate);
  const out = new Float32Array(input.length);
  let y = 0;
  for (let i = 0; i < input.length; i++) {
    y += k * (input[i]! - y);
    out[i] = y;
  }
  return out;
}

/** Adds a band-passed noise click with exponential decay starting at `at` seconds. */
function addClick(out: Float32Array, sr: number, rand: Rand, at: number, freq: number, q: number, decay: number, gain: number) {
  const start = Math.floor(at * sr);
  const len = Math.min(out.length - start, Math.floor(decay * 8 * sr));
  if (len <= 0) return;
  const noise = new Float32Array(len);
  for (let i = 0; i < len; i++) noise[i] = (rand() * 2 - 1) * Math.exp(-i / (decay * sr));
  const filtered = bandpass(noise, sr, freq, q);
  for (let i = 0; i < len; i++) out[start + i]! += filtered[i]! * gain * 3;
}

/** Adds a decaying sine (the "body" of a strike, or a bell partial). */
function addTone(out: Float32Array, sr: number, at: number, freq: number, decay: number, gain: number, attack = 0.001) {
  const start = Math.floor(at * sr);
  const attackLen = Math.max(1, Math.floor(attack * sr));
  for (let i = 0; start + i < out.length; i++) {
    const env = Math.min(1, i / attackLen) * Math.exp(-i / (decay * sr));
    if (env < 1e-4 && i > attackLen) break;
    out[start + i]! += Math.sin((2 * Math.PI * freq * i) / sr) * env * gain;
  }
}

function normalize(out: Float32Array, peak: number): Float32Array {
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] = (out[i]! / max) * peak;
  return out;
}

function fadeTail(out: Float32Array, sr: number, seconds = 0.004) {
  const len = Math.min(out.length, Math.floor(seconds * sr));
  for (let i = 0; i < len; i++) out[out.length - 1 - i]! *= i / len;
}

const EVENT_SALT: Record<SoundEvent, number> = { key: 1, space: 2, backspace: 3, enter: 4, bell: 5 };

export function synthesize(event: SoundEvent, variant: number, sampleRate: number): Float32Array {
  const rand = makeRand(0x5eed + variant * 7919 + EVENT_SALT[event] * 104729);
  const jitter = (spread: number) => 1 + (rand() * 2 - 1) * spread;
  const sr = sampleRate;
  let out: Float32Array;

  switch (event) {
    case 'key': {
      out = new Float32Array(Math.floor(0.09 * sr));
      addClick(out, sr, rand, 0, 2600 * jitter(0.18), 1.1, 0.0022, 1);
      addClick(out, sr, rand, 0.0015, 5200 * jitter(0.1), 2, 0.0009, 0.5);
      addTone(out, sr, 0, 190 * jitter(0.12), 0.011, 0.55);
      // Type bar falling back to the basket.
      addClick(out, sr, rand, 0.024 * jitter(0.15), 3400 * jitter(0.15), 1.5, 0.0016, 0.22);
      normalize(out, 0.9);
      break;
    }
    case 'space': {
      out = new Float32Array(Math.floor(0.12 * sr));
      addClick(out, sr, rand, 0, 1100 * jitter(0.12), 0.9, 0.004, 1);
      addTone(out, sr, 0, 118 * jitter(0.1), 0.022, 0.8);
      addClick(out, sr, rand, 0.03 * jitter(0.1), 2400 * jitter(0.1), 1.6, 0.0015, 0.25);
      normalize(out, 0.8);
      break;
    }
    case 'backspace': {
      out = new Float32Array(Math.floor(0.11 * sr));
      addClick(out, sr, rand, 0, 1700 * jitter(0.1), 1.2, 0.002, 0.9);
      addClick(out, sr, rand, 0.032 * jitter(0.12), 2500 * jitter(0.1), 1.4, 0.0018, 0.7);
      addTone(out, sr, 0, 150 * jitter(0.1), 0.012, 0.4);
      normalize(out, 0.75);
      break;
    }
    case 'enter': {
      // Carriage return: a ratchet of accelerating clicks over a low whoosh, ending in a thunk.
      const duration = 0.46;
      out = new Float32Array(Math.floor(duration * sr));
      const whoosh = new Float32Array(out.length);
      for (let i = 0; i < whoosh.length; i++) {
        const t = i / sr;
        const env = Math.sin(Math.PI * Math.min(1, t / 0.36)) ** 2;
        whoosh[i] = (rand() * 2 - 1) * env;
      }
      const low = lowpass(lowpass(whoosh, sr, 520), sr, 520);
      for (let i = 0; i < out.length; i++) out[i] = low[i]! * 0.5;
      let t = 0.005;
      let gap = 0.026;
      while (t < 0.34) {
        addClick(out, sr, rand, t, 2900 * jitter(0.12), 1.8, 0.0012, 0.35);
        t += gap * jitter(0.08);
        gap = Math.max(0.011, gap * 0.9);
      }
      addTone(out, sr, 0.355, 135 * jitter(0.08), 0.03, 0.9);
      addClick(out, sr, rand, 0.355, 900, 0.8, 0.004, 0.8);
      normalize(out, 0.75);
      break;
    }
    case 'bell': {
      out = new Float32Array(Math.floor(1.3 * sr));
      const base = 2093 * jitter(0.01);
      addTone(out, sr, 0, base, 0.55, 1, 0.002);
      addTone(out, sr, 0, base * 2.76, 0.22, 0.4, 0.002);
      addTone(out, sr, 0, base * 5.4, 0.09, 0.18, 0.002);
      addClick(out, sr, rand, 0, 6000, 2, 0.0008, 0.15);
      normalize(out, 0.45);
      break;
    }
  }
  fadeTail(out, sr);
  return out;
}

/**
 * Picks a variant index, never the same one three times in a row (docs/05 §6).
 */
export function pickVariant(recent: readonly number[], count: number, rand: () => number): number {
  let pick = Math.floor(rand() * count);
  const [a, b] = recent.slice(-2);
  if (count > 1 && a !== undefined && a === b && pick === a) pick = (pick + 1 + Math.floor(rand() * (count - 1))) % count;
  return pick;
}
