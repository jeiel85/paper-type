import { SEED_ALGORITHM_VERSION } from '../rendering/inkSeed';

/** Mirrors schemas/papertype-note.schema.json (schemaVersion 1). */
export type Note = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  title: string | null;
  text: string;
  paperPresetId: string;
  inkPresetId: string;
  writerSettings: {
    typeSize: 'small' | 'regular' | 'large' | 'larger';
    marginMode: 'wide' | 'narrow';
    correctionMode: 'clean' | 'typewriter';
    seedAlgorithmVersion: number;
    inkSeed?: string;
    [key: string]: unknown;
  };
  correctionMarks: unknown[];
  attachments: { id: string; kind: 'image'; fileName?: string; mimeType?: string }[];
  platformExtensions?: Record<string, unknown>;
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : // Non-secure contexts (plain http on a LAN IP) have no randomUUID.
      '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
        (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0]! & (15 >> (Number(c) / 4)))).toString(16),
      );

export function createNote(now = new Date()): Note {
  const id = newId();
  const at = now.toISOString();
  return {
    schemaVersion: 1,
    id,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    title: null,
    text: '',
    paperPresetId: 'classic-ivory',
    inkPresetId: 'normal',
    writerSettings: {
      typeSize: 'regular',
      marginMode: 'wide',
      correctionMode: 'clean',
      seedAlgorithmVersion: SEED_ALGORITHM_VERSION,
      inkSeed: id,
    },
    correctionMarks: [],
    attachments: [],
  };
}

export const inkSeedOf = (note: Pick<Note, 'id' | 'writerSettings'>) => note.writerSettings.inkSeed ?? note.id;
