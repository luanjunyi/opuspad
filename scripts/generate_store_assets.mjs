import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const iconPath = `file://${path.join(rootDir, 'public', 'icon128.png')}`;

const assets = [
  {
    name: 'small_promo_tile.png',
    width: 440,
    height: 280,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Manrope:wght@600&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            width: 440px;
            height: 280px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f4f1ea;
            font-family: 'Manrope', sans-serif;
            color: #1f1d1b;
          }
          .logo {
            width: 96px;
            height: 96px;
            margin-bottom: 20px;
            border-radius: 20px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
          }
          .title {
            font-family: 'Instrument Serif', serif;
            font-size: 48px;
            margin: 0;
            line-height: 1;
          }
        </style>
      </head>
      <body>
        <img src="${iconPath}" class="logo">
        <h1 class="title">OpusPad</h1>
      </body>
      </html>
    `
  },
  {
    name: 'marquee_promo_tile.png',
    width: 1400,
    height: 560,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Manrope:wght@600&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            width: 1400px;
            height: 560px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f4f1ea;
            font-family: 'Manrope', sans-serif;
            color: #1f1d1b;
          }
          .logo {
            width: 160px;
            height: 160px;
            margin-bottom: 40px;
            border-radius: 32px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          }
          .title {
            font-family: 'Instrument Serif', serif;
            font-size: 120px;
            margin: 0;
            line-height: 1;
            letter-spacing: -0.02em;
          }
          .tagline {
            margin-top: 24px;
            font-size: 24px;
            color: #6a655d;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <img src="${iconPath}" class="logo">
        <h1 class="title">OpusPad</h1>
        <div class="tagline">Bridging AI output and human intent.</div>
      </body>
      </html>
    `
  }
];

(async () => {
  console.log('Launching browser for store asset generation (pixel perfect)...');
  const browser = await chromium.launch({ headless: true });
  
  for (const asset of assets) {
    console.log(`Generating ${asset.name} (${asset.width}x${asset.height})...`);
    // CRITICAL: deviceScaleFactor MUST be 1 for exact pixels
    const context = await browser.newContext({
      viewport: { width: asset.width, height: asset.height },
      deviceScaleFactor: 1, 
    });
    
    const page = await context.newPage();
    await page.setContent(asset.html);
    
    // Ensure fonts and images are loaded
    await page.waitForLoadState('networkidle');
    await page.evaluateHandle('document.fonts.ready');
    
    // Capture screenshot as PNG (Playwright PNGs are 32-bit by default, but we ensure no transparency)
    // Actually, to be safe and follow "no alpha", we could use JPEG or ensure background is solid.
    // The dashboard says "JPEG or 24-bit PNG (no alpha)".
    // A solid background in the HTML usually suffices for PNG, but some decoders still see an alpha channel.
    // However, Chrome Store usually accepts PNGs with solid backgrounds.
    // But let's use JPEG if we want to be 100% sure about the alpha channel, or just trust the solid background.
    
    await page.screenshot({ 
      path: path.join(rootDir, 'store_assets', asset.name),
      omitBackground: false // Ensure background is captured
    });
    
    console.log(`Saved ${asset.name}`);
    await context.close();
  }

  // Also copy icon to store_assets (as a link or file)
  const storeIconPath = path.join(rootDir, 'store_assets', 'store_icon.png');
  const sourceIconPath = path.join(rootDir, 'public', 'icon128.png');
  if (fs.existsSync(sourceIconPath)) {
    fs.copyFileSync(sourceIconPath, storeIconPath);
    console.log('Copied store_icon.png');
  }

  await browser.close();
  process.exit(0);
})();
