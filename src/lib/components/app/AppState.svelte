
<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { Point, Line, SequenceItem, Shape, Settings, BasePoint } from "../../../types";
  import { normalizeLines } from "../../../utils/path";
  import {
    getDefaultStartPoint,
    getDefaultLines,
    getDefaultShapes,
    DEFAULT_SETTINGS,
    DEFAULT_ROBOT_WIDTH,
    DEFAULT_ROBOT_HEIGHT
  } from "../../../config/defaults";
  import { loadSettings } from "../../../utils/settingsPersistence";
  import { createHistory, type AppState } from "../../../utils/history";

  // Stores
  import {
    isUnsaved,
    currentFilePath,
  } from "../../../stores";

  // State
  export let startPoint: Point = getDefaultStartPoint();
  export let lines: Line[] = normalizeLines(getDefaultLines());
  export let sequence: SequenceItem[] = lines.map((ln) => ({
    kind: "path",
    lineId: ln.id!,
  }));
  export let shapes: Shape[] = getDefaultShapes();
  export let settings: Settings = { ...DEFAULT_SETTINGS };
  export let robotWidth = DEFAULT_ROBOT_WIDTH;
  export let robotHeight = DEFAULT_ROBOT_HEIGHT;

  // Bindable output props for Undo/Redo availability
  export let canUndo = false;
  export let canRedo = false;

  export let isLoaded = false;
  let lastSavedState: string = "";

  // History
  const history = createHistory();
  const { canUndoStore, canRedoStore } = history;

  // Sync history stores to props
  $: canUndo = $canUndoStore;
  $: canRedo = $canRedoStore;

  // Helpers
  function getAppState(): AppState {
    return {
      startPoint,
      lines,
      shapes,
      sequence,
      settings,
    };
  }

  function getCurrentState(): string {
    return JSON.stringify(getAppState());
  }

  export function recordChange() {
    history.record(getAppState());
    if (isLoaded) {
      isUnsaved.set(true);
    }
  }

  export function undo() {
    const prev = history.undo();
    if (prev) {
      startPoint = prev.startPoint;
      lines = prev.lines;
      shapes = prev.shapes;
      sequence = prev.sequence;
      settings = prev.settings;
      checkSavedState();
      return true;
    }
    return false;
  }

  export function redo() {
    const next = history.redo();
    if (next) {
      startPoint = next.startPoint;
      lines = next.lines;
      shapes = next.shapes;
      sequence = next.sequence;
      settings = next.settings;
      checkSavedState();
      return true;
    }
    return false;
  }

  function checkSavedState() {
      const currentState = getCurrentState();
      if (currentState === lastSavedState) {
        isUnsaved.set(false);
      } else {
        isUnsaved.set(true);
      }
  }

  export function setLastSavedState() {
      lastSavedState = getCurrentState();
  }

  // Initialization
  onMount(async () => {
      const savedSettings = await loadSettings();
      // Ensure settings is not null or empty
      if (savedSettings) {
          settings = { ...DEFAULT_SETTINGS, ...savedSettings };
      } else {
          settings = { ...DEFAULT_SETTINGS };
      }

      // Defaults from settings
      robotWidth = settings?.rWidth || DEFAULT_ROBOT_WIDTH;
      robotHeight = settings?.rHeight || DEFAULT_ROBOT_HEIGHT;

      setTimeout(() => {
          isLoaded = true;
          recordChange();
      }, 500);
  });

  // Reactivity for Robot Dimensions if settings change
  $: {
      if (settings) {
         robotWidth = settings.rWidth || DEFAULT_ROBOT_WIDTH;
         robotHeight = settings.rHeight || DEFAULT_ROBOT_HEIGHT;
      }
  }

  // Ensure lines and shapes trigger reactivity
  $: {
    lines = lines;
    shapes = shapes;
  }

</script>
