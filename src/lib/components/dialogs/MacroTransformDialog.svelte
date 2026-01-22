<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { cubicInOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";
  import type { SequenceMacroItem, Transformation } from "../../../types";

  export let isOpen = false;
  export let macro: SequenceMacroItem;
  export let onSave: () => void;

  let activeTab: "translate" | "rotate" | "flip" = "translate";

  // Form State
  let dx = 0;
  let dy = 0;
  let degrees = 90;
  let pivotType: "origin" | "center" | "custom" = "center";
  let pivotX = 72; // Default center field
  let pivotY = 72;
  let flipAxis: "horizontal" | "vertical" = "horizontal";

  function addTransform() {
    let t: Transformation;
    if (activeTab === "translate") {
      if (dx === 0 && dy === 0) return;
      t = { type: "translate", dx, dy };
    } else if (activeTab === "rotate") {
      if (degrees === 0) return;
      t = {
        type: "rotate",
        degrees,
        pivot: pivotType === "custom" ? { x: pivotX, y: pivotY } : pivotType,
      };
    } else {
      t = {
        type: "flip",
        axis: flipAxis,
        pivot: pivotType === "custom" ? { x: pivotX, y: pivotY } : pivotType,
      };
    }

    if (!macro.transformations) macro.transformations = [];
    macro.transformations = [...macro.transformations, t];

    // Reset fields for next add
    dx = 0;
    dy = 0;
    // Keep degrees/pivot settings as they might be reused
  }

  function removeTransform(index: number) {
    if (!macro.transformations) return;
    macro.transformations = macro.transformations.filter((_: Transformation, i: number) => i !== index);
  }

  function moveTransform(index: number, delta: number) {
    if (!macro.transformations) return;
    const newIdx = index + delta;
    if (newIdx < 0 || newIdx >= macro.transformations.length) return;

    const item = macro.transformations[index];
    const newTransforms = [...macro.transformations];
    newTransforms.splice(index, 1);
    newTransforms.splice(newIdx, 0, item);
    macro.transformations = newTransforms;
  }

  function handleSave() {
    onSave();
    isOpen = false;
  }

  function formatPivot(t: Transformation) {
    if (!t.pivot || t.pivot === "origin") return "Origin (0,0)";
    if (t.pivot === "center") return "Center";
    return `(${t.pivot.x.toFixed(1)}, ${t.pivot.y.toFixed(1)})`;
  }
</script>

{#if isOpen}
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 z-[1005] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
  >
    <div
      transition:fly={{ y: 20, duration: 300, easing: cubicInOut }}
      class="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-neutral-200 dark:border-neutral-800"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white">Transform Macro</h2>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">
                Modify "{macro.name}" instance geometry
            </div>
        </div>
        <button
          on:click={() => (isOpen = false)}
          class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6">

        <!-- Add New Transform Section -->
        <div class="space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Add Transformation</h3>

            <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-1 flex gap-1">
                <button
                    class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all {activeTab === 'translate' ? 'bg-white dark:bg-neutral-700 shadow text-blue-600 dark:text-blue-400' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}"
                    on:click={() => activeTab = 'translate'}
                >
                    Translate
                </button>
                <button
                    class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all {activeTab === 'rotate' ? 'bg-white dark:bg-neutral-700 shadow text-blue-600 dark:text-blue-400' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}"
                    on:click={() => activeTab = 'rotate'}
                >
                    Rotate
                </button>
                <button
                    class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all {activeTab === 'flip' ? 'bg-white dark:bg-neutral-700 shadow text-blue-600 dark:text-blue-400' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}"
                    on:click={() => activeTab = 'flip'}
                >
                    Flip
                </button>
            </div>

            <div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-4">
                {#if activeTab === 'translate'}
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-neutral-500 mb-1">X Delta (in)</label>
                            <input type="number" bind:value={dx} class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-neutral-500 mb-1">Y Delta (in)</label>
                            <input type="number" bind:value={dy} class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                {:else if activeTab === 'rotate'}
                    <div>
                        <label class="block text-xs font-medium text-neutral-500 mb-1">Rotation Angle (degrees)</label>
                        <input type="number" bind:value={degrees} class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-neutral-500 mb-2">Pivot Point</label>
                        <div class="flex gap-4 mb-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" bind:group={pivotType} value="center" class="text-blue-600 focus:ring-blue-500" />
                                <span class="text-sm">Center</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" bind:group={pivotType} value="origin" class="text-blue-600 focus:ring-blue-500" />
                                <span class="text-sm">Origin (0,0)</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" bind:group={pivotType} value="custom" class="text-blue-600 focus:ring-blue-500" />
                                <span class="text-sm">Custom</span>
                            </label>
                        </div>
                        {#if pivotType === 'custom'}
                            <div class="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-500/20">
                                <div>
                                    <label class="block text-xs font-medium text-neutral-500 mb-1">Pivot X</label>
                                    <input type="number" bind:value={pivotX} class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-neutral-500 mb-1">Pivot Y</label>
                                    <input type="number" bind:value={pivotY} class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm" />
                                </div>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div>
                        <label class="block text-xs font-medium text-neutral-500 mb-2">Flip Axis</label>
                        <div class="flex gap-4 mb-4">
                            <label class="flex items-center gap-2 cursor-pointer p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex-1">
                                <input type="radio" bind:group={flipAxis} value="horizontal" class="text-blue-600 focus:ring-blue-500" />
                                <div class="flex flex-col">
                                    <span class="text-sm font-medium">Horizontal</span>
                                    <span class="text-xs text-neutral-500">Left ↔ Right</span>
                                </div>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex-1">
                                <input type="radio" bind:group={flipAxis} value="vertical" class="text-blue-600 focus:ring-blue-500" />
                                <div class="flex flex-col">
                                    <span class="text-sm font-medium">Vertical</span>
                                    <span class="text-xs text-neutral-500">Top ↕ Bottom</span>
                                </div>
                            </label>
                        </div>

                        <label class="block text-xs font-medium text-neutral-500 mb-2">Flip Around</label>
                        <div class="flex gap-4 mb-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" bind:group={pivotType} value="center" class="text-blue-600 focus:ring-blue-500" />
                                <span class="text-sm">Center</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" bind:group={pivotType} value="origin" class="text-blue-600 focus:ring-blue-500" />
                                <span class="text-sm">Origin (0,0)</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" bind:group={pivotType} value="custom" class="text-blue-600 focus:ring-blue-500" />
                                <span class="text-sm">Custom Point</span>
                            </label>
                        </div>
                        {#if pivotType === 'custom'}
                            <div class="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-500/20">
                                <div>
                                    <label class="block text-xs font-medium text-neutral-500 mb-1">Pivot X</label>
                                    <input type="number" bind:value={pivotX} class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-neutral-500 mb-1">Pivot Y</label>
                                    <input type="number" bind:value={pivotY} class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm" />
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                <button
                    on:click={addTransform}
                    class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors"
                >
                    Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </button>
            </div>
        </div>

        <!-- Applied Transforms List -->
        <div class="space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span>Applied Transformations</span>
                <span class="text-xs font-normal text-neutral-500 lowercase bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">{(macro.transformations || []).length} items</span>
            </h3>

            {#if !macro.transformations || macro.transformations.length === 0}
                <div class="text-center py-8 text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700">
                    No transformations applied.
                </div>
            {:else}
                <div class="space-y-2">
                    {#each macro.transformations as t, i}
                        <div class="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm">
                            <div class="flex-none p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                {#if t.type === 'translate'}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                                    </svg>
                                {:else if t.type === 'rotate'}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                    </svg>
                                {/if}
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-semibold text-neutral-900 dark:text-white capitalize">{t.type}</div>
                                <div class="text-xs text-neutral-500">
                                    {#if t.type === 'translate'}
                                        X: {t.dx ?? 0}, Y: {t.dy ?? 0}
                                    {:else if t.type === 'rotate'}
                                        {t.degrees}° around {formatPivot(t)}
                                    {:else}
                                        {t.axis} around {formatPivot(t)}
                                    {/if}
                                </div>
                            </div>

                            <div class="flex items-center gap-1">
                                <button on:click={() => moveTransform(i, -1)} disabled={i === 0} class="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                                <button on:click={() => moveTransform(i, 1)} disabled={i === macro.transformations.length - 1} class="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                                <button on:click={() => removeTransform(i)} class="p-1 text-red-400 hover:text-red-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
        <button
          on:click={() => (isOpen = false)}
          class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={handleSave}
          class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
        >
          Apply Changes
        </button>
      </div>
    </div>
  </div>
{/if}
