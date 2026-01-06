// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import type { Line, SequenceItem, SequenceWaitItem, Point } from "../types";

/**
 * Updates lines that are linked by name.
 * If type is 'xy', it syncs the X/Y of all lines with the same name to the source line.
 * If type is 'name', it checks if the new name matches an existing group, and if so snaps the source to that group.
 */
export function updateLinkedLines(
  lines: Line[],
  sourceLineId: string,
  type: "xy" | "name",
): Line[] {
  const sourceLine = lines.find((l) => l.id === sourceLineId);
  if (!sourceLine) return lines;

  // Rule 1: Empty names never link
  if (!sourceLine.name || sourceLine.name.trim() === "") {
    return lines;
  }

  const name = sourceLine.name;

  if (type === "xy") {
    // Check for locked peers.
    const group = lines.filter((l) => l.name === name);
    const lockedLine = group.find((l) => l.locked);

    if (lockedLine) {
      // Revert changes to match locked line
      return lines.map((l) => {
        if (l.name === name) {
          if (
            l.endPoint.x !== lockedLine.endPoint.x ||
            l.endPoint.y !== lockedLine.endPoint.y
          ) {
            return {
              ...l,
              endPoint: {
                ...l.endPoint,
                x: lockedLine.endPoint.x,
                y: lockedLine.endPoint.y,
              },
            };
          }
        }
        return l;
      });
    }

    // We are moving the source line. Update all others with same name.
    let changed = false;
    const newLines = lines.map((l) => {
      if (l.id !== sourceLineId && l.name === name) {
        // Sync X/Y
        if (
          l.endPoint.x !== sourceLine.endPoint.x ||
          l.endPoint.y !== sourceLine.endPoint.y
        ) {
          changed = true;
          // Return new object for reactivity
          return {
            ...l,
            endPoint: {
              ...l.endPoint,
              x: sourceLine.endPoint.x,
              y: sourceLine.endPoint.y,
            },
          };
        }
      }
      return l;
    });
    return changed ? newLines : lines;
  } else if (type === "name") {
    // Name just changed.
    // Check if there are OTHER lines with this new name.
    const targetMatch = lines.find(
      (l) => l.id !== sourceLineId && l.name === name,
    );

    if (targetMatch) {
      // Snap source to target
      // We must modify the source line in the array
      return lines.map((l) => {
        if (l.id === sourceLineId) {
          return {
            ...l,
            endPoint: {
              ...l.endPoint,
              x: targetMatch.endPoint.x,
              y: targetMatch.endPoint.y,
            },
          };
        }
        return l;
      });
    } else {
      // New unique name (or just renamed to something else). No linking needed yet.
      return lines;
    }
  }

  return lines;
}

/**
 * Updates wait items that are linked by name.
 * Syncs durationMs.
 */
export function updateLinkedWaits(
  sequence: SequenceItem[],
  sourceId: string,
): SequenceItem[] {
  const sourceWait = sequence.find(
    (s) => s.kind === "wait" && s.id === sourceId,
  ) as SequenceWaitItem | undefined;

  if (!sourceWait) return sequence;
  if (!sourceWait.name || sourceWait.name.trim() === "") return sequence;

  const name = sourceWait.name;

  // Check for locked waits in the group
  const group = sequence.filter(
    (s) => s.kind === "wait" && s.name === name,
  ) as SequenceWaitItem[];
  const lockedWait = group.find((w) => w.locked);

  if (lockedWait) {
    // Revert changes to match locked wait
    return sequence.map((item) => {
      if (item.kind === "wait" && item.name === name) {
        if (item.durationMs !== lockedWait.durationMs) {
          return { ...item, durationMs: lockedWait.durationMs };
        }
      }
      return item;
    });
  }

  const duration = sourceWait.durationMs;

  let changed = false;
  const newSeq = sequence.map((item) => {
    if (
      item.kind === "wait" &&
      item.id !== sourceId &&
      item.name === name &&
      item.durationMs !== duration
    ) {
      changed = true;
      return {
        ...item,
        durationMs: duration,
      };
    }
    return item;
  });

  return changed ? newSeq : sequence;
}

/**
 * Checks if a name is linked (appears more than once) in the set.
 */
