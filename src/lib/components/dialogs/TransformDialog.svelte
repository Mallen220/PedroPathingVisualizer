<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { cubicInOut } from "svelte/easing";
  import type { Point, Line, Shape } from "../../../types/index";
  import {
    translatePath,
    rotatePath,
    flipPath,
  } from "../../../utils/pathTransform";

  export let isOpen = false;
  export let startPoint: Point;
  export let lines: Line[];
  export let shapes: Shape[];
  export let onApply: (data: {
    startPoint: Point;
    lines: Line[];
    shapes: Shape[];
  }) => void;
  export let onClose: () => void;

  let activeTab: "translate" | "rotate" | "flip" = "translate";

  // State for Translate
  let translateX = 0;
  let translateY = 0;

  // State for Rotate
  let rotateAngle = 90;
  let rotateAnchorX = 72;
  let rotateAnchorY = 72;
  let rotateAnchorMode: "origin" | "center" | "custom" = "center";

  // State for Flip
  let flipAxis: "horizontal" | "vertical" = "horizontal";
  let flipAnchor = 72; // X for horizontal, Y for vertical
  let flipAnchorMode: "origin" | "center" | "custom" = "center";

  // Common
  let includeObstacles = false;

  $: if (rotateAnchorMode === "origin") {
    rotateAnchorX = 0;
    rotateAnchorY = 0;
  } else if (rotateAnchorMode === "center") {
    rotateAnchorX = 72;
    rotateAnchorY = 72;
  }

  $: if (flipAnchorMode === "origin") {
    flipAnchor = 0;
  } else if (flipAnchorMode === "center") {
    flipAnchor = 72;
  }

  function setActiveTab(tab: string) {
    activeTab = tab as "translate" | "rotate" | "flip";
  }

  function setRotateMode(mode: string) {
    rotateAnchorMode = mode as "center" | "origin" | "custom";
  }

  function setFlipMode(mode: string) {
    flipAnchorMode = mode as "center" | "origin" | "custom";
  }

  function handleApply() {
    const data = {
      startPoint,
      lines,
      shapes: includeObstacles ? shapes : [],
    };

    let result;

    if (activeTab === "translate") {
      result = translatePath(data, translateX, translateY);
    } else if (activeTab === "rotate") {
      result = rotatePath(data, rotateAngle, {
        x: rotateAnchorX,
        y: rotateAnchorY,
      });
    } else if (activeTab === "flip") {
      result = flipPath(data, flipAxis, flipAnchor);
    }

    if (result) {
      // Merge back shapes if included, otherwise keep original shapes
      const newShapes = includeObstacles ? result.shapes : shapes;
      onApply({
        startPoint: result.startPoint,
        lines: result.lines,
        shapes: newShapes,
      });
      onClose();
    }
  }
</script>

{#if isOpen}
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    on:click|self={onClose}
    role="dialog"
    aria-modal="true"
  >
    <div
      transition:fly={{ duration: 200, y: 20, easing: cubicInOut }}
      class="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md border border-neutral-200 dark:border-neutral-800 overflow-hidden"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
      >
        <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
          Transform Path
        </h2>
        <button
          on:click={onClose}
          class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-neutral-200 dark:border-neutral-800">
        {#each ["translate", "rotate", "flip"] as tab}
          <button
            class="flex-1 py-3 text-sm font-medium transition-colors border-b-2
              {activeTab === tab
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'}"
            on:click={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        {/each}
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        {#if activeTab === "translate"}
          <div class="space-y-4">
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Shift the entire path by an X/Y offset.
            </p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >Delta X (in)</label
                >
                <input
                  type="number"
                  bind:value={translateX}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >Delta Y (in)</label
                >
                <input
                  type="number"
                  bind:value={translateY}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        {:else if activeTab === "rotate"}
          <div class="space-y-4">
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Rotate the path around a pivot point.
            </p>
            <div>
              <label
                class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >Angle (degrees)</label
              >
              <input
                type="number"
                bind:value={rotateAngle}
                class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label
                class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >Pivot Point</label
              >
              <div class="flex gap-2 mb-2">
                {#each ["center", "origin", "custom"] as mode}
                  <button
                    class="px-3 py-1 text-xs rounded border transition-colors
                      {rotateAnchorMode === mode
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}"
                    on:click={() => setRotateMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                {/each}
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label
                    class="block text-xs text-neutral-500 dark:text-neutral-500"
                    >Pivot X</label
                  >
                  <input
                    type="number"
                    bind:value={rotateAnchorX}
                    disabled={rotateAnchorMode !== "custom"}
                    class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs text-neutral-500 dark:text-neutral-500"
                    >Pivot Y</label
                  >
                  <input
                    type="number"
                    bind:value={rotateAnchorY}
                    disabled={rotateAnchorMode !== "custom"}
                    class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === "flip"}
          <div class="space-y-4">
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Mirror the path across an axis.
            </p>
            <div>
              <label
                class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >Axis Direction</label
              >
              <div class="flex gap-2">
                <button
                  class="flex-1 py-2 text-sm border rounded transition-colors flex items-center justify-center gap-2
                    {flipAxis === 'horizontal'
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}"
                  on:click={() => (flipAxis = "horizontal")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m16 13 4 4-4 4" />
                    <path d="m8 13-4 4 4 4" />
                    <line x1="12" x2="12" y1="2" y2="22" />
                  </svg>
                  Horizontal (Left/Right)
                </button>
                <button
                  class="flex-1 py-2 text-sm border rounded transition-colors flex items-center justify-center gap-2
                    {flipAxis === 'vertical'
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}"
                  on:click={() => (flipAxis = "vertical")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m13 16 4 4 4-4" />
                    <path d="m13 8 4-4 4 4" />
                    <line x1="2" x2="22" y1="12" y2="12" />
                  </svg>
                  Vertical (Up/Down)
                </button>
              </div>
            </div>

            <div>
              <label
                class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >Axis Position (Anchor)</label
              >
              <div class="flex gap-2 mb-2">
                {#each ["center", "origin", "custom"] as mode}
                  <button
                    class="px-3 py-1 text-xs rounded border transition-colors
                      {flipAnchorMode === mode
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}"
                    on:click={() => setFlipMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                {/each}
              </div>
              <div>
                <label
                  class="block text-xs text-neutral-500 dark:text-neutral-500"
                >
                  {flipAxis === "horizontal" ? "X Coordinate" : "Y Coordinate"}
                </label>
                <input
                  type="number"
                  bind:value={flipAnchor}
                  disabled={flipAnchorMode !== "custom"}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        {/if}

        <div class="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <label class="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              bind:checked={includeObstacles}
              class="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500"
            />
            <span class="text-sm text-neutral-700 dark:text-neutral-300"
              >Include Obstacles</span
            >
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-end gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800"
      >
        <button
          on:click={onClose}
          class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={handleApply}
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Apply Transform
        </button>
      </div>
    </div>
  </div>
{/if}
