import { applyChange, invertChange, type Change } from './change';

export type Selection = { start: number; end: number };

/**
 * insert  — typed text or a committed IME composition
 * delete  — Backspace/Delete/cut
 * paste   — insertFromPaste / drop
 * other   — anything else (always its own group)
 */
export type EditKind = 'insert' | 'delete' | 'paste' | 'other';

type Group = {
  changes: Change[];
  before: Selection;
  after: Selection;
  kind: EditKind;
  lastAt: number;
};

export type HistoryOptions = {
  /** Consecutive edits closer than this merge into one undo step. */
  groupWindowMs?: number;
  limit?: number;
};

/**
 * App-owned undo/redo (docs/04 §7, ADR-004). The browser's own textarea undo
 * is disabled; the writer calls `record` after each committed edit.
 */
export class EditHistory {
  private undoStack: Group[] = [];
  private redoStack: Group[] = [];
  private readonly groupWindowMs: number;
  private readonly limit: number;
  private sealed = false;

  constructor(options: HistoryOptions = {}) {
    this.groupWindowMs = options.groupWindowMs ?? 500;
    this.limit = options.limit ?? 200;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  /** Forces the next edit into a new group (e.g. after the caret was moved). */
  seal() {
    this.sealed = true;
  }

  record(change: Change, kind: EditKind, before: Selection, after: Selection, now: number) {
    this.redoStack = [];
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && !this.sealed && canMerge(last, change, kind, now, this.groupWindowMs)) {
      last.changes.push(change);
      last.after = after;
      last.lastAt = now;
      return;
    }
    this.sealed = false;
    this.undoStack.push({ changes: [change], before, after, kind, lastAt: now });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
  }

  /** Returns the restored text and selection, or null when there is nothing to undo. */
  undo(text: string): { text: string; selection: Selection } | null {
    const group = this.undoStack.pop();
    if (!group) return null;
    let next = text;
    for (let i = group.changes.length - 1; i >= 0; i--) {
      next = applyChange(next, invertChange(group.changes[i]!));
    }
    this.redoStack.push(group);
    this.sealed = true;
    return { text: next, selection: group.before };
  }

  redo(text: string): { text: string; selection: Selection } | null {
    const group = this.redoStack.pop();
    if (!group) return null;
    let next = text;
    for (const change of group.changes) next = applyChange(next, change);
    this.undoStack.push(group);
    this.sealed = true;
    return { text: next, selection: group.after };
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.sealed = false;
  }
}

function canMerge(last: Group, change: Change, kind: EditKind, now: number, windowMs: number) {
  if (kind !== last.kind || (kind !== 'insert' && kind !== 'delete')) return false;
  if (now - last.lastAt > windowMs) return false;
  const prev = last.changes[last.changes.length - 1]!;
  if (kind === 'insert') {
    // A line break starts a new group, and the insert must continue where the last one ended.
    if (change.inserted.includes('\n') || prev.inserted.includes('\n')) return false;
    // Some mobile IMEs re-compose the syllable that was just committed (안 + ㅏ → 아나),
    // so the new change may replace the tail of the previous insert. It still merges
    // as long as it stays inside what the previous insert produced.
    const prevEnd = prev.from + prev.inserted.length;
    return change.from >= prev.from && change.from + change.removed.length === prevEnd;
  }
  // Repeated Backspace (moving left) or Delete (staying put).
  const backspace = change.from + change.removed.length === prev.from;
  const forwardDelete = change.from === prev.from;
  return change.inserted === '' && prev.inserted === '' && (backspace || forwardDelete);
}
