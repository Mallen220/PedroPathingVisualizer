// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { describe, it, expect } from "vitest";
import { getRandomColor } from "../utils/draw";

describe("getRandomColor", () => {
  it("should return a string", () => {
    const color = getRandomColor();
    expect(typeof color).toBe("string");
  });

  it("should return a valid hex color starting with #", () => {
    const color = getRandomColor();
    expect(color.startsWith("#")).toBe(true);
  });

  it("should return a color with 7 characters", () => {
    const color = getRandomColor();
    expect(color.length).toBe(7);
  });

  it("should only contain allowed characters (5-9, A-D)", () => {
    const color = getRandomColor();
    // 56789ABCD
    const validChars = "56789ABCD";
    for (let i = 1; i < color.length; i++) {
      expect(validChars.includes(color[i])).toBe(true);
    }
  });

  it("should generate different colors", () => {
    const color1 = getRandomColor();
    let color2 = getRandomColor();
    // Try a few times to avoid random collision (though unlikely with this keyspace)
    let attempts = 0;
    while (color1 === color2 && attempts < 10) {
      color2 = getRandomColor();
      attempts++;
    }
    expect(color1).not.toBe(color2);
  });
});
