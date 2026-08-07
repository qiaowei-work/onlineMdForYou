import { test, expect } from '@playwright/test';

test.describe('Editor UX Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
  });

  test('paragraph button in toolbar is visible', async ({ page }) => {
    await expect(page.locator('button[title="正文"]')).toBeVisible();
  });

  test('paragraph button reverts heading to body text', async ({ page }) => {
    const editor = page.locator('.ProseMirror');
    await editor.click();
    // Click H1 button first
    await page.locator('button[title="一级标题"]').click();
    await editor.pressSequentially('Test');
    // Click paragraph button
    await page.locator('button[title="正文"]').click();
    await editor.pressSequentially(' more');
    // Text should contain both
    await expect(editor).toContainText('Test');
  });

  test('link button opens input popup', async ({ page }) => {
    const editor = page.locator('.ProseMirror');
    await editor.click();
    // Select some text
    await editor.pressSequentially('hello world');
    await editor.dblclick();
    // Click link button
    await page.locator('button[title*="链接"]').click();
    // Link input popup should appear
    await expect(page.locator('.link-input-popup input')).toBeVisible({ timeout: 3000 });
  });

  test('blockquote creates blockquote element', async ({ page }) => {
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.pressSequentially('Hello');
    // Select and wrap in blockquote
    await editor.dblclick();
    await page.locator('button[title*="引用"]').click();
    // Should have a blockquote
    await expect(editor.locator('blockquote').first()).toBeVisible();
  });
});
