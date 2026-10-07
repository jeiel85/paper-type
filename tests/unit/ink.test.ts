import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/ink-seed-v1.json';
import { layoutParagraph, splitParagraphs } from '../../src/core/rendering/glyphs';
import { fnv1a32, glyphRandoms, isCjk, mulberry32, NORMAL_INK, seedKey } from '../../src/core/rendering/inkSeed';

describe('ink seed algorithm v1 — fixtures/ink-seed-v1.json', () => {
  it.each(fixture.fnv1a32)('fnv1a32($input)', ({ input, hash }) => {
    expect(fnv1a32(input)).toBe(hash);
  });

  it.each(fixture.mulberry32)('mulberry32($seed)', ({ seed, u }) => {
    const next = mulberry32(seed);
    expect(u.map(() => next())).toEqual(u);
  });

  it.each(fixture.texts)('glyph seeds for $text', ({ inkSeed, text, glyphs }) => {
    const actual = splitParagraphs(text).flatMap((p, pi) => {
      let codePoints = 0;
      const out = [];
      for (const g of layoutParagraph(p.text, pi, inkSeed, NORMAL_INK)) {
        if (g.ink) {
          const c = g.text.codePointAt(0)!;
          out.push({ grapheme: g.text, p: pi, o: codePoints, c, key: seedKey(inkSeed, pi, codePoints, c) });
        }
        codePoints += Array.from(g.text).length;
      }
      return out;
    });
    expect(actual).toEqual(glyphs.map(({ grapheme, p, o, c, key }) => ({ grapheme, p, o, c, key })));
    for (const g of glyphs) {
      expect(fnv1a32(g.key)).toBe(g.seed);
      expect(glyphRandoms(inkSeed, g.p, g.o, g.c).map((r) => r * 2 ** 32)).toEqual(g.u);
    }
  });
});

describe('deterministic ink', () => {
  it('gives the same ink for the same text on every render', () => {
    const a = layoutParagraph('오늘의 문장입니다', 0, 'note-a', NORMAL_INK);
    const b = layoutParagraph('오늘의 문장입니다', 0, 'note-a', NORMAL_INK);
    expect(a).toEqual(b);
  });

  it('differs between notes', () => {
    const a = layoutParagraph('same text', 0, 'note-a', NORMAL_INK);
    const b = layoutParagraph('same text', 0, 'note-b', NORMAL_INK);
    expect(a.map((g) => g.ink)).not.toEqual(b.map((g) => g.ink));
  });

  it('editing one paragraph leaves the next paragraph untouched (R3)', () => {
    const before = splitParagraphs('첫 문단\n둘째 문단');
    const after = splitParagraphs('첫 문단을 고침\n둘째 문단');
    expect(layoutParagraph(after[1]!.text, 1, 's', NORMAL_INK)).toEqual(layoutParagraph(before[1]!.text, 1, 's', NORMAL_INK));
  });

  it('keeps every value inside the Normal preset range, narrower for Hangul', () => {
    const glyphs = layoutParagraph('Typewriter 타자기 한글 English 漢字 かな', 0, 'range', NORMAL_INK);
    for (const g of glyphs) {
      if (!g.ink) continue;
      const range = isCjk(g.text.codePointAt(0)!) ? NORMAL_INK.cjk : NORMAL_INK.latin;
      expect(g.ink.opacity).toBeGreaterThanOrEqual(range.opacityLow);
      expect(g.ink.opacity).toBeLessThanOrEqual(1);
      expect(Math.abs(g.ink.dx)).toBeLessThanOrEqual(range.x);
      expect(Math.abs(g.ink.dy)).toBeLessThanOrEqual(range.y);
    }
    expect(NORMAL_INK.cjk.x).toBeLessThan(NORMAL_INK.latin.x);
  });

  it('draws no ink for whitespace and keeps UTF-16 starts', () => {
    const glyphs = layoutParagraph('a 😀b', 0, 's', NORMAL_INK);
    expect(glyphs.map((g) => [g.text, g.start, g.ink === null])).toEqual([
      ['a', 0, false],
      [' ', 1, true],
      ['😀', 2, false],
      ['b', 4, false],
    ]);
  });
});
