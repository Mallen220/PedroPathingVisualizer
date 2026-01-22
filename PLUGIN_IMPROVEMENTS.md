# Plugin System Improvement Report

Based on the development of the "Field Annotations" plugin, several friction points were identified that make plugin development "tricky and not intuitive." Below is an analysis of these difficulties and architectural recommendations to improve the ecosystem.

## 1. Identified Difficulties

### A. Lack of Native UI Components
**Issue:** The environment disables `window.prompt` and `window.confirm`. To implement a simple input dialog, we had to manually create DOM elements using `document.createElement`, style them with inline CSS, and manage their lifecycle (append/remove).
**Impact:** Plugin code is bloated with boilerplate UI code (60+ lines just for a simple modal). It is also prone to visual inconsistency with the main app.

### B. Reactivity & Store Integration
**Issue:** Adding data to `extraDataStore` did not automatically trigger a re-render of the field. We had to modify the core `FieldRenderer.svelte` component to explicitly subscribe to `extraDataStore`.
**Impact:** Plugins are not truly "plug-and-play." A developer cannot simply write a plugin; they might need to modify core application logic to make it visible, which breaks the plugin architecture's isolation.

### C. Verbose Registry Management
**Issue:** A feature like "Field Annotations" requires registering with three separate registries (`navbarActions`, `contextMenuItems`, `fieldRenderers`) and manually managing their IDs.
**Impact:** High cognitive load. Developers must know the existence and API of every individual registry.

### D. Manual Error Handling
**Issue:** To prevent a plugin from crashing the whole app, every callback had to be manually wrapped in `try/catch` blocks.
**Impact:** Code is repetitive and defensive. If a developer forgets a catch block, the app is fragile.

### E. Coordinate Systems
**Issue:** Developers must manually access `fieldViewStore`, retrieve `xScale`/`yScale`, and handle the math for converting field inches to screen pixels (and inverting it for mouse clicks).
**Impact:** High complexity for visual plugins. Risk of incorrect scaling or placement.

---

## 2. Recommendations for Improvement

To resolve these issues, we recommend implementing a **Plugin SDK** that abstracts these complexities.

### 1. Expose a Standard UI Library
Provide a `pedro.ui` namespace with high-level methods that match the host application's styling.

```typescript
// Proposed API
await pedro.ui.prompt({ title: "Add Note", message: "Enter text..." });
await pedro.ui.confirm({ title: "Delete?", message: "Are you sure?" });
pedro.ui.toast("Note added!");
```

### 2. Automatic Reactivity (The "Plugin Layer")
Instead of modifying `FieldRenderer.svelte` for every new store, implement a generic `PluginOverlay` layer in the core app that listens to a unified `pedro.draw` event or store.

*   **Change:** The `FieldRenderer` should automatically re-render when *any* registered plugin data changes, or provide a method `pedro.graphics.requestRedraw()`.

### 3. Unified "Feature" Registration
Allow plugins to register a "Feature" that groups related functionality, handling the wiring automatically.

```typescript
// Proposed API
pedro.registerFeature({
  name: "Sticky Notes",
  navbar: {
    icon: "...",
    onClick: () => { ... }
  },
  contextMenu: { ... },
  render: (ctx) => { ... } // Automatically wrapped in try/catch and provided with a safe drawing context
});
```

### 4. Simplified Coordinate Helpers
Expose a drawing context that automatically handles the scale transform.

```typescript
// Proposed API
pedro.graphics.drawRect({
  x: 72, y: 72, // Field coordinates (inches)
  width: 12, height: 12, // Field dimensions
  color: "red"
});
// The system handles xScale(x) and zooming automatically.
```

### 5. Sandbox / Error Boundary
The `PluginManager` should automatically wrap all plugin entry points (callbacks) in a global error handler. This removes the need for individual `try/catch` blocks in plugin code.

## Summary
By moving UI creation, coordinate math, and error handling into the core `pedro` API, plugin size could be reduced by ~70%, and reliability would improve significantly.
