<script lang="ts">
  import type { Point, Line, Shape } from "../../types";
  import {
    translatePathData,
    rotatePathData,
    flipPathData,
  } from "../../utils/pathTransform";

  export let startPoint: Point;
  export let lines: Line[];
  export let shapes: Shape[];
  export let onApply: (
    newStartPoint: Point,
    newLines: Line[],
    newShapes: Shape[],
  ) => void;
  export let onClose: () => void;

  let activeTab: "translate" | "rotate" | "flip" = "translate";

  // Translate State
  let dx = 0;
  let dy = 0;

  // Rotate State
  let angle = 90;
  let cx = 72;
  let cy = 72;

  // Flip State
  let flipAxis: "x" | "y" = "x";
  let flipCenter = 72;

  function applyTranslate() {
    const result = translatePathData({ startPoint, lines, shapes }, dx, dy);
    onApply(result.startPoint, result.lines, result.shapes);
  }

  function applyRotate() {
    const result = rotatePathData({ startPoint, lines, shapes }, angle, cx, cy);
    onApply(result.startPoint, result.lines, result.shapes);
  }

  function applyFlip() {
    const result = flipPathData(
      { startPoint, lines, shapes },
      flipAxis,
      flipCenter,
    );
    onApply(result.startPoint, result.lines, result.shapes);
  }
</script>

<div class="w-full space-y-4">
  <div class="flex justify-between items-center">
    <h3 class="text-base font-semibold text-neutral-900 dark:text-white">
      Transform Path
    </h3>
    <button
      on:click={onClose}
      class="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      aria-label="Close transform panel"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>

  <!-- Tabs -->
  <div
    class="flex gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2"
  >
    <button
      class="px-3 py-1 text-sm font-medium rounded transition-colors {activeTab ===
      'translate'
        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}"
      on:click={() => (activeTab = "translate")}
    >
      Translate
    </button>
    <button
      class="px-3 py-1 text-sm font-medium rounded transition-colors {activeTab ===
      'rotate'
        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}"
      on:click={() => (activeTab = "rotate")}
    >
      Rotate
    </button>
    <button
      class="px-3 py-1 text-sm font-medium rounded transition-colors {activeTab ===
      'flip'
        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}"
      on:click={() => (activeTab = "flip")}
    >
      Flip
    </button>
  </div>

  <!-- Content -->
  {#if activeTab === "translate"}
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label
          for="dx-input"
          class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >Delta X (in)</label
        >
        <input
          id="dx-input"
          type="number"
          bind:value={dx}
          class="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
        />
      </div>
      <div>
        <label
          for="dy-input"
          class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >Delta Y (in)</label
        >
        <input
          id="dy-input"
          type="number"
          bind:value={dy}
          class="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
        />
      </div>
    </div>
    <div class="text-xs text-neutral-500 dark:text-neutral-400">
      Moves the entire path by the specified X and Y amounts.
    </div>
    <button
      on:click={applyTranslate}
      class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
      >Apply Translation</button
    >
  {/if}

  {#if activeTab === "rotate"}
    <div class="grid grid-cols-3 gap-4">
      <div>
        <label
          for="angle-input"
          class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >Angle (deg)</label
        >
        <input
          id="angle-input"
          type="number"
          bind:value={angle}
          class="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
        />
      </div>
      <div>
        <label
          for="cx-input"
          class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >Center X</label
        >
        <input
          id="cx-input"
          type="number"
          bind:value={cx}
          class="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
        />
      </div>
      <div>
        <label
          for="cy-input"
          class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >Center Y</label
        >
        <input
          id="cy-input"
          type="number"
          bind:value={cy}
          class="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
        />
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        on:click={() => (angle = 90)}
        class="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded transition-colors"
        >+90°</button
      >
      <button
        on:click={() => (angle = -90)}
        class="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded transition-colors"
        >-90°</button
      >
      <button
        on:click={() => (angle = 180)}
        class="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded transition-colors"
        >180°</button
      >
      <div class="flex-1"></div>
      <button
        on:click={() => {
          cx = 0;
          cy = 0;
        }}
        class="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded transition-colors"
        >Origin (0,0)</button
      >
      <button
        on:click={() => {
          cx = 72;
          cy = 72;
        }}
        class="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded transition-colors"
        >Center (72,72)</button
      >
    </div>
    <button
      on:click={applyRotate}
      class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
      >Apply Rotation</button
    >
  {/if}

  {#if activeTab === "flip"}
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label
          for="flip-axis"
          class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >Flip Axis</label
        >
        <select
          id="flip-axis"
          bind:value={flipAxis}
          class="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
        >
          <option value="x">Flip Horizontally (across X)</option>
          <option value="y">Flip Vertically (across Y)</option>
        </select>
      </div>
      <div>
        <label
          for="flip-center"
          class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >Center Line (in)</label
        >
        <input
          id="flip-center"
          type="number"
          bind:value={flipCenter}
          class="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
        />
      </div>
    </div>
    <div class="text-xs text-neutral-500 dark:text-neutral-400">
      {#if flipAxis === "x"}
        Flips left/right across the vertical line X={flipCenter}.
      {:else}
        Flips up/down across the horizontal line Y={flipCenter}.
      {/if}
    </div>
    <button
      on:click={applyFlip}
      class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
      >Apply Flip</button
    >
  {/if}
</div>
