<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import TrashIcon from "./icons/TrashIcon.svelte";
  import { fade, scale } from "svelte/transition";

  export let disabled = false;
  export let title = "Remove";
  export let confirmTitle = "Confirm Removal";
  export let className = "";

  const dispatch = createEventDispatcher();
  let confirming = false;
  let timeout: ReturnType<typeof setTimeout>;

  function handleClick(e: MouseEvent) {
    e.stopPropagation();

    if (disabled) return;

    if (!confirming) {
      confirming = true;
      timeout = setTimeout(() => {
        confirming = false;
      }, 3000); // 3 seconds to confirm
    } else {
      clearTimeout(timeout);
      confirming = false;
      dispatch("click");
    }
  }

  function handleBlur() {
    // If we tab away, cancel confirmation
    // delaying slightly to allow click to register if it was a click that caused blur (unlikely on button itself)
    setTimeout(() => {
      confirming = false;
      clearTimeout(timeout);
    }, 200);
  }
</script>

<button
  type="button"
  {title}
  aria-label={confirming ? confirmTitle : title}
  class="{className} transition-all duration-200 flex items-center justify-center overflow-hidden"
  class:w-20={confirming}
  class:px-2={confirming}
  on:click={handleClick}
  on:mouseleave={() => {
    // Optional: cancel on mouse leave? No, that's annoying.
  }}
  on:blur={handleBlur}
  {disabled}
  aria-disabled={disabled}
>
  {#if confirming}
    <span
      in:fade={{ duration: 150 }}
      class="text-xs font-bold text-red-600 dark:text-red-400 whitespace-nowrap"
    >
      Confirm?
    </span>
  {:else}
    <div in:scale={{ duration: 150, start: 0.8 }}>
      <TrashIcon className="size-5" strokeWidth={2} />
    </div>
  {/if}
</button>
