import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://127.0.0.1:5175/?fs=mock');
  await page.waitForSelector('.landing-panel');
  await page.click('button.primary-button');
  await page.waitForSelector('.sidebar-item');
  
  await page.click(`text=DATA_CORRECTNESS_VERIFICATION.md`);
  await page.waitForTimeout(2000);
  
  const contentBefore = await page.content();
  const hasBlockNote = contentBefore.includes('bn-container');
  console.log('Has BlockNote before click?', hasBlockNote);
  
  await page.click('button:has-text("Open source")');
  await page.waitForTimeout(2000);
  
  const contentAfter = await page.content();
  const hasCodeMirror = contentAfter.includes('cm-editor');
  const hasBlockNoteAfter = contentAfter.includes('bn-container');
  console.log('Has CodeMirror after click?', hasCodeMirror);
  console.log('Has BlockNote after click?', hasBlockNoteAfter);
  
  await browser.close();
})();
