<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { snapshotStore, type Snapshot } from "../../snapshotStore";
  import { slide } from "svelte/transition";

  let newSnapshotName = "";

  function createSnapshot() {
    snapshotStore.create(newSnapshotName);
    newSnapshotName = "";
  }

  function restoreSnapshot(id: string) {
    if (confirm("Are you sure you want to restore this snapshot? Current unsaved changes will be lost.")) {
      snapshotStore.restore(id);
    }
  }

  function deleteSnapshot(id: string) {
    if (confirm("Are you sure you want to delete this snapshot?")) {
      snapshotStore.delete(id);
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }
</script>

<div class="w-full flex flex-col gap-4 p-4 pb-32">
  <!-- Create Section -->
  <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4 space-y-4">
    <div class="flex items-center gap-2">
      <div class="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4 text-blue-600 dark:text-blue-400">
           <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
           <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
      </div>
      <span class="text-sm font-bold text-neutral-700 dark:text-neutral-200">CREATE SNAPSHOT</span>
    </div>

    <div class="flex gap-2">
      <input
        type="text"
        bind:value={newSnapshotName}
        placeholder="Snapshot Name (optional)"
        class="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
        on:keydown={(e) => e.key === 'Enter' && createSnapshot()}
      />
      <button
        on:click={createSnapshot}
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Save
      </button>
    </div>
  </div>

  <!-- List Section -->
  <div class="space-y-2">
    {#if $snapshotStore.length === 0}
       <div class="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
         No snapshots saved yet.
       </div>
    {:else}
      {#each $snapshotStore as snapshot (snapshot.id)}
        <div
          transition:slide|local
          class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 flex items-center justify-between group hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div class="flex flex-col overflow-hidden mr-3">
             <span class="font-medium text-neutral-900 dark:text-neutral-100 truncate">{snapshot.name}</span>
             <span class="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(snapshot.timestamp)}</span>
             <span class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
               {snapshot.data.lines.length} paths • {snapshot.data.sequence.length} items
             </span>
          </div>

          <div class="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              on:click={() => restoreSnapshot(snapshot.id)}
              class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Restore Snapshot"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button
              on:click={() => deleteSnapshot(snapshot.id)}
              class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete Snapshot"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
