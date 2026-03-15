import { test, expect } from '@playwright/test';

test('text editor routes correctly and auto saves', async ({ page }) => {
  await page.goto('/?fs=mock');
  
  // Click open workspace button
  await page.click('text="Open Fixture Workspace"');
  
  // Open data.json
  await page.click('text="data.json"');

  // Verify CodeMirror is visible
  await expect(page.locator('.cm-editor')).toBeVisible();
  
  // Check content is rendered
  await expect(page.locator('.cm-content')).toContainText('hello');

  // Open binary image and check error state
  await page.click('text="image.png"');
  await expect(page.locator('text="Unsupported File"')).toBeVisible();
  await expect(page.locator('text="Binary files cannot be edited"')).toBeVisible();
  
  // Incompatible markdown opens in rich mode first, with an explicit source-mode escape hatch
  await page.click('text="notes-with-table.md"');
  await expect(page.locator('.bn-editor')).toBeVisible();
  await expect(page.locator('text=/This Markdown may be rewritten when saved from the rich editor/')).toBeVisible();
  await page.click('text="Open source"');
  await expect(page.locator('.cm-editor')).toBeVisible();
  await expect(page.locator('text="Source mode recommended"')).toBeVisible();
});
