<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import NumberInput from "./NumberInput.svelte";
  const dispatch = createEventDispatcher();

  export let x: number;
  export let y: number;
  export let disabled: boolean = false;
  export let min: number = 0;
  export let max: number = 144;
  export let step: number = 0.1;
  export let labelX: string = "X:";
  export let labelY: string = "Y:";
  export let ariaLabelPrefix: string = "";
  export let title: string = "";
  export let className: string = "w-16 sm:w-20";

  function onChange() {
    dispatch("change");
  }
</script>

<div class="flex items-center gap-2">
  <span class="text-xs text-neutral-600 dark:text-neutral-400 font-extralight"
    >{labelX}</span
  >
  <NumberInput
    bind:value={x}
    {min}
    {max}
    {step}
    {disabled}
    {title}
    ariaLabel="{ariaLabelPrefix} X"
    {className}
    on:change={onChange}
    on:input
  />
  <span class="text-xs text-neutral-600 dark:text-neutral-400 font-extralight"
    >{labelY}</span
  >
  <NumberInput
    bind:value={y}
    {min}
    {max}
    {step}
    {disabled}
    {title}
    ariaLabel="{ariaLabelPrefix} Y"
    {className}
    on:change={onChange}
    on:input
  />
</div>
