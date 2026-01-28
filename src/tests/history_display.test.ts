// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { createHistory, type AppState } from "../utils/history";
import type { Point } from "../types";

// Mocking the parts of AppState needed for testing
const defaultState: AppState = {
  startPoint: { x: 0, y: 0, heading: "tangential", reverse: false } as Point,
  lines: [],
  shapes: [],
  sequence: [],
  settings: {
    unit: "inches",
  } as any,
};

describe("history order and navigation", () => {
  let history: ReturnType<typeof createHistory>;

  beforeEach(() => {
    history = createHistory(defaultState);
  });

  it("handles multi-step redo jumps correctly (forward in time)", () => {
    // Add states A, B, C
    const stateA = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 10 } };
    const stateB = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 20 } };
    const stateC = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 30 } };

    history.add(stateA, "State A");
    history.add(stateB, "State B");
    history.add(stateC, "State C");

    const h = get(history);
    // Undo stack: [Init, A, B, C]
    expect(h.undoStack.length).toBe(4);
    expect(h.redoStack.length).toBe(0);

    // Jump back to Init
    const initItem = h.undoStack[0];
    history.jumpTo(initItem);

    const h2 = get(history);
    // Undo stack: [Init]
    // Redo stack: [A, B, C] -> Note: createHistory.jumpTo logic pushes undone items to redo.
    // If we undo C, B, A in order, redo stack becomes [A, B, C] (top is A).
    expect(h2.undoStack.length).toBe(1);
    expect(h2.redoStack.length).toBe(3);

    // Check order. redoStack[0] should be the immediate next state (A).
    const stateNext = JSON.parse(h2.redoStack[0].state);
    expect(stateNext.startPoint.x).toBe(10); // A

    // Now Jump Forward to C (farthest future)
    // C should be at the end of redoStack if A is at 0?
    // Let's check logic:
    // Undo [Init, A, B, C] -> Jump to Init.
    // slice(0, 1) -> [Init] (new Undo)
    // slice(1) -> [A, B, C] (to move)
    // return { undo: [Init], redo: [A, B, C] }
    // Redo() pops redoStack[0] -> A. Correct.

    const targetC = h2.redoStack[2]; // C is at index 2
    expect(JSON.parse(targetC.state).startPoint.x).toBe(30);

    history.jumpTo(targetC);

    const h3 = get(history);
    // Undo stack: [Init, A, B, C]
    // Redo stack: []
    expect(h3.undoStack.length).toBe(4);
    expect(h3.redoStack.length).toBe(0);
    // Current state (top of undo) should be C
    const current = JSON.parse(h3.undoStack[h3.undoStack.length - 1].state);
    expect(current.startPoint.x).toBe(30);
  });

  it("handles multi-step jumps to middle of redo stack", () => {
    // Init, A, B, C
    const stateA = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 10 } };
    const stateB = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 20 } };
    const stateC = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 30 } };

    history.add(stateA, "State A");
    history.add(stateB, "State B");
    history.add(stateC, "State C");

    // Jump to Init
    const h = get(history);
    history.jumpTo(h.undoStack[0]);

    // Redo stack is [A, B, C]
    const h2 = get(history);

    // Jump to B (middle of redo stack)
    // A is index 0, B is index 1
    const targetB = h2.redoStack[1];
    history.jumpTo(targetB);

    const h3 = get(history);
    // Undo: [Init, A, B]
    // Redo: [C]
    expect(h3.undoStack.length).toBe(3);
    expect(h3.redoStack.length).toBe(1);

    // Top of Undo is B
    const current = JSON.parse(h3.undoStack[h3.undoStack.length - 1].state);
    expect(current.startPoint.x).toBe(20);

    // Next redo is C
    const next = JSON.parse(h3.redoStack[0].state);
    expect(next.startPoint.x).toBe(30);
  });
});
