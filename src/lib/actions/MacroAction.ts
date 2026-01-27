// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import type { ActionDefinition } from "../actionRegistry";
import MacroTableRow from "../components/table/MacroTableRow.svelte";

export const MacroAction: ActionDefinition = {
  kind: "macro",
  label: "Macro",
  isMacro: true,
  component: MacroTableRow,
  // renderField: Handled by line renderer (expanded lines) or other items inside macro
  // toJavaCode: Handled by flattener in codeExporter which expands macros
};
