<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import { slide } from "svelte/transition";

  export let value: string = "";
  export let options: string[] = [];
  export let placeholder: string = "Search or add new...";
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  let isOpen = false;
  let inputElement: HTMLInputElement;
  let activeIndex = -1;
  // Unique ID for this instance to support multiple dropdowns on one page
  let listboxId = `dropdown-list-${Math.random().toString(36).substring(2, 9)}`;

  // Filter options based on current input
  $: filteredOptions = options
    .filter((opt) => opt.toLowerCase().includes(value.toLowerCase()))
    .sort();

  // Reset active index when options change
  $: {
    if (filteredOptions) activeIndex = -1;
  }

  function handleInput(e: Event) {
    value = (e.target as HTMLInputElement).value;
    isOpen = true;
    activeIndex = -1;
    dispatch("change", value);
  }

  function handleFocus() {
    isOpen = true;
  }

  function handleBlur() {
    // Small delay to allow click on dropdown item to register if mousedown didn't catch it
    // or if focus moved elsewhere
    setTimeout(() => {
      isOpen = false;
      activeIndex = -1;
    }, 200);
  }

  function selectOption(opt: string) {
    value = opt;
    isOpen = false;
    activeIndex = -1;
    dispatch("change", value);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
        e.preventDefault(); // Prevent form submission
        selectOption(filteredOptions[activeIndex]);
      } else {
        isOpen = false;
        inputElement.blur();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      isOpen = false;
      inputElement.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        isOpen = true;
        activeIndex = 0;
      } else {
        activeIndex = (activeIndex + 1) % filteredOptions.length;
        scrollToActive();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        isOpen = true;
        activeIndex = filteredOptions.length - 1;
      } else {
        if (activeIndex === -1) {
          activeIndex = filteredOptions.length - 1;
        } else {
          activeIndex =
            (activeIndex - 1 + filteredOptions.length) % filteredOptions.length;
        }
        scrollToActive();
      }
    }
  }

  async function scrollToActive() {
    await tick();
    const activeEl = document.getElementById(
      `${listboxId}-option-${activeIndex}`,
    );
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }
</script>

<div class="relative w-full">
  <input
    bind:this={inputElement}
    type="text"
    bind:value
    {placeholder}
    {disabled}
    class="text-sm font-medium bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-2 py-0.5 w-full"
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:keydown={handleKeydown}
    aria-label={placeholder}
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={isOpen}
    aria-controls={isOpen ? listboxId : undefined}
    aria-activedescendant={isOpen && activeIndex >= 0
      ? `${listboxId}-option-${activeIndex}`
      : undefined}
  />

  {#if isOpen && filteredOptions.length > 0}
    <ul
      id={listboxId}
      role="listbox"
      transition:slide={{ duration: 150 }}
      class="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg p-0 m-0 list-none"
    >
      {#each filteredOptions as option, index}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- Key events handled by input -->
        <li
          id={`${listboxId}-option-${index}`}
          role="option"
          aria-selected={index === activeIndex}
          class="w-full text-left px-3 py-1.5 text-sm cursor-pointer {index ===
          activeIndex
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100'
            : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-neutral-700 dark:text-neutral-200'}"
          on:mousedown|preventDefault={() => selectOption(option)}
        >
          {option}
        </li>
      {/each}
    </ul>
  {/if}
</div>
