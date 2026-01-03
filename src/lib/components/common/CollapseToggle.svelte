<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let collapsed: boolean;
  export let label: string;
  export let count: number | undefined = undefined;
  export let title: string = "";

  $: derivedTitle = title || (collapsed ? `Show ${label}` : `Hide ${label}`);
</script>

<button
  on:click={() => {
    collapsed = !collapsed;
    dispatch("toggle", collapsed);
  }}
  class="flex items-center gap-2 font-light hover:bg-neutral-200 dark:hover:bg-neutral-800 px-2 py-1 rounded transition-colors text-sm text-left"
  title={derivedTitle}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width={2}
    stroke="currentColor"
    class="size-3 transition-transform {collapsed ? 'rotate-0' : 'rotate-90'}"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="m8.25 4.5 7.5 7.5-7.5 7.5"
    />
  </svg>
  {label}
  {#if count !== undefined}
    ({count})
  {/if}
</button>
