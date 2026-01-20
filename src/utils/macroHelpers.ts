import type {
  Line,
  Shape,
  SequenceItem,
  SequenceMacroItem,
  SequencePathItem,
  SequenceWaitItem,
  SequenceRotateItem,
  PedroData,
} from "../types";

// Helper to read file (needs to be injected or provided by platform context)
// Since we are in utils, we might need to rely on the `api` or pass a reader function.
// However, typically in this codebase `window.api` is available in renderer.
// But utils can be used in tests where `window` might not exist.
// We will assume the caller provides the data or a loader.

// Since the plan says "loadAndImportMacro", and we are in Electron context usually:
// We'll define the core logic of *processing* the data here.
// The actual file reading might need to happen in the component or via `window.api`.

export function processMacroImport(
  macroData: PedroData,
  filePath: string,
  macroName: string,
): {
  macroItem: SequenceMacroItem;
  newLines: Line[];
  newShapes: Shape[];
} {
  const macroInstanceId = `macro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Prefix Helper
  const prefixId = (id: string) => `${macroInstanceId}__${id}`;

  const newLines: Line[] = [];
  const newShapes: Shape[] = [];
  const internalSequence: SequenceItem[] = [];

  // 1. Process Lines
  if (macroData.lines) {
    macroData.lines.forEach((line) => {
      const newLine: Line = {
        ...line,
        id: prefixId(line.id || Math.random().toString(36)),
        fromMacroId: macroInstanceId,
        originalId: line.id,
      };
      newLines.push(newLine);
    });
  }

  // 2. Process Shapes
  if (macroData.shapes) {
    macroData.shapes.forEach((shape) => {
      const newShape: Shape = {
        ...shape,
        id: prefixId(shape.id),
        fromMacroId: macroInstanceId,
        originalId: shape.id,
      };
      newShapes.push(newShape);
    });
  }

  // 3. Process Sequence
  // If macro has no explicit sequence, default to all lines in order
  const rawSequence =
    macroData.sequence && macroData.sequence.length > 0
      ? macroData.sequence
      : (macroData.lines || []).map(
          (l) => ({ kind: "path", lineId: l.id! }) as SequenceItem,
        );

  rawSequence.forEach((item) => {
    if (item.kind === "path") {
      const pathItem = item as SequencePathItem;
      internalSequence.push({
        ...pathItem,
        lineId: prefixId(pathItem.lineId),
      });
    } else if (item.kind === "wait") {
      const waitItem = item as SequenceWaitItem;
      internalSequence.push({
        ...waitItem,
        id: prefixId(waitItem.id),
      });
    } else if (item.kind === "rotate") {
      const rotateItem = item as SequenceRotateItem;
      internalSequence.push({
        ...rotateItem,
        id: prefixId(rotateItem.id),
      });
    } else if (item.kind === "macro") {
      // Nested macros?
      // For now, let's assume flattened or recursively processed.
      // If we just prefix the ID, we might need to process ITS lines too.
      // But typically `PedroData` is fully resolved or we only support 1 level of import for now.
      // If we support nested, we'd need to recursively import.
      // Let's just prefix the ID for now.
      const nestedMacro = item as SequenceMacroItem;
      internalSequence.push({
        ...nestedMacro,
        id: prefixId(nestedMacro.id),
        // internalSequence? If the source data didn't have it (old format), we might be in trouble.
        // But for this task, we are establishing the new format.
      });
    }
  });

  const macroItem: SequenceMacroItem = {
    kind: "macro",
    id: macroInstanceId,
    filePath: filePath,
    name: macroName,
    internalSequence: internalSequence,
    anchorPoint: macroData.startPoint,
  };

  return { macroItem, newLines, newShapes };
}
