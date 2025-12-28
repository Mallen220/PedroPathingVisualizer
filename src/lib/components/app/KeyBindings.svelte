
<script lang="ts">
  import { onMount } from 'svelte';
  import hotkeys from "hotkeys-js";
  import {
    showGrid,
    snapToGrid,
    showProtractor,
    toggleCollapseAllTrigger,
    showShortcuts,
  } from "../../../stores";

  // Props
  export let settings: any;
  export let saveProject: () => void;
  export let saveFileAs: () => void;
  export let exportGif: () => void;
  export let addNewLine: () => void;
  export let addWait: () => void;
  export let addControlPoint: () => void;
  export let removeControlPoint: () => void;
  export let undoAction: () => void;
  export let redoAction: () => void;
  export let resetAnimation: () => void;
  export let stepForward: () => void;
  export let stepBackward: () => void;
  export let playing: boolean;
  export let play: () => void;
  export let pause: () => void;
  export let DEFAULT_KEY_BINDINGS: any;

  function getKey(action: string): string {
    const bindings = settings?.keyBindings || DEFAULT_KEY_BINDINGS;
    const binding = bindings.find((b: any) => b.action === action);
    return binding ? binding.key : "";
  }

  $: {
    if (settings && settings.keyBindings) {
      hotkeys.unbind();

      const bind = (action: string, handler: (e: KeyboardEvent) => void) => {
        const key = getKey(action);
        if (key) {
          hotkeys(key, (e) => {
            e.preventDefault();
            handler(e);
          });
        }
      };

      bind("saveProject", () => saveProject());
      bind("saveFileAs", () => saveFileAs());
      bind("exportGif", () => exportGif());
      bind("addNewLine", () => addNewLine());
      bind("addWait", () => addWait());
      bind("addControlPoint", () => {
        addControlPoint();
      });
      bind("removeControlPoint", () => {
        removeControlPoint();
      });
      bind("undo", () => undoAction());
      bind("redo", () => redoAction());

      bind("resetAnimation", () => resetAnimation());
      bind("stepForward", () => stepForward());
      bind("stepBackward", () => stepBackward());

      bind("toggleOnion", () => {
        settings.showOnionLayers = !settings.showOnionLayers;
        settings = { ...settings };
      });

      bind("toggleGrid", () => showGrid.update((v) => !v));
      bind("toggleSnap", () => snapToGrid.update((v) => !v));
      bind("toggleProtractor", () => showProtractor.update((v) => !v));
      bind("toggleCollapseAll", () =>
        toggleCollapseAllTrigger.update((v) => v + 1),
      );
      bind("showHelp", () => showShortcuts.update((v) => !v));

      const playKey = getKey("togglePlay");
      if (playKey) {
        hotkeys(playKey, (e) => {
          if (
            document.activeElement &&
            (document.activeElement.tagName === "INPUT" ||
              document.activeElement.tagName === "TEXTAREA" ||
              document.activeElement.tagName === "SELECT" ||
              document.activeElement.tagName === "BUTTON" ||
              document.activeElement.getAttribute("role") === "button")
          ) {
            return;
          }
          e.preventDefault();
          if (playing) pause();
          else play();
        });
      }
    }
  }
</script>
