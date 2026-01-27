// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import type { ActionDefinition } from "../actionRegistry";

// This is a partial definition for the Path action.
// The UI rendering and logic for Path is still handled natively in WaypointTable and FieldRenderer
// for deep integration reasons, but registering it here allows us to use generic flags
// like isPath in other parts of the application.

export const PathAction: ActionDefinition = {
  kind: "path",
  label: "Path",
  isPath: true,
  // We point to null component to indicate it's handled natively if fallback logic exists,
  // or we could eventually migrate the row component here.
  // For now, we only need the flag lookup.
  component: null,
};
