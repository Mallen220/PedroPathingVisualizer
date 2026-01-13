<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import {
    checkpointsStore,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
  } from "../projectStore";
  import { formatTime } from "../../utils/timeCalculator";
  import { slide } from "svelte/transition";
  import TrashIcon from "./icons/TrashIcon.svelte";

  export let isOpen: boolean;
  export let onClose: () => void;

  let newCheckpointName = "";

  function handleCreate() {
    if (!newCheckpointName.trim()) {
      newCheckpointName = `Checkpoint ${new Date().toLocaleTimeString()}`;
    }
    createCheckpoint(newCheckpointName);
    newCheckpointName = "";
  }

  function handleRestore(id: string, name: string) {
    if (confirm(`Are you sure you want to restore "${name}"? Current unsaved changes will be lost.`)) {
      restoreCheckpoint(id);
      onClose();
    }
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete checkpoint "${name}"?`)) {
      deleteCheckpoint(id);
    }
  }

  // Format timestamp helper
  function formatTimestamp(ts: number) {
    return new Date(ts).toLocaleString();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    on:click={onClose}
    on:keydown={(e) => e.key === "Escape" && onClose()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="checkpoints-title"
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="w-full max-w-lg bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col max-h-[80vh]"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700"
      >
        <h2
          id="checkpoints-title"
          class="text-lg font-semibold text-neutral-900 dark:text-white"
        >
          Project Checkpoints
        </h2>
        <button
          on:click={onClose}
          class="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="size-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Create Section -->
      <div class="p-4 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700">
        <label for="cp-name" class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          Create New Checkpoint
        </label>
        <div class="flex gap-2">
          <input
            id="cp-name"
            type="text"
            bind:value={newCheckpointName}
            placeholder="e.g. 'Before Optimization'"
            class="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:outline-none text-neutral-900 dark:text-white"
            on:keydown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            on:click={handleCreate}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
          >
            Create
          </button>
        </div>
      </div>

      <!-- List Section -->
      <div class="flex-1 overflow-y-auto p-2">
        {#if $checkpointsStore.length === 0}
          <div class="flex flex-col items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-12 mb-3 opacity-50">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p class="text-sm">No checkpoints yet.</p>
            <p class="text-xs mt-1 opacity-75">Create one above to save your progress.</p>
          </div>
        {:else}
          <div class="flex flex-col gap-2">
            <!-- Sort by timestamp descending (newest first) -->
            {#each [...$checkpointsStore].sort((a, b) => b.timestamp - a.timestamp) as cp (cp.id)}
              <div
                class="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
                transition:slide
              >
                <div class="flex-1 min-w-0 mr-4">
                  <h3 class="text-sm font-medium text-neutral-900 dark:text-white truncate" title={cp.name}>
                    {cp.name}
                  </h3>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {formatTimestamp(cp.timestamp)}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    on:click={() => handleRestore(cp.id, cp.name)}
                    class="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Restore
                  </button>
                  <button
                    on:click={() => handleDelete(cp.id, cp.name)}
                    class="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete Checkpoint"
                  >
                    <TrashIcon className="size-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 text-xs text-neutral-500 dark:text-neutral-400 text-center">
        Checkpoints are saved within the project file (.pp)
      </div>
    </div>
  </div>
{/if}
