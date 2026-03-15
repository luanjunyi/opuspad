import { test, expect } from '@playwright/test';

test('markdown editor routes correctly based on compatibility', async ({ page }) => {
  await page.goto('/?fs=mock');
  
  // Click open workspace button
  await page.click('text="Open Fixture Workspace"');
  
  // Open notes.md (compatible markdown)
  await page.click('text="notes.md"');

  // Verify CodeMirror is visible by default (source mode)
  await expect(page.locator('.cm-editor')).toBeVisible();
  
  // Switch to rich mode
  await page.click('text="Open rich"');

  // Verify BlockNote is now visible
  await expect(page.locator('.bn-editor')).toBeVisible();
  
  // Open notes-with-table.md (markdown with a fidelity warning)
  await page.click('text="notes-with-table.md"');

  // Verify it also opens in source mode by default
  await expect(page.locator('.cm-editor')).toBeVisible();
  
  // Verify warning banner and rich-mode toggle
  await expect(page.locator('text=/This Markdown may be rewritten when saved from the rich editor/')).toBeVisible();
  await expect(page.locator('text="Open rich"')).toBeVisible();
});
