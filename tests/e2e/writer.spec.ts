import { expect, test, type Page } from '@playwright/test';

const input = (page: Page) => page.locator('.type-input');

async function ready(page: Page) {
  await page.goto('/');
  await expect(input(page)).toBeFocused();
}

async function waitSaved(page: Page) {
  await expect(page.locator('.save-label')).toHaveText('저장됨', { timeout: 5000 });
}

test.describe('Writer P0', () => {
  test('types English, mirrors it in ink and keeps both layers aligned', async ({ page }) => {
    await ready(page);
    await page.keyboard.type('Hello, typewriter. ');
    await page.keyboard.type('A long line that wraps onto the next line of the sheet so both layers must agree.');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second paragraph.');

    await expect(input(page)).toHaveValue(/Second paragraph\.$/);
    const ink = await page.locator('.ink').innerText();
    expect(ink.replace(/​/g, '')).toContain('Second paragraph.');

    const metrics = await page.evaluate(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('.type-input')!;
      const ink = document.querySelector<HTMLElement>('.ink')!;
      return { ta: ta.getBoundingClientRect().height, ink: ink.getBoundingClientRect().height, scrollTop: ta.scrollTop, scrollHeight: ta.scrollHeight, clientHeight: ta.clientHeight };
    });
    expect(metrics.scrollTop).toBe(0);
    expect(Math.abs(metrics.ta - metrics.ink)).toBeLessThan(1);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  });

  test('restores the text after reload', async ({ page }) => {
    await ready(page);
    await page.keyboard.type('Saved across reloads.');
    await waitSaved(page);
    await page.reload();
    await expect(input(page)).toHaveValue('Saved across reloads.');
  });

  test('recovers text typed right before the tab was closed', async ({ page, context }) => {
    await ready(page);
    await page.keyboard.type('typed then closed');
    // Close immediately, before the 500ms debounce: pagehide must flush or snapshot.
    await page.close({ runBeforeUnload: true });
    const next = await context.newPage();
    await next.goto('/');
    await expect(input(next)).toHaveValue('typed then closed');
  });

  test('undo/redo use the app history and group continuous typing', async ({ page }) => {
    await ready(page);
    await page.keyboard.type('first');
    await page.waitForTimeout(700); // pause → new undo group
    await page.keyboard.type(' second');
    await page.keyboard.press('Control+Z');
    await expect(input(page)).toHaveValue('first');
    await page.keyboard.press('Control+Z');
    await expect(input(page)).toHaveValue('');
    await page.keyboard.press('Control+Shift+Z');
    await expect(input(page)).toHaveValue('first');
    await page.keyboard.press('Control+Y');
    await expect(input(page)).toHaveValue('first second');
  });

  test('paste and selection replace', async ({ page }) => {
    await ready(page);
    await page.keyboard.type('replace ME please');
    await page.evaluate(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('.type-input')!;
      ta.setSelectionRange(8, 10);
    });
    await page.keyboard.insertText('you');
    await expect(input(page)).toHaveValue('replace you please');
    await page.keyboard.press('Control+Z');
    await expect(input(page)).toHaveValue('replace ME please');
  });

  test('Korean IME composition commits once and undoes in one step', async ({ page }) => {
    await ready(page);
    const cdp = await page.context().newCDPSession(page);
    const compose = async (steps: string[], final: string) => {
      for (const text of steps) {
        await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
      }
      await cdp.send('Input.insertText', { text: final });
    };

    // One composition (ㅎ → 하 → 한) is undone in exactly one step.
    await compose(['ㅎ', '하', '한'], '한');
    await expect(input(page)).toHaveValue('한');
    await page.keyboard.press('Control+Z');
    await expect(input(page)).toHaveValue('');

    // Two syllables: whether they share an undo group depends on typing speed
    // (500ms window), but no undo step may ever leave a partial syllable.
    await compose(['ㅎ', '하', '한'], '한');
    await compose(['ㄱ', '그', '글'], '글');
    await expect(input(page)).toHaveValue('한글');
    expect(await page.locator('.ink').innerText()).toContain('한글');
    await expect(page.locator('.ink .comp')).toHaveCount(0);
    const seen: string[] = [];
    for (let i = 0; i < 3 && (await input(page).inputValue()) !== ''; i++) {
      await page.keyboard.press('Control+Z');
      seen.push(await input(page).inputValue());
    }
    expect(seen.at(-1)).toBe('');
    for (const value of seen) expect(['한', '']).toContain(value);

    await waitSaved(page).catch(() => {}); // nothing to save is also fine
    await compose(['ㄷ', '다', '닭'], '닭');
    await waitSaved(page);
    await page.reload();
    await expect(input(page)).toHaveValue('닭');
  });

  test('shows the composition underlined while composing and never saves it', async ({ page }) => {
    await ready(page);
    await page.keyboard.type('ab ');
    await waitSaved(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '가', selectionStart: 1, selectionEnd: 1 });
    await expect(page.locator('.ink .comp')).toHaveText('가');
    await page.waitForTimeout(2500); // past debounce and maxWait
    const stored = await page.evaluate(
      () =>
        new Promise<string>((resolve, reject) => {
          const open = indexedDB.open('papertype');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('notes', 'readonly');
            const all = tx.objectStore('notes').getAll();
            all.onsuccess = () => resolve((all.result[0] as { text: string }).text);
          };
        }),
    );
    expect(stored).toBe('ab ');
  });

  test('moves the paper, not the caret, once the caret passes the strike point', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await ready(page);
    const paperX = () =>
      page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.paper')!).transform).m41);
    const startX = await paperX();
    await page.keyboard.type('The quick brown fox jumps over the lazy dog');
    await page.waitForTimeout(200);
    expect(await paperX()).toBeLessThan(startX);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    expect(await paperX()).toBe(startX);
  });

  test('reduced motion keeps the paper still horizontally', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await ready(page);
    const paperX = () =>
      page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.paper')!).transform).m41);
    const startX = await paperX();
    await page.keyboard.type('The quick brown fox jumps over the lazy dog');
    expect(await paperX()).toBe(startX);
    await expect(page.getByRole('button', { name: /움직임/ })).toBeDisabled();
  });

  test('sound toggle persists and typing works without audio', async ({ page }) => {
    await ready(page);
    const toggle = page.getByRole('button', { name: '소리 끄기' });
    await toggle.click();
    await expect(page.getByRole('button', { name: '소리 켜기' })).toHaveAttribute('aria-pressed', 'false');
    await expect(input(page)).toBeFocused();
    await page.keyboard.type('quiet');
    await waitSaved(page);
    await page.reload();
    await expect(page.getByRole('button', { name: '소리 켜기' })).toBeVisible();
    await expect(input(page)).toHaveValue('quiet');
  });

  test('editor is labelled for screen readers and the ink copy is hidden', async ({ page }) => {
    await ready(page);
    await expect(page.getByRole('textbox', { name: '본문' })).toBeVisible();
    await expect(page.locator('.ink')).toHaveAttribute('aria-hidden', 'true');
  });
});
