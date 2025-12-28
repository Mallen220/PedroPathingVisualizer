
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    showSettings,
    showShortcuts,
    exportDialogState,
    currentFilePath,
    isUnsaved
  } from "../../../stores";

  // Note: We need access to electronAPI
  const electronAPI = (window as any).electronAPI;

  // Props
  export let saveProject: () => void;
  export let saveFileAs: () => void;
  export let exportGif: () => void;
  export let undoAction: () => void;
  export let redoAction: () => void;
  export let openProjectNative: () => void;
  export const recordChange: () => void = () => {};
  export const startPoint: any = null;
  export const lines: any = null;
  export const sequence: any = null;
  export const shapes: any = null;

  export let canUndo: boolean = false;
  export let canRedo: boolean = false;

  // We need to pass the reset logic as a prop or callback because it modifies state that lives in App.svelte
  export let onNewProject: () => void;

  onMount(() => {
    if (electronAPI && electronAPI.onMenuAction) {
      electronAPI.onMenuAction((action: string) => {
        switch (action) {
          case "new-path":
            if (confirm("Create new project? Unsaved changes will be lost.")) {
                onNewProject();
            }
            break;
          case "open-file":
            openProjectNative();
            break;
          case "save-project":
            saveProject();
            break;
          case "save-as":
            saveFileAs();
            break;
          case "export-gif":
            exportGif();
            break;
          case "export-java":
            exportDialogState.set({ isOpen: true, format: "java" });
            break;
          case "export-points":
            exportDialogState.set({ isOpen: true, format: "points" });
            break;
          case "export-sequential":
            exportDialogState.set({ isOpen: true, format: "sequential" });
            break;
          case "open-settings":
            showSettings.set(true);
            break;
          case "open-shortcuts":
            showShortcuts.set(true);
            break;
          case "undo":
            if (canUndo) undoAction();
            break;
          case "redo":
            if (canRedo) redoAction();
            break;
        }
      });
    }
  });
</script>
