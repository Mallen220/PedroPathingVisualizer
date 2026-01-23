<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { onMount } from "svelte";
  import { cubicInOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";
  import { resetSettings, saveSettings } from "../../../utils/settingsPersistence";
  import { DEFAULT_SETTINGS } from "../../../config/defaults";
  import type { Settings } from "../../../types/index";

  // Tabs
  import GeneralTab from "./settings-tabs/GeneralTab.svelte";
  import RobotTab from "./settings-tabs/RobotTab.svelte";
  import MotionTab from "./settings-tabs/MotionTab.svelte";
  import InterfaceTab from "./settings-tabs/InterfaceTab.svelte";
  import FilesTab from "./settings-tabs/FilesTab.svelte";
  import AdvancedTab from "./settings-tabs/AdvancedTab.svelte";
  import AboutTab from "./settings-tabs/AboutTab.svelte";

  // Get version from package. json
  import packageJson from "../../../../package.json";
  let appVersion = packageJson.version;

  export let isOpen = false;
  export let settings: Settings = { ...DEFAULT_SETTINGS };

  let activeTab = "general";
  let searchQuery = "";

  const tabs = [
    { id: "general", label: "General", icon: "HomeIcon" },
    { id: "robot", label: "Robot", icon: "RobotIcon" },
    { id: "motion", label: "Motion", icon: "MotionIcon" },
    { id: "interface", label: "Interface", icon: "SwatchIcon" },
    { id: "file", label: "Files", icon: "FolderIcon" },
    { id: "advanced", label: "Advanced", icon: "CogIcon" },
    { id: "about", label: "About", icon: "InfoIcon" },
  ];

  let downloadCount: number | null = null;

  onMount(async () => {
    try {
      let page = 1;
      let count = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `https://api.github.com/repos/Mallen220/PedroPathingVisualizer/releases?per_page=100&page=${page}`,
        );

        if (response.ok) {
          const releases = await response.json();
          if (releases.length === 0) {
            hasMore = false;
          } else {
            releases.forEach((release: any) => {
              release.assets.forEach((asset: any) => {
                // Filter for application binaries to avoid counting metadata files (like latest.yml)
                // which might be downloaded automatically by updaters.
                const name = asset.name.toLowerCase();
                if (
                  name.endsWith(".exe") ||
                  name.endsWith(".dmg") ||
                  name.endsWith(".deb") ||
                  name.endsWith(".rpm") ||
                  name.endsWith(".appimage") ||
                  name.endsWith(".pkg") ||
                  name.endsWith(".zip") ||
                  name.endsWith(".tar.gz")
                ) {
                  count += asset.download_count;
                }
              });
            });
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      downloadCount = count;
    } catch (e) {
      console.error("Failed to fetch download count", e);
    }
  });

  async function handleReset() {
    if (
      confirm(
        "Are you sure you want to reset all settings to defaults? This cannot be undone.",
      )
    ) {
      const defaultSettings = await resetSettings();
      // Update the bound settings object
      Object.keys(defaultSettings).forEach((key) => {
        (settings as any)[key] = (defaultSettings as any)[key];
      });

      // Prevent the UI from immediately triggering the onboarding tutorial
      // when the user resets settings. Mark onboarding as seen and persist.
      (settings as any).hasSeenOnboarding = true;
      settings = { ...settings };
      try {
        await saveSettings(settings);
      } catch (e) {
        console.warn("Failed to persist settings after reset", e);
      }
    }
  }

  function closeDialog() {
    isOpen = false;
  }

  // Clear search when closing
  $: if (!isOpen) searchQuery = "";
</script>

{#if isOpen}
  <div
    transition:fade={{ duration: 200, easing: cubicInOut }}
    class="fixed inset-0 z-[1005] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
  >
    <div
      transition:fly={{ y: 20, duration: 300, easing: cubicInOut }}
      class="flex w-full max-w-5xl h-[80vh] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
    >
      <!-- Sidebar -->
      <div class="w-64 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <!-- Sidebar Header / Search -->
        <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
           <h2 id="settings-title" class="text-lg font-bold text-neutral-900 dark:text-white mb-3 px-1">Settings</h2>
           <div class="relative">
             <input
               type="text"
               bind:value={searchQuery}
               placeholder="Search settings..."
               class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-white"
             />
             <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
           </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto p-2 space-y-0.5">
           {#each tabs as tab}
             <button
               on:click={() => { activeTab = tab.id; searchQuery = ""; }}
               class="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors {activeTab === tab.id && !searchQuery ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}"
             >
                <!-- Icons (Inline for simplicity) -->
                {#if tab.icon === "HomeIcon"}
                   <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 size-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                {:else if tab.icon === "RobotIcon"}
                   <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 size-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
                {:else if tab.icon === "MotionIcon"}
                   <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 size-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                {:else if tab.icon === "SwatchIcon"}
                   <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 size-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" /></svg>
                {:else if tab.icon === "FolderIcon"}
                   <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 size-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 6v.776" /></svg>
                {:else if tab.icon === "CogIcon"}
                   <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 size-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 6v.776" /></svg>
                {:else if tab.icon === "InfoIcon"}
                   <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 size-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                {/if}
                {tab.label}
             </button>
           {/each}
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-4 border-t border-neutral-200 dark:border-neutral-800">
           <button
             on:click={handleReset}
             class="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
           >
              <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
              Reset All Settings
           </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900">
         <!-- Header (Title + Close) -->
         <div class="flex items-center justify-between p-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800">
            <div>
               <h3 class="text-xl font-bold text-neutral-900 dark:text-white">
                  {searchQuery ? "Search Results" : tabs.find(t => t.id === activeTab)?.label}
               </h3>
               {#if searchQuery}
                 <p class="text-sm text-neutral-500">
                    Showing matches for "{searchQuery}"
                 </p>
               {/if}
            </div>
            <button
               on:click={() => (isOpen = false)}
               class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
               aria-label="Close"
            >
               <svg xmlns="http://www.w3.org/2000/svg" class="size-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
         </div>

         <!-- Scrollable Content -->
         <div class="flex-1 overflow-y-auto p-4 sm:p-8">
            {#if searchQuery}
               <!-- Render all tabs stacked, but they filter themselves -->
               <div class="space-y-8">
                   <div class="space-y-4">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">General</h4>
                      <GeneralTab {closeDialog} {searchQuery} />
                   </div>
                   <div class="space-y-4">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Robot</h4>
                      <RobotTab bind:settings {searchQuery} />
                   </div>
                   <div class="space-y-4">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Motion</h4>
                      <MotionTab bind:settings {searchQuery} />
                   </div>
                   <div class="space-y-4">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Interface</h4>
                      <InterfaceTab bind:settings {searchQuery} />
                   </div>
                   <div class="space-y-4">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Files</h4>
                      <FilesTab bind:settings {searchQuery} />
                   </div>
                   <div class="space-y-4">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Advanced</h4>
                      <AdvancedTab bind:settings {searchQuery} />
                   </div>
               </div>
            {:else}
               <!-- Active Tab Only -->
               <div transition:fade={{ duration: 150 }}>
                   {#if activeTab === "general"}
                      <GeneralTab {closeDialog} />
                   {:else if activeTab === "robot"}
                      <RobotTab bind:settings />
                   {:else if activeTab === "motion"}
                      <MotionTab bind:settings />
                   {:else if activeTab === "interface"}
                      <InterfaceTab bind:settings />
                   {:else if activeTab === "file"}
                      <FilesTab bind:settings />
                   {:else if activeTab === "advanced"}
                      <AdvancedTab bind:settings />
                   {:else if activeTab === "about"}
                      <AboutTab {appVersion} {downloadCount} />
                   {/if}
               </div>
            {/if}
         </div>
      </div>
    </div>
  </div>
{/if}
