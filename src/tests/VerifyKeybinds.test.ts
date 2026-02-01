// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { describe, it, expect } from "vitest";
import { DEFAULT_KEY_BINDINGS } from "../config/keybindings";

describe("Keybindings", () => {
  it("should include select-next-sequence and select-prev-sequence", () => {
    const selectNextSeq = DEFAULT_KEY_BINDINGS.find(
      (b) => b.id === "select-next-sequence",
    );
    const selectPrevSeq = DEFAULT_KEY_BINDINGS.find(
      (b) => b.id === "select-prev-sequence",
    );

    expect(selectNextSeq).toBeDefined();
    expect(selectNextSeq?.key).toBe("ctrl+down, cmd+down, tab");

    expect(selectPrevSeq).toBeDefined();
    expect(selectPrevSeq?.key).toBe("ctrl+up, cmd+up, shift+tab");
  });

  it("should include new integrated commands", () => {
    const selectNext = DEFAULT_KEY_BINDINGS.find((b) => b.id === "select-next");
    const selectPrev = DEFAULT_KEY_BINDINGS.find((b) => b.id === "select-prev");
    const toggleStrategySheet = DEFAULT_KEY_BINDINGS.find(
      (b) => b.id === "toggle-strategy-sheet",
    );
    const manageRobotProfiles = DEFAULT_KEY_BINDINGS.find(
      (b) => b.id === "manage-robot-profiles",
    );

    expect(selectNext).toBeDefined();
    expect(selectPrev).toBeDefined();
    expect(toggleStrategySheet).toBeDefined();
    expect(manageRobotProfiles).toBeDefined();
  });
});
