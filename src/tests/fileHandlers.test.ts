// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { get } from "svelte/store";
import {
  saveProject,
  saveFileAs,
} from "../utils/fileHandlers";
import {
  currentFilePath,
  fileManagerOpen,
  fileManagerCreatingNew,
} from "../stores";
import * as fileUtils from "../utils/file";
import { startPointStore, linesStore } from "../lib/projectStore";

// Mock electron API on window
const mockElectronAPI = {
  writeFile: vi.fn(),
  showSaveDialog: vi.fn(),
};

// Mock downloadTrajectory
vi.mock("../utils/file", () => ({
  downloadTrajectory: vi.fn(),
  loadTrajectoryFromFile: vi.fn(),
}));

describe("fileHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).electronAPI = undefined;
    currentFilePath.set(null);
    fileManagerOpen.set(false);
    fileManagerCreatingNew.set(false);
  });

  describe("saveProject", () => {
    it("should save to existing path if available (Electron)", async () => {
      (window as any).electronAPI = mockElectronAPI;
      currentFilePath.set("/path/to/project.pp");
      mockElectronAPI.writeFile.mockResolvedValue(true);

      await saveProject();

      expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
        "/path/to/project.pp",
        expect.any(String)
      );
    });

    it("should open File Manager in creation mode if no path (Electron)", async () => {
      (window as any).electronAPI = mockElectronAPI;
      currentFilePath.set(null);

      await saveProject();

      expect(get(fileManagerOpen)).toBe(true);
      expect(get(fileManagerCreatingNew)).toBe(true);
      expect(mockElectronAPI.writeFile).not.toHaveBeenCalled();
    });

    it("should fall back to saveFileAs (browser) if no path", async () => {
      (window as any).electronAPI = undefined;
      currentFilePath.set(null);

      await saveProject();

      expect(fileUtils.downloadTrajectory).toHaveBeenCalled();
      expect(get(fileManagerOpen)).toBe(false);
    });
  });

  describe("saveFileAs", () => {
    it("should open File Manager in creation mode (Electron)", () => {
      (window as any).electronAPI = mockElectronAPI;

      saveFileAs();

      expect(get(fileManagerOpen)).toBe(true);
      expect(get(fileManagerCreatingNew)).toBe(true);
      expect(fileUtils.downloadTrajectory).not.toHaveBeenCalled();
    });

    it("should use downloadTrajectory in browser", () => {
      (window as any).electronAPI = undefined;

      saveFileAs();

      expect(fileUtils.downloadTrajectory).toHaveBeenCalled();
      expect(get(fileManagerOpen)).toBe(false);
    });
  });
});
