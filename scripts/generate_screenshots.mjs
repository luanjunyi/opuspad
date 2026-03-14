import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function capture(page, name, options = {}) {
  const screenshotPath = path.join(rootDir, 'store_assets', name);
  console.log(`Capturing ${name}...`);
  await page.screenshot({ path: screenshotPath, ...options });
  console.log(`Saved to ${screenshotPath}`);
}

(async () => {
  console.log('Launching browser for store screenshot regeneration...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2, // High resolution for Retina displays
  });

  const page = await context.newPage();
  
  try {
    // 1. Landing Page
    console.log('Navigating to landing page...');
    await page.goto('http://127.0.0.1:5173/?fs=mock');
    await page.waitForSelector('.landing-panel');
    await capture(page, 'screenshot_1_landing.png');

    // 2. Open Workspace
    console.log('Opening workspace...');
    await page.click('button.primary-button');
    console.log('Waiting for filesystem tree...');
    await page.waitForSelector('text=example.md', { timeout: 10000 });
    
    // 3. Open example.md (Rich Mode)
    console.log('Opening example.md...');
    await page.click('text=example.md');
    await page.waitForTimeout(3000); // Wait for BlockNote to initialize
    await capture(page, 'screenshot_2_rich_mode.png');

    // 4. Switch to Source Mode (using design-doc which should fail guard due to tables)
    console.log('Opening design-doc-md-editor-chrome.md...');
    await page.click('text=design-doc-md-editor-chrome.md');
    await page.waitForTimeout(2000);
    await capture(page, 'screenshot_3_source_mode.png');

    // 5. Open JSON file (CodeMirror)
    console.log('Opening package.json...');
    await page.click('text=package.json');
    await page.waitForTimeout(1500);
    await capture(page, 'screenshot_4_json_editor.png');

    // 6. Project Manifest
    console.log('Opening manifest.json...');
    await page.click('text=manifest.json');
    await page.waitForTimeout(1500);
    await capture(page, 'screenshot_5_manifest_editor.png');

    console.log('All screenshots captured successfully!');
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
