
<script lang="ts">
  import { FIELD_SIZE } from '../../../config/defaults';
  import { scaleLinear } from 'd3';

  export let settings: any;
  export let twoElement: HTMLElement;
  export let x: any; // d3 scale
  export let y: any; // d3 scale
  export let robotXY: any;
  export let robotHeading: number;
  export let robotWidth: number;
  export let robotHeight: number;

  // Need to handle error events for images
  function handleImageError(e: Event, fallback: string) {
      const img = e.target as HTMLImageElement;
      if (img) img.src = fallback;
  }
</script>

<div
  bind:this={twoElement}
  class="w-full h-full rounded-lg shadow-md bg-neutral-50 dark:bg-neutral-900 relative overflow-clip"
  role="application"
  style="
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    user-drag: none;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -ms-user-drag: none;
    -o-user-drag: none;
  "
  on:contextmenu={(e) => e.preventDefault()}
  on:dragstart={(e) => e.preventDefault()}
  on:selectstart={(e) => e.preventDefault()}
  tabindex="-1"
  style:transform={`rotate(${settings.fieldRotation || 0}deg)`}
  style:transition="transform 0.3s ease-in-out"
>
    <!-- Field Map Image -->
    <img
    src={settings.fieldMap
      ? `/fields/${settings.fieldMap}`
      : "/fields/decode.webp"}
    alt="Field"
    class="absolute top-0 left-0 w-full h-full rounded-lg z-10"
    style="
    background: transparent;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    user-drag: none;
    -webkit-user-drag: none;
    -moz-user-drag: none;
    -ms-user-drag: none;
    -o-user-drag: none;
    "
    draggable="false"
    on:error={(e) => handleImageError(e, "/fields/decode.webp")}
    on:dragstart={(e) => e.preventDefault()}
    on:selectstart={(e) => e.preventDefault()}
  />

  <!-- Visualization Content (Two.js container) -->
   <slot />

   <!-- Robot Overlay -->
   {#if robotXY}
   <img
    src={settings.robotImage || "/robot.png"}
    alt="Robot"
    style={`position: absolute; top: ${robotXY.y}px;
left: ${robotXY.x}px; transform: translate(-50%, -50%) rotate(${robotHeading}deg); z-index: 20; width: ${x(robotWidth)}px; height: ${x(robotHeight)}px;user-select: none; -webkit-user-select: none; -moz-user-select: none;-ms-user-select: none;
pointer-events: none;`}
    draggable="false"
    on:error={(e) => handleImageError(e, "/robot.png")}
    on:dragstart={(e) => e.preventDefault()}
    on:selectstart={(e) => e.preventDefault()}
  />
  {/if}
</div>
