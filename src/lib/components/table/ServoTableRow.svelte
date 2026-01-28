<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import type { SequenceServoItem, SequenceItem } from "../../../types";
  import TrashIcon from "../icons/TrashIcon.svelte";
  import { focusRequest } from "../../../stores";

  export let item: SequenceItem;
  export let index: number;
  export let isLocked: boolean = false;

  // Drag & Drop props
  export let dragOverIndex: number | null = null;
  export let dragPosition: string | null = null;
  export let draggingIndex: number | null = null;

  // Interaction callbacks
  export let onUpdate: (item: SequenceItem) => void;
  export let onLock: () => void;
  export let onDelete: () => void;
  export let onDragStart: (e: DragEvent) => void;
  export let onDragEnd: () => void;
  export let onContextMenu: (e: MouseEvent) => void;

  export let sequence: SequenceItem[] = [];

  $: servoItem = item as SequenceServoItem;

  let hoveredId: string | null = null;

  function handleHoverEnter(e: MouseEvent, id: string | null) {
    hoveredId = id;
  }
  function handleHoverLeave() {
    hoveredId = null;
  }

  // Focus Handling Action
  function focusOnRequest(
    node: HTMLElement,
    params: { id: string; field: string },
  ) {
    const unsubscribe = focusRequest.subscribe((req) => {
      if (req && req.id === params.id && req.field === params.field) {
        node.focus();
        if (node instanceof HTMLInputElement) node.select();
      }
    });
    return {
      update(newParams: { id: string; field: string }) {
        params = newParams;
      },
      destroy() {
        unsubscribe();
      },
    };
  }

  function handleNameInput(e: Event) {
    const target = e.target as HTMLInputElement;
    item.name = target.value;
    onUpdate(item);
  }

  function handlePortInput(e: Event) {
    const target = e.target as HTMLInputElement;
    (item as SequenceServoItem).port = target.value;
    onUpdate(item);
  }

  function handleDurationInput(e: Event) {
    const target = e.target as HTMLInputElement;
    (item as SequenceServoItem).durationMs = parseFloat(target.value);
    onUpdate(item);
  }

  function handlePositionInput(e: Event) {
    const target = e.target as HTMLInputElement;
    (item as SequenceServoItem).position = parseFloat(target.value);
    onUpdate(item);
  }
</script>

<tr
  data-seq-index={index}
  draggable={!isLocked}
  on:dragstart={onDragStart}
  on:dragend={onDragEnd}
  on:contextmenu={onContextMenu}
  class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 bg-indigo-50 dark:bg-indigo-900/20 transition-colors duration-150"
  class:border-t-2={dragOverIndex === index && dragPosition === "top"}
  class:border-b-2={dragOverIndex === index && dragPosition === "bottom"}
  class:border-blue-500={dragOverIndex === index}
  class:dark:border-blue-400={dragOverIndex === index}
  class:opacity-50={draggingIndex === index}
>
  <td
    class="w-8 px-2 py-2 text-center cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="w-4 h-4 mx-auto"
    >
      <path
        fill-rule="evenodd"
        d="M10 3a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        clip-rule="evenodd"
      />
    </svg>
  </td>
  <td class="px-3 py-2">
    <div class="flex flex-col gap-1 w-full max-w-[160px]">
      <input
        class="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
        class:text-indigo-500={hoveredId === item.id}
        value={item.name}
        on:input={handleNameInput}
        use:focusOnRequest={{
          id: `servo-${item.id}`,
          field: "name",
        }}
        disabled={isLocked}
        placeholder="Name"
        aria-label="Servo Name"
      />
      <input
        class="w-full px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-[10px] text-neutral-500"
        value={servoItem.port}
        on:input={handlePortInput}
        disabled={isLocked}
        placeholder="Port"
        aria-label="Servo Port"
      />
    </div>
  </td>
  <td class="px-3 py-2 align-top">
    <div class="flex flex-col gap-1">
      <label class="text-[9px] text-neutral-400 uppercase">Duration (ms)</label>
      <input
        type="number"
        class="w-20 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
        min="0"
        value={servoItem.durationMs}
        on:input={handleDurationInput}
        disabled={isLocked}
      />
    </div>
  </td>
  <td class="px-3 py-2 align-top">
    <div class="flex flex-col gap-1">
      <label class="text-[9px] text-neutral-400 uppercase">Pos (0-1)</label>
      <input
        type="number"
        class="w-20 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
        step="0.01"
        min="0"
        max="1"
        value={servoItem.position}
        on:input={handlePositionInput}
        disabled={isLocked}
      />
    </div>
  </td>
  <td
    class="px-3 py-2 text-left flex items-center justify-start gap-1 align-top pt-3"
  >
    <!-- Lock toggle -->
    <button
      on:click|stopPropagation={onLock}
      title={isLocked ? "Unlock" : "Lock"}
      class="inline-flex items-center justify-center h-6 w-6 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      aria-pressed={isLocked}
    >
      {#if isLocked}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="size-5 stroke-yellow-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25 2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="size-5 stroke-gray-400"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25 2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      {/if}
    </button>

    <!-- Delete slot -->
    {#if !isLocked}
      <button
        on:click|stopPropagation={onDelete}
        title="Delete"
        class="inline-flex items-center justify-center h-6 w-6 p-0.5 rounded transition-colors text-neutral-400 hover:text-red-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        <TrashIcon className="size-4" strokeWidth={2} />
      </button>
    {:else}
      <span class="h-6 w-6" aria-hidden="true"></span>
    {/if}
  </td>
</tr>
