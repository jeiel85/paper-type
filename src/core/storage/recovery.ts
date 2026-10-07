/**
 * Emergency snapshot in localStorage (docs/02 §11, docs/03 §6). Written
 * synchronously when the page is hidden with unsaved text, or when an
 * IndexedDB save fails, so a reload can still bring the text back.
 * One slot only: it always holds the latest unsaved text of the open note.
 */
export type RecoverySnapshot = { noteId: string; text: string; savedAt: string };

const KEY = 'papertype:recovery:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const defaultStorage = (): StorageLike | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function writeSnapshot(snapshot: RecoverySnapshot, storage = defaultStorage()): boolean {
  try {
    storage?.setItem(KEY, JSON.stringify(snapshot));
    return !!storage;
  } catch {
    return false; // quota exceeded or storage blocked
  }
}

export function readSnapshot(storage = defaultStorage()): RecoverySnapshot | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RecoverySnapshot>;
    if (typeof value.noteId !== 'string' || typeof value.text !== 'string' || typeof value.savedAt !== 'string') return null;
    return value as RecoverySnapshot;
  } catch {
    return null;
  }
}

export function clearSnapshot(storage = defaultStorage()) {
  try {
    storage?.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

/**
 * Decides which text to open with. The snapshot wins only when it belongs to
 * the same note (or there is no stored note) and is newer than the stored copy.
 */
export function pickRecoveredText(
  stored: { id: string; text: string; updatedAt: string } | undefined,
  snapshot: RecoverySnapshot | null,
): { text: string; recovered: boolean } {
  if (!snapshot) return { text: stored?.text ?? '', recovered: false };
  if (!stored) return { text: snapshot.text, recovered: snapshot.text !== '' };
  if (snapshot.noteId !== stored.id) return { text: stored.text, recovered: false };
  const newer = Date.parse(snapshot.savedAt) > Date.parse(stored.updatedAt);
  if (newer && snapshot.text !== stored.text) return { text: snapshot.text, recovered: true };
  return { text: stored.text, recovered: false };
}
