import { test, expect } from '@playwright/test';

test.describe('mdOnline Smoke Tests', () => {
  test('app loads and shows editor', async ({ page }) => {
    await page.goto('http://localhost:5173');
    // 编辑器应该渲染出来（ProseMirror contenteditable 区域）
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    // 侧边栏应该可见
    await expect(page.locator('aside').getByText('文件管理')).toBeVisible();
  });

  test('sidebar toggle works', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    // 侧边栏默认展开，应该有文件夹内容
    await expect(page.locator('aside').getByText('文件管理')).toBeVisible();
  });

  test('typing in editor works', async ({ page }) => {
    await page.goto('http://localhost:5173');
    const editor = page.locator('.ProseMirror');
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    await editor.pressSequentially('Hello mdOnline!');
    await expect(editor).toContainText('Hello mdOnline!');
  });

  test('dark mode toggle works', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    // 点击暗黑模式切换按钮（太阳/月亮图标）
    const themeToggle = page.locator('button').filter({ has: page.locator('.lucide-sun, .lucide-moon') }).first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      // 检查 html 上是否有 dark class
      await expect(page.locator('html')).toHaveClass(/dark/);
    }
  });
});
