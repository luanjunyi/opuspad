import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const originalMockFsPath = path.join(rootDir, 'src', 'services', 'mockFileSystem.ts');
const backupMockFsPath = path.join(rootDir, 'src', 'services', 'mockFileSystem.ts.bak');

const mdFiles = [
  '/Users/jluan/code/stock_check/.spec/DATA_CORRECTNESS_VERIFICATION.md',
  '/Users/jluan/code/stock_check/.spec/design-doc-metrics-ttm.md',
  '/Users/jluan/code/stock_check/.spec/design-doc-revenue-source-api.md',
  '/Users/jluan/code/stock_check/.spec/design-doc-sec-pipeline.md',
];

const tsxFiles = [
  '/Users/jluan/code/stock_check/src/components/AnalysisRadarChart.tsx',
  '/Users/jluan/code/stock_check/src/components/AnalysisTab.tsx',
  '/Users/jluan/code/stock_check/src/components/FeedbackWidget.tsx',
  '/Users/jluan/code/stock_check/src/components/FinancialTable.tsx',
];

async function capture(page, name, options = {}) {
  const screenshotPath = path.join(rootDir, 'store_assets', name);
  console.log(`Capturing ${name}...`);
  await page.screenshot({ path: screenshotPath, ...options });
  console.log(`Saved to ${screenshotPath}`);
}

async function prepareMockFS() {
  await fs.copyFile(originalMockFsPath, backupMockFsPath);
  
  let tree = {};
  for (const f of [...mdFiles, ...tsxFiles]) {
    const name = path.basename(f);
    const content = await fs.readFile(f, 'utf-8');
    tree[name] = content;
  }

  // Escape backticks and ${} for the template literal, if we output as JSON it's easier, but mockFileSystem expects TypeScript.
  // Wait, mockFileSystem can just parse JSON.
  const originalCode = await fs.readFile(originalMockFsPath, 'utf-8');
  
  // We'll replace the DEFAULT_MOCK_FILE_SYSTEM definition.
  // A safe way is to replace the tree object with our JSON.
  const newCode = originalCode.replace(
    /const DEFAULT_MOCK_FILE_SYSTEM: MockFileSystemTree = \{[\s\S]*?\};\n\nexport class MockFileSystemService/m,
    `const DEFAULT_MOCK_FILE_SYSTEM: MockFileSystemTree = ${JSON.stringify(tree, null, 2)};\n\nexport class MockFileSystemService`
  );
  
  await fs.writeFile(originalMockFsPath, newCode);
  console.log('Mock FS updated with custom files.');
}

async function restoreMockFS() {
  await fs.copyFile(backupMockFsPath, originalMockFsPath);
  await fs.unlink(backupMockFsPath);
  console.log('Mock FS restored.');
}

(async () => {
  try {
    await prepareMockFS();
    
    // Give Vite a moment to HMR or just let page.goto pick it up
    await new Promise(r => setTimeout(r, 2000));

    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();
    
    console.log('Navigating to landing page...');
    await page.goto('http://127.0.0.1:5175/?fs=mock');
    await page.waitForSelector('.landing-panel');

    console.log('Opening workspace...');
    await page.click('button.primary-button');
    console.log('Waiting for filesystem tree...');
    // wait for any file to appear
    await page.waitForSelector('.sidebar-item', { timeout: 10000 });
    
    // Process MD files
    for (let i = 0; i < mdFiles.length; i++) {
      const name = path.basename(mdFiles[i]);
      console.log(`Opening ${name}...`);
      await page.click(`text=${name}`);
      await page.waitForTimeout(3000); // Wait for BlockNote
      await capture(page, `stock_check_md_${i+1}_rich.png`);

      // check if we can switch to source mode
      const sourceBtn = page.locator('button:has-text("Open source")');
      if (await sourceBtn.isVisible()) {
        console.log(`Switching to source mode for ${name}...`);
        await sourceBtn.click();
        await page.waitForTimeout(2000);
        await capture(page, `stock_check_md_${i+1}_source.png`);
      } else {
        console.log(`No "Open source" button found for ${name}`);
      }
    }

    // Process TSX files
    for (let i = 0; i < tsxFiles.length; i++) {
      const name = path.basename(tsxFiles[i]);
      console.log(`Opening ${name}...`);
      await page.click(`text=${name}`);
      await page.waitForTimeout(2000);
      await capture(page, `stock_check_tsx_${i+1}.png`);
    }

    console.log('All screenshots captured successfully!');
    await browser.close();
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await restoreMockFS().catch(e => console.error('Failed to restore mock fs', e));
    process.exit(0);
  }
})();
