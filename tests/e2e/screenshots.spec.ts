import { expect, test } from '@playwright/test';

/** Regenerates README screenshots: `SHOTS=1 npx playwright test screenshots`. */
test.skip(!process.env.SHOTS, 'set SHOTS=1 to regenerate docs/screenshots');

const SAMPLE = [
  '오늘은 종이 위에 천천히 문장을 적어 본다.',
  '디지털이지만 조금은 오래된 기계처럼, 한 글자씩 눌러 찍는다.',
  '',
  'The quick brown fox jumps over the lazy dog.',
  '값, 닭, 읽다 — 복합 받침도 깨지지 않고 그대로',
].join('\n');

for (const [name, viewport] of [
  ['writer-desktop', { width: 1280, height: 800 }],
  ['writer-mobile', { width: 390, height: 844 }],
] as const) {
  test(name, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.type-input')).toBeFocused();
    await page.keyboard.insertText(SAMPLE);
    await page.keyboard.type('.', { delay: 30 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `docs/screenshots/${name}.png` });
  });
}

test('writer-strike', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('.type-input')).toBeFocused();
  await page.keyboard.insertText('Dear reader,\n종이 위에 한 글자씩 찍히는 소리');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.keyboard.press('k');
  // Freeze the strike at the moment the typebar hits the paper (50% of its 140ms swing).
  await page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      a.pause();
      a.currentTime = 66;
    }),
  );
  await page.screenshot({ path: 'docs/screenshots/writer-strike.png', clip: { x: 340, y: 300, width: 600, height: 420 } });
});
