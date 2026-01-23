<script lang="ts">
  import type { Settings } from "../../../../types";
  import SettingsItem from "../SettingsItem.svelte";
  import { fade } from "svelte/transition";

  export let settings: Settings;
  export let searchQuery: string = "";
</script>

<div class="space-y-1">
  <SettingsItem label="Git Integration" description="Show git status indicators for files" {searchQuery}>
    <input
      type="checkbox"
      bind:checked={settings.gitIntegration}
      class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
    />
  </SettingsItem>

  <SettingsItem label="Autosave Mode" description="Choose when to automatically save the project" {searchQuery}>
      <select
        bind:value={settings.autosaveMode}
        class="w-32 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="never">Never</option>
        <option value="time">Time Based</option>
        <option value="change">On Change</option>
        <option value="close">On Close</option>
      </select>
  </SettingsItem>

  {#if settings.autosaveMode === "time"}
    <div transition:fade>
      <SettingsItem label="Autosave Interval" description={`Save every ${settings.autosaveInterval} minutes`} {searchQuery}>
          <select
            bind:value={settings.autosaveInterval}
            class="w-32 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {#each [1, 5, 10, 15, 20, 40, 60] as interval}
              <option value={interval}>{interval} minutes</option>
            {/each}
          </select>
      </SettingsItem>
    </div>
  {/if}
</div>
