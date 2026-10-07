import { glyphInk, type GlyphInk, type InkPreset } from './inkSeed';

export type Glyph = {
  text: string;
  /** UTF-16 offset of the grapheme inside its paragraph. */
  start: number;
  /** null for whitespace, which is drawn without ink. */
  ink: GlyphInk | null;
};

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

const WHITESPACE = /^\s+$/;

function* graphemes(paragraph: string): Generator<{ segment: string; index: number }> {
  if (segmenter) {
    for (const { segment, index } of segmenter.segment(paragraph)) yield { segment, index };
    return;
  }
  // Fallback: code points (older engines without Intl.Segmenter).
  let index = 0;
  for (const segment of paragraph) {
    yield { segment, index };
    index += segment.length;
  }
}

/** Splits one paragraph (no '\n') into graphemes with deterministic ink (docs/05 §2). */
export function layoutParagraph(paragraph: string, paragraphIndex: number, inkSeed: string, preset: InkPreset): Glyph[] {
  const glyphs: Glyph[] = [];
  let codePointOffset = 0;
  for (const { segment, index } of graphemes(paragraph)) {
    const ink = WHITESPACE.test(segment)
      ? null
      : glyphInk(preset, inkSeed, paragraphIndex, codePointOffset, segment.codePointAt(0)!);
    glyphs.push({ text: segment, start: index, ink });
    codePointOffset += countCodePoints(segment);
  }
  return glyphs;
}

function countCodePoints(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0xdc00 || code > 0xdfff) n++; // low surrogates belong to the previous code point
  }
  return n;
}

/** Paragraphs with their UTF-16 start offset in the whole text. */
export function splitParagraphs(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  let start = 0;
  for (const part of text.split('\n')) {
    out.push({ text: part, start });
    start += part.length + 1;
  }
  return out;
}
