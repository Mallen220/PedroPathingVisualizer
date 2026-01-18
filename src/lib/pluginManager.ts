// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { get } from "svelte/store";
import {
  pluginsStore,
  customExportersStore,
  themesStore,
  type PluginInfo,
  type CustomExporter,
  type CustomTheme,
} from "./pluginsStore";
import * as projectStore from "./projectStore";
import * as appStores from "../stores";
import {
  componentRegistry,
  tabRegistry,
  navbarActionRegistry,
  hookRegistry,
  fieldOverlayRegistry,
  contextMenuRegistry,
} from "./registries";
import AnnotationOverlay from "./components/AnnotationOverlay.svelte";

const {
  startPointStore,
  linesStore,
  shapesStore,
  sequenceStore,
  annotationsStore,
} = projectStore;

export class PluginManager {
  private static allExporters: CustomExporter[] = [];
  private static allThemes: CustomTheme[] = [];

  static async init() {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.listPlugins) return;

    // Reset internal lists
    this.allExporters = [];
    this.allThemes = [];

    try {
      const files = await electronAPI.listPlugins();
      const plugins: PluginInfo[] = [];

      for (const file of files) {
        try {
          const enabled = this.getEnabledState(file);

          if (enabled) {
            const code = await electronAPI.readPlugin(file);
            this.executePlugin(file, code);
          }

          plugins.push({ name: file, loaded: enabled, enabled });
        } catch (error) {
          console.error(`Failed to load plugin ${file}:`, error);
          plugins.push({
            name: file,
            loaded: false,
            error: String(error),
            enabled: false,
          });
        }
      }
      pluginsStore.set(plugins);
      this.refreshActiveResources();
    } catch (err) {
      console.error("Failed to init plugins:", err);
    }
  }

  private static getEnabledState(name: string): boolean {
    try {
      const key = `plugin_enabled_${name}`;
      const val = localStorage.getItem(key);
      // Default to false (disabled) if not explicitly enabled
      return val === null ? false : val === "true";
    } catch {
      return false;
    }
  }

  static async togglePlugin(name: string, enabled: boolean) {
    try {
      localStorage.setItem(`plugin_enabled_${name}`, String(enabled));
    } catch {}

    // Reload all plugins to reflect the change (especially disabling)
    await this.reloadPlugins();
  }

  private static refreshActiveResources() {
    const plugins = get(pluginsStore);
    const enabledPlugins = new Set(
      plugins.filter((p) => p.enabled).map((p) => p.name),
    );

    const activeExporters = this.allExporters.filter(
      (e) => e.pluginName && enabledPlugins.has(e.pluginName),
    );
    customExportersStore.set(activeExporters);

    const activeThemes = this.allThemes.filter(
      (t) => t.pluginName && enabledPlugins.has(t.pluginName),
    );
    themesStore.set(activeThemes);
  }

  static executePlugin(filename: string, code: string) {
    // Restricted API exposed to plugins
    const pedroAPI = {
      registerExporter: (name: string, handler: (data: any) => string) => {
        // Add to internal list
        this.allExporters = this.allExporters.filter((e) => e.name !== name); // unique by name
        this.allExporters.push({ name, handler, pluginName: filename });
      },
      registerTheme: (name: string, css: string) => {
        this.allThemes = this.allThemes.filter((t) => t.name !== name);
        this.allThemes.push({ name, css, pluginName: filename });
      },
      getData: () => {
        // Expose current state read-only
        return {
          startPoint: get(startPointStore),
          lines: get(linesStore),
          shapes: get(shapesStore),
          sequence: get(sequenceStore),
        };
      },
      // Expanded API
      registries: {
        components: componentRegistry,
        tabs: tabRegistry,
        navbarActions: navbarActionRegistry,
        hooks: hookRegistry,
        fieldOverlays: fieldOverlayRegistry,
        contextMenu: contextMenuRegistry,
      },
      stores: {
        project: projectStore,
        app: appStores,
        get: get,
      },
      // Expose internal components for plugins to use
      components: {
        AnnotationOverlay,
      },
    };

    // Execute safely-ish
    try {
      // We pass 'pedro' as the argument name
      const fn = new Function("pedro", code);
      fn(pedroAPI);
    } catch (e) {
      throw new Error(`Execution failed: ${e}`);
    }
  }

  static async openPluginsFolder() {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.openPluginsFolder) {
      await electronAPI.openPluginsFolder();
    }
  }

  static async reloadPlugins() {
    // Reset stores and re-init
    customExportersStore.set([]);
    themesStore.set([]);
    await this.init();
  }
}
