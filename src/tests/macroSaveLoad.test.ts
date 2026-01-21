
import { describe, it, expect, vi, beforeEach } from "vitest";
import { get } from "svelte/store";
import * as fileHandlers from "../utils/fileHandlers";
import * as projectStore from "../lib/projectStore";
import {
  currentFilePath,
  projectMetadataStore,
  isUnsaved,
  notification,
} from "../stores";
import {
  startPointStore,
  linesStore,
  sequenceStore,
  shapesStore,
  settingsStore,
  macrosStore,
} from "../lib/projectStore";
import { DEFAULT_SETTINGS } from "../config/defaults";

// Mock Svelte stores
vi.mock("../stores", async () => {
  const { writable } = await import("svelte/store");
  return {
    currentFilePath: writable(""),
    isUnsaved: writable(false),
    notification: writable(null),
    projectMetadataStore: writable({}),
    currentDirectoryStore: writable(null),
  };
});

describe("Macro Save/Load Relative Paths", () => {
  const mockElectronAPI = {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    fileExists: vi.fn(),
    // saveFile intentionally missing to force writeFile path
    showSaveDialog: vi.fn(),
    getSavedDirectory: vi.fn(),
    copyFile: vi.fn(),
    relativePath: vi.fn(),
    resolvePath: vi.fn(),
  };

  beforeEach(() => {
    (window as any).electronAPI = mockElectronAPI;
    vi.clearAllMocks();

    // Reset stores
    currentFilePath.set("");
    settingsStore.set({ ...DEFAULT_SETTINGS });
    linesStore.set([]);
    sequenceStore.set([]);
    macrosStore.set(new Map());
  });

  describe("Saving with Macros", () => {
    it("should convert macro paths to relative when saving", async () => {
      // Setup project with a macro
      const macroItem = {
        kind: "macro",
        id: "m1",
        filePath: "/abs/path/to/macro.pp",
        name: "Macro 1",
      };
      sequenceStore.set([macroItem as any]);
      linesStore.set([]);

      // Mock APIs
      const targetPath = "/abs/path/to/project.pp";
      mockElectronAPI.showSaveDialog.mockResolvedValue(targetPath);
      mockElectronAPI.writeFile.mockResolvedValue(true);

      // Mock relativePath to return a relative path
      mockElectronAPI.relativePath.mockImplementation((from, to) => {
        if (from === targetPath && to === "/abs/path/to/macro.pp") {
            return "../macro.pp";
        }
        return to;
      });

      // Act: Save As
      await fileHandlers.saveProject(undefined, undefined, undefined, undefined, undefined, true);

      // Verify writeFile was called
      expect(mockElectronAPI.writeFile).toHaveBeenCalled();

      // Check content passed to writeFile
      const writeCall = mockElectronAPI.writeFile.mock.calls[0];
      const savedPath = writeCall[0];
      const savedContent = JSON.parse(writeCall[1]);

      expect(savedPath).toBe(targetPath);
      expect(savedContent.sequence[0].filePath).toBe("../macro.pp");
    });
  });

  describe("Loading with Macros", () => {
    it("should resolve relative macro paths to absolute when loading", async () => {
      // Setup mock data in file
      const projectPath = "/abs/path/to/project.pp";
      const fileData = {
        startPoint: { x: 0, y: 0 },
        lines: [],
        sequence: [
          {
            kind: "macro",
            id: "m1",
            filePath: "../macro.pp", // Relative in file
            name: "Macro 1",
          },
        ],
      };

      // Mock resolvePath
      mockElectronAPI.resolvePath.mockImplementation((base, relative) => {
         if (base === projectPath && relative === "../macro.pp") {
             return "/abs/path/to/macro.pp";
         }
         return relative;
      });

      // Mock loading the macro file (so loadMacro succeeds)
      mockElectronAPI.readFile.mockResolvedValue(JSON.stringify({
          startPoint: {x:0,y:0},
          lines: [],
          sequence: []
      }));

      // Act
      await projectStore.loadProjectData(fileData, projectPath);

      // Verify sequenceStore has absolute path
      const seq = get(sequenceStore);
      expect(seq[0].kind).toBe("macro");
      expect((seq[0] as any).filePath).toBe("/abs/path/to/macro.pp");

      // Verify macro was loaded with absolute path
      expect(mockElectronAPI.readFile).toHaveBeenCalledWith("/abs/path/to/macro.pp");
    });

    it("should resolve nested macro paths to absolute", async () => {
        const rootMacroPath = "/abs/path/to/root.pp";
        const nestedMacroPathRelative = "./nested.pp";
        const nestedMacroPathAbsolute = "/abs/path/to/nested.pp";

        const rootMacroContent = {
            startPoint: {x:0, y:0},
            lines: [],
            sequence: [
                {
                    kind: "macro",
                    id: "nested1",
                    filePath: nestedMacroPathRelative
                }
            ]
        };

        const nestedMacroContent = {
            startPoint: {x:0, y:0},
            lines: [],
            sequence: []
        };

        // Mock reading files
        mockElectronAPI.readFile.mockImplementation((path) => {
            if (path === rootMacroPath) return Promise.resolve(JSON.stringify(rootMacroContent));
            if (path === nestedMacroPathAbsolute) return Promise.resolve(JSON.stringify(nestedMacroContent));
            return Promise.reject("File not found: " + path);
        });

        // Mock resolvePath
        mockElectronAPI.resolvePath.mockImplementation((base, relative) => {
            if (base === rootMacroPath && relative === nestedMacroPathRelative) {
                return nestedMacroPathAbsolute;
            }
            return relative;
        });

        // Act: load root macro
        await projectStore.loadMacro(rootMacroPath);

        // Verify macrosStore has root macro
        const macros = get(macrosStore);
        expect(macros.has(rootMacroPath)).toBe(true);

        // Verify nested macro path in root macro data in store is ABSOLUTE
        const rootData = macros.get(rootMacroPath);
        expect((rootData!.sequence[0] as any).filePath).toBe(nestedMacroPathAbsolute);

        // Verify nested macro was also loaded into store
        expect(macros.has(nestedMacroPathAbsolute)).toBe(true);
    });
  });
});
