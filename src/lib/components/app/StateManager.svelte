
<script lang="ts">
  import { onMount, tick } from "svelte";
  import { debounce } from "lodash";
  import { loadSettings, saveSettings } from "../../../utils/settingsPersistence";
  import { currentFilePath, isUnsaved } from "../../../stores";
  import { createHistory, type AppState } from "../../../utils/history";

  // Props
  export let startPoint: any;
  export let lines: any;
  export let shapes: any;
  export let sequence: any;
  export let settings: any;

  // Since we want to update the parent's settings object, we use bind

  // Initialize Defaults
  export let isLoaded = false;
  let lastSavedState: string = "";

  const history = createHistory();
  export const canUndoStore = history.canUndoStore;
  export const canRedoStore = history.canRedoStore;

  function getCurrentState(): string {
    return JSON.stringify({
      startPoint,
      lines,
      shapes,
      sequence,
      settings,
    });
  }

  function getAppState(): AppState {
      return {
          startPoint,
          lines,
          shapes,
          sequence,
          settings,
      };
  }

  export function recordChange() {
      // We assume parent handles nulling previewOptimizedLines if needed, or we emit event
      history.record(getAppState());
      if (isLoaded) {
          isUnsaved.set(true);
      }
  }

  export function undo() {
    const prev = history.undo();
    if (prev) {
      // We need to return the new state to the parent
      return prev;
    }
    return null;
  }

  export function redo() {
    const next = history.redo();
    if (next) {
      return next;
    }
    return null;
  }

  export function checkSavedState() {
      const currentState = getCurrentState();
      if (currentState === lastSavedState) {
          isUnsaved.set(false);
      } else {
          isUnsaved.set(true);
      }
  }

  export function updateLastSavedState() {
      lastSavedState = getCurrentState();
  }

  // Settings persistence
  onMount(async () => {
    const savedSettings = await loadSettings();
    // Merge? or Replace?
    // Parent should handle updating settings
    // Here we just return it or invoke callback
    // But since we are extracting logic...
    // Let's assume parent calls this.
  });

  const debouncedSaveSettings = debounce(async (settingsToSave: any) => {
    await saveSettings(settingsToSave);
  }, 1000);

  $: {
    if (settings) {
      debouncedSaveSettings(settings);
    }
  }

  onMount(() => {
    setTimeout(() => {
      isLoaded = true;
      recordChange();
    }, 500);
  });
</script>
