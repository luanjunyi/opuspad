import { test, expect } from '@playwright/test';

test('markdown editor routes correctly based on compatibility', async ({ page }) => {
  await page.goto('/?fs=mock');
  
  // Click open workspace button
  await page.click('text="Open Fixture Workspace"');
  
  // Open notes.md (compatible markdown)
  await page.click('text="notes.md"');

  // Verify BlockNote is visible (.bn-editor is the class BlockNote uses)
  await expect(page.locator('.bn-editor')).toBeVisible();
  
  // Open notes-with-table.md (markdown with a fidelity warning)
  await page.click('text="notes-with-table.md"');

  // Verify BlockNote still opens by default
  await expect(page.locator('.bn-editor')).toBeVisible();
  
  // Verify warning banner and source-mode toggle
  await expect(page.locator('text=/This Markdown may be rewritten when saved from the rich editor/')).toBeVisible();
  await expect(page.locator('text="Open source"')).toBeVisible();
});
