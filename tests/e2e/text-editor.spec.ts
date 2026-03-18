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

test('source editor stays mounted while editing', async ({ page }) => {
  await page.goto('/?fs=mock');

  await page.click('text="Open Fixture Workspace"');
  await page.click('text="notes-with-table.md"');
  await page.click('text="Open source"');

  const editor = page.locator('.cm-editor');
  const content = page.locator('.cm-content');

  await expect(editor).toBeVisible();
  await content.click();
  await page.keyboard.type(' stable');

  await editor.evaluate((node) => {
    node.setAttribute('data-refresh-probe', 'stable-editor');
  });

  await page.waitForTimeout(3200);

  await expect(content).toContainText('stable');
  await expect(editor).toHaveAttribute('data-refresh-probe', 'stable-editor');
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.closest('.cm-editor') !== null)
    )
    .toBe(true);
});
