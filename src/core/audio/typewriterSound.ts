import { pickVariant, synthesize, type SoundEvent } from './synth';

const VARIANTS: Record<SoundEvent, number> = { key: 5, space: 3, backspace: 3, enter: 3, bell: 2 };
const EVENT_GAIN: Record<SoundEvent, number> = { key: 0.55, space: 0.55, backspace: 0.5, enter: 0.5, bell: 0.35 };

export type SoundStatus = 'locked' | 'ready' | 'unavailable';

/**
 * Web Audio playback. Browsers block audio until a user gesture, so `unlock()`
 * is called from the first pointer/key event (docs/03 §8, R5). If audio cannot
 * start, typing keeps working and the status says 'unavailable'.
 */
export class TypewriterSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundEvent, AudioBuffer[]>();
  private recent = new Map<SoundEvent, number[]>();
  private lastPlayedAt = new Map<SoundEvent, number>();
  status: SoundStatus = 'locked';
  enabled = true;

  /**
   * Creates the (suspended) AudioContext and synthesises the buffers ahead of
   * time. Opening the audio device can take 100ms+ on Windows; doing it while
   * idle keeps that cost off the first keystroke. Browsers allow creating a
   * context before a gesture — it just stays suspended until `unlock()`.
   */
  prepare() {
    if (this.ctx || this.status === 'unavailable') return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.status = 'unavailable';
        return;
      }
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.prepareBuffers(this.ctx);
    } catch {
      this.status = 'unavailable';
    }
  }

  unlock() {
    if (this.status === 'unavailable') return;
    try {
      this.prepare();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {
          // Still locked; the next gesture will try again.
        });
      }
      this.status = 'ready';
    } catch {
      this.status = 'unavailable';
    }
  }

  private prepareBuffers(ctx: AudioContext) {
    for (const event of Object.keys(VARIANTS) as SoundEvent[]) {
      const list: AudioBuffer[] = [];
      for (let v = 0; v < VARIANTS[event]; v++) {
        const samples = synthesize(event, v, ctx.sampleRate);
        const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
        list.push(buffer);
      }
      this.buffers.set(event, list);
    }
  }

  play(event: SoundEvent) {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const list = this.buffers.get(event);
    if (!list?.length) return;

    // Some IME/browser combinations fire two input events for one key press.
    const now = performance.now();
    if (now - (this.lastPlayedAt.get(event) ?? -Infinity) < 18) return;
    this.lastPlayedAt.set(event, now);

    const recent = this.recent.get(event) ?? [];
    const index = pickVariant(recent, list.length, Math.random);
    recent.push(index);
    if (recent.length > 2) recent.shift();
    this.recent.set(event, recent);

    const source = this.ctx.createBufferSource();
    source.buffer = list[index]!;
    source.playbackRate.value = 0.98 + Math.random() * 0.04;
    const gain = this.ctx.createGain();
    gain.gain.value = EVENT_GAIN[event] * (0.96 + Math.random() * 0.08);
    source.connect(gain).connect(this.master);
    source.start();
  }
}
