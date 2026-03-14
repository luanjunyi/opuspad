import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../store_assets');
const RAW_DIR = path.join(OUTPUT_DIR, 'raw_screenshots');

if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

const screenshots = [
  {
    name: 'screenshot_1_claude_md',
    file: 'CLAUDE.md',
    title: 'Render CLAUDE.md beautifully.',
    subtitle: 'Instantly review AI agent instructions in a clean, readable format.',
    mode: 'rich'
  },
  {
    name: 'screenshot_2_wysiwyg_edit',
    file: 'implementation-plan.md',
    title: 'Edit specs visually. Save as clean Markdown.',
    subtitle: 'Fix typos, reorder sections, and refine AI output naturally.',
    mode: 'rich'
  },
  {
    name: 'screenshot_3_local_private',
    file: 'architecture-notes.md',
    title: '100% local. Zero uploads.',
    subtitle: 'Your proprietary specs never leave your machine.',
    mode: 'rich'
  },
  {
    name: 'screenshot_4_source_mode',
    file: 'api-spec.md',
    title: 'Toggle to raw Markdown instantly.',
    subtitle: 'Full control when syntax gets complex.',
    mode: 'source'
  }
];

async function generateScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  
  console.log('Navigating to app in mock mode...');
  await page.goto('http://localhost:5173/?fs=mock');

  // Click Open Fixture Workspace
  await page.click('button.primary-button');
  await page.waitForSelector('.workspace-shell');

  for (const s of screenshots) {
    console.log(`Generating ${s.name}...`);
    
    // Select the file in sidebar
    // Sidebar files are likely in .sidebar-item
    await page.click(`.sidebar-item:has-text("${s.file}")`);
    
    // Wait for editor to load
    await page.waitForSelector('.editor-panel');

    // Toggle mode if needed
    if (s.mode === 'source') {
      const sourceBtn = page.locator('button:has-text("Open source")');
      if (await sourceBtn.isVisible()) {
        await sourceBtn.click();
      }
    } else {
      const richBtn = page.locator('button:has-text("Open rich")');
      if (await richBtn.isVisible()) {
        await richBtn.click();
      }
    }

    // Wait a bit for layout
    await page.waitForTimeout(1000);

    const rawPath = path.join(RAW_DIR, `${s.name}_raw.png`);
    await page.screenshot({ path: rawPath });

    // Generate composite with overlay
    const compositeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          .container { width: 1280px; height: 800px; position: relative; }
          .screenshot { width: 100%; height: 100%; object-fit: cover; }
          .overlay {
            position: absolute; top: 0; left: 0; right: 0; 
            background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.85) 100%);
            padding: 32px 48px; color: white; border-bottom: 1px solid rgba(255,255,255,0.1);
            font-family: 'Outfit', sans-serif;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .title { font-size: 32px; font-weight: 700; margin: 0 0 8px 0; }
          .subtitle { font-size: 18px; font-weight: 400; color: #94a3b8; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="file://${rawPath}" class="screenshot">
          <div class="overlay">
            <h1 class="title">${s.title}</h1>
            <p class="subtitle">${s.subtitle}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const overlayPage = await context.newPage();
    await overlayPage.setContent(compositeHtml);
    await overlayPage.waitForLoadState('networkidle');
    
    const finalPath = path.join(OUTPUT_DIR, `${s.name}.png`);
    await overlayPage.screenshot({ path: finalPath });
    await overlayPage.close();
    
    console.log(`Saved ${s.name}.png`);
  }

  await browser.close();
  console.log('All screenshots generated successfully.');
}

generateScreenshots().catch(console.error);
