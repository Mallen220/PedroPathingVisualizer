# Feature Journal

## 2024-05-22 - Initial Setup

**Learning:** The project uses `.pp` files to store path data.
**Action:** When implementing features that modify data, ensure backward compatibility or migration for existing `.pp` files.

## 2025-02-14 - [Reusable UI Components]

**Learning:** Significant code duplication existed in the `ControlTab` components (`PathLineSection`, `ControlPointsSection`, etc.), making maintenance difficult and accessibility inconsistent.
**Action:** Created a suite of atomic UI components in `src/lib/components/common/` (`NumberInput`, `CoordinateInputs`, `SectionHeader`, etc.). Future UI development should prefer these components over raw HTML inputs to ensure consistent styling, behavior, and accessibility compliance.
