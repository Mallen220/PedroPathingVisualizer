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

describe("createHistory", () => {
  let history: ReturnType<typeof createHistory>;

  beforeEach(() => {
    history = createHistory(defaultState);
  });

  it("initializes with empty stacks (except initial state)", () => {
    const h = get(history);
    expect(h.undoStack.length).toBe(1); // Initial state
    expect(h.redoStack.length).toBe(0);
    expect(get(history.canUndoStore)).toBe(false); // Length <= 1
    expect(get(history.canRedoStore)).toBe(false);
  });

  it("adds a state", () => {
    const state1 = {
      ...defaultState,
      startPoint: {
        x: 10,
        y: 10,
        heading: "tangential",
        reverse: false,
      } as Point,
    };
    history.add(state1, "State 1");

    const h = get(history);
    expect(h.undoStack.length).toBe(2);
    expect(get(history.canUndoStore)).toBe(true);

    const current = JSON.parse(h.undoStack[h.undoStack.length - 1].state);
    expect(current.startPoint.x).toBe(10);
  });

  it("undo restores previous state", () => {
    const state1 = {
      ...defaultState,
      startPoint: {
        x: 10,
        y: 10,
        heading: "tangential",
        reverse: false,
      } as Point,
    };
    const state2 = {
      ...defaultState,
      startPoint: {
        x: 20,
        y: 20,
        heading: "tangential",
        reverse: false,
      } as Point,
    };

    history.add(state1, "State 1");
    history.add(state2, "State 2");

    history.undo();

    const h = get(history);
    // Undo stack should have [initial, state1]
    // Redo stack should have [state2]
    expect(h.undoStack.length).toBe(2);
    expect(h.redoStack.length).toBe(1);

    const current = JSON.parse(h.undoStack[h.undoStack.length - 1].state);
    expect(current.startPoint.x).toBe(10);

    expect(get(history.canRedoStore)).toBe(true);
  });

  it("redo restores next state", () => {
    const state1 = {
      ...defaultState,
      startPoint: {
        x: 10,
        y: 10,
        heading: "tangential",
        reverse: false,
      } as Point,
    };
    const state2 = {
      ...defaultState,
      startPoint: {
        x: 20,
        y: 20,
        heading: "tangential",
        reverse: false,
      } as Point,
    };

    history.add(state1);
    history.add(state2);
    history.undo();

    history.redo();

    const h = get(history);
    expect(h.undoStack.length).toBe(3);
    const current = JSON.parse(h.undoStack[h.undoStack.length - 1].state);
    expect(current.startPoint.x).toBe(20);
    expect(get(history.canRedoStore)).toBe(false);
  });

  it("clears redo stack on new record", () => {
    const state1 = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 10 } };
    const state2 = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 20 } };
    const state3 = { ...defaultState, startPoint: { ...defaultState.startPoint, x: 30 } };

    history.add(state1);
    history.add(state2);
    history.undo(); // Back to state1, redo stack has state2

    expect(get(history.canRedoStore)).toBe(true);

    history.add(state3); // Should clear redo stack

    expect(get(history.canRedoStore)).toBe(false);
    const h = get(history);
    const current = JSON.parse(h.undoStack[h.undoStack.length - 1].state);
    expect(current.startPoint.x).toBe(30);
  });

  it("stores states as strings (deep copy behavior)", () => {
    const mutableState = {
      ...defaultState,
      startPoint: {
        x: 10,
        y: 10,
        heading: "tangential",
        reverse: false,
      } as Point,
    };
    history.add(mutableState);

    // Modify original object
    mutableState.startPoint.x = 999;

    // History should not be affected
    const h = get(history);
    const stored = JSON.parse(h.undoStack[h.undoStack.length - 1].state);
    expect(stored.startPoint.x).toBe(10);
  });
});
