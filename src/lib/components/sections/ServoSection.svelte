<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { selectedPointId, selectedLineId } from "../../../stores";
  import DeleteButtonWithConfirm from "../common/DeleteButtonWithConfirm.svelte";
  import type { SequenceServoItem, SequenceItem } from "../../../types/index";
  import { actionRegistry } from "../../actionRegistry";

  export let servo: SequenceServoItem;
  export let sequence: SequenceItem[];

  // Collapsed state
  export let collapsed: boolean = false;

  export let onRemove: () => void;
  // Generic add handler
  export let onAddAction: ((def: any) => void) | undefined = undefined;

  // Specific handlers from parent loop if any (legacy compatibility)
  export let onInsertAfter: (() => void) | undefined = undefined;
  export let onAddPathAfter: (() => void) | undefined = undefined;
  export let onAddWaitAfter: (() => void) | undefined = undefined;
  export let onAddRotateAfter: (() => void) | undefined = undefined;

  export let onMoveUp: () => void;
  export let onMoveDown: () => void;
  export let canMoveUp: boolean = true;
  export let canMoveDown: boolean = true;
  export let recordChange: (() => void) | undefined = undefined;

  $: isSelected = $selectedPointId === `servo-${servo.id}`;

  function toggleCollapsed() {
    collapsed = !collapsed;
  }

  function handleNameInput(e: Event) {
    const input = e.target as HTMLInputElement;
    servo.name = input.value;
    if (recordChange) recordChange();
  }

  function handlePortInput(e: Event) {
    const input = e.target as HTMLInputElement;
    servo.port = input.value;
    if (recordChange) recordChange();
  }

  function handlePositionChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const val = parseFloat(target.value);
    if (!Number.isNaN(val)) {
      servo.position = Math.max(0, Math.min(1, val)); // Clamp 0-1
    }
    if (recordChange) recordChange();
  }

  function handleDurationChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const val = parseFloat(target.value);
    if (!Number.isNaN(val) && val >= 0) {
      servo.durationMs = val;
    }
    if (recordChange) recordChange();
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
  role="button"
  tabindex="0"
  aria-pressed={isSelected}
  class={`bg-white dark:bg-neutral-800 rounded-xl shadow-sm border transition-all duration-200 ${
    isSelected
      ? "border-indigo-500 ring-1 ring-indigo-500/20"
      : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
  }`}
  on:click|stopPropagation={() => {
    if (!servo.locked) {
      selectedPointId.set(`servo-${servo.id}`);
      selectedLineId.set(null);
    }
  }}
  on:keydown|stopPropagation={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!servo.locked) {
        selectedPointId.set(`servo-${servo.id}`);
        selectedLineId.set(null);
      }
    }
  }}
