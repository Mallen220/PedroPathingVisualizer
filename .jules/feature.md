## 2026-01-04 - Context Menu Pattern

**Learning:** Implemented a reusable Context Menu pattern using `svelte:component` for dynamic icons and `on:contextmenu` handlers on table rows. Key learnings:

1.  **Component Design:** A generic `ContextMenu.svelte` that accepts items with `action`, `label`, `icon`, and `disabled`/`danger` states is highly reusable.
2.  **Positioning:** Calculating position based on viewport boundaries (checking `window.innerWidth/Height`) is crucial to prevent menus from being clipped off-screen.
3.  **Data Flow:** Using local state in the parent component (e.g., `WaypointTable`) to track the "active item" for the context menu (via `seqIndex`) avoids complex global state management.
4.  **Deep Copying:** Use `structuredClone` for deep copying plain objects (like path data) instead of `lodash.cloneDeep` when possible to stay standard and lightweight.
5.  **Frontend Verification:** Playwright tests for context menus need to account for dynamic DOM elements (menu portals) and specific selector strategies (text-based for dynamic lists).

**Action:** Adopt this Context Menu pattern for other list-based UIs (e.g., File Manager) to improve consistency. Always check viewport boundaries for floating UI elements.
