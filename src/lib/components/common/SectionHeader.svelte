<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import CollapseToggle from "./CollapseToggle.svelte";

  export let title: string;
  export let collapsed: boolean;
  export let count: number | undefined = undefined;
</script>

<div class="flex items-center justify-between w-full">
  <CollapseToggle bind:collapsed label={title} {count} on:toggle />
  <div class="flex items-center gap-1">
    <slot name="buttons" />
  </div>
</div>
