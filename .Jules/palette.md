## 2024-05-22 - Actionable Empty States & Invisible Inputs

Learning: Empty states are prime real estate for guiding users, not just informing them. Also, when wrapping native inputs (like `<input type="color">`) for custom styling, keyboard accessibility is frequently lost because the focus ring ends up on the invisible input.
Action: Always verify `focus-within` styles on custom input wrappers and elevate primary actions into empty state slots.

## 2024-05-22 - Unreachable Empty States

Learning: Implemented "Add Path" buttons in the Empty State for `PathTab`, but discovered that the app prevents deleting the last line (`if (lines.length <= 1) return;`). This makes the Empty State unreachable for the user, rendering the UX improvement invisible.
Action: Before optimizing empty states, verify they are actually reachable in the application flow. Consider relaxing "at least one item" constraints to allow true empty states.

## 2026-01-26 - Invisible Focus on Styled Range Inputs

Learning: Removing default outlines (`focus:outline-none`) on range inputs (`<input type="range">`) to achieve a custom look creates a significant accessibility barrier. Keyboard users cannot see the focus state on the slider thumb.
Action: Always add explicit `focus-visible` styles (e.g., `focus-visible:ring`) to the slider or its container when removing default outlines.

## 2026-01-28 - Actionable Empty State Implementation

Learning: Successfully implemented actionable empty states in `PathTab` by allowing the last path segment to be deleted. This reveals the empty state which now contains primary actions ("Add Path", "Add Wait", "Add Rotate") directly, guiding the user on how to proceed.
Action: When designing list views, ensure the "zero items" state is reachable and provides a clear path to adding the first item, rather than forcing a default item that cannot be removed.
