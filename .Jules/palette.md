# Palette's Journal

## 2024-05-22 - Accessibility State Management
Learning: For multi-step actions (like delete -> confirm), simply changing text isn't enough for screen readers. Dynamic `aria-label` combined with `aria-live="polite"` ensures the state change is announced immediately without moving focus.
Action: Apply this pattern to other stateful buttons (e.g., save/unsaved states) where the label changes significance.
