import { memo, useMemo, type ReactNode } from 'react';
import { layoutParagraph, splitParagraphs } from '../../core/rendering/glyphs';
import { NORMAL_INK } from '../../core/rendering/inkSeed';

type Range = { start: number; end: number };

type InkLayerProps = {
  text: string;
  inkSeed: string;
  /** UTF-16 caret offset; a zero-size marker is rendered there so the carriage can measure it. */
  caret: number;
  /** Uncommitted IME composition, drawn underlined. */
  composition: Range | null;
  /** The glyph that was just struck ends at `at`; `n` changes on every strike to restart the stamp. */
  fresh: { at: number; n: number } | null;
};

/**
 * Decorative copy of the textarea text (aria-hidden). Lines must wrap exactly
 * like the transparent textarea above it — see docs/04 §11.1. Each paragraph is
 * memoised, so typing re-renders only the paragraph being edited.
 */
export const InkLayer = memo(function InkLayer({ text, inkSeed, caret, composition, fresh }: InkLayerProps) {
  const paragraphs = useMemo(() => splitParagraphs(text), [text]);
  return (
    <div className="ink" aria-hidden="true">
      {paragraphs.map((p, i) => {
        const end = p.start + p.text.length;
        const localCaret = caret >= p.start && caret <= end ? caret - p.start : -1;
        let compStart = -1;
        let compEnd = -1;
        if (composition && composition.end > p.start && composition.start <= end) {
          compStart = Math.max(0, composition.start - p.start);
          compEnd = Math.min(p.text.length, composition.end - p.start);
        }
        const inParagraph = fresh && fresh.at > p.start && fresh.at <= end;
        return (
          <Paragraph
            key={i}
            index={i}
            text={p.text}
            inkSeed={inkSeed}
            caret={localCaret}
            compStart={compStart}
            compEnd={compEnd}
            freshEnd={inParagraph ? fresh.at - p.start : -1}
            freshKey={inParagraph ? fresh.n : 0}
          />
        );
      })}
    </div>
  );
});

type ParagraphProps = {
  index: number;
  text: string;
  inkSeed: string;
  caret: number;
  compStart: number;
  compEnd: number;
  freshEnd: number;
  freshKey: number;
};

const Paragraph = memo(function Paragraph({ index, text, inkSeed, caret, compStart, compEnd, freshEnd, freshKey }: ParagraphProps) {
  const glyphs = useMemo(() => layoutParagraph(text, index, inkSeed, NORMAL_INK), [text, index, inkSeed]);

  const nodes: ReactNode[] = [];
  let caretPlaced = caret < 0;
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i]!;
    if (!caretPlaced && g.start >= caret) {
      nodes.push(<span key="caret" className="caret-mark" data-caret="" />);
      caretPlaced = true;
    }
    const inComposition = compStart >= 0 && g.start >= compStart && g.start < compEnd;
    if (!g.ink) {
      nodes.push(inComposition ? <span key={i} className="comp">{g.text}</span> : g.text);
      continue;
    }
    const isFresh = g.start + g.text.length === freshEnd;
    nodes.push(
      <span
        // A new key on every strike remounts the span so the stamp animation runs again.
        key={isFresh ? `f${freshKey}` : i}
        className={`g${inComposition ? ' comp' : ''}${isFresh ? ' fresh' : ''}`}
        style={{ left: `${g.ink.dx.toFixed(4)}em`, top: `${g.ink.dy.toFixed(4)}em`, opacity: g.ink.opacity.toFixed(3) }}
      >
        {g.text}
      </span>,
    );
  }
  if (!caretPlaced) nodes.push(<span key="caret" className="caret-mark" data-caret="" />);

  // An empty paragraph still needs one line of height, like an empty line in the textarea.
  return <div className="para">{text === '' ? '​' : null}{nodes}</div>;
});