>
  <!-- Card Header -->
  <div class="flex items-center justify-between p-3 gap-3">
    <!-- Left: Title & Name -->
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <button
        on:click|stopPropagation={toggleCollapsed}
        class="flex items-center gap-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 transition-colors px-1 py-1"
        title="{collapsed ? 'Expand' : 'Collapse'} servo"
        aria-label="{collapsed ? 'Expand' : 'Collapse'} servo"
        aria-expanded={!collapsed}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2.5}
          stroke="currentColor"
          class="size-3.5 transition-transform duration-200 {collapsed
            ? '-rotate-90'
            : 'rotate-0'}"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
        <span
          class="text-xs font-bold uppercase tracking-wider text-indigo-500 whitespace-nowrap"
          >Servo</span
        >
      </button>

      <div class="flex items-center gap-2 flex-1 min-w-0">
        <div class="relative flex-1 min-w-0">
          <input
            value={servo.name}
            placeholder="Servo Action"
            aria-label="Servo name"
            title="Edit servo name"
            class="w-full pl-2 pr-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-neutral-400 truncate"
            disabled={servo.locked}
            on:input={handleNameInput}
            on:blur={() => recordChange && recordChange()}
            on:click|stopPropagation
          />
        </div>
      </div>
    </div>

    <!-- Right: Controls -->
    <div class="flex items-center gap-1">
      <button
        title={servo.locked ? "Unlock Servo" : "Lock Servo"}
        aria-label={servo.locked ? "Unlock Servo" : "Lock Servo"}
        on:click|stopPropagation={() => {
          servo.locked = !servo.locked;
          if (recordChange) recordChange();
        }}
        class="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"
      >
        {#if servo.locked}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="size-4 text-amber-500"
          >
            <path
              fill-rule="evenodd"
              d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
              clip-rule="evenodd"
            />
          </svg>
        {:else}
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
              d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25 2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        {/if}
      </button>

      <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>

      <div
        class="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-lg p-0.5"
      >
        <button
          on:click|stopPropagation={() => {
            if (!servo.locked && canMoveUp && onMoveUp) onMoveUp();
          }}
          disabled={!canMoveUp || servo.locked}
          class="p-1 rounded-md hover:bg-white dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm hover:shadow"
          title="Move Up"
          aria-label="Move Up"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="size-3.5"
          >
            <path
              fill-rule="evenodd"
              d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <button
          on:click|stopPropagation={() => {
            if (!servo.locked && canMoveDown && onMoveDown) onMoveDown();
          }}
          disabled={!canMoveDown || servo.locked}
          class="p-1 rounded-md hover:bg-white dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm hover:shadow"
          title="Move Down"
          aria-label="Move Down"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="size-3.5"
          >
            <path
              fill-rule="evenodd"
              d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <DeleteButtonWithConfirm
        on:click={() => {
          if (!servo.locked && onRemove) onRemove();
        }}
        disabled={servo.locked}
        title="Remove Servo Action"
      />
    </div>
  </div>

  {#if !collapsed}
    <div class="px-3 pb-3 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <!-- Port -->
        <div class="space-y-2">
          <label
            for="servo-port-{servo.id}"
            class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block"
          >
            Port Name
          </label>
          <input
            id="servo-port-{servo.id}"
            class="w-full px-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            value={servo.port}
            on:input={handlePortInput}
            placeholder="clawServo"
            on:click|stopPropagation
            disabled={servo.locked}
          />
        </div>

        <!-- Position -->
        <div class="space-y-2">
          <label
            for="servo-pos-{servo.id}"
            class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block"
          >
            Position (0-1)
          </label>
          <div class="flex items-center gap-2">
            <input
              type="range"
              class="flex-1 accent-indigo-500"
              min="0"
              max="1"
              step="0.01"
              value={servo.position}
              on:input={handlePositionChange}
              on:click|stopPropagation
              disabled={servo.locked}
            />
            <input
              id="servo-pos-{servo.id}"
              class="w-16 px-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={servo.position}
              on:change={handlePositionChange}
              on:click|stopPropagation
              disabled={servo.locked}
            />
          </div>
        </div>
      </div>

      <!-- Duration Input -->
      <div class="space-y-2">
        <label
          for="servo-duration-{servo.id}"
          class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block"
        >
          Duration (ms) <span class="text-neutral-400 font-normal normal-case"
            >(optional delay)</span
          >
        </label>
        <div class="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
              clip-rule="evenodd"
            />
          </svg>
          <input
            id="servo-duration-{servo.id}"
            class="w-full pl-9 pr-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            type="number"
            min="0"
            step="50"
            value={servo.durationMs}
            on:change={handleDurationChange}
            on:click|stopPropagation
            disabled={servo.locked}
          />
        </div>
      </div>

      <!-- Action Bar -->
      <div
        class="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50 flex-wrap"
      >
        <span class="text-xs font-medium text-neutral-400 mr-auto"
          >Insert after:</span
        >
        {#each Object.values($actionRegistry) as def (def.kind)}
          {#if def.createDefault || def.isPath}
            {@const color = def.buttonColor || "gray"}
            <button
              on:click|stopPropagation={() => {
                if (onAddAction) onAddAction(def);
                // Fallbacks if handler not provided (legacy)
                else if (def.isPath && onAddPathAfter) onAddPathAfter();
                else if (def.isWait && onAddWaitAfter) onAddWaitAfter();
                else if (def.isRotate && onAddRotateAfter) onAddRotateAfter();
              }}
              class={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 hover:bg-${color}-100 dark:hover:bg-${color}-900/30 transition-colors border border-${color}-200 dark:border-${color}-800/30`}
              title={`Add ${def.label} After`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="size-3"
              >
                <path
                  d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
                />
              </svg>
              {def.label}
            </button>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>
