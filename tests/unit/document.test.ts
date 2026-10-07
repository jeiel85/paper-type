import { describe, expect, it } from 'vitest';
import { applyChange, diffText, invertChange } from '../../src/core/document/change';
import { EditHistory } from '../../src/core/document/history';

describe('diffText', () => {
  it('returns null for equal strings', () => {
    expect(diffText('같다', '같다')).toBeNull();
  });

  it.each([
    ['', 'a'],
    ['abc', 'abXc'],
    ['abc', 'ac'],
    ['안녕', '안녕하세요'],
    ['단어 일부 선택', '단어 한글 선택'],
    ['aaa', 'aa'],
    ['😀😁', '😀😂'],
    ['x😀', 'x'],
    ['line\nnext', 'line\n\nnext'],
  ])('round-trips %j -> %j', (before, after) => {
    const change = diffText(before, after)!;
    expect(applyChange(before, change)).toBe(after);
    expect(applyChange(after, invertChange(change))).toBe(before);
  });

  it('never splits a surrogate pair', () => {
    // 😀 = D83D DE00, 😂 = D83D DE02: they share the high surrogate.
    const change = diffText('😀', '😂')!;
    expect(change).toEqual({ from: 0, removed: '😀', inserted: '😂' });
  });
});

const sel = (n: number) => ({ start: n, end: n });

/** Simulates the writer: apply text edits through the history like Writer.tsx does. */
function typing() {
  const history = new EditHistory();
  let text = '';
  let t = 0;
  const edit = (next: string, kind: Parameters<EditHistory['record']>[1], gapMs = 100) => {
    t += gapMs;
    const change = diffText(text, next);
    if (!change) return;
    history.record(change, kind, sel(text.length), sel(next.length), t);
    text = next;
  };
  return {
    history,
    edit,
    get text() {
      return text;
    },
    set text(v: string) {
      text = v;
    },
  };
}

describe('EditHistory', () => {
  it('undoes one committed IME composition in one step (docs/04 §7)', () => {
    const w = typing();
    // The writer records nothing during compositionupdate (ㅎ → 하 → 한); only the commit.
    w.edit('한', 'insert');
    const r = w.history.undo(w.text)!;
    expect(r.text).toBe('');
    expect(w.history.canUndo).toBe(false);
  });

  it('groups continuous typing within 500ms and splits after a pause', () => {
    const w = typing();
    w.edit('안', 'insert');
    w.edit('안녕', 'insert', 200);
    w.edit('안녕 ', 'insert', 200);
    w.edit('안녕 하', 'insert', 900); // pause → new group
    w.text = w.history.undo(w.text)!.text;
    expect(w.text).toBe('안녕 ');
    w.text = w.history.undo(w.text)!.text;
    expect(w.text).toBe('');
  });

  it('keeps a line break, a paste and a direction change in their own groups', () => {
    const w = typing();
    w.edit('abc', 'insert');
    w.edit('abc\n', 'insert');
    w.edit('abc\nPASTE', 'paste');
    w.edit('abc\nPAST', 'delete');
    const steps: string[] = [];
    let r;
    while ((r = w.history.undo(w.text))) {
      w.text = r.text;
      steps.push(w.text);
    }
    expect(steps).toEqual(['abc\nPASTE', 'abc\n', 'abc', '']);
  });

  it('merges repeated Backspace into one step', () => {
    const w = typing();
    w.edit('hello', 'insert');
    w.history.seal();
    w.edit('hell', 'delete');
    w.edit('hel', 'delete');
    w.edit('he', 'delete');
    w.text = w.history.undo(w.text)!.text;
    expect(w.text).toBe('hello');
  });

  it('merges a mobile IME re-composition of the previous syllable (안 + ㅏ → 아나)', () => {
    const w = typing();
    w.edit('안', 'insert');
    w.edit('아나', 'insert');
    w.text = w.history.undo(w.text)!.text;
    expect(w.text).toBe('');
  });

  it('starts a new group after the caret was moved (seal)', () => {
    const w = typing();
    w.edit('ab', 'insert');
    w.history.seal();
    w.edit('abc', 'insert');
    w.text = w.history.undo(w.text)!.text;
    expect(w.text).toBe('ab');
  });

  it('redoes what was undone and clears redo on a new edit', () => {
    const w = typing();
    w.edit('one', 'insert');
    w.text = w.history.undo(w.text)!.text;
    const redone = w.history.redo(w.text)!;
    expect(redone.text).toBe('one');
    w.text = redone.text;
    w.text = w.history.undo(w.text)!.text;
    w.edit('two', 'insert');
    expect(w.history.canRedo).toBe(false);
  });

  it('restores the selection that existed before the edit', () => {
    const history = new EditHistory();
    // Replace the selected word "일부" (offsets 3..5) with "한글".
    const before = '단어 일부 선택';
    const after = '단어 한글 선택';
    history.record(diffText(before, after)!, 'insert', { start: 3, end: 5 }, sel(5), 0);
    expect(history.undo(after)).toEqual({ text: before, selection: { start: 3, end: 5 } });
  });

  it('drops the oldest groups beyond the limit', () => {
    const history = new EditHistory({ limit: 3 });
    let text = '';
    for (let i = 0; i < 5; i++) {
      const next = `${text}${i}\n`;
      history.record(diffText(text, next)!, 'insert', sel(text.length), sel(next.length), i * 1000);
      text = next;
    }
    let undos = 0;
    let r;
    while ((r = history.undo(text))) {
      text = r.text;
      undos++;
    }
    expect(undos).toBe(3);
    expect(text).toBe('0\n1\n');
  });
});
