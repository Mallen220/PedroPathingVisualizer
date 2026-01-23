<script lang="ts">
  import type { Settings, CustomFieldConfig } from "../../../../types";
  import SettingsItem from "../SettingsItem.svelte";
  import { themesStore } from "../../../pluginsStore";
  import { AVAILABLE_FIELD_MAPS } from "../../../../config/defaults";
  import CustomFieldWizard from "../../settings/CustomFieldWizard.svelte";

  export let settings: Settings;
  export let searchQuery: string = "";

  let isCustomFieldWizardOpen = false;
  let editingCustomConfig: CustomFieldConfig | undefined = undefined;

  $: availableMaps = [
    ...AVAILABLE_FIELD_MAPS,
    ...(settings.customMaps || []).map((m) => ({
      value: m.id,
      label: m.name || "Custom Field",
    })),
  ];

  function handleCustomFieldSave(e: CustomEvent<CustomFieldConfig>) {
    const newConfig = e.detail;
    if (!settings.customMaps) settings.customMaps = [];
    const index = settings.customMaps.findIndex((m) => m.id === newConfig.id);
    if (index >= 0) {
      settings.customMaps[index] = newConfig;
    } else {
      settings.customMaps.push(newConfig);
    }
    settings.fieldMap = newConfig.id;
    settings = { ...settings };
  }

  function handleAddCustomMap() {
    editingCustomConfig = undefined;
    isCustomFieldWizardOpen = true;
  }

  function handleEditCustomMap(id: string) {
    editingCustomConfig = settings.customMaps?.find((m) => m.id === id);
    isCustomFieldWizardOpen = true;
  }

  function handleDeleteCustomMap(id: string) {
    if (confirm("Are you sure you want to delete this custom field map?")) {
      settings.customMaps = settings.customMaps?.filter((m) => m.id !== id) || [];
      if (settings.fieldMap === id) {
        settings.fieldMap = "centerstage.webp";
      }
      settings = { ...settings };
    }
  }
</script>

<div class="space-y-1">
  <SettingsItem label="Theme" description="Interface color scheme" {searchQuery}>
     <div class="flex flex-col items-end gap-1">
        <select
          bind:value={settings.theme}
          class="w-40 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="auto">Auto</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          {#each $themesStore as theme}
            <option value={theme.name}>{theme.name}</option>
          {/each}
        </select>
     </div>
  </SettingsItem>

  <SettingsItem label="Program Font Size" description="Adjust the scale of the user interface" {searchQuery}>
     <div class="flex items-center gap-2 w-40">
        <input
          type="range"
          min="75" max="150" step="5"
          bind:value={settings.programFontSize}
          class="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span class="text-xs font-medium w-8 text-right">{settings.programFontSize || 100}%</span>
     </div>
  </SettingsItem>

  <SettingsItem label="Field Map" description="Select the competition field" {searchQuery}>
     <div class="flex flex-col items-end gap-2 w-full max-w-[200px]">
        <div class="flex gap-1 w-full">
            <select
                bind:value={settings.fieldMap}
                class="flex-1 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                {#each availableMaps as field}
                <option value={field.value}>{field.label}</option>
                {/each}
            </select>
            {#if settings.customMaps?.some((m) => m.id === settings.fieldMap)}
                <button
                    title="Delete"
                    class="p-1 text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    on:click={() => handleDeleteCustomMap(settings.fieldMap)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            {/if}
        </div>
        {#if settings.customMaps?.some((m) => m.id === settings.fieldMap)}
            <button
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                on:click={() => handleEditCustomMap(settings.fieldMap)}
            >
                Edit Custom Map
            </button>
        {/if}
        <button
            class="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline"
            on:click={handleAddCustomMap}
        >
            + Add Custom Field Map
        </button>
     </div>
  </SettingsItem>

  <SettingsItem label="Field Orientation" description="Rotate the view of the field" {searchQuery}>
      <div class="flex gap-1">
        {#each [0, 90, 180, 270] as rotation}
            <button
                class="px-2 py-1 text-xs rounded border transition-all duration-200 {settings.fieldRotation === rotation ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}"
                on:click={() => { settings.fieldRotation = rotation; settings = {...settings}; }}
            >
                {rotation}°
            </button>
        {/each}
      </div>
  </SettingsItem>

  <SettingsItem label="Velocity Heatmap" description="Visualize robot speed along path (Green to Red)" {searchQuery}>
    <input
      type="checkbox"
      bind:checked={settings.showVelocityHeatmap}
      class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
    />
  </SettingsItem>
</div>

<CustomFieldWizard
  bind:isOpen={isCustomFieldWizardOpen}
  currentConfig={editingCustomConfig}
  on:save={handleCustomFieldSave}
  on:close={() => (isCustomFieldWizardOpen = false)}
/>
