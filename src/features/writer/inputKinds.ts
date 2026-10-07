import type { SoundEvent } from '../../core/audio/synth';
import type { EditKind } from '../../core/document/history';

/** Maps beforeinput inputType to an undo grouping kind (docs/04 §4, §7.2). */
export function editKindFor(inputType: string): EditKind {
  if (inputType.startsWith('delete')) return 'delete';
  if (inputType === 'insertFromPaste' || inputType === 'insertFromDrop' || inputType === 'insertFromYank') return 'paste';
  if (inputType.startsWith('insert')) return 'insert';
  return 'other';
}

/**
 * Decides the sound from inputType/data instead of keydown, because mobile
 * virtual keyboards often report key = "Unidentified" (docs/05 §6).
 */
export function soundFor(inputType: string, data: string | null): SoundEvent | null {
  switch (inputType) {
    case 'insertText':
      return data !== null && /^\s+$/.test(data) ? 'space' : 'key';
    case 'insertCompositionText':
    case 'insertReplacementText':
      return 'key';
    case 'insertLineBreak':
    case 'insertParagraph':
      return 'enter';
    default:
      return inputType.startsWith('delete') ? 'backspace' : null;
  }
}

export type Motion = 'key' | 'return' | 'review' | 'none';

export const motionFor = (inputType: string): Motion =>
  inputType === 'insertLineBreak' || inputType === 'insertParagraph' ? 'return' : 'key';
