<script lang="ts">
  import type { Settings } from "../../../../types";
  import SettingsItem from "../SettingsItem.svelte";
  import { handleNumberInput } from "../../../../utils/settingsHelper";

  export let settings: Settings;
  export let searchQuery: string = "";
</script>

<div class="space-y-1">
  <SettingsItem label="Robot Onion Layers" description="Show robot body at intervals along the path" {searchQuery}>
    <input
      type="checkbox"
      bind:checked={settings.showOnionLayers}
      class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-indigo-500 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
    />
  </SettingsItem>

  {#if settings.showOnionLayers}
    <SettingsItem label="Show Only on Current Path" description="Only show onion layers for the selected path" {searchQuery}>
        <input
          type="checkbox"
          bind:checked={settings.onionSkinCurrentPathOnly}
          class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-indigo-500 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        />
    </SettingsItem>

    <SettingsItem label="Onion Layer Spacing" description="Distance in inches between each robot body trace" {searchQuery}>
         <div class="flex items-center gap-2 w-40">
            <input
              type="range"
              min="2" max="20" step="1"
              bind:value={settings.onionLayerSpacing}
              class="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span class="text-xs font-medium w-8 text-right">{settings.onionLayerSpacing || 6}"</span>
         </div>
    </SettingsItem>
  {/if}

  <SettingsItem label="Optimization Iterations" description="Generations the optimizer will run" {searchQuery}>
     <input
      type="number"
      value={settings.optimizationIterations}
      min="10" max="3000" step="1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "optimizationIterations", 10, 3000, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
  </SettingsItem>

  <SettingsItem label="Population Size" description="Candidate paths per generation" {searchQuery}>
     <input
      type="number"
      value={settings.optimizationPopulationSize}
      min="10" max="200" step="1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "optimizationPopulationSize", 10, 200, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <SettingsItem label="Mutation Rate" description="Fraction of control points mutated per generation" {searchQuery}>
     <input
      type="number"
      value={settings.optimizationMutationRate}
      min="0.01" max="1" step="0.01"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "optimizationMutationRate", 0.01, 1, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
    />
  </SettingsItem>

  <SettingsItem label="Mutation Strength" description="Max distance (in) a point can move per mutation" {searchQuery}>
     <input
      type="number"
      value={settings.optimizationMutationStrength}
      min="0.1" max="20" step="0.1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "optimizationMutationStrength", 0.1, 20, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
    />
  </SettingsItem>

  {#if !searchQuery}
      <div class="mt-8 text-center opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-10 mx-auto mb-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <p class="text-xs">More advanced settings coming soon!</p>
      </div>
  {/if}
</div>
