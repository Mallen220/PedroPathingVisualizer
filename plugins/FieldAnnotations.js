// Field Annotations Plugin
// Adds sticky notes to the field

// 1. Register the AnnotationOverlay component
// The component class is exposed via pedro.components.AnnotationOverlay
pedro.registries.fieldOverlays.register({
  id: "AnnotationOverlay",
  component: pedro.components.AnnotationOverlay,
});

// 2. Register Context Menu Item to add a note
pedro.registries.contextMenu.register({
  label: "Add Note",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`,
  action: (x, y) => {
    // Access annotationsStore via pedro.stores.project.annotationsStore
    const { annotationsStore } = pedro.stores.project;
    const { get } = pedro.stores;

    // Generate ID (simple random or uuid)
    const id = `note-${Math.random().toString(36).slice(2)}`;

    const newNote = {
      id,
      x,
      y,
      text: "",
      color: "#fef3c7",
    };

    annotationsStore.update((n) => [...n, newNote]);

    // Notify change to trigger autosave/history
    // Note: We don't have direct access to onRecordChange callback here easily unless we expose it.
    // However, store updates are reactive. History recording is usually triggered by UI actions.
    // AnnotationOverlay component calls onRecordChange when interacting.
    // For "Add Note", we might need to manually trigger it if we want undo support immediately.
    // But pedroAPI doesn't expose recordChange directly yet.
    // We'll rely on the user interacting with the note (edit/move) to trigger history for now,
    // or assume the overlay handles store subscriptions? No, history is manual.
    // TODO: Expose recordChange in pedroAPI if needed.
  },
});

// 3. Register Hook to Save Annotations
pedro.registries.hooks.register("onSave", (data) => {
  const { annotationsStore } = pedro.stores.project;
  const { get } = pedro.stores;
  data.annotations = get(annotationsStore);
});

// 4. Register Hook to Load Annotations
pedro.registries.hooks.register("onLoad", (data) => {
  if (data.annotations) {
    const { annotationsStore } = pedro.stores.project;
    annotationsStore.set(data.annotations);
  }
});
