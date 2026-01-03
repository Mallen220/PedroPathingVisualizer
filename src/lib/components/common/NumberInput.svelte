<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let value: number;
  export let min: number = 0;
  export let max: number = 144;
  export let step: number = 0.1;
  export let disabled: boolean = false;
  export let title: string = "";
  export let ariaLabel: string = "";
  export let className: string = "w-16 sm:w-20"; // Default width
  export let placeholder: string = "";

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseFloat(target.value);
    // Don't update value if NaN (user is typing), but dispatch input
    // The parent binding will handle it or we can let svelte handle it.
    // However, for Svelte `bind:value` with `type="number"`, it handles parsing.
    dispatch("input", e);
  }

  function handleChange(e: Event) {
    dispatch("change", e);
  }

  function handleBlur(e: Event) {
    dispatch("blur", e);
  }
</script>

<input
  type="number"
  bind:value
  {min}
  {max}
  {step}
  {disabled}
  {title}
  {placeholder}
  aria-label={ariaLabel}
  class="{className} px-2 py-1 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  on:change={handleChange}
  on:blur={handleBlur}
  on:input={handleInput}
/>
