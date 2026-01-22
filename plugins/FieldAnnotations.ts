/// <reference path="./pedro.d.ts" />

// Plugin: Field Annotations
// Version: 1.2
// Description: Add sticky notes to the field for collaboration and planning.

console.log("[FieldAnnotations] Plugin loading...");

const NOTE_SIZE_INCHES = 12;

// Helper: Access the store for annotations
function getAnnotations() {
  try {
    const store = pedro.stores.project.extraDataStore;
    const data = pedro.stores.get(store);
    return (data && data.annotations) ? data.annotations : [];
  } catch (e) {
    console.error("[FieldAnnotations] getAnnotations failed:", e);
    return [];
  }
}

function setAnnotations(list) {
  try {
    const store = pedro.stores.project.extraDataStore;
    const data = pedro.stores.get(store);
    store.set({ ...data, annotations: list });
  } catch (e) {
    console.error("[FieldAnnotations] setAnnotations failed:", e);
  }
}

function addNote(x, y) {
    try {
        const text = prompt("Enter note text:");
        if (!text) return;

        const colors = ["#fef08a", "#bae6fd", "#bbf7d0", "#fbcfe8", "#e9d5ff"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const newNote = {
        id: Math.random().toString(36).substring(2, 10),
        x: x,
        y: y,
        text: text,
        color: color
        };

        const list = getAnnotations();
        setAnnotations([...list, newNote]);
    } catch (e) {
        console.error("[FieldAnnotations] Add Note failed:", e);
    }
}

// 1. Context Menu: Add Note (Alternative)
pedro.registries.contextMenuItems.register({
  id: "add-annotation",
  label: "Add Sticky Note",
  condition: (args) => {
    try {
        const list = getAnnotations();
        const hit = list.some(note =>
            Math.abs(args.x - note.x) < NOTE_SIZE_INCHES / 2 &&
            Math.abs(args.y - note.y) < NOTE_SIZE_INCHES / 2
        );
        return !hit;
    } catch (e) {
        console.error("[FieldAnnotations] condition failed:", e);
        return true;
    }
  },
  onClick: (args) => {
    addNote(args.x, args.y);
  }
});

// 2. Navbar Action: Add Note
pedro.registries.navbarActions.register({
    id: "add-annotation-btn",
    title: "Add Note",
    // Icon: Sticky Note SVG
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
</svg>
`,
    location: "center",
    order: 10,
    onClick: () => {
        // Calculate center of view
        try {
            const pan = pedro.stores.get(pedro.stores.app.fieldViewStore.fieldPan) || {x: 0, y: 0};
            // Default to center of field if we can't get pan info,
            // but actually we want the field coordinates of the viewport center.
            // fieldViewStore exposes xScale/yScale which map Field -> Screen.
            // We need Screen -> Field (invert).

            const fieldView = pedro.stores.get(pedro.stores.app.fieldViewStore);
            if (fieldView && fieldView.xScale && fieldView.xScale.invert) {
                const width = fieldView.width || 800;
                const height = fieldView.height || 600;

                // Center of screen
                const cx = width / 2;
                const cy = height / 2;

                const fx = fieldView.xScale.invert(cx);
                const fy = fieldView.yScale.invert(cy);

                // Clamp to field bounds (0-144)
                const clampedX = Math.max(0, Math.min(144, fx));
                const clampedY = Math.max(0, Math.min(144, fy));

                addNote(clampedX, clampedY);
            } else {
                // Fallback
                addNote(72, 72);
            }
        } catch(e) {
            console.error("Error calculating center:", e);
            addNote(72, 72);
        }
    }
});

// 3. Context Menu: Delete Note
pedro.registries.contextMenuItems.register({
  id: "delete-annotation",
  label: "Delete Sticky Note",
  condition: (args) => {
    try {
        const list = getAnnotations();
        const hit = list.some(note =>
            Math.abs(args.x - note.x) < NOTE_SIZE_INCHES / 2 &&
            Math.abs(args.y - note.y) < NOTE_SIZE_INCHES / 2
        );
        return hit;
    } catch (e) {
        console.error("[FieldAnnotations] delete condition failed:", e);
        return false;
    }
  },
  onClick: (args) => {
    try {
        const list = getAnnotations();
        const note = list.find(note =>
            Math.abs(args.x - note.x) < NOTE_SIZE_INCHES / 2 &&
            Math.abs(args.y - note.y) < NOTE_SIZE_INCHES / 2
        );

        if (note && confirm(`Delete note "${note.text}"?`)) {
            setAnnotations(list.filter(n => n.id !== note.id));
        }
    } catch (e) {
        console.error("[FieldAnnotations] Delete Note failed:", e);
    }
  }
});

// 4. Render Notes
pedro.registries.fieldRenderers.register({
  id: "annotation-renderer",
  fn: (two) => {
    try {
        const list = getAnnotations();
        if (list.length === 0) return;

        const fieldView = pedro.stores.get(pedro.stores.app.fieldViewStore);
        if (!fieldView || !fieldView.xScale || !fieldView.yScale) return;

        const { xScale, yScale } = fieldView;

        const container = two.makeGroup();

        list.forEach(note => {
            const cx = xScale(note.x);
            const cy = yScale(note.y);

            if (isNaN(cx) || isNaN(cy)) return;

            const wPx = Math.abs(xScale(note.x + NOTE_SIZE_INCHES/2) - xScale(note.x - NOTE_SIZE_INCHES/2));
            const hPx = Math.abs(yScale(note.y + NOTE_SIZE_INCHES/2) - yScale(note.y - NOTE_SIZE_INCHES/2));

            const shadow = two.makeRectangle(cx + 4, cy + 4, wPx, hPx);
            shadow.fill = "rgba(0,0,0,0.2)";
            shadow.noStroke();

            const rect = two.makeRectangle(cx, cy, wPx, hPx);
            rect.fill = note.color;
            rect.stroke = "#6b7280";
            rect.linewidth = 1;

            const text = two.makeText(note.text, cx, cy);
            text.family = "ui-sans-serif, system-ui, sans-serif";
            text.size = wPx / 8;
            text.alignment = "center";
            text.baseline = "middle";
            text.fill = "#1f2937";
            text.weight = "500";

            container.add(shadow, rect, text);
        });
    } catch (e) {
        console.error("[FieldAnnotations] Renderer failed:", e);
    }
  }
});

console.log("[FieldAnnotations] Plugin loaded successfully.");
