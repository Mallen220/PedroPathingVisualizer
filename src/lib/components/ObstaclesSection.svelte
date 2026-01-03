<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createTriangle } from "../../utils";
  import { snapToGrid, showGrid, gridSize } from "../../stores";
  import TrashIcon from "./icons/TrashIcon.svelte";
  import CollapseToggle from "./common/CollapseToggle.svelte";
  import CoordinateInputs from "./common/CoordinateInputs.svelte";

  export let shapes: Shape[];
  export let collapsedObstacles: boolean[];

  $: snapToGridTitle =
    $snapToGrid && $showGrid ? `Snapping to ${$gridSize} grid` : "No snapping";

  function toggleObstacle(index: number) {
    collapsedObstacles[index] = !collapsedObstacles[index];
    collapsedObstacles = [...collapsedObstacles]; // Force reactivity
  }

  function toggleAllObstacles() {
    const allCollapsed = collapsedObstacles.every((c) => c);
    collapsedObstacles = collapsedObstacles.map(() => !allCollapsed);
  }
</script>

<div class="flex flex-col w-full justify-start items-start gap-0.5 text-sm">
  <div class="flex items-center gap-2 w-full">
    <CollapseToggle
      collapsed={collapsedObstacles.every((c) => c)}
      label="Obstacles"
      count={shapes.length}
      on:toggle={toggleAllObstacles}
    />
  </div>

  {#each shapes as shape, shapeIdx}
    <div
      class="flex flex-col w-full justify-start items-start gap-1 p-2 border rounded-md border-neutral-300 dark:border-neutral-600 mt-2"
    >
      <div class="flex flex-row w-full justify-between items-center">
        <div class="flex flex-row items-center gap-2">
          <CollapseToggle
            collapsed={collapsedObstacles[shapeIdx]}
            label="Obstacle {shapeIdx + 1}"
            on:toggle={() => toggleObstacle(shapeIdx)}
          />

          <input
            bind:value={shape.name}
            placeholder="Obstacle {shapeIdx + 1}"
            class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none text-sm font-medium"
          />
          <div
            class="relative size-5 rounded-full overflow-hidden shadow-sm border border-neutral-300 dark:border-neutral-600 shrink-0"
            style="background-color: {shape.color}"
          >
            <input
              type="color"
              bind:value={shape.color}
              class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              title="Change Obstacle Color"
            />
          </div>
        </div>

        <div class="flex flex-row gap-1">
          <button
            title="Add Vertex"
            on:click={() => {
              shape.vertices = [...shape.vertices, { x: 50, y: 50 }];
            }}
            class="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width={2.5}
              class="size-5 stroke-green-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
          {#if shapes.length > 0}
            <button
              title="Remove Shape"
              on:click={() => {
                shapes.splice(shapeIdx, 1);
                shapes = shapes;
                // Also remove the collapsed state for this obstacle
                collapsedObstacles.splice(shapeIdx, 1);
                collapsedObstacles = [...collapsedObstacles];
              }}
              class="text-red-500 hover:text-red-600"
            >
              <TrashIcon class_="size-4" strokeWidth={2} />
            </button>
          {/if}
        </div>
      </div>

      {#if !collapsedObstacles[shapeIdx]}
        {#each shape.vertices as vertex, vertexIdx}
          <div class="flex flex-row justify-start items-center gap-2">
            <div class="font-bold text-sm">{vertexIdx + 1}:</div>
            <CoordinateInputs
              bind:x={vertex.x}
              bind:y={vertex.y}
              step={$snapToGrid && $showGrid ? $gridSize : 0.1}
              title={snapToGridTitle}
              className="w-24 pl-1.5"
            />

            {#if $snapToGrid && $showGrid}
              <span class="text-xs text-green-500" title="Snapping enabled"
                >✓</span
              >
            {/if}
            {#if shape.vertices.length > 3}
              <button
                title="Remove Vertex"
                class="text-red-500 hover:text-red-600"
                on:click={() => {
                  shape.vertices.splice(vertexIdx, 1);
                  shape.vertices = shape.vertices;
                }}
              >
                <TrashIcon class_="size-4" strokeWidth={2} />
              </button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {/each}

  <button
    on:click={() => {
      shapes = [...shapes, createTriangle(shapes.length)];
      // Add a new collapsed state for the new obstacle (default to collapsed)
      collapsedObstacles = [...collapsedObstacles, true];
    }}
    class="font-semibold text-red-500 text-sm flex flex-row justify-start items-center gap-1 mt-2"
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
    <p>Add Obstacle</p>
  </button>
</div>
