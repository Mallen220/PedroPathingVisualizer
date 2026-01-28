import { writable, derived, type Writable } from "svelte/store";
import type { Point, Line, Shape, SequenceItem, Settings } from "../types";

export interface HistoryItem {
  id: string;
  state: string;
  description: string;
  timestamp: number;
}

export interface History {
  undoStack: HistoryItem[];
  redoStack: HistoryItem[];
}

export interface AppState {
  startPoint: Point;
  lines: Line[];
  shapes: Shape[];
  sequence: SequenceItem[];
  settings: Settings;
}

export function createHistory(initialState: any) {
  const store = writable<History>({
    undoStack: [
      {
        id: crypto.randomUUID(),
        state: JSON.stringify(initialState),
        description: "Initial State",
        timestamp: Date.now(),
      },
    ],
    redoStack: [],
  });

  const { subscribe, update, set } = store;

  const canUndoStore = derived(store, ($history) => $history.undoStack.length > 1);
  const canRedoStore = derived(store, ($history) => $history.redoStack.length > 0);

  return {
    subscribe,
    canUndoStore,
    canRedoStore,
    add: (state: any, description: string = "Change") =>
      update((h) => {
        const newItem: HistoryItem = {
          id: crypto.randomUUID(),
          state: JSON.stringify(state),
          description,
          timestamp: Date.now(),
        };
        return {
          undoStack: [...h.undoStack, newItem],
          redoStack: [],
        };
      }),
    undo: () =>
      update((h) => {
        if (h.undoStack.length <= 1) return h;
        const current = h.undoStack[h.undoStack.length - 1];
        const previous = h.undoStack[h.undoStack.length - 2];
        return {
          undoStack: h.undoStack.slice(0, -1),
          redoStack: [current, ...h.redoStack],
        };
      }),
    redo: () =>
      update((h) => {
        if (h.redoStack.length === 0) return h;
        const next = h.redoStack[0];
        return {
          undoStack: [...h.undoStack, next],
          redoStack: h.redoStack.slice(1),
        };
      }),
    jumpTo: (targetItem: HistoryItem) =>
      update((h) => {
        // Check if item is in undoStack (past/current)
        const undoIndex = h.undoStack.findIndex((i) => i.id === targetItem.id);
        if (undoIndex !== -1) {
          // If it's the current state (last in undoStack), do nothing
          if (undoIndex === h.undoStack.length - 1) return h;

          // We are moving back in time.
          // Items after undoIndex move to redoStack.
          // Example: Undo [A, B, C, D]. Jump to B (index 1).
          // New Undo: [A, B]
          // Items to move: [C, D]. They should be pushed to Redo.
          // Redo needs to be [D, C, ...oldRedo] so that Redo() pops D then C.
          // h.undoStack.slice(undoIndex + 1) gives [C, D].
          // To put them on Redo stack correctly:
          // We want Redo Stack to be [C, D].
          // Because popping from Redo gives the *next* state.
          // From B, next is C. So C should be top of Redo.
          // [C, D] is correct order for [top, bottom] if Redo() pops from [0].
          const toMove = h.undoStack.slice(undoIndex + 1);
          return {
            undoStack: h.undoStack.slice(0, undoIndex + 1),
            redoStack: [...toMove, ...h.redoStack],
          };
        }

        // Check if item is in redoStack (future)
        const redoIndex = h.redoStack.findIndex((i) => i.id === targetItem.id);
        if (redoIndex !== -1) {
          // We are moving forward in time.
          // Items up to and including redoIndex move to undoStack.
          // Example: Redo [C, D]. Jump to D (index 1).
          // We need to redo C, then redo D.
          // Items to move: [C, D].
          // New Undo: [...oldUndo, C, D].
          // New Redo: what's left after D.
          const toMove = h.redoStack.slice(0, redoIndex + 1);
          return {
            undoStack: [...h.undoStack, ...toMove],
            redoStack: h.redoStack.slice(redoIndex + 1),
          };
        }

        return h;
      }),
    reset: (state: any) =>
      set({
        undoStack: [
          {
            id: crypto.randomUUID(),
            state: JSON.stringify(state),
            description: "Initial State",
            timestamp: Date.now(),
          },
        ],
        redoStack: [],
      }),
  };
}
