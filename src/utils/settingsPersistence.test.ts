import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadSettings,
  saveSettings,
  resetSettings,
  settingsFileExists,
} from "./settingsPersistence";
import { DEFAULT_SETTINGS } from "../config/defaults";

// Mock the fileSystemAdapter module
const mockFileSystem = {
  getAppDataPath: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  fileExists: vi.fn(),
};

vi.mock("./fileSystemAdapter", () => ({
  getFileSystem: () => mockFileSystem,
}));

describe("Settings Persistence", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Suppress console logs during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("loadSettings returns defaults if file does not exist", async () => {
    mockFileSystem.getAppDataPath.mockResolvedValue("/app/data");
    mockFileSystem.fileExists.mockResolvedValue(false);

    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("loadSettings loads and parses settings correctly", async () => {
    mockFileSystem.getAppDataPath.mockResolvedValue("/app/data");
    mockFileSystem.fileExists.mockResolvedValue(true);

    const storedSettings = {
      version: "1.0.0",
      settings: { ...DEFAULT_SETTINGS, xVelocity: 999 }, // Use a valid property
      lastUpdated: "2023-01-01",
    };

    mockFileSystem.readFile.mockResolvedValue(
      JSON.stringify(storedSettings),
    );

    const settings = await loadSettings();

    expect(mockFileSystem.readFile).toHaveBeenCalled();
    expect(settings.xVelocity).toBe(999);
  });

  it("saveSettings writes to file", async () => {
    mockFileSystem.getAppDataPath.mockResolvedValue("/app/data");

    const result = await saveSettings(DEFAULT_SETTINGS);

    expect(result).toBe(true);
    expect(mockFileSystem.writeFile).toHaveBeenCalled();
    const callArgs = mockFileSystem.writeFile.mock.calls[0];
    expect(callArgs[0]).toContain("pedro-settings.json");
    expect(JSON.parse(callArgs[1]).settings).toEqual(DEFAULT_SETTINGS);
  });

  it("resetSettings saves default settings", async () => {
    mockFileSystem.getAppDataPath.mockResolvedValue("/app/data");

    const result = await resetSettings();

    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(mockFileSystem.writeFile).toHaveBeenCalled();
    const callArgs = mockFileSystem.writeFile.mock.calls[0];
    expect(JSON.parse(callArgs[1]).settings).toEqual(DEFAULT_SETTINGS);
  });
});
