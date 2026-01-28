<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { tick } from "svelte";
  import type { Writable } from "svelte/store";
  import type { HistoryEntry } from "../../../utils/history";

  export let historyStore: Writable<{
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
  }>;
  export let onJumpTo: (entry: HistoryEntry) => void;

  // Formatting helper
  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  let listContainer: HTMLDivElement;

  // Scroll to current when history changes
  $: if ($historyStore && listContainer) {
    tick().then(() => {
      const current = document.getElementById("history-current");
      if (current) {
        current.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  }
</script>

<div class="flex flex-col h-full max-h-[400px] w-full">
  <div class="p-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
    <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
      History
    </h3>
  </div>

  <div
    class="flex-1 overflow-y-auto p-1 space-y-0.5"
    bind:this={listContainer}
  >
    {#if $historyStore}
      <!-- FUTURE (Redo Stack) - Reversed to show [Oldest Future ... Newest Future] so Newest is bottom of this section?
           Wait, stack is [C, B] (B is newer). We want C (Future), B (Future).
           If we reverse redoStack, we get [B, C].
           If user wants "Reverse Order" (Newest Top), we want:
           Future B (Next redo)
           Future C (Later redo)
           Current A
           Past...

           redoStack has "most recently undone" at the END (top of stack).
           So redoStack.pop() gives B.
           So B is the "closest" future.
           We want B to be just above A.

           If list order is Newest at Top:
           Future C
           Future B
           Current A
           Past ...

           redoStack: [C, B].
           So we iterate redoStack (C, B).
      -->
      {#each $historyStore.redoStack as entry}
        <button
          class="w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 dark:text-neutral-500 opacity-70"
          on:click={() => onJumpTo(entry)}
        >
          <div class="flex flex-col truncate min-w-0 flex-1">
            <span class="truncate">{entry.description}</span>
            <span class="text-[10px] opacity-60">{formatTime(entry.timestamp)}</span>
          </div>
        </button>
      {/each}

      <!-- PAST (Undo Stack) - Reversed so Current is Top -->
      <!-- undoStack: [Initial, ... , Current] -->
      <!-- We want Current first. -->
      {#each [...$historyStore.undoStack].reverse() as entry, i}
        {@const isActive = i === 0} <!-- First item in reversed list is current -->

        <button
          id={isActive ? "history-current" : undefined}
          class={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group transition-colors ${
            isActive
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 font-medium"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          }`}
          on:click={() => onJumpTo(entry)}
        >
          <div class="flex flex-col truncate min-w-0 flex-1">
            <span class="truncate">{entry.description}</span>
            <span class="text-[10px] opacity-60">{formatTime(entry.timestamp)}</span>
          </div>
          {#if isActive}
            <div
              class="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 ml-2 flex-shrink-0"
            ></div>
          {/if}
        </button>
      {/each}
    {/if}

    {#if $historyStore && $historyStore.undoStack.length === 0}
         <div class="p-4 text-center text-neutral-400 text-xs italic">
             No history yet.
         </div>
    {/if}
  </div>
</div>
