<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { diffResult } from "../../diffStore";
  import { currentFilePath } from "../../../stores";

  $: result = $diffResult;

  // Derived lists from the flat eventDiff array
  $: addedEvents = result ? result.eventDiff.filter(e => e.changeType === 'added') : [];
  $: removedEvents = result ? result.eventDiff.filter(e => e.changeType === 'removed') : [];
  $: changedEvents = result ? result.eventDiff.filter(e => e.changeType === 'changed') : [];

  let commitMessage = "";
  let isCommitting = false;
  let isPushing = false;
  let commitStatus = "";
  let statusType: "success" | "error" | "" = "";

  function formatNum(n: number) {
    return n.toFixed(2);
  }

  function formatDiff(n: number) {
    return (n > 0 ? "+" : "") + n.toFixed(2);
  }

  async function handleCommit() {
    if (!$currentFilePath) return;
    if (!commitMessage.trim()) return;

    isCommitting = true;
    commitStatus = "";
    try {
        const api = (window as any).electronAPI;
        if (api && api.gitAdd && api.gitCommit) {
             const added = await api.gitAdd($currentFilePath);
             if (added) {
                 const committed = await api.gitCommit($currentFilePath, commitMessage);
                 if (committed) {
                     commitStatus = "Committed successfully!";
                     statusType = "success";
                     commitMessage = "";
                 } else {
                     commitStatus = "Commit failed.";
                     statusType = "error";
                 }
             } else {
                 commitStatus = "Failed to add file.";
                 statusType = "error";
             }
        }
    } catch (e) {
        console.error(e);
        commitStatus = "Error committing.";
        statusType = "error";
    } finally {
        isCommitting = false;
        setTimeout(() => {
            if (statusType === "success") commitStatus = "";
        }, 3000);
    }
  }

  async function handlePush() {
      if (!$currentFilePath) return;
      isPushing = true;
      commitStatus = "";
      try {
          const api = (window as any).electronAPI;
          if (api && api.gitPush) {
              const pushed = await api.gitPush($currentFilePath);
              if (pushed) {
                  commitStatus = "Pushed successfully!";
                  statusType = "success";
              } else {
                  commitStatus = "Push failed.";
                  statusType = "error";
              }
          }
      } catch (e) {
          console.error(e);
          commitStatus = "Error pushing.";
          statusType = "error";
      } finally {
          isPushing = false;
          setTimeout(() => {
            if (statusType === "success") commitStatus = "";
          }, 3000);
      }
  }
</script>

<div class="w-full h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
  {#if result}
    <div class="p-4 space-y-6">
      <!-- Stats Overview -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Total Time</p>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold text-neutral-900 dark:text-white">{formatNum(result.statsDiff.time.new)}s</span>
            {#if result.statsDiff.time.diff !== 0}
                <span class="text-sm font-semibold {result.statsDiff.time.diff > 0 ? 'text-red-500' : 'text-green-500'}">
                    {formatDiff(result.statsDiff.time.diff)}s
                </span>
            {/if}
          </div>
        </div>

        <div class="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
            <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Total Distance</p>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold text-neutral-900 dark:text-white">{formatNum(result.statsDiff.distance.new)} in</span>
              {#if result.statsDiff.distance.diff !== 0}
                  <span class="text-sm font-semibold text-neutral-500">
                      {formatDiff(result.statsDiff.distance.diff)} in
                  </span>
              {/if}
            </div>
        </div>
      </div>

      <!-- Events Log -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          Changes Log
          <span class="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-xs text-neutral-600 dark:text-neutral-300">
            {addedEvents.length + removedEvents.length + changedEvents.length}
          </span>
        </h3>

        {#if addedEvents.length === 0 && removedEvents.length === 0 && changedEvents.length === 0}
            <div class="p-8 text-center bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 border-dashed">
                <p class="text-neutral-500 dark:text-neutral-400 text-sm">No changes detected compared to the last commit.</p>
            </div>
        {:else}
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700/50 overflow-hidden">
                {#each addedEvents as item}
                    <div class="p-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <div class="mt-1 w-2 h-2 rounded-full bg-green-500 flex-none shadow-sm shadow-green-500/50"></div>
                        <div>
                            <p class="text-sm text-neutral-900 dark:text-neutral-100 font-medium">Added Event</p>
                            <p class="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.description}</p>
                        </div>
                    </div>
                {/each}
                {#each removedEvents as item}
                    <div class="p-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <div class="mt-1 w-2 h-2 rounded-full bg-red-500 flex-none shadow-sm shadow-red-500/50"></div>
                        <div>
                            <p class="text-sm text-neutral-900 dark:text-neutral-100 font-medium">Removed Event</p>
                            <p class="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.description}</p>
                        </div>
                    </div>
                {/each}
                {#each changedEvents as item}
                    <div class="p-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <div class="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-none shadow-sm shadow-blue-500/50"></div>
                        <div>
                            <p class="text-sm text-neutral-900 dark:text-neutral-100 font-medium">Modified Event</p>
                            <p class="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.description}</p>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
      </div>

      <!-- Git Operations -->
      <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4 space-y-4">
        <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Version Control</h3>

        <div class="space-y-3">
            <textarea
                bind:value={commitMessage}
                placeholder="Describe your changes..."
                class="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-20 placeholder:text-neutral-400"
            ></textarea>

            <div class="flex items-center justify-between gap-3">
                <button
                    on:click={handleCommit}
                    disabled={isCommitting || !commitMessage.trim()}
                    class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {#if isCommitting}
                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Committing...
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clip-rule="evenodd" />
                        </svg>
                        Commit Changes
                    {/if}
                </button>

                <button
                    on:click={handlePush}
                    disabled={isPushing}
                    class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm font-medium rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                     {#if isPushing}
                        <div class="w-4 h-4 border-2 border-neutral-500/30 border-t-neutral-500 rounded-full animate-spin"></div>
                        Pushing...
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                             <path fill-rule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clip-rule="evenodd" />
                        </svg>
                        Push to Remote
                    {/if}
                </button>
            </div>

            {#if commitStatus}
                <div class="px-3 py-2 rounded-lg text-xs font-medium {statusType === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}">
                    {commitStatus}
                </div>
            {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
       <div class="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
       <div>
           <p class="text-neutral-900 dark:text-white font-medium">Computing Diff</p>
           <p class="text-neutral-500 dark:text-neutral-400 text-sm">Comparing against the last committed version...</p>
       </div>
    </div>
  {/if}
</div>
