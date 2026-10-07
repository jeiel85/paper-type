import { describe, expect, it } from 'vitest';
import { pickVariant, synthesize, type SoundEvent } from '../../src/core/audio/synth';
import { editKindFor, soundFor } from '../../src/features/writer/inputKinds';

describe('synthesized sounds (ADR-006)', () => {
  const events: SoundEvent[] = ['key', 'space', 'backspace', 'enter', 'bell'];

  it.each(events)('%s is short, finite, within [-1, 1] and deterministic', (event) => {
    const a = synthesize(event, 0, 48000);
    const b = synthesize(event, 0, 48000);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length / 48000).toBeLessThan(1.5);
    let peak = 0;
    for (const v of a) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeGreaterThan(0.1);
    expect(peak).toBeLessThanOrEqual(1);
  });

  it('variants sound different', () => {
    expect(synthesize('key', 0, 48000)).not.toEqual(synthesize('key', 1, 48000));
  });

  it('never picks the same variant three times in a row', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const picks: number[] = [];
    for (let i = 0; i < 2000; i++) picks.push(pickVariant(picks.slice(-2), 3, rand));
    for (let i = 2; i < picks.length; i++) {
      expect(picks[i] === picks[i - 1] && picks[i] === picks[i - 2]).toBe(false);
    }
  });
});

describe('input event mapping', () => {
  it.each([
    ['insertText', 'a', 'key'],
    ['insertText', ' ', 'space'],
    ['insertCompositionText', 'ㅎ', 'key'],
    ['insertLineBreak', null, 'enter'],
    ['deleteContentBackward', null, 'backspace'],
    ['insertFromPaste', null, null],
  ])('%s %j → %s sound', (inputType, data, expected) => {
    expect(soundFor(inputType, data)).toBe(expected);
  });

  it.each([
    ['insertText', 'insert'],
    ['insertCompositionText', 'insert'],
    ['deleteContentBackward', 'delete'],
    ['deleteWordBackward', 'delete'],
    ['insertFromPaste', 'paste'],
    ['formatBold', 'other'],
  ])('%s → %s group', (inputType, expected) => {
    expect(editKindFor(inputType)).toBe(expected);
  });
});
