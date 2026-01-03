<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import type { Line } from "../../types";
  import { snapToGrid, showGrid, gridSize } from "../../stores";
  import EventMarkersSection from "./EventMarkersSection.svelte";
  import ControlPointsSection from "./ControlPointsSection.svelte";
  import HeadingControls from "./HeadingControls.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import { selectedLineId } from "../../stores";
  import TrashIcon from "./icons/TrashIcon.svelte";
  import CollapseToggle from "./common/CollapseToggle.svelte";
  import LockToggle from "./common/LockToggle.svelte";
  import MoveControls from "./common/MoveControls.svelte";
  import CoordinateInputs from "./common/CoordinateInputs.svelte";

  export let line: Line;
  export let idx: number;
  export let lines: Line[];
  export let collapsed: boolean;
  export let collapsedEventMarkers: boolean;
  export let collapsedControlPoints: boolean;
  export let onRemove: () => void;
  export let onInsertAfter: () => void;
  export let onAddWaitAfter: () => void;
  export let recordChange: () => void;
  export let onMoveUp: () => void;
  export let onMoveDown: () => void;
  export let canMoveUp: boolean = true;
  export let canMoveDown: boolean = true;

  $: isSelected = $selectedLineId === line.id;

  $: snapToGridTitle =
    $snapToGrid && $showGrid ? `Snapping to ${$gridSize} grid` : "No snapping";
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
  role="button"
  tabindex="0"
  aria-pressed={isSelected}
  class={`flex flex-col w-full justify-start items-start gap-1 ${isSelected ? "border-l-4 border-amber-400 pl-2" : ""}`}
  on:click={() => selectedLineId.set(line.id)}
  on:keydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectedLineId.set(line.id);
    }
  }}
>
  <div
    class="flex flex-row w-full justify-between items-center flex-wrap gap-y-2"
  >
    <div class="flex flex-row items-center gap-2 flex-wrap">
      <CollapseToggle
        bind:collapsed
        label="Path {idx + 1}"
        title="{collapsed ? 'Expand' : 'Collapse'} path"
      />

      <input
        bind:value={line.name}
        placeholder="Path {idx + 1}"
        class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none text-sm font-semibold min-w-[100px]"
        disabled={line.locked}
        on:input={() => {
          // Force parent reactivity so other components (like exporters)
          // pick up the updated name immediately.
          lines = [...lines];
        }}
        on:blur={() => {
          // Commit the change for history/undo
          lines = [...lines];
          if (recordChange) recordChange();
        }}
      />

      <ColorPicker
        bind:color={line.color}
        title="Change Path Color"
        disabled={line.locked}
      />

      <LockToggle
        bind:locked={line.locked}
        titleLocked="Unlock Path"
        titleUnlocked="Lock Path"
        on:toggle={() => {
          lines = [...lines]; // Force reactivity
        }}
      />

      <div class="flex flex-row gap-0.5 ml-1">
        <MoveControls
          locked={line.locked}
          {canMoveUp}
          {canMoveDown}
          on:moveUp={onMoveUp}
          on:moveDown={onMoveDown}
          showDelete={false}
        />
      </div>
    </div>

    <div class="flex flex-row justify-end items-center gap-1 ml-auto">
      <!-- Add Point After Button -->

      <button
        title="Add Point After This Line"
        on:click={onInsertAfter}
        class="text-blue-500 hover:text-blue-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2}
          class="size-5 stroke-green-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </button>

      <!-- Add Wait After Button -->
      <button
        title="Add Wait After"
        on:click={onAddWaitAfter}
        class="text-orange-500 hover:text-orange-600"
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
      </button>

      {#if lines.length > 1}
        <button
          title="Remove Line"
          class="text-red-500 hover:text-red-600"
          on:click={onRemove}
        >
          <TrashIcon class_="size-5" strokeWidth={2} />
        </button>
      {/if}
    </div>
  </div>

  {#if !collapsed}
    <div class={`h-[0.75px] w-full`} style={`background: ${line.color}`} />

    <div class="flex flex-col justify-start items-start w-full">
      <div class="font-light">Point Position:</div>
      <div class="flex flex-wrap justify-start items-center gap-x-4 gap-y-2">
        <CoordinateInputs
          bind:x={line.endPoint.x}
          bind:y={line.endPoint.y}
          disabled={line.locked}
          step={$snapToGrid && $showGrid ? $gridSize : 0.1}
          title={snapToGridTitle}
          ariaLabelPrefix="Line {idx + 1} End Point"
          className="w-20 sm:w-28 pl-1.5"
        />

        <HeadingControls
          endPoint={line.endPoint}
          locked={line.locked}
          on:change={() => {
            // Force reactivity so timeline recalculates immediately
            lines = [...lines];
          }}
          on:commit={() => {
            // Commit change to history
            lines = [...lines];
            recordChange();
          }}
        />
      </div>
    </div>

    <EventMarkersSection
      bind:line
      lineIdx={idx}
      bind:collapsed={collapsedEventMarkers}
    />

    <ControlPointsSection
      bind:line
      lineIdx={idx}
      bind:collapsed={collapsedControlPoints}
      {recordChange}
    />
  {/if}
</div>
