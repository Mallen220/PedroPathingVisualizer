
export type DragPosition = "top" | "bottom";

export function calculateDragPosition(
  e: DragEvent,
  currentTarget: HTMLElement
): DragPosition {
  const rect = currentTarget.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  return e.clientY < midY ? "top" : "bottom";
}

export function reorderSequence<T>(
  sequence: T[],
  fromIndex: number,
  toIndex: number,
  position: DragPosition
): T[] {
  const item = sequence[fromIndex];
  const newSequence = [...sequence];

  // Remove from old position
  newSequence.splice(fromIndex, 1);

  // Calculate new position
  // If we removed from before the target, the target index shifts down by 1
  let insertIndex = toIndex;
  if (fromIndex < toIndex) {
    insertIndex--;
  }

  if (position === "bottom") {
    insertIndex++;
  }

  // Safety clamp
  if (insertIndex < 0) insertIndex = 0;
  if (insertIndex > newSequence.length) insertIndex = newSequence.length;

  newSequence.splice(insertIndex, 0, item);
  return newSequence;
}
