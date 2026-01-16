// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PluginManager } from "../lib/pluginManager";
import {
  customExportersStore,
  pluginsStore,
  themesStore,
} from "../lib/pluginsStore";
import { get } from "svelte/store";

describe("PluginManager", () => {
  beforeEach(() => {
    // Reset stores
    customExportersStore.set([]);
    pluginsStore.set([]);
    themesStore.set([]);
    vi.clearAllMocks();
  });

  it("should load plugins from electronAPI (supports .js)", async () => {
    const mockListPlugins = vi.fn().mockResolvedValue(["test-plugin.js"]);
    const mockReadPlugin = vi.fn().mockResolvedValue(`
      pedro.registerExporter("Test CSV", (data) => {
        return "csv,data";
      });
    `);

    const mockGetDirSettings = vi
      .fn()
      .mockResolvedValue({ plugins: { "test-plugin.js": true } });

    (window as any).electronAPI = {
      listPlugins: mockListPlugins,
      readPlugin: mockReadPlugin,
      getDirectorySettings: mockGetDirSettings,
    };

    await PluginManager.init();

    expect(mockListPlugins).toHaveBeenCalled();
    expect(mockReadPlugin).toHaveBeenCalledWith("test-plugin.js");

    const plugins = get(pluginsStore);
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("test-plugin.js");
    expect(plugins[0].loaded).toBe(true);
    expect(plugins[0].enabled).toBe(true);

    const exporters = get(customExportersStore);
    expect(exporters).toHaveLength(1);
    expect(exporters[0].name).toBe("Test CSV");

    // Test the handler
    const result = exporters[0].handler({} as any);
    expect(result).toBe("csv,data");
  });

  it("should load plugins from electronAPI (supports .ts)", async () => {
    const mockListPlugins = vi.fn().mockResolvedValue(["test-plugin.ts"]);
    const mockReadPlugin = vi.fn().mockResolvedValue(`
      pedro.registerExporter("Test CSV TS", (data) => {
        return "csv,data,ts";
      });
    `);

    const mockGetDirSettings = vi
      .fn()
      .mockResolvedValue({ plugins: { "test-plugin.ts": true } });

    (window as any).electronAPI = {
      listPlugins: mockListPlugins,
      readPlugin: mockReadPlugin,
      getDirectorySettings: mockGetDirSettings,
    };

    await PluginManager.init();

    const plugins = get(pluginsStore);
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("test-plugin.ts");
    expect(plugins[0].loaded).toBe(true);
    expect(plugins[0].enabled).toBe(true);

    const exporters = get(customExportersStore);
    expect(exporters).toHaveLength(1);
    expect(exporters[0].name).toBe("Test CSV TS");

    const result = exporters[0].handler({} as any);
    expect(result).toBe("csv,data,ts");
  });

  it("should handle execution errors", async () => {
    const mockListPlugins = vi.fn().mockResolvedValue(["bad-plugin.js"]);
    const mockReadPlugin = vi.fn().mockResolvedValue(`
      throw new Error("Boom");
    `);

    const mockGetDirSettings = vi
      .fn()
      .mockResolvedValue({ plugins: { "bad-plugin.js": false } });

    (window as any).electronAPI = {
      listPlugins: mockListPlugins,
      readPlugin: mockReadPlugin,
      getDirectorySettings: mockGetDirSettings,
    };

    await PluginManager.init();

    const plugins = get(pluginsStore);
    expect(plugins).toHaveLength(1);
    expect(plugins[0].loaded).toBe(false);
    expect(plugins[0].error).toContain("Boom");
    expect(plugins[0].enabled).toBe(false);
  });

  it("plugins default to disabled when settings missing", async () => {
    const mockListPlugins = vi
      .fn()
      .mockResolvedValue(["no-settings-plugin.js"]);
    const mockReadPlugin = vi.fn().mockResolvedValue(`
      pedro.registerExporter("No Settings", (data) => {
        return "no-settings";
      });
    `);

    const mockGetDirSettings = vi.fn().mockResolvedValue({});

    (window as any).electronAPI = {
      listPlugins: mockListPlugins,
      readPlugin: mockReadPlugin,
      getDirectorySettings: mockGetDirSettings,
    };

    await PluginManager.init();

    const plugins = get(pluginsStore);
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("no-settings-plugin.js");
    expect(plugins[0].enabled).toBe(false);

    const exporters = get(customExportersStore);
    expect(exporters).toHaveLength(0);
  });

  it("should register themes", async () => {
    const mockListPlugins = vi
      .fn()
      .mockResolvedValue(["Example-pink-theme.js"]);
    const mockReadPlugin = vi.fn().mockResolvedValue(`
      pedro.registerTheme("Pink Plugin Theme", ".bg-blue { color: pink; }");
    `);

    (window as any).electronAPI = {
      listPlugins: mockListPlugins,
      readPlugin: mockReadPlugin,
    };

    await PluginManager.init();

    const themes = get(themesStore);
    expect(themes).toHaveLength(1);
    expect(themes[0].name).toBe("Pink Plugin Theme");
    expect(themes[0].css).toBe(".bg-blue { color: pink; }");
  });
});
