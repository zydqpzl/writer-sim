import { test, expect } from '@playwright/test';

test('游戏首页能够正常加载', async ({ page }) => {
  const pageErrors: string[] = [];

  // 记录网页运行过程中出现的 JavaScript 错误
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  // 打开游戏首页
  await page.goto('/');

  // 确认 React 挂载节点存在且可见
  const root = page.locator('#root');
  await expect(root).toBeVisible();

  // 确认 React 已经在页面中渲染出实际内容
  await expect(root.locator(':scope > *').first()).toBeVisible();

  // 确认页面没有 JavaScript 运行错误
  expect(pageErrors).toEqual([]);
});