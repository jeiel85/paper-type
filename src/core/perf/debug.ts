/**
 * Development aids, enabled with `?debug=1` (docs/08 §6, docs/09 P0).
 * The IME logger records event types and lengths only — never note text
 * (docs/06 §11).
 */
export const debugEnabled = (() => {
  try {
    return new URLSearchParams(window.location.search).has('debug');
  } catch {
    return false;
  }
})();

export function logInputEvent(event: Event) {
  if (!debugEnabled) return;
  const e = event as InputEvent & CompositionEvent;
  console.debug('[ime]', event.type, {
    inputType: 'inputType' in e ? e.inputType : undefined,
    isComposing: 'isComposing' in e ? e.isComposing : undefined,
    dataLength: typeof e.data === 'string' ? e.data.length : null,
    t: Math.round(performance.now()),
  });
}

export type PerfStats = { fps: number; inputLatencyMs: number | null; longTasks: number };

/** Measures frame rate, input→next-frame latency and long tasks. */
export class PerfMonitor {
  private frames = 0;
  private windowStart = performance.now();
  private raf = 0;
  private inputAt: number | null = null;
  private latency: number | null = null;
  private longTasks = 0;
  private observer: PerformanceObserver | null = null;

  constructor(private readonly onStats: (stats: PerfStats) => void) {}

  start() {
    const tick = (now: number) => {
      this.frames++;
      if (this.inputAt !== null) {
        this.latency = now - this.inputAt;
        this.inputAt = null;
      }
      if (now - this.windowStart >= 1000) {
        this.onStats({
          fps: Math.round((this.frames * 1000) / (now - this.windowStart)),
          inputLatencyMs: this.latency === null ? null : Math.round(this.latency),
          longTasks: this.longTasks,
        });
        this.frames = 0;
        this.windowStart = now;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    try {
      this.observer = new PerformanceObserver((list) => {
        this.longTasks += list.getEntries().length;
      });
      this.observer.observe({ type: 'longtask', buffered: false });
    } catch {
      // longtask is Chromium-only
    }
  }

  markInput() {
    this.inputAt = performance.now();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
  }
}
