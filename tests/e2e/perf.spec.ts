import { expect, test } from '@playwright/test';

/**
 * Gate P0 #6 measurement (docs/08 §6). Timing depends on the machine, so it only
 * runs on demand: `PERF=1 npx playwright test perf`.
 */
test.skip(!process.env.PERF, 'set PERF=1 to run performance measurements');

for (const size of [3000, 10000]) {
  test(`typing into a ${size}-character document`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const body = '타자기 위에서 천천히 문장을 적는다. The quick brown fox jumps over the lazy dog. ';
    let text = '';
    while (text.length < size) text += body + (text.length % 600 < body.length ? '\n' : '');
    await page.keyboard.insertText(text.slice(0, size));
    await page.waitForTimeout(800);

    // Warm-up: the first strikes pay one-off costs (layer creation, first animations).
    // They are reported separately so the steady-state numbers stay comparable.
    await page.evaluate(() => {
      const w = window as unknown as { __warm: number[] };
      w.__warm = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.__warm.push(e.duration);
      }).observe({ type: 'longtask' });
    });
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('b', { delay: 10 });
      await page.waitForTimeout(70);
    }
    const warmLongTasks = await page.evaluate(() => (window as unknown as { __warm: number[] }).__warm.slice());

    await page.evaluate(() => {
      const w = window as unknown as { __perf: { frames: number[]; longTasks: number[] } };
      w.__perf = { frames: [], longTasks: [] };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.__perf.longTasks.push(e.duration);
      }).observe({ type: 'longtask' });
      let last = performance.now();
      const tick = (now: number) => {
        w.__perf.frames.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    // Latency is measured in the page: beforeinput → the next animation frame
    // (the frame that shows the typed glyph). Measuring across the CDP boundary
    // would race the key dispatch.
    await page.evaluate(() => {
      const w = window as unknown as { __lat: number[] };
      w.__lat = [];
      document.querySelector('.type-input')!.addEventListener('beforeinput', () => {
        const start = performance.now();
        requestAnimationFrame(() => requestAnimationFrame(() => w.__lat.push(performance.now() - start)));
      });
    });

    // Type at a brisk ~12 keys/s for 200 keys, including Enter and Backspace.
    for (let i = 0; i < 200; i++) {
      const key = i % 40 === 39 ? 'Enter' : i % 17 === 16 ? 'Backspace' : 'a';
      await page.keyboard.press(key, { delay: 10 });
      await page.waitForTimeout(70);
    }
    await page.waitForTimeout(300);
    const latencies = await page.evaluate(() => (window as unknown as { __lat: number[] }).__lat);

    const result = await page.evaluate(() => (window as unknown as { __perf: { frames: number[]; longTasks: number[] } }).__perf);
    const frames = result.frames.slice(5);
    const avgFrame = frames.reduce((a, b) => a + b, 0) / frames.length;
    const fps = 1000 / avgFrame;
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)]!;
    console.log(
      `[perf] ${size} chars: avg ${fps.toFixed(1)} fps, p95 input→frame ${p95.toFixed(1)} ms, long tasks ${result.longTasks.length} (max ${Math.max(0, ...result.longTasks).toFixed(0)} ms); warm-up long tasks [${warmLongTasks.map((d) => d.toFixed(0)).join(', ')}] ms`,
    );
    expect(fps).toBeGreaterThanOrEqual(55);
    expect(result.longTasks.filter((d) => d > 50).length).toBeLessThanOrEqual(2);
  });
}
