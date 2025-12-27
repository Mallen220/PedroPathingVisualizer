import type { DirectorySettings } from "../types";

// Default directory settings
const DEFAULT_DIRECTORY_SETTINGS: DirectorySettings = {
  autoPathsDirectory: "",
};

import { getFileSystem } from "./fileSystemAdapter";

// Save directory settings
export async function saveDirectorySettings(
  settings: DirectorySettings,
): Promise<void> {
  try {
    const fs = getFileSystem();
    await fs.saveDirectorySettings(settings);
  } catch (error) {
    console.error("Error saving directory settings:", error);
  }
}

// Load directory settings
export async function loadDirectorySettings(): Promise<DirectorySettings> {
  try {
    const fs = getFileSystem();
    const settings = await fs.getDirectorySettings();
    return { ...DEFAULT_DIRECTORY_SETTINGS, ...settings };
  } catch (error) {
    console.error("Error loading directory settings:", error);
  }

  return DEFAULT_DIRECTORY_SETTINGS;
}

// Get the saved AutoPaths directory
export async function getSavedAutoPathsDirectory(): Promise<string> {
  const settings = await loadDirectorySettings();
  return settings.autoPathsDirectory;
}

// Save the AutoPaths directory
export async function saveAutoPathsDirectory(directory: string): Promise<void> {
  const settings = await loadDirectorySettings();
  settings.autoPathsDirectory = directory;
  await saveDirectorySettings(settings);
}
