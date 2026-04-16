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
    // 1. Initial Scratchpad
    console.log('Navigating to scratchpad...');
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForSelector('.scratchpad-shell');
    await capture(page, 'screenshot_1_scratchpad.png');

    // 2. Scratchpad with multiple notes
    console.log('Creating second note...');
    await page.click('button[title="New Note"]');
    await page.waitForTimeout(1000);
    // Type some content in the second note
    await page.click('.bn-editor');
    await page.keyboard.type('# Research Ideas\n- Agentic workflows\n- Local-first UX\n- Chrome Extension API limits');
    await page.waitForTimeout(1000);
    await capture(page, 'screenshot_2_multi_note.png');

    // 3. Open Workspace via ?fs=mock
    console.log('Opening workspace mock...');
    await page.goto('http://127.0.0.1:5173/?fs=mock');
    await page.waitForSelector('.scratchpad-shell');
    await page.click('button:has-text("Open Folder")');
    console.log('Waiting for filesystem tree...');
    await page.waitForSelector('text=example.md', { timeout: 10000 });
    await capture(page, 'screenshot_3_workspace.png');
    
    // 4. Open example.md (Rich Mode)
    console.log('Opening example.md...');
    await page.click('text=example.md');
    await page.waitForTimeout(2000);
    await capture(page, 'screenshot_4_rich_mode.png');

    // 5. Open CLAUDE.md (Source Mode)
    console.log('Opening submission guide...');
    await page.click('text=SUBMISSION_GUIDE.md');
    await page.waitForTimeout(2000);
    await capture(page, 'screenshot_5_source_mode.png');

    console.log('All screenshots captured successfully!');
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
