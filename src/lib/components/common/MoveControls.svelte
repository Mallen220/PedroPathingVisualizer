<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import TrashIcon from "../icons/TrashIcon.svelte";

  const dispatch = createEventDispatcher();

  export let canMoveUp: boolean = true;
  export let canMoveDown: boolean = true;
  export let locked: boolean = false;
  export let showDelete: boolean = true;
  export let deleteTitle: string = "Remove";

  function moveUp(e: Event) {
    e.stopPropagation();
    if (!locked && canMoveUp) dispatch("moveUp");
  }

  function moveDown(e: Event) {
    e.stopPropagation();
    if (!locked && canMoveDown) dispatch("moveDown");
  }

  function remove(e: Event) {
    e.stopPropagation();
    if (!locked) dispatch("delete");
  }
</script>

<div class="flex items-center gap-1">
  <div class="flex flex-row gap-0.5 mr-2">
    <button
      title={locked ? "Locked" : "Move up"}
      on:click={moveUp}
      class="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/70 dark:border-neutral-700/70 disabled:opacity-40 disabled:cursor-not-allowed"
      disabled={!canMoveUp || locked}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="size-3"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m5 15 7-7 7 7"
        />
      </svg>
    </button>
    <button
      title={locked ? "Locked" : "Move down"}
      on:click={moveDown}
      class="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/70 dark:border-neutral-700/70 disabled:opacity-40 disabled:cursor-not-allowed"
      disabled={!canMoveDown || locked}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="size-3"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m19 9-7 7-7-7"
        />
      </svg>
    </button>
  </div>

  {#if showDelete}
    <button
      on:click={remove}
      class="text-red-500 hover:text-red-600"
      title={deleteTitle}
      disabled={locked}
    >
      <TrashIcon class_="size-4" strokeWidth={2} />
    </button>
  {/if}
</div>
