import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const assets = [
  {
    name: 'small_promo_tile.png',
    path: path.join(rootDir, 'temp_assets', 'small.html'),
    width: 440,
    height: 280,
  },
  {
    name: 'marquee_promo_tile.png',
    path: path.join(rootDir, 'temp_assets', 'marquee.html'),
    width: 1400,
    height: 560,
  }
];

(async () => {
  console.log('Launching browser for store asset generation...');
  const browser = await chromium.launch({ headless: true });
  
  for (const asset of assets) {
    console.log(`Generating ${asset.name}...`);
    const context = await browser.newContext({
      viewport: { width: asset.width, height: asset.height },
      deviceScaleFactor: 2, // High resolution
    });
    
    const page = await context.newPage();
    const fileUrl = `file://${asset.path}`;
    
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');
    
    // Ensure fonts are loaded
    await page.evaluateHandle('document.fonts.ready');
    
    await page.screenshot({ 
      path: path.join(rootDir, 'store_assets', asset.name),
      omitBackground: true
    });
    
    console.log(`Saved ${asset.name}`);
    await context.close();
  }

  await browser.close();
  process.exit(0);
})();