export function isLinked(
  name: string | undefined,
  allNames: string[],
): boolean {
  if (!name || name.trim() === "") return false;
  let count = 0;
  for (const n of allNames) {
    if (n === name) count++;
    if (count > 1) return true;
  }
  return false;
}

/**
 * Restores links after loading.
 * If _linkedName is present, restore it to name.
 * Then force synchronization of groups (first item wins).
 */
export function restoreLinks(lines: Line[]): Line[] {
  // 1. Restore names
  const namedLines = lines.map((l) => {
    if (l._linkedName) {
      return { ...l, name: l._linkedName };
    }
    return l;
  });

  // 2. Sync groups
  // Map name -> Point
  const groups = new Map<string, Point>();
  const finalizedLines = namedLines.map((l) => {
    if (!l.name || l.name.trim() === "") return l;

    if (groups.has(l.name)) {
      const parent = groups.get(l.name)!;
      // Force sync
      if (l.endPoint.x !== parent.x || l.endPoint.y !== parent.y) {
        return {
          ...l,
          endPoint: {
            ...l.endPoint,
            x: parent.x,
            y: parent.y,
          },
        };
      }
    } else {
      groups.set(l.name, l.endPoint);
    }
    return l;
  });

  return finalizedLines;
}

/**
 * Prepare lines for saving.
 * Detect duplicates, set _linkedName, and rename duplicates for display.
 */
export function prepareLinesForSave(lines: Line[]): Line[] {
  // Count names
  const counts = new Map<string, number>();
  lines.forEach((l) => {
    if (l.name && l.name.trim() !== "") {
      counts.set(l.name, (counts.get(l.name) || 0) + 1);
    }
  });

  // Track current index for each duplicate group
  const currentIndices = new Map<string, number>();

  return lines.map((l) => {
    if (!l.name || l.name.trim() === "") return l;

    const count = counts.get(l.name) || 0;
    if (count > 1) {
      // It's a linked group
      const idx = (currentIndices.get(l.name) || 0) + 1;
      currentIndices.set(l.name, idx);

      const newName = idx === 1 ? l.name : `${l.name} (${idx - 1})`;
      return {
        ...l,
        name: newName,
        _linkedName: l.name,
      };
    }
    return l;
  });
}

/**
 * Prepare sequence waits for saving.
 */
export function prepareSequenceForSave(seq: SequenceItem[]): SequenceItem[] {
  // Count wait names
  const counts = new Map<string, number>();
  seq.forEach((s) => {
    if (s.kind === "wait" && s.name && s.name.trim() !== "") {
      counts.set(s.name, (counts.get(s.name) || 0) + 1);
    }
  });

  const currentIndices = new Map<string, number>();

  return seq.map((s) => {
    if (s.kind !== "wait") return s;
    if (!s.name || s.name.trim() === "") return s;

    const count = counts.get(s.name) || 0;
    if (count > 1) {
      const idx = (currentIndices.get(s.name) || 0) + 1;
      currentIndices.set(s.name, idx);
      // Waits don't strictly need unique names in UI, but file format requirement 14 says:
      // "Duplicate named paths must be written with unique display names... On load restore links"
      // It doesn't explicitly say Waits must be renamed, but for consistency and to avoid ambiguity we should.
      // Wait... "Duplicate named paths".
      // Req 11 says "Wait events with the same non-empty name are linked."
      // It doesn't explicitly say we must rename waits on save.
      // However, if we don't, loading logic needs to know they are linked.
      // But wait, if they have the same name in the file, they are linked by definition!
      // Paths are renamed because Java export needs unique variables? No, mostly because UI typically enforces unique names or users get confused.
      // The prompt says "When saving: Duplicate named paths must be written with unique display names".
      // It doesn't mention waits.
      // However, to be safe, I'll store `_linkedName` if I modify it.
      // Actually, if I don't modify the name, I don't need `_linkedName`.
      // If I leave wait names identical ("Wait", "Wait"), they will load as "Wait", "Wait" and be linked. This is desired.
      // So I will NOT rename waits. I will only set `_linkedName` if I renamed them.
      // Since I'm not renaming them, I won't touch them.
      return s;
    }
    return s;
  });
}
