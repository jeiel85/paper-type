export type SaveState = 'clean' | 'dirty' | 'saving' | 'error';

export type AutosaveOptions = {
  save: () => Promise<void>;
  onStateChange: (state: SaveState) => void;
  onError?: (error: unknown) => void;
  debounceMs?: number;
  maxWaitMs?: number;
};

/**
 * clean -> dirty -> saving -> clean
 *                     └-> error -> saving (retry)
 * Debounced 500ms with a 2s max wait (docs/03 §6). Edits made while a save is
 * running are saved again right after it, so nothing typed is left unsaved.
 */
export class Autosave {
  private state: SaveState = 'clean';
  private version = 0;
  private savedVersion = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;

  constructor(private readonly options: AutosaveOptions) {
    this.debounceMs = options.debounceMs ?? 500;
    this.maxWaitMs = options.maxWaitMs ?? 2000;
  }

  get current() {
    return this.state;
  }

  get hasUnsavedChanges() {
    return this.version !== this.savedVersion;
  }

  markDirty() {
    this.version++;
    if (this.state !== 'saving' && this.state !== 'error') this.setState('dirty');
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.flush(), this.debounceMs);
    this.maxWaitTimer ??= setTimeout(() => void this.flush(), this.maxWaitMs);
  }

  /** Saves now if there is anything unsaved. Resolves when the data is saved or the save failed. */
  async flush(): Promise<void> {
    this.clearTimers();
    if (this.running) {
      await this.running;
      if (!this.hasUnsavedChanges) return;
    }
    if (!this.hasUnsavedChanges) return;
    this.running = this.run();
    try {
      await this.running;
    } finally {
      this.running = null;
    }
  }

  private async run() {
    const target = this.version;
    this.setState('saving');
    try {
      await this.options.save();
      this.savedVersion = Math.max(this.savedVersion, target);
      if (this.hasUnsavedChanges) {
        this.setState('dirty');
        // markDirty() already armed timers while the save was running.
        this.debounceTimer ??= setTimeout(() => void this.flush(), this.debounceMs);
      } else {
        this.setState('clean');
      }
    } catch (error) {
      this.setState('error');
      this.options.onError?.(error);
    }
  }

  dispose() {
    this.clearTimers();
  }

  private clearTimers() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer);
    this.debounceTimer = null;
    this.maxWaitTimer = null;
  }

  private setState(state: SaveState) {
    if (this.state === state) return;
    this.state = state;
    this.options.onStateChange(state);
  }
}
