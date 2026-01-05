import { test, expect } from '@playwright/test';

test('Verify Upload Path button moved to File Manager', async ({ page }) => {
  // Mock window.electronAPI to prevent errors
  await page.addInitScript(() => {
    window.electronAPI = {
        getDirectory: async () => '/mock/dir',
        setDirectory: async () => '/mock/new/dir',
        listFiles: async () => [],
        readFile: async () => '{}',
        writeFile: async () => true,
        deleteFile: async () => true,
        fileExists: async () => false,
        getSavedDirectory: async () => '/mock/dir',
        createDirectory: async () => true,
        getDirectoryStats: async () => ({}),
        renameFile: async () => ({ success: true, newPath: '/mock/dir/new.pp' }),
        rendererReady: async () => {},
        onOpenFilePath: () => {},
        onMenuAction: () => {},
    };
  });

  await page.goto('http://localhost:4173');

  // Wait for loading screen to disappear
  // In preview/build, the loading screen might persist if onMount doesn't fire cleanly or errors happen.
  // We can force hide it or wait.
  await page.evaluate(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';
  });

  // Verify "Open Project" is gone from Navbar
  const openProjectBtn = page.getByRole('button', { name: 'Open Project' });
  // Navbar uses label acting as button for file input
  const navbarUpload = page.locator('label[title="Open Project"]');
  await expect(navbarUpload).not.toBeVisible();

  // Open File Manager
  await page.getByRole('button', { name: 'Open File Manager' }).click();

  // Verify Import Button exists in File Manager Toolbar
  // It has title "Import File"
  const importBtn = page.getByRole('button', { name: 'Import File' }).or(page.locator('label[title="Import File"]'));
  await expect(importBtn).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: '.jules/verification/file-manager-import.png' });
});
