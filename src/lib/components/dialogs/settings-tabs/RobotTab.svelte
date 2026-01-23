<script lang="ts">
  import type { Settings } from "../../../../types";
  import RobotProfileManager from "../../settings/RobotProfileManager.svelte";
  import SettingsItem from "../SettingsItem.svelte";
  import { handleNumberInput } from "../../../../utils/settingsHelper";

  export let settings: Settings;
  export let searchQuery: string = "";

  function imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert image"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleImageError(e: Event) {
    const target = e.target as HTMLImageElement;
    target.src = "/robot.png";
  }

  async function handleImageUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      try {
        const base64 = await imageToBase64(file);
        settings.robotImage = base64;
        settings = { ...settings };

        const successMsg = document.createElement("div");
        successMsg.className =
          "fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-[2000]";
        successMsg.textContent = "Robot image updated!";
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } catch (error) {
        alert("Error loading image: " + (error as Error).message);
      }
    }
  }
</script>

<div class="space-y-1">
  {#if !searchQuery || 'profile'.includes(searchQuery.toLowerCase())}
      <RobotProfileManager {settings} onSettingsChange={() => (settings = { ...settings })} />
  {/if}

  <SettingsItem label="Robot Length" description="Length of the robot base (in)" {searchQuery}>
    <input
      type="number"
      value={settings.rLength}
      min="1" max="36" step="0.5"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "rLength", 1, 36, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <SettingsItem label="Robot Width" description="Width of the robot base (in)" {searchQuery}>
    <input
      type="number"
      value={settings.rWidth}
      min="1" max="36" step="0.5"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "rWidth", 1, 36, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <SettingsItem label="Safety Margin" description="Buffer around obstacles and field boundaries (in)" {searchQuery}>
    <input
      type="number"
      value={settings.safetyMargin}
      min="0" max="24" step="0.5"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "safetyMargin", 0, 24, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <SettingsItem label="Validate Field Boundaries" description="Warn if robot exits the field" {searchQuery}>
    <input
      type="checkbox"
      bind:checked={settings.validateFieldBoundaries}
      class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
    />
  </SettingsItem>

  <SettingsItem label="Restrict Dragging" description="Keep points inside field bounds" {searchQuery}>
    <input
      type="checkbox"
      bind:checked={settings.restrictDraggingToField}
      class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
    />
  </SettingsItem>

  <SettingsItem label="Continuous Validation" description="Show validation issues while working" {searchQuery}>
    <input
      type="checkbox"
      bind:checked={settings.continuousValidation}
      class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
    />
  </SettingsItem>

  <!-- Robot Image Section: Custom UI -->
  <SettingsItem label="Robot Image" description="Upload a custom image for your robot" {searchQuery}>
      <div class="flex flex-col items-end gap-2">
           <div class="relative w-16 h-16 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 overflow-hidden">
                <img
                  src={settings.robotImage || "/robot.png"}
                  alt="Robot Preview"
                  class="w-full h-full object-contain"
                  on:error={handleImageError}
                />
           </div>
           <div class="flex gap-2">
                <input
                  id="robot-image-input"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  on:change={handleImageUpload}
                />
                <button
                  on:click={() => document.getElementById("robot-image-input")?.click()}
                  class="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  Upload
                </button>
                {#if settings.robotImage && settings.robotImage !== "/robot.png"}
                  <button
                    on:click={() => { settings.robotImage = "/robot.png"; settings = {...settings}; }}
                    class="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 rounded hover:bg-neutral-200"
                  >
                    Reset
                  </button>
                {/if}
                <button
                    on:click={() => { settings.robotImage = "/JefferyThePotato.png"; settings = {...settings}; }}
                    class="potato-tooltip px-2 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 rounded hover:bg-amber-200 relative group overflow-hidden"
                    title="Potato"
                >
                    🥔
                </button>
           </div>
      </div>
  </SettingsItem>
</div>

<style>
  .potato-tooltip {
    position: relative;
  }

  .potato-tooltip::after {
    content: "🥔 POTATO 🥔";
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-5px);
    background: #a16207;
    color: white;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: bold;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 1000;
  }

  .potato-tooltip:hover::after {
    opacity: 1;
  }
</style>
