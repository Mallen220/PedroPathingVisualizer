// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import type { ActionDefinition } from "../actionRegistry";

// Tailwind Safelist for dynamic classes:
// bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:ring-green-300 dark:focus:ring-green-700
// bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800/30

// This is a partial definition for the Path action.
// The UI rendering and logic for Path is still handled natively in WaypointTable and FieldRenderer
// for deep integration reasons, but registering it here allows us to use generic flags
// like isPath in other parts of the application.

export const PathAction: ActionDefinition = {
  kind: "path",
  label: "Path",
  buttonColor: "green",
  isPath: true,
  // We point to null component to indicate it's handled natively if fallback logic exists,
  // or we could eventually migrate the row component here.
  // For now, we only need the flag lookup.
  component: null,
};
