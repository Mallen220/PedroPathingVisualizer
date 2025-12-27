import { DEFAULT_SETTINGS } from "../config/defaults";
import type { Settings } from "../types";

// Versioning for settings schema
const SETTINGS_VERSION = "1.0.0";

interface StoredSettings {
  version: string;
  settings: Settings;
  lastUpdated: string;
}

import { getFileSystem } from "./fileSystemAdapter";

// Get the settings file path
async function getSettingsFilePath(): Promise<string> {
  const fs = getFileSystem();
  try {
    const appDataPath = await fs.getAppDataPath();
    return `${appDataPath}/pedro-settings.json`;
  } catch (error) {
    console.error("Error getting app data path:", error);
    return "";
  }
}

function migrateSettings(stored: Partial<StoredSettings>): Settings {
  const defaults = { ...DEFAULT_SETTINGS };

  if (!stored.settings) {
    return defaults;
  }

  // Always merge with defaults to ensure new settings are included
  // and removed settings are not persisted
  const migrated: Settings = { ...defaults };

  // Copy only the properties that exist in both objects
  Object.keys(stored.settings).forEach((key) => {
    if (key in migrated) {
      // Special-case merging for keyBindings so newly added defaults appear
      if (key === "keyBindings" && Array.isArray(stored.settings.keyBindings)) {
        const defaultBindings = defaults.keyBindings || [];
        const storedBindings = stored.settings.keyBindings as any[];

        // Map stored bindings by id for quick lookup
        const storedMap = new Map<string, any>();
        storedBindings.forEach((b) => storedMap.set(b.id, b));

        // Start with defaults, override with stored values when ids match
        const merged = defaultBindings.map((d) => {
          const s = storedMap.get(d.id);
          return s ? { ...d, ...s } : d;
        });

        // Append any stored-only bindings (user added) that aren't in defaults
        storedBindings.forEach((b) => {
          if (!defaultBindings.find((d) => d.id === b.id)) merged.push(b);
        });

        // @ts-ignore
        migrated.keyBindings = merged;
      } else {
        // @ts-ignore - We know the key exists in Settings
        migrated[key] = stored.settings[key];
      }
    }
  });

  return migrated;
}

// Load settings from file
export async function loadSettings(): Promise<Settings> {
  const fs = getFileSystem();

  // Try file system (which now works via network too)
  try {
    const filePath = await getSettingsFilePath();

    if (!filePath || !(await fs.fileExists(filePath))) {
      // Fallback to localStorage if file not found (legacy browser support or first run)
      // But now "browser mode" talks to server.
      // However, if we want to keep independent browser settings (if server is not reachable?),
      // we might keep localStorage fallback.
      // But fileSystemAdapter handles network.
      console.log("Settings file does not exist, checking localStorage/defaults");
    } else {
      const fileContent = await fs.readFile(filePath);
      const stored: StoredSettings = JSON.parse(fileContent);

      if (stored.version !== SETTINGS_VERSION) {
        console.log(
          `Migrating settings from version ${stored.version} to ${SETTINGS_VERSION}`,
        );
      }
      return migrateSettings(stored);
    }
  } catch (error) {
    console.error("Error loading settings from FS:", error);
  }

  // Fallback to defaults
  return { ...DEFAULT_SETTINGS };
}

// Save settings to file
export async function saveSettings(settings: Settings): Promise<boolean> {
  const fs = getFileSystem();

  try {
    const filePath = await getSettingsFilePath();

    if (!filePath) {
      console.error("Cannot get settings file path");
      return false;
    }

    const stored: StoredSettings = {
      version: SETTINGS_VERSION,
      settings: { ...settings },
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeFile(filePath, JSON.stringify(stored, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    // Fallback to localStorage?
    try {
      const stored: StoredSettings = {
        version: SETTINGS_VERSION,
        settings: { ...settings },
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem("pedro-settings", JSON.stringify(stored));
    } catch {}
    return false;
  }
}

// Reset settings to defaults
export async function resetSettings(): Promise<Settings> {
  const defaults = { ...DEFAULT_SETTINGS };
  await saveSettings(defaults);
  return defaults;
}

// Check if settings file exists
export async function settingsFileExists(): Promise<boolean> {
  const fs = getFileSystem();
  try {
    const filePath = await getSettingsFilePath();
    return filePath ? await fs.fileExists(filePath) : false;
  } catch (error) {
    console.error("Error checking settings file:", error);
    return false;
  }
}
