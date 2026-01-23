<script lang="ts">
  import { showPluginManager, showShortcuts, startTutorial } from "../../../../stores";
  import SettingsItem from "../SettingsItem.svelte";

  export let closeDialog: () => void;
  export let searchQuery: string = "";
</script>

<div class="space-y-1">
  <SettingsItem label="Welcome Tutorial" description="Start the interactive tutorial" {searchQuery}>
     <button
        on:click={() => {
           closeDialog();
           startTutorial.set(true);
        }}
        class="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
     >
        Start Tutorial
     </button>
  </SettingsItem>

  <SettingsItem label="Keyboard Shortcuts" description="View and customize keyboard shortcuts" {searchQuery}>
     <button
        on:click={() => showShortcuts.set(true)}
        class="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
     >
        Open Editor
     </button>
  </SettingsItem>

  <SettingsItem label="Plugin Manager" description="Manage extensions and plugins" {searchQuery}>
     <button
        on:click={() => {
           closeDialog();
           showPluginManager.set(true);
        }}
        class="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
     >
        Open Manager
     </button>
  </SettingsItem>
</div>
