import { test, expect } from '@playwright/test';

test('markdown editor routes correctly based on compatibility', async ({ page }) => {
  await page.goto('/?fs=mock');
  
  // Click open workspace button
  await page.click('text="Open Fixture Workspace"');
  
  // Open notes.md (compatible markdown)
  await page.click('text="notes.md"');

  // Verify BlockNote is visible (.bn-editor is the class BlockNote uses)
  await expect(page.locator('.bn-editor')).toBeVisible();
  
  // Open notes-with-table.md (incompatible markdown)
  await page.click('text="notes-with-table.md"');

  // Verify CodeMirror is visible instead
  await expect(page.locator('.cm-editor')).toBeVisible();
  
  // Verify warning banner
  await expect(page.locator('text="Opened in source mode because this Markdown file cannot round-trip safely through the block editor."')).toBeVisible();
});
