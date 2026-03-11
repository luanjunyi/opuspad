import { chromium } from 'playwright';
import path from 'path';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2, // High DPI for store asset
  });

  const page = await context.newPage();
  
  try {
    console.log('Navigating to app...');
    await page.goto('http://127.0.0.1:5173/?fs=mock');

    // Click 'Open Fixture Workspace'
    await page.getByText(/Open Fixture Workspace/i).click();

    // Wait for the filesystem tree to appear
    await page.waitForSelector('text=notes.md');

    // Open notes.md
    await page.getByText('notes.md').first().click();

    // Give BlockNote time to mount and render
    await page.waitForTimeout(2000);

    console.log('Taking screenshot...');
    await page.screenshot({ path: path.join(process.cwd(), 'store_assets', 'screenshot_1.png') });
    console.log('Screenshot saved to store_assets/screenshot_1.png');

  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
