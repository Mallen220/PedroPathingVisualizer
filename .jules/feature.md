## 2024-05-24 - File Manager Mirror Logic

**Learning:** The "Mirror Path" feature was already implemented in the File Manager (`duplicateFile` with `mirror=true`), including helper functions `mirrorPathData` and `mirrorPointHeading`. However, this logic was duplicated inside `FileManager.svelte` and not exposed for use on the currently active path in the editor.
**Action:** When implementing "Mirror Path" for the active editor, I should extract the mirroring logic from `FileManager.svelte` into a reusable utility (e.g., `src/utils/pathMirroring.ts`) to avoid code duplication and ensure consistency between file-level and editor-level mirroring.
