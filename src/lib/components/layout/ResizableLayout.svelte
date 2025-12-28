
<script lang="ts">
  import { onMount } from 'svelte';

  export let showSidebar: boolean = true;
  export let isLargeScreen: boolean = true;
  export let userFieldLimit: number | null = null;
  export let userFieldHeightLimit: number | null = null;
  export let mainContentHeight: number = 800;
  export let mainContentWidth: number = 1200;
  export let showSidebarWidth: number = 0; // Output

  // Constants
  const MIN_SIDEBAR_WIDTH = 400;
  const MIN_FIELD_PANE_WIDTH = 100;

  // State
  let resizeMode: "horizontal" | "vertical" | null = null;
  let mainContentDiv: HTMLElement;

  // -- Reactivity --
  // Calculate the width of the left pane (Field) based on sidebar visibility
  $: leftPaneWidth = (() => {
    if (!showSidebar) return mainContentWidth;

    const targetWidth = userFieldLimit ?? mainContentWidth * 0.55;

    // Clamp values
    const maxWidth = mainContentWidth - MIN_SIDEBAR_WIDTH;
    const minWidth = MIN_FIELD_PANE_WIDTH;

    if (maxWidth < minWidth) return mainContentWidth * 0.5;

    return Math.max(minWidth, Math.min(targetWidth, maxWidth));
  })();

  $: showSidebarWidth = mainContentWidth - leftPaneWidth;

  // -- Event Handlers --
  function startHorizontalResize(e: MouseEvent | TouchEvent) {
    if (!isLargeScreen || !showSidebar) return;
    resizeMode = "horizontal";
  }

  function startVerticalResize(e: MouseEvent | TouchEvent) {
    if (isLargeScreen || !showSidebar) return;
    resizeMode = "vertical";
  }

  function handleResize(clientX: number, clientY: number) {
    if (!resizeMode) return;

    if (resizeMode === "horizontal") {
      userFieldLimit = clientX;
    } else if (resizeMode === "vertical" && mainContentDiv) {
      const rect = mainContentDiv.getBoundingClientRect();
      // Calculate height relative to the top of the main content area
      const newHeight = clientY - rect.top;
      // Clamp values
      const minHeight = 200;
      const maxHeight = rect.height - 100; // Keep at least 100px for control tab
      userFieldHeightLimit = Math.max(
        minHeight,
        Math.min(newHeight, maxHeight),
      );
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!resizeMode) return;
    e.preventDefault();
    handleResize(e.clientX, e.clientY);
  }

  function onTouchMove(e: TouchEvent) {
    if (!resizeMode) return;
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    handleResize(touch.clientX, touch.clientY);
  }

  function stopResize() {
    resizeMode = null;
  }
</script>

<svelte:window
  on:mouseup={stopResize}
  on:mousemove={onMouseMove}
  on:touchend={stopResize}
  on:touchmove={onTouchMove}
/>

<div
    class="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch lg:overflow-hidden relative p-2 gap-2"
    bind:clientHeight={mainContentHeight}
    bind:clientWidth={mainContentWidth}
    bind:this={mainContentDiv}
  >
    <!-- Left Pane Slot -->
    <div
      class="flex-none flex justify-center items-center relative transition-all duration-75 ease-linear"
      style={`
        width: ${isLargeScreen && showSidebar ? leftPaneWidth + "px" : "100%"};
        height: ${isLargeScreen ? "100%" : userFieldHeightLimit ? userFieldHeightLimit + "px" : "auto"};
        min-height: ${!isLargeScreen ? (userFieldHeightLimit ? "0" : "60vh") : "0"};
      `}
    >
        <slot name="left-pane" {leftPaneWidth} {mainContentHeight} {mainContentWidth} />
    </div>

    <!-- Resizer Handle (Desktop only) -->
    {#if isLargeScreen && showSidebar}
      <button
        class="w-2 cursor-col-resize flex justify-center items-center hover:bg-purple-500/50 active:bg-purple-600 transition-colors rounded-sm select-none z-40 border-none bg-transparent p-0 m-0"
        on:mousedown={startHorizontalResize}
        aria-label="Resize Sidebar"
        tabindex="0"
      >
        <div
          class="w-[2px] h-8 bg-neutral-400 dark:bg-neutral-600 rounded-full"
        ></div>
      </button>
    {/if}

    <!-- Resizer Handle (Mobile/Tablet only) -->
    {#if !isLargeScreen && showSidebar}
      <button
        class="h-2 w-full cursor-row-resize flex justify-center items-center hover:bg-purple-500/50 active:bg-purple-600 transition-colors rounded-sm select-none z-40 border-none bg-transparent p-0 m-0"
        on:mousedown={startVerticalResize}
        on:touchstart={startVerticalResize}
        aria-label="Resize Tab"
        tabindex="0"
      >
        <div
          class="h-[2px] w-8 bg-neutral-400 dark:bg-neutral-600 rounded-full"
        ></div>
      </button>
    {/if}

    <!-- Right Pane Slot -->
    <div
      class="flex-1 h-auto lg:h-full min-h-0 min-w-0 transition-all duration-300 ease-in-out"
      class:lg:w-0={!showSidebar && isLargeScreen}
      class:hidden={!showSidebar && isLargeScreen}
      class:overflow-hidden={!showSidebar && isLargeScreen}
    >
        <slot name="right-pane" />
    </div>
</div>
