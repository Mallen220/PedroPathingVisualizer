<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Note } from "../../types";
  import type { ScaleLinear } from "d3";

  export let note: Note;
  export let x: ScaleLinear<number, number>;
  export let y: ScaleLinear<number, number>;
  export let rotation: number = 0; // Field rotation to counter-rotate

  const dispatch = createEventDispatcher<{
    update: Note;
    delete: string;
  }>();

  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let node: HTMLElement;
  let isEditing = false;
  let textarea: HTMLTextAreaElement;

  function handleMouseDown(e: MouseEvent) {
    if (isEditing) return;
    if (e.button !== 0) return; // Only left click

    e.stopPropagation();
    isDragging = true;

    // We need to calculate offset relative to the note's top-left
    // But since the note might be rotated, this is tricky.
    // However, we simply want to preserve the distance between mouse and anchor during drag.

    // Actually, simpler approach:
    // On mouse move, we calculate the delta from the start mouse position,
    // convert that delta to field inches (accounting for zoom/rotation if needed),
    // and add it to the original note position.

    // But here we are inside a container that is ALREADY rotated and zoomed/panned (via x/y scales and CSS transform).
    // The parent container has the CSS transform `rotate(fieldRotation)`.
    // The `x` and `y` scales map inches to pixels within that rotated coordinate system.

    // So if we move mouse 10px right on screen:
    // If rotation is 0: x increases.
    // If rotation is 90: y increases?

    // Wait, the mouse events are global (screen coordinates).
    // We need to transform mouse movement into the local coordinate system of the container.

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startNoteX = note.x;
    const startNoteY = note.y;

    const handleMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startMouseX;
        const dy = ev.clientY - startMouseY;

        // Rotate delta if needed because the container is rotated
        // The container is rotated by `rotation` degrees.
        // So visual DX aligns with local rotated axis.
        // We need to map visual (screen) DX/DY to local (container) DX/DY.
        // Local = InverseRotate(Visual)

        const rad = -(rotation * Math.PI) / 180;
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

        // Convert local pixel delta to inches
        // x scale is linear, so (x(1) - x(0)) is pixels per inch.
        // We can just use x.invert to get inches.
        // But x.invert includes pan/zoom offset.
        // Delta inches = localDx / (pixels per inch).

        // Pixels per inch calculation:
        const ppi = x(1) - x(0); // Assuming x(0) is mapped
        // Actually scale might be inverted for Y.
        // y(1) - y(0) might be negative.

        const inchDx = localDx / (x(1) - x(0));
        const inchDy = localDy / (y(0) - y(1)); // y is typically inverted in screen coords (0 at top)
        // Wait, y scale domain [0, 144] -> range [height, 0] usually.
        // So y(1) < y(0). y(0) - y(1) is positive pixels per inch.
        // BUT `dy` is positive downwards.
        // If we move mouse down (positive dy), we want y inches to change appropriately.
        // In field coords, y usually increases upwards?
        // Let's check FieldRenderer scales:
        // domain [0, FIELD_SIZE], range [height ..., 0 ...]
        // So 0 is at bottom (high pixel value), 144 is at top (low pixel value).
        // So moving mouse down (increasing pixel Y) means DECREASING field Y.
        // So inchDy should be -localDy / ppi?

        // Let's rely on invert.
        // newPixelsX = x(startNoteX) + localDx;
        // newPixelsY = y(startNoteY) + localDy;
        // newNoteX = x.invert(newPixelsX);
        // newNoteY = y.invert(newPixelsY);

        const currentPixelsX = x(startNoteX);
        const currentPixelsY = y(startNoteY);

        const newPixelsX = currentPixelsX + localDx;
        const newPixelsY = currentPixelsY + localDy;

        const newNoteX = x.invert(newPixelsX);
        const newNoteY = y.invert(newPixelsY);

        dispatch("update", { ...note, x: newNoteX, y: newNoteY });
    };

    const handleMouseUp = () => {
        isDragging = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function toggleEdit() {
    isEditing = true;
    setTimeout(() => {
        if (textarea) {
            textarea.focus();
            textarea.select();
        }
    }, 0);
  }

  function saveEdit() {
      isEditing = false;
      dispatch("update", { ...note, text: note.text });
  }

  function deleteNote() {
    dispatch("delete", note.id);
  }
</script>

<div
  bind:this={node}
  class="absolute flex flex-col gap-1 shadow-md rounded p-2 min-w-[150px] max-w-[250px] pointer-events-auto border transition-colors"
  class:cursor-grab={!isEditing}
  class:cursor-text={isEditing}
  class:active:cursor-grabbing={!isEditing && isDragging}
  style="
    left: {x(note.x)}px;
    top: {y(note.y)}px;
    transform: translate(0, 0) rotate({-rotation}deg);
    transform-origin: top left;
    background-color: {note.color || '#fef08a'}; /* yellow-200 */
    border-color: {note.color ? 'rgba(0,0,0,0.1)' : '#facc15'}; /* yellow-400 */
    color: #000;
  "
  on:mousedown={handleMouseDown}
  role="note"
  aria-label="Field note"
>
    <!-- Header -->
    <div class="flex justify-between items-center text-xs opacity-70 mb-1 select-none">
        <span class="font-bold uppercase tracking-wider text-[10px]">Note</span>
        <button
            class="hover:bg-black/10 rounded px-1.5 py-0.5 transition-colors"
            on:click|stopPropagation={deleteNote}
            title="Delete Note"
        >
            ✕
        </button>
    </div>

    <!-- Content -->
    {#if isEditing}
        <textarea
            bind:this={textarea}
            bind:value={note.text}
            class="w-full min-h-[4rem] bg-white/50 text-sm p-1 rounded resize-y focus:outline-none focus:bg-white focus:ring-1 focus:ring-black/20"
            on:blur={saveEdit}
            on:keydown={(e) => { e.stopPropagation(); /* prevent app shortcuts */ }}
            on:mousedown={(e) => e.stopPropagation()}
        />
    {:else}
        <div
            class="text-sm whitespace-pre-wrap break-words min-h-[1.5rem]"
            on:dblclick={toggleEdit}
            role="button"
            tabindex="0"
        >
            {note.text || "Double click to edit"}
        </div>
    {/if}
</div>
