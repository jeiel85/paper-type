import Dexie, { type Table } from 'dexie';
import type { Note } from '../document/note';

export type WriterPrefs = { sound: boolean; reduceMotion: boolean };
export const DEFAULT_PREFS: WriterPrefs = { sound: true, reduceMotion: false };

type SettingRow = { key: string; value: unknown };

class PaperTypeDb extends Dexie {
  notes!: Table<Note, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super('papertype');
    // v1: base notes + settings (docs/03 §5, §11). Later versions add attachments, correction marks.
    this.version(1).stores({
      notes: 'id, updatedAt, createdAt, deletedAt',
      settings: 'key',
    });
  }
}

let db: PaperTypeDb | null = null;
const getDb = () => (db ??= new PaperTypeDb());

/** Most recently edited note that is not in the trash. */
export async function loadLatestNote(): Promise<Note | undefined> {
  return getDb()
    .notes.orderBy('updatedAt')
    .reverse()
    .filter((n) => !n.deletedAt)
    .first();
}

export async function saveNote(note: Note): Promise<void> {
  await getDb().notes.put(note);
}

export async function loadPrefs(): Promise<WriterPrefs> {
  const row = await getDb().settings.get('writer');
  return { ...DEFAULT_PREFS, ...(row?.value as Partial<WriterPrefs> | undefined) };
}

export async function savePrefs(prefs: WriterPrefs): Promise<void> {
  await getDb().settings.put({ key: 'writer', value: prefs });
}
