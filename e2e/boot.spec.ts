import { test, _electron as electron, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test('app boots and displays main interface', async () => {
  // Logic to find executable based on OS
  let executablePath = '';
  const platform = os.platform();
  const arch = os.arch();
  // ES Modules (which Playwright uses by default in .mjs or ts when configured) might not have __dirname
  // But Playwright test files in ts usually handle it?
  // Playwright runs in Node. If package.json has type: module, __dirname is not available.
  const releaseDir = path.resolve(process.cwd(), 'release');

  console.log(`Platform: ${platform}, Arch: ${arch}`);
  console.log(`Release dir: ${releaseDir}`);

  // Debug: list release dir
  if (fs.existsSync(releaseDir)) {
      console.log(`Contents of ${releaseDir}:`, fs.readdirSync(releaseDir));
  } else {
      console.log(`${releaseDir} does not exist!`);
  }

  if (platform === 'darwin') {
    // macOS
    // Look for .app bundle.
    // electron-builder usually outputs to 'mac' (x64) or 'mac-arm64' (arm64).
    // Sometimes 'mac' contains universal or the specific arch if only one was built.

    const possibleDirs = ['mac', 'mac-arm64', 'mac-universal'];
    let appPath = '';

    for (const dir of possibleDirs) {
      const fullDir = path.join(releaseDir, dir);
      if (fs.existsSync(fullDir)) {
        console.log(`Found dir: ${fullDir}`);
        console.log(`Contents:`, fs.readdirSync(fullDir));
        // Look for .app inside
        const files = fs.readdirSync(fullDir);
        const appFile = files.find(file => file.endsWith('.app'));
        if (appFile) {
          appPath = path.join(fullDir, appFile);
          break;
        }
      } else {
          console.log(`Dir not found: ${fullDir}`);
      }
    }

    if (!appPath) {
      throw new Error(`Could not find .app in ${releaseDir}`);
    }

    // Playwright needs the executable inside the bundle
    executablePath = path.join(appPath, 'Contents', 'MacOS', 'Pedro Pathing Visualizer');

  } else if (platform === 'win32') {
    // Windows
    // Look for unpacked folder
    const possibleDirs = ['win-unpacked'];
    let exePath = '';

    for (const dir of possibleDirs) {
        const fullDir = path.join(releaseDir, dir);
        if (fs.existsSync(fullDir)) {
            exePath = path.join(fullDir, 'Pedro Pathing Visualizer.exe');
            if (fs.existsSync(exePath)) {
                break;
            }
        }
    }

    if (!exePath) {
         throw new Error(`Could not find executable in ${releaseDir}/win-unpacked`);
    }
    executablePath = exePath;

  } else if (platform === 'linux') {
    // Linux
    // Look for unpacked directory
    // We expect electron-builder to be run with --dir
    // Default dir name is usually 'linux-unpacked'
    const possibleDirs = ['linux-unpacked'];
    let binaryPath = '';

    for (const dir of possibleDirs) {
        const fullDir = path.join(releaseDir, dir);
        if (fs.existsSync(fullDir)) {
            // The binary name matches the productName but lowercased/dashed usually, or just productName?
            // "productName": "Pedro Pathing Visualizer"
            // "name": "pedro-pathing-visualizer"
            // electron-builder usually uses "pedro-pathing-visualizer" (from name) or "Pedro Pathing Visualizer"?
            // It uses the `executableName` property if set, else `name`.
            // Let's check for likely candidates.
            const candidates = ['pedro-pathing-visualizer', 'Pedro Pathing Visualizer'];
            for (const cand of candidates) {
                const p = path.join(fullDir, cand);
                if (fs.existsSync(p)) {
                    binaryPath = p;
                    break;
                }
            }
        }
        if (binaryPath) break;
    }

    if (!binaryPath) {
        throw new Error(`Could not find executable in ${releaseDir}/linux-unpacked`);
    }
    executablePath = binaryPath;
  } else {
      throw new Error(`Unsupported platform: ${platform}`);
  }

  console.log(`Executable path: ${executablePath}`);

  // Launch the app
  const app = await electron.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-gpu'] // Sometimes needed for linux environments like Docker
  });

  // Verify
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  // Check for some element or title
  const title = await window.title();
  console.log(`App title: ${title}`);

  // Take screenshot immediately to see what's wrong
  const screenshotPath = path.join(process.cwd(), 'test-results', `boot-${platform}-${arch}.png`);
  // Ensure test-results exists
  if (!fs.existsSync(path.dirname(screenshotPath))) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  }
  await window.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Basic assertion
  expect(title).toContain('Pedro Pathing Visualizer');
  console.log(`Screenshot saved to ${screenshotPath}`);

  await app.close();
});
