import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Autosave, type SaveState } from '../../src/core/storage/autosave';
import { clearSnapshot, pickRecoveredText, readSnapshot, writeSnapshot } from '../../src/core/storage/recovery';

describe('Autosave (docs/03 §6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(save = vi.fn(async () => {})) {
    const states: SaveState[] = [];
    const onError = vi.fn();
    const autosave = new Autosave({ save, onStateChange: (s) => states.push(s), onError });
    return { autosave, save, states, onError };
  }

  it('debounces by 500ms', async () => {
    const { autosave, save, states } = setup();
    autosave.markDirty();
    await vi.advanceTimersByTimeAsync(300);
    autosave.markDirty();
    await vi.advanceTimersByTimeAsync(300);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    expect(save).toHaveBeenCalledTimes(1);
    expect(states).toEqual(['dirty', 'saving', 'clean']);
  });

  it('saves at the latest after 2s of continuous typing (maxWait)', async () => {
    const { autosave, save } = setup();
    for (let i = 0; i < 10; i++) {
      autosave.markDirty();
      await vi.advanceTimersByTimeAsync(250);
    }
    expect(save).toHaveBeenCalled();
  });

  it('saves again when text changed during a save', async () => {
    let release!: () => void;
    const save = vi.fn(() => new Promise<void>((r) => (release = r)));
    const { autosave } = setup(save);
    autosave.markDirty();
    const flushing = autosave.flush();
    autosave.markDirty(); // typed while saving
    release();
    await flushing;
    expect(autosave.hasUnsavedChanges).toBe(true);
    await vi.advanceTimersByTimeAsync(600);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(autosave.hasUnsavedChanges).toBe(false);
  });

  it('goes to error, keeps the change, and succeeds on retry', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('QuotaExceededError')).mockResolvedValue(undefined);
    const { autosave, states, onError } = setup(save);
    autosave.markDirty();
    await autosave.flush();
    expect(autosave.current).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(autosave.hasUnsavedChanges).toBe(true);
    await autosave.flush();
    expect(autosave.current).toBe('clean');
    expect(states).toEqual(['dirty', 'saving', 'error', 'saving', 'clean']);
  });

  it('flush is a no-op when nothing changed', async () => {
    const { autosave, save } = setup();
    await autosave.flush();
    expect(save).not.toHaveBeenCalled();
  });
});

describe('recovery snapshot', () => {
  const memory = () => {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
  };

  it('writes, reads and clears one slot', () => {
    const storage = memory();
    const snap = { noteId: 'n1', text: '복구할 글', savedAt: '2026-10-07T02:00:00.000Z' };
    expect(writeSnapshot(snap, storage)).toBe(true);
    expect(readSnapshot(storage)).toEqual(snap);
    clearSnapshot(storage);
    expect(readSnapshot(storage)).toBeNull();
  });

  it('reports failure when storage throws (quota)', () => {
    const storage = { ...memory(), setItem: () => { throw new Error('quota'); } };
    expect(writeSnapshot({ noteId: 'n', text: 't', savedAt: 'x' }, storage)).toBe(false);
  });

  it('ignores a malformed slot', () => {
    const storage = memory();
    storage.setItem('papertype:recovery:v1', '{"noteId":1}');
    expect(readSnapshot(storage)).toBeNull();
  });

  const stored = { id: 'n1', text: 'saved', updatedAt: '2026-10-07T02:00:00.000Z' };

  it('prefers a newer snapshot of the same note', () => {
    const snap = { noteId: 'n1', text: 'saved + unsaved', savedAt: '2026-10-07T02:00:05.000Z' };
    expect(pickRecoveredText(stored, snap)).toEqual({ text: 'saved + unsaved', recovered: true });
  });

  it('keeps the stored note when the snapshot is older, identical or for another note', () => {
    expect(pickRecoveredText(stored, { noteId: 'n1', text: 'old', savedAt: '2026-10-07T01:59:00.000Z' }).recovered).toBe(false);
    expect(pickRecoveredText(stored, { noteId: 'n1', text: 'saved', savedAt: '2026-10-07T03:00:00.000Z' }).recovered).toBe(false);
    expect(pickRecoveredText(stored, { noteId: 'n2', text: 'x', savedAt: '2026-10-07T03:00:00.000Z' }).text).toBe('saved');
  });

  it('uses the snapshot when nothing is stored (IndexedDB unavailable)', () => {
    expect(pickRecoveredText(undefined, { noteId: 'n1', text: 'only here', savedAt: 'x' })).toEqual({ text: 'only here', recovered: true });
  });
});
