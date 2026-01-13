<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { slide } from "svelte/transition";
  import { annotationsStore } from "../projectStore";
  import type { Annotation } from "../../types";
  import { getRandomColor } from "../../utils/draw";
  import TrashIcon from "./icons/TrashIcon.svelte";
  import ColorPicker from "./ColorPicker.svelte";

  export let annotations: Annotation[];
  // If binding from store directly in parent, this is redundant if using store here.
  // But ControlTab passes props. So let's use props.

  let collapsed = false;

  function addAnnotation() {
    const newAnnotation: Annotation = {
      id: `annotation-${Math.random().toString(36).slice(2)}`,
      type: "text",
      x: 72,
      y: 72,
      content: "New Note",
      color: getRandomColor(),
      fontSize: 24,
      locked: false,
    };
    annotations = [...annotations, newAnnotation];
  }

  function deleteAnnotation(index: number) {
    const a = annotations[index];
    if (a.locked) return;
    annotations = annotations.filter((_, i) => i !== index);
  }

  function updateAnnotation(index: number, updates: Partial<Annotation>) {
    const a = annotations[index];
    if (a.locked && (updates.x !== undefined || updates.y !== undefined))
      return;
    annotations[index] = { ...a, ...updates };
  }
</script>

<div
  class="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800 shadow-sm"
>
  <button
    class="w-full flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    on:click={() => (collapsed = !collapsed)}
  >
    <div
      class="flex items-center gap-2 font-medium text-sm text-neutral-700 dark:text-neutral-200"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="w-4 h-4"
      >
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
          clip-rule="evenodd"
        />
      </svg>
      Strategy Board (Annotations)
    </div>
    <div class="flex items-center gap-2">
      <span
        class="text-xs text-neutral-400 bg-neutral-200 dark:bg-neutral-700 px-1.5 rounded-full"
      >
        {annotations.length}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
  </button>

  {#if !collapsed}
    <div class="p-3 space-y-3" transition:slide>
      <div class="flex justify-end">
        <button
          class="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm font-medium transition-colors"
          on:click={addAnnotation}
        >
          Add Text Note
        </button>
      </div>

      {#if annotations.length === 0}
        <div
          class="text-center py-6 text-neutral-400 text-xs italic border border-dashed border-neutral-200 dark:border-neutral-700 rounded-md"
        >
          No annotations added. <br /> Use notes to mark zones or strategy.
        </div>
      {:else}
        <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {#each annotations as annotation, i (annotation.id)}
            <div
              class="p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-900/30 text-sm space-y-2"
            >
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  class="flex-1 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  bind:value={annotation.content}
                  placeholder="Note text..."
                />
                <button
                  on:click={() => (annotation.locked = !annotation.locked)}
                  class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  title={annotation.locked ? "Unlock" : "Lock"}
                >
                  {annotation.locked ? "🔒" : "🔓"}
                </button>
                <button
                  on:click={() => deleteAnnotation(i)}
                  class="text-neutral-400 hover:text-red-500 disabled:opacity-30"
                  disabled={annotation.locked}
                  title="Delete"
                >
                  <TrashIcon className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div class="flex items-center gap-2">
                <ColorPicker bind:color={annotation.color} />
                <div class="flex items-center gap-1 text-xs text-neutral-500">
                  <span>Size:</span>
                  <input
                    type="number"
                    class="w-14 px-1 py-0.5 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800"
                    bind:value={annotation.fontSize}
                    min="8"
                    max="200"
                  />
                </div>
                <div
                  class="flex items-center gap-1 text-xs text-neutral-500 ml-auto"
                >
                  <span>X:</span>
                  <input
                    type="number"
                    class="w-12 px-1 py-0.5 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800"
                    bind:value={annotation.x}
                    disabled={annotation.locked}
                  />
                  <span>Y:</span>
                  <input
                    type="number"
                    class="w-12 px-1 py-0.5 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800"
                    bind:value={annotation.y}
                    disabled={annotation.locked}
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
