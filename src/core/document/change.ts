/**
 * Every edit is normalised to one replace operation computed from the text
 * before and after (docs/04 §7.1). Offsets are UTF-16 code units.
 */
export type Change = {
  from: number;
  /** Text that was removed: before.slice(from, from + removed.length). */
  removed: string;
  /** Text that was inserted at `from`. */
  inserted: string;
};

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/** Returns null when the two strings are equal. */
export function diffText(before: string, after: string): Change | null {
  if (before === after) return null;
  const max = Math.min(before.length, after.length);

  let start = 0;
  while (start < max && before.charCodeAt(start) === after.charCodeAt(start)) start++;
  // Never split a surrogate pair: back off to the pair's start.
  if (start > 0 && isHighSurrogate(before.charCodeAt(start - 1))) start--;

  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > start &&
    endAfter > start &&
    before.charCodeAt(endBefore - 1) === after.charCodeAt(endAfter - 1)
  ) {
    endBefore--;
    endAfter--;
  }
  if (endBefore < before.length && isLowSurrogate(before.charCodeAt(endBefore))) {
    endBefore++;
    endAfter++;
  }

  return {
    from: start,
    removed: before.slice(start, endBefore),
    inserted: after.slice(start, endAfter),
  };
}

export function applyChange(text: string, change: Change): string {
  return text.slice(0, change.from) + change.inserted + text.slice(change.from + change.removed.length);
}

export function invertChange(change: Change): Change {
  return { from: change.from, removed: change.inserted, inserted: change.removed };
}
