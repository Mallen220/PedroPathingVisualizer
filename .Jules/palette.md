## 2024-05-22 - [Keyboard Shortcuts Visibility]

**Learning:** Users often miss powerful keyboard shortcuts because they are hidden in the code and not exposed in the UI.
**Action:** Always provide a "Keyboard Shortcuts" or "Help" dialog when implementing custom hotkeys.

## 2024-10-24 - [Tabbed Interfaces for Complex Workflows]

**Learning:** When a user workflow involves both "Setup" (configuring environment/tools) and "Execution" (creating the sequence), splitting these into separate Tabs significantly reduces cognitive load and clutter compared to a single long scrollable list.
**Action:** Identify distinct phases of user activity and separate them into tabs or views, rather than relying solely on collapsible sections.

## 2025-01-20 - [Clear Copy Feedback]

**Learning:** Users lack confidence when copying code/content if the only feedback is a subtle tooltip or icon change. A dedicated text change ("Copy" -> "Copied!") provides much clearer confirmation of success.
**Action:** When implementing copy-to-clipboard functionality, change the button text or state visibly for a few seconds to confirm the action.

## 2025-01-26 - [Icon-Only Button Accessibility]

**Learning:** Icon-only buttons (like Next/Previous arrows) are often invisible to screen readers and automated testing tools if they lack `aria-label` attributes. This also makes programmatic verification difficult.
**Action:** Always audit icon-only buttons for `aria-label` or `title` attributes during implementation.

## 2026-01-03 - [Semantic Labels for Toolbar Actions]

**Learning:** Consistent labeling of toolbar actions (like "Settings", "Save", "Open") using `aria-label` improves accessibility and allows for easier programmatic targeting in tests, especially when icons are decorative or dynamic.
**Action:** Ensure all primary toolbar actions have explicit `aria-label` attributes, even if they have tooltips or adjacent text that might seem sufficient.
