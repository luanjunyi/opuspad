import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function run() {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const manifestJsonPath = path.join(rootDir, 'manifest.json');
  const docsIndexPath = path.join(rootDir, 'docs', 'index.html');
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf-8'));
  
  const currentVersion = packageJson.version;
  
  // Get version from command line arguments
  const args = process.argv.slice(2);
  const newVersion = args[0];

  if (!newVersion) {
    console.log(`Current version: ${currentVersion}`);
    process.exit(0);
  }

  // Validate for Chrome Extension version rules (1-4 integers separated by dots)
  if (!/^\d+(\.\d+){1,3}$/.test(newVersion)) {
    console.error('Error: Version must be in format x.y or x.y.z (only numbers and dots allowed)');
    process.exit(1);
  }

  console.log(`Bumping version from ${currentVersion} to ${newVersion}...`);

  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
  
  // Update manifest.json
  manifestJson.version = newVersion;
  fs.writeFileSync(manifestJsonPath, JSON.stringify(manifestJson, null, 2) + '\n', 'utf-8');

  // Update docs/index.html
  if (fs.existsSync(docsIndexPath)) {
    let docsHtml = fs.readFileSync(docsIndexPath, 'utf-8');
    // Match <div class="badge">Version X.Y — Now Available</div>
    const badgeRegex = /<div class="badge">Version [\d.]+ — Now Available<\/div>/;
    if (badgeRegex.test(docsHtml)) {
      docsHtml = docsHtml.replace(badgeRegex, `<div class="badge">Version ${newVersion} — Now Available</div>`);
      fs.writeFileSync(docsIndexPath, docsHtml, 'utf-8');
      console.log(`Updated version in docs/index.html to ${newVersion}`);
    } else {
      console.warn('Warning: Could not find version badge in docs/index.html');
    }
  }

  const { name } = packageJson;
  const zipName = `${name}-v${newVersion}.zip`;
  const zipPath = path.join(rootDir, zipName);

  console.log(`Creating zip file: ${zipName}...`);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  try {
    execSync(`cd dist && zip -r "../${zipName}" .`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`\nSuccessfully created:`);
    console.log(` - ${zipPath}`);
  } catch (error) {
    console.error('Failed to create zip files:', error);
    process.exit(1);
  }
}

run();
