
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { getTransformedCoordinates } from '../../../utils/interactive';
  import { scaleLinear } from 'd3';
  import { FIELD_SIZE } from '../../../config/defaults';

  // Props
  export let settings: any;
  // export let width: number; // Unused in script, removed
  // export let height: number; // Unused in script, removed

  // Removed showGrid as it is unused

  export let snapToGrid = false;
  export const robotXY: any = null; // Unused in this file logic, but passed for binding consistency if needed
  export const robotHeading: number = 0; // Unused in this file logic
  export let x: any; // d3 scale
  export let y: any; // d3 scale

  // If you can't pass 'twoElement', you might need to bind it inside the visualization component
  // But here we are wrapping the visualization component.

  const dispatch = createEventDispatcher();

  let container: HTMLDivElement;
  let currentMouseX = 0;
  let currentMouseY = 0;
  let isMouseOverField = false;
  let isObstructingHUD = false;
  let isDown = false;
  let dragOffset = { x: 0, y: 0 };
  let currentElem: string | null = null;

  // We need to know which element is under the cursor.
  // The original App.svelte used 'two.renderer.domElement'.
  // If we wrap the FieldVisualization, we can listen to events on the container.
  // However, hit testing in SVG/Canvas (Two.js) is usually done by the library or by checking elements.
  // If Two.js renders SVG, the elements are in the DOM.

  function handleMouseMove(evt: MouseEvent) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Assuming container is the Two.js container or wraps it tightly.
    // If rotation is applied to the child, we must account for it.

    // Note: getTransformedCoordinates logic was in App.svelte. We need to move it to a util or duplicate.
    // I'll assume I can import it or reproduce it.

    const transformed = getTransformedCoordinates(
      evt.clientX,
      evt.clientY,
      rect,
      settings.fieldRotation || 0
    );

    let mouseX = x.invert(transformed.x);
    let mouseY = y.invert(transformed.y);

    // Grid snap
    if (snapToGrid) {
      mouseX = Math.round(mouseX / 6) * 6;
      mouseY = Math.round(mouseY / 6) * 6;
    }

    // Clamp
    mouseX = Math.max(0, Math.min(FIELD_SIZE, mouseX));
    mouseY = Math.max(0, Math.min(FIELD_SIZE, mouseY));

    currentMouseX = mouseX;
    currentMouseY = mouseY;
    isMouseOverField = true;

    // Check obstruction for HUD (roughly top left corner)
    isObstructingHUD = transformed.x < 120 && transformed.y < 60; // Approximate

    dispatch('mousemove', { mouseX, mouseY, rawEvent: evt });

    // Dragging logic
    if (isDown && currentElem) {
        // ... dragging logic to be implemented or emitted
        dispatch('drag', { id: currentElem, x: mouseX, y: mouseY, dx: dragOffset.x, dy: dragOffset.y });
    }

    // Cursor logic requires knowing what is under the mouse.
    // If using SVG, we can check evt.target
    const target = evt.target as HTMLElement;
    if (target && target.id && (target.id.startsWith('point') || target.id.startsWith('obstacle'))) {
        container.style.cursor = "pointer";
        if (!isDown) currentElem = target.id; // Hover effect
    } else {
        container.style.cursor = "auto";
        if (!isDown) currentElem = null;
    }
  }

  function handleMouseDown(evt: MouseEvent) {
      isDown = true;
      // Identify what was clicked
      const target = evt.target as HTMLElement;
      // Traversing up to find group id if needed, or check direct target
      // Two.js usually creates groups.
      let clickedId = null;
      // This part depends on how Two.js renders SVG structure.
      // Usually it's <g id="point-1-2"> <circle ...> </g>
      // The event target might be the circle or path inside the group.

      // Simple approximation: check id of target or parent
      let el: HTMLElement | null = target;
      while(el && el !== container) {
          if (el.id && (el.id.startsWith('point-') || el.id.startsWith('obstacle-') || el.id.startsWith('line-'))) {
              clickedId = el.id;
              break;
          }
          el = el.parentElement;
      }

      currentElem = clickedId;

      if (clickedId) {
          // Calculate drag offset if needed
          // For now, emit selection
           dispatch('select', { id: clickedId });
      }

      dispatch('mousedown', { mouseX: currentMouseX, mouseY: currentMouseY, rawEvent: evt });
  }

  function handleMouseUp(evt: MouseEvent) {
      isDown = false;
      dragOffset = { x: 0, y: 0 };
      dispatch('mouseup');
      dispatch('recordChange');
  }

  function handleMouseLeave() {
      isMouseOverField = false;
      dispatch('mouseleave');
  }

  function handleDblClick(evt: MouseEvent) {
      if (currentElem) return; // Don't create new point if double clicking an existing one
      dispatch('dblclick', { mouseX: currentMouseX, mouseY: currentMouseY });
  }

</script>

<div
    bind:this={container}
    class="w-full h-full relative"
    on:mousemove={handleMouseMove}
    on:mousedown={handleMouseDown}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseLeave}
    on:dblclick={handleDblClick}
    role="application"
>
    <slot
        {currentMouseX}
        {currentMouseY}
        {isMouseOverField}
        {isObstructingHUD}
    />
</div>
