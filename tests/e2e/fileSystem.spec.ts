import { test, expect } from '@playwright/test';

test('mock workspace mounts and renders lazily', async ({ page }) => {
  await page.goto('/?fs=mock');
  
  // Click open workspace button
  await page.click('text="Open Fixture Workspace"');
  
  // Check that root nodes render
  await expect(page.locator('text="notes.md"')).toBeVisible();
  await expect(page.locator('text="notes-with-table.md"')).toBeVisible();
  await expect(page.locator('text="folder1"')).toBeVisible();

  // nested.txt should not be visible yet
  await expect(page.locator('text="nested.txt"')).not.toBeVisible();

  // Expand folder1
  await page.click('text="folder1"');

  // Now nested.txt should be visible
  await expect(page.locator('text="nested.txt"')).toBeVisible();
});
