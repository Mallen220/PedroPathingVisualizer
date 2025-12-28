
<script lang="ts">
  import { onMount } from 'svelte';
  import { currentFilePath, isUnsaved } from '../../../stores';
  import { normalizeLines } from '../../../utils/path'; // Ensure this exists or move it
  import { getDefaultStartPoint, getDefaultLines, getDefaultShapes } from '../../../config/defaults';
  import { loadTrajectoryFromFile } from '../../../utils/file';
  import _ from 'lodash';

  // Props
  export let settings: any;
  export let startPoint: any;
  export let lines: any;
  export let sequence: any;
  export const shapes: any = null;
  export const recordChange: () => void = () => {};

  // Electron API
  const electronAPI = (window as any).electronAPI;

  function addToRecentFiles(path: string) {
    if (!settings.recentFiles) {
      settings.recentFiles = [];
    }
    const existingIndex = settings.recentFiles.indexOf(path);
    if (existingIndex !== -1) {
      settings.recentFiles.splice(existingIndex, 1);
    }
    settings.recentFiles.unshift(path);
    if (settings.recentFiles.length > 10) {
      settings.recentFiles = settings.recentFiles.slice(0, 10);
    }
    settings = { ...settings };
  }

  export async function loadRecentFile(path: string, loadDataCallback: (data: any) => void) {
    if (!electronAPI || !electronAPI.readFile) {
      alert("Cannot load files in this environment");
      return;
    }
    try {
      if (electronAPI.fileExists && !(await electronAPI.fileExists(path))) {
        if (confirm(`File not found: ${path}\nDo you want to remove it from recent files?`)) {
          settings.recentFiles = settings.recentFiles?.filter((p: string) => p !== path);
          settings = { ...settings };
        }
        return;
      }
      const content = await electronAPI.readFile(path);
      const data = JSON.parse(content);
      loadDataCallback(data);
      currentFilePath.set(path);
      addToRecentFiles(path);
    } catch (err) {
      console.error("Error loading recent file:", err);
      alert("Failed to load file: " + (err as Error).message);
    }
  }

  export async function saveProject() {
    // Need access to current variables from parent.
    // We can emit an event or assume they are bound.
    if ($currentFilePath && electronAPI) {
      try {
        const jsonString = JSON.stringify({
          startPoint,
          lines,
          sequence,
          shapes,
          settings,
        });
        await electronAPI.writeFile($currentFilePath, jsonString);
        isUnsaved.set(false);
        addToRecentFiles($currentFilePath);
        return true;
      } catch (e) {
        console.error("Failed to save", e);
        alert("Failed to save file.");
        return false;
      }
    } else {
       return false; // Indicating "save as" needed
    }
  }

  export async function loadFile(evt: Event, loadDataCallback: (data: any) => void) {
    const elem = evt.target as HTMLInputElement;
    const file = elem.files?.[0];

    if (!file) return;

    if (!file.name.endsWith(".pp")) {
      alert("Please select a .pp file");
      elem.value = "";
      return;
    }

    if (electronAPI && $currentFilePath) {
       await loadFileWithCopy(file, loadDataCallback);
    } else {
      loadTrajectoryFromFile(evt, (data) => {
        if ((file as any).path) {
          addToRecentFiles((file as any).path);
          currentFilePath.set((file as any).path);
        }
        loadDataCallback(data);
      });
    }
    elem.value = "";
  }

  async function loadFileWithCopy(file: File, loadDataCallback: (data: any) => void) {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          const currentDir = $currentFilePath
            ? $currentFilePath.substring(0, $currentFilePath.lastIndexOf("/"))
            : await electronAPI.getDirectory();
          const destPath = currentDir + "/" + file.name;
          const exists = await electronAPI.fileExists(destPath);
          if (exists) {
            const overwrite = confirm(`File "${file.name}" already exists in the current directory. Overwrite?`);
            if (!overwrite) {
              loadDataCallback(data);
              return;
            }
          }
          await electronAPI.writeFile(destPath, content);
          loadDataCallback(data);
          currentFilePath.set(destPath);
          addToRecentFiles(destPath);
        } catch (error: unknown) {
          console.error("Error processing file:", error);
          const msg = error instanceof Error ? error.message : "Unknown error";
          alert("Error loading file: " + msg);
        }
      };
      reader.onerror = () => {
        alert("Error reading file");
      };
      reader.readAsText(file);
    } catch (error: unknown) {
      console.error("Error in loadFileWithCopy:", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      alert("Error loading file: " + msg);
    }
  }
</script>
