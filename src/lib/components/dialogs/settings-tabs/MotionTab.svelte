<script lang="ts">
  import type { Settings } from "../../../../types";
  import SettingsItem from "../SettingsItem.svelte";
  import { handleNumberInput } from "../../../../utils/settingsHelper";
  import { DEFAULT_SETTINGS } from "../../../../config/defaults";

  export let settings: Settings;
  export let searchQuery: string = "";

  // Display units state
  let angularVelocityUnit: "rad" | "deg" = "rad";

  // Display value for angular velocity
  $: angularVelocityDisplay = settings
    ? angularVelocityUnit === "rad"
      ? settings.aVelocity / Math.PI
      : (settings.aVelocity * 180) / Math.PI
    : 1;

  // Display value for max angular acceleration
  $: maxAngularAccelerationDisplay = settings
    ? angularVelocityUnit === "rad"
      ? (settings.maxAngularAcceleration ?? 0)
      : ((settings.maxAngularAcceleration ?? 0) * 180) / Math.PI
    : 0;

  function handleAngularVelocityInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseFloat(target.value);
    if (isNaN(val)) return;

    if (angularVelocityUnit === "rad") {
      settings.aVelocity = val * Math.PI;
    } else {
      settings.aVelocity = (val * Math.PI) / 180;
    }
    settings = { ...settings };
  }

  function handleAngularVelocityChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.value === "") {
      settings.aVelocity = DEFAULT_SETTINGS.aVelocity;
      settings = { ...settings };
    } else {
      handleAngularVelocityInput(e);
    }
  }

  function handleMaxAngularAccelerationInput(e: Event) {
    const target = e.target as HTMLInputElement;
    let val = parseFloat(target.value);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;

    if (angularVelocityUnit === "rad") {
      settings.maxAngularAcceleration = val;
    } else {
      settings.maxAngularAcceleration = (val * Math.PI) / 180;
    }
    settings = { ...settings };
  }
</script>

<div class="space-y-1">
  <SettingsItem label="X Velocity" description="Max speed in X direction (in/s)" {searchQuery}>
     <input
      type="number"
      value={settings.xVelocity}
      min="0" step="1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "xVelocity", 0, undefined, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <SettingsItem label="Y Velocity" description="Max speed in Y direction (in/s)" {searchQuery}>
     <input
      type="number"
      value={settings.yVelocity}
      min="0" step="1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "yVelocity", 0, undefined, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <SettingsItem label="Max Velocity" description="Absolute max speed limit (in/s)" {searchQuery}>
     <input
      type="number"
      value={settings.maxVelocity}
      min="0" step="1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "maxVelocity", 0, undefined, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <SettingsItem label="Max Acceleration" description="Max acceleration (in/s²)" {searchQuery}>
     <input
      type="number"
      value={settings.maxAcceleration}
      min="0" step="1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "maxAcceleration", 0, undefined, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <SettingsItem label="Max Deceleration" description="Max deceleration (in/s²)" {searchQuery}>
     <input
      type="number"
      value={settings.maxDeceleration}
      min="0" step="1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "maxDeceleration", 0, undefined, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>

  <!-- Angular Velocity with Unit Toggle -->
  <SettingsItem label="Angular Velocity" description={angularVelocityUnit === "rad" ? "Multiplier of π rad/s" : "deg/s"} {searchQuery}>
    <div class="flex flex-col items-end gap-1">
      <div class="flex items-center text-xs border border-neutral-300 dark:border-neutral-600 rounded overflow-hidden">
        <button
          class="px-2 py-0.5 {angularVelocityUnit === 'rad' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
          on:click={() => (angularVelocityUnit = "rad")}
        >
          π rad/s
        </button>
        <div class="w-px h-full bg-neutral-300 dark:bg-neutral-600"></div>
        <button
          class="px-2 py-0.5 {angularVelocityUnit === 'deg' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
          on:click={() => (angularVelocityUnit = "deg")}
        >
          deg/s
        </button>
      </div>
      <input
        type="number"
        value={angularVelocityDisplay}
        min="0"
        step={angularVelocityUnit === "rad" ? 0.1 : 10}
        on:input={handleAngularVelocityInput}
        on:change={handleAngularVelocityChange}
        class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </SettingsItem>

  <SettingsItem label="Max Angular Accel." description={angularVelocityUnit === "rad" ? "rad/s² (0 to auto-calc)" : "deg/s² (0 to auto-calc)"} {searchQuery}>
     <input
        type="number"
        value={Number((maxAngularAccelerationDisplay ?? 0).toFixed(2))}
        min="0"
        step={angularVelocityUnit === "rad" ? 0.1 : 10}
        on:input={handleMaxAngularAccelerationInput}
        class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
  </SettingsItem>

  <SettingsItem label="Friction Coefficient" description="Higher values = more resistance" {searchQuery}>
     <input
      type="number"
      value={settings.kFriction}
      min="0" step="0.1"
      on:input={(e) => { handleNumberInput(settings, e.currentTarget.value, "kFriction", 0, undefined, true); settings = {...settings}; }}
      class="w-24 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </SettingsItem>
</div>
