<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import LockToggle from "./common/LockToggle.svelte";
  import CoordinateInputs from "./common/CoordinateInputs.svelte";

  export let startPoint: Point;
  export let addPathAtStart: () => void;
  export let addWaitAtStart: () => void;
  export let toggleCollapseAll: () => void;
  export let allCollapsed: boolean;
</script>

<div class="flex flex-col w-full justify-start items-start gap-0.5">
  <div class="flex items-center justify-between w-full flex-wrap gap-2">
    <div class="font-semibold flex items-center gap-2">
      Starting Point
      <LockToggle
        bind:locked={startPoint.locked}
        titleLocked="Unlock Starting Point"
        titleUnlocked="Lock Starting Point"
        on:toggle={() => {
          startPoint = { ...startPoint }; // Force reactivity
        }}
      />
    </div>

    <button
      on:click={toggleCollapseAll}
      class="text-sm mb-2 px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700"
      aria-label="Toggle collapse/expand all"
    >
      {#if allCollapsed}
        <span class="whitespace-nowrap">Expand All</span>
      {:else}
        <span class="whitespace-nowrap">Collapse All</span>
      {/if}
    </button>
  </div>
  <div class="flex flex-wrap justify-start items-center gap-x-4 gap-y-2">
    <CoordinateInputs
      bind:x={startPoint.x}
      bind:y={startPoint.y}
      disabled={startPoint.locked}
      step={0.1}
      ariaLabelPrefix="Starting Point"
      className="w-20 sm:w-28 pl-1.5"
    />

    <div class="flex items-center gap-4">
      <button
        on:click={addPathAtStart}
        class="font-semibold text-green-500 text-sm flex flex-row justify-start items-center gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2}
          stroke="currentColor"
          class="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        <span>Add Path</span>
      </button>
      <button
        on:click={addWaitAtStart}
        class="font-semibold text-amber-500 text-sm flex flex-row justify-start items-center gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="size-5"
        >
          <circle cx="12" cy="12" r="9" />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 7v5l3 2"
          />
        </svg>
        <span>Add Wait</span>
      </button>
    </div>
  </div>
</div>
