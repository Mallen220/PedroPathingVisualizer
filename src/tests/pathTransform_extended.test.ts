// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { describe, it, expect } from "vitest";
import { translatePath, rotatePath, flipPath } from "../utils/pathTransform";
import type { Point, Line, Shape } from "../types";

describe("pathTransform extensions", () => {
  describe("translatePath", () => {
    it("should translate start point, lines, and shapes", () => {
      const data = {
        startPoint: { x: 10, y: 10, heading: "tangential" } as Point,
        lines: [
          {
            endPoint: { x: 20, y: 20 },
            controlPoints: [{ x: 15, y: 15 }],
          } as Line,
        ],
        shapes: [
          {
            type: "obstacle",
            vertices: [{ x: 5, y: 5 }],
          } as Shape,
        ],
      };

      const result = translatePath(data, 10, -5);

      expect(result.startPoint.x).toBe(20);
      expect(result.startPoint.y).toBe(5);

      expect(result.lines[0].endPoint.x).toBe(30);
      expect(result.lines[0].endPoint.y).toBe(15);
      expect(result.lines[0].controlPoints[0].x).toBe(25);
      expect(result.lines[0].controlPoints[0].y).toBe(10);

      expect(result.shapes[0].vertices[0].x).toBe(15);
      expect(result.shapes[0].vertices[0].y).toBe(0);
    });
  });

  describe("rotatePath", () => {
    it("should rotate points around a pivot", () => {
      const data = {
        startPoint: { x: 10, y: 0, heading: "constant", degrees: 0 } as Point,
        lines: [],
        shapes: [],
      };

      // Rotate 90 degrees around (0,0) -> (0, 10)
      const result = rotatePath(data, 90, { x: 0, y: 0 });

      expect(result.startPoint.x).toBeCloseTo(0);
      expect(result.startPoint.y).toBeCloseTo(10);
      expect(result.startPoint.degrees).toBe(90);
    });

    it("should rotate linear heading", () => {
      const data = {
        startPoint: {
          x: 0,
          y: 0,
          heading: "linear",
          startDeg: 10,
          endDeg: 20,
        } as Point,
        lines: [],
      };
      const result = rotatePath(data, 90, { x: 0, y: 0 });
      expect(result.startPoint.startDeg).toBe(100);
      expect(result.startPoint.endDeg).toBe(110);
    });
  });

  describe("flipPath", () => {
    it("should flip horizontally across an axis", () => {
      const data = {
        startPoint: { x: 10, y: 10, heading: "constant", degrees: 45 } as Point,
        lines: [],
      };

      // Flip across X=0. x' = -x = -10.
      const result = flipPath(data, "horizontal", 0);

      expect(result.startPoint.x).toBe(-10);
      expect(result.startPoint.y).toBe(10);
      // Angle: 180 - 45 = 135
      expect(result.startPoint.degrees).toBe(135);
    });

    it("should flip vertically across an axis", () => {
      const data = {
        startPoint: { x: 10, y: 10, heading: "constant", degrees: 45 } as Point,
        lines: [],
      };

      // Flip across Y=0. y' = -y = -10.
      const result = flipPath(data, "vertical", 0);

      expect(result.startPoint.x).toBe(10);
      expect(result.startPoint.y).toBe(-10);
      // Angle: -45 => 315
      expect(result.startPoint.degrees).toBe(315);
    });
  });
});
