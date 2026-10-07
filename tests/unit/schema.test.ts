import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import sampleManifest from '../../examples/sample-backup-manifest.json';
import sampleNote from '../../examples/sample-note.json';
import manifestSchema from '../../schemas/papertype-backup-manifest.schema.json';
import noteSchema from '../../schemas/papertype-note.schema.json';
import { createNote } from '../../src/core/document/note';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateNote = ajv.compile(noteSchema);
const validateManifest = ajv.compile(manifestSchema);

describe('note schema (docs/06, R10)', () => {
  it('accepts the example note', () => {
    expect(validateNote(sampleNote), JSON.stringify(validateNote.errors)).toBe(true);
  });

  it('accepts a note created by the app, with inkSeed set to its id', () => {
    const note = { ...createNote(new Date('2026-10-07T02:00:00Z')), text: '안녕하세요' };
    expect(validateNote(note), JSON.stringify(validateNote.errors)).toBe(true);
    expect(note.writerSettings.inkSeed).toBe(note.id);
  });

  it('checks date-time format (format assertion is on)', () => {
    expect(validateNote({ ...sampleNote, createdAt: 'yesterday' })).toBe(false);
  });

  it('validates correction marks', () => {
    const mark = { id: 'm1', kind: 'strike', at: 3, originalText: '틀린', createdAt: '2026-10-07T02:00:00Z' };
    expect(validateNote({ ...sampleNote, correctionMarks: [mark] })).toBe(true);
    expect(validateNote({ ...sampleNote, correctionMarks: [{ ...mark, at: -1 }] })).toBe(false);
  });
});

describe('backup manifest schema', () => {
  it('accepts the example manifest', () => {
    expect(validateManifest(sampleManifest), JSON.stringify(validateManifest.errors)).toBe(true);
  });

  it('accepts unknown top-level fields for forward compatibility', () => {
    expect(validateManifest({ ...sampleManifest, futureField: { x: 1 } })).toBe(true);
  });

  it.each(['../notes/x.json', '/notes/x.json', 'notes\\x.json', 'notes/../../etc.json', 'other/x.json'])(
    'rejects unsafe note path %j',
    (path) => {
      expect(validateManifest({ ...sampleManifest, notes: [{ id: 'x', path }] })).toBe(false);
    },
  );

  it('rejects a placeholder checksum', () => {
    const notes = [{ ...sampleManifest.notes[0]!, sha256: '<sha256-of-note-file>' }];
    expect(validateManifest({ ...sampleManifest, notes })).toBe(false);
  });
});
