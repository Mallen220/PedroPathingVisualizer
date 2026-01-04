<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { fade } from "svelte/transition";

  export let x: number;
  export let y: number;
  export let title: string | null = null;
  export let items: {
    label: string;
    action: string;
    icon?: any;
    disabled?: boolean;
    danger?: boolean;
    separator?: boolean;
  }[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
    select: { action: string };
  }>();

  let menuElement: HTMLDivElement;

  function handleClickOutside(event: MouseEvent) {
    if (menuElement && !menuElement.contains(event.target as Node)) {
      dispatch("close");
    }
  }

  // Adjust position if it goes off screen
  let adjustedX = x;
  let adjustedY = y;

  onMount(() => {
    if (menuElement) {
      const rect = menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + rect.width > viewportWidth) {
        adjustedX = x - rect.width;
      }
      if (y + rect.height > viewportHeight) {
        adjustedY = y - rect.height;
      }
      // Ensure positive coordinates
      adjustedX = Math.max(0, adjustedX);
      adjustedY = Math.max(0, adjustedY);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });
</script>

<div
  bind:this={menuElement}
  class="fixed z-[1200] min-w-[180px] py-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 text-sm select-none"
  style="top: {adjustedY}px; left: {adjustedX}px;"
  transition:fade={{ duration: 100 }}
  role="menu"
  tabindex="-1"
  on:contextmenu|preventDefault
>
  {#if title}
    <div
      class="px-3 py-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 border-b border-neutral-100 dark:border-neutral-700 mb-1 truncate max-w-[200px]"
    >
      {title}
    </div>
  {/if}

  {#each items as item}
    {#if item.separator}
      <div class="h-px bg-neutral-200 dark:bg-neutral-700 my-1"></div>
    {:else}
      <button
        on:click={() => {
          if (!item.disabled) {
            dispatch("select", { action: item.action });
          }
        }}
        disabled={item.disabled}
        class="w-full text-left px-4 py-2 flex items-center gap-2 transition-colors
        {item.disabled
          ? 'opacity-50 cursor-not-allowed text-neutral-400 dark:text-neutral-600'
          : item.danger
            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
      >
        {#if item.icon}
          <div class="size-4 flex items-center justify-center">
            <svelte:component this={item.icon} className="size-4" strokeWidth={1.5} />
          </div>
        {:else}
          <div class="size-4"></div>
        {/if}
        {item.label}
      </button>
    {/if}
  {/each}
</div>
