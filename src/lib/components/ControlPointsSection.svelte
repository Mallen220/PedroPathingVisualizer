<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import _ from "lodash";
  import { snapToGrid, showGrid, gridSize } from "../../stores";
  import type { Line } from "../../types";
  import {
    calculateDragPosition,
    reorderSequence,
    getClosestTarget,
    type DragPosition,
  } from "../../utils/dragDrop";
  import SectionHeader from "./common/SectionHeader.svelte";
  import MoveControls from "./common/MoveControls.svelte";
  import CoordinateInputs from "./common/CoordinateInputs.svelte";

  export let line: Line;
  export let lineIdx: number;
  export let collapsed: boolean;
  export let recordChange: () => void;

  $: snapToGridTitle =
    $snapToGrid && $showGrid ? `Snapping to ${$gridSize} grid` : "No snapping";

  // Drag and drop state
  let draggingIndex: number | null = null;
  let dragOverIndex: number | null = null;
  let dragPosition: DragPosition | null = null;
  let containerRef: HTMLElement;

  function handleDragStart(e: DragEvent, index: number) {
    if (line.locked) {
      e.preventDefault();
      return;
    }
    draggingIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  }

  function handleWindowDragOver(e: DragEvent) {
    if (draggingIndex === null) return;

    // Ensure we are dragging over THIS component's container
    if (!containerRef) return;

    e.preventDefault();

    const target = getClosestTarget(e, "div[data-cp-index]", containerRef);

    if (!target) return;

    const index = parseInt(target.element.getAttribute("data-cp-index") || "");
    if (isNaN(index)) return;

    if (dragOverIndex !== index || dragPosition !== target.position) {
      dragOverIndex = index;
      dragPosition = target.position;
    }
  }

  function handleWindowDrop(e: DragEvent) {
    if (draggingIndex === null) return;
    e.preventDefault();

    if (
      dragOverIndex === null ||
      dragPosition === null ||
      draggingIndex === dragOverIndex
    ) {
      handleDragEnd();
      return;
    }

    const newPoints = reorderSequence(
      line.controlPoints,
      draggingIndex,
      dragOverIndex,
      dragPosition,
    );

    line.controlPoints = newPoints;
    recordChange();

    handleDragEnd();
  }

  function handleDragEnd() {
    draggingIndex = null;
    dragOverIndex = null;
    dragPosition = null;
  }

  function moveControlPoint(index: number, delta: number) {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= line.controlPoints.length) return;

    const newPoints = [...line.controlPoints];
    const temp = newPoints[index];
    newPoints[index] = newPoints[targetIndex];
    newPoints[targetIndex] = temp;

    line.controlPoints = newPoints;
    recordChange();
  }

  function removeControlPoint(idx: number) {
    let _pts = line.controlPoints;
    _pts.splice(idx, 1);
    line.controlPoints = _pts;
    recordChange();
  }
</script>

<svelte:window on:dragover={handleWindowDragOver} on:drop={handleWindowDrop} />

<div class="flex flex-col w-full justify-start items-start mt-2">
  <SectionHeader
    bind:collapsed
    title="Control Points"
    count={line.controlPoints.length}
  >
    <div slot="buttons">
      <button
        on:click={() => {
          line.controlPoints = [
            ...line.controlPoints,
            {
              x: _.random(36, 108),
              y: _.random(36, 108),
            },
          ];
          recordChange();
        }}
        class="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 px-2 py-1"
        title="Add Control Point"
        disabled={line.locked}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2}
          stroke="currentColor"
          class="size-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Add Control Point
      </button>
    </div>
  </SectionHeader>

  <!-- Control Points list (shown when expanded) -->
  {#if !collapsed && line.controlPoints.length > 0}
    <div class="w-full mt-2 space-y-2" bind:this={containerRef}>
      {#each line.controlPoints as point, idx (idx)}
        <div
          role="listitem"
          data-cp-index={idx}
          draggable={!line.locked}
          on:dragstart={(e) => handleDragStart(e, idx)}
          on:dragend={handleDragEnd}
          class="flex flex-col p-2 border border-blue-300 dark:border-blue-700 rounded-md bg-blue-50 dark:bg-blue-900/20 transition-all duration-200"
          class:border-t-4={dragOverIndex === idx && dragPosition === "top"}
          class:border-b-4={dragOverIndex === idx && dragPosition === "bottom"}
          class:border-blue-500={dragOverIndex === idx}
          class:dark:border-blue-400={dragOverIndex === idx}
          class:opacity-50={draggingIndex === idx}
          class:cursor-move={!line.locked}
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              {#if !line.locked}
                <div
                  class="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 3a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              {/if}
              <div class="w-3 h-3 rounded-full bg-blue-500"></div>
              <span
                class="text-sm font-medium text-blue-700 dark:text-blue-300"
              >
                Control Point {idx + 1}
              </span>
            </div>

            <MoveControls
              locked={line.locked}
              canMoveUp={idx > 0}
              canMoveDown={idx < line.controlPoints.length - 1}
              on:moveUp={() => moveControlPoint(idx, -1)}
              on:moveDown={() => moveControlPoint(idx, 1)}
              on:delete={() => removeControlPoint(idx)}
              deleteTitle="Remove Control Point"
            />
          </div>

          <!-- Control Point Position Inputs -->
          <CoordinateInputs
            bind:x={point.x}
            bind:y={point.y}
            disabled={line.locked}
            step={$snapToGrid && $showGrid ? $gridSize : 0.1}
            title={snapToGridTitle}
            ariaLabelPrefix="Line {lineIdx + 1} Control Point {idx + 1}"
            on:change={() => {
              line.controlPoints = [...line.controlPoints];
            }}
          />

          <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Line {lineIdx + 1}, Control Point {idx + 1}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
