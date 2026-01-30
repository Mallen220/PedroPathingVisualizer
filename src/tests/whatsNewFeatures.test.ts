// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { describe, it, expect } from "vitest";
import { getLatestHighlightId } from "../lib/components/whats-new/features/index";

describe("WhatsNew Features", () => {
  it("should ignore newest.md if it matches the template", () => {
    const latestId = getLatestHighlightId();
    expect(latestId).not.toBe("newest");
    // Optionally check that it returns a valid version ID like "v1.7.1"
    expect(latestId).toMatch(/^v\d+\.\d+\.\d+$/);
  });
});
