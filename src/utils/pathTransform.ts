// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import type {
  Point,
  ControlPoint,
  Line,
  Shape,
  SequenceItem,
  BasePoint,
} from "../types";
import { transformAngle } from "./math";

// Helper to mirror a single point's heading (X-axis flip / Mirror across Vertical Line)
export function mirrorPointHeading(point: Point): Point {
  if (point.heading === "linear")
    return {
      ...point,
      startDeg: transformAngle(180 - point.startDeg),
      endDeg: transformAngle(180 - point.endDeg),
    };
  if (point.heading === "constant")
    return { ...point, degrees: transformAngle(180 - point.degrees) };
  // Tangential reverse flag stays same
  return point;
}

// Mirror path data across the center Y-axis (X = 72)
export function mirrorPathData(data: {
  startPoint: Point;
  lines: Line[];
  shapes: Shape[];
}) {
  const m = JSON.parse(JSON.stringify(data));

  if (m.startPoint) {
    m.startPoint.x = 144 - m.startPoint.x;
    m.startPoint = mirrorPointHeading(m.startPoint);
  }

  if (m.lines) {
    m.lines.forEach((line: Line) => {
      if (line.endPoint) {
        line.endPoint.x = 144 - line.endPoint.x;
        line.endPoint = mirrorPointHeading(line.endPoint);
      }
      if (line.controlPoints) {
        line.controlPoints.forEach((cp: ControlPoint) => (cp.x = 144 - cp.x));
      }
    });
  }

  if (m.shapes) {
    m.shapes.forEach((s: Shape) =>
      s.vertices?.forEach((v: any) => (v.x = 144 - v.x)),
    );
  }

  return m;
}

// Reverse path direction
export function reversePathData(data: {
  startPoint: Point;
  lines: Line[];
  sequence?: SequenceItem[];
  shapes?: Shape[];
}) {
  // Deep clone to avoid mutating original
  const r = JSON.parse(JSON.stringify(data));
  const originalLines: Line[] = data.lines || [];

  if (originalLines.length === 0) return r;

  // 1. New Start Point is the last End Point
  const lastLine = originalLines[originalLines.length - 1];
  const newStartPoint = JSON.parse(JSON.stringify(lastLine.endPoint));

  // Adjust new start point heading properties
  if (newStartPoint.heading === "linear") {
    const temp = newStartPoint.startDeg;
    newStartPoint.startDeg = newStartPoint.endDeg;
    newStartPoint.endDeg = temp;
  }

  // 2. Reverse Lines
  // We iterate backwards to reconstruct the path in reverse geometric order.
  // The target end points for the new lines are: [P_{n-1}, P_{n-2}, ..., P_0]
  const points = [r.startPoint, ...originalLines.map((l) => l.endPoint)];

  const newLines: Line[] = [];

  for (let i = originalLines.length; i >= 1; i--) {
    const originalLineIndex = i - 1;
    const originalLine = originalLines[originalLineIndex];

    // The target end point is the start point of the original segment.
    const targetEndPoint = JSON.parse(JSON.stringify(points[i - 1]));

    // Fix heading for target end point if linear
    if (targetEndPoint.heading === "linear") {
      const temp = targetEndPoint.startDeg;
      targetEndPoint.startDeg = targetEndPoint.endDeg;
      targetEndPoint.endDeg = temp;
    }

    // Control points need to be reversed order
    const newControlPoints = [...(originalLine.controlPoints || [])].reverse();

    const newLine: Line = {
      ...originalLine,
      endPoint: targetEndPoint,
      controlPoints: newControlPoints,
      // Swap waits
      waitBefore: originalLine.waitAfter,
      waitAfter: originalLine.waitBefore,
      waitBeforeMs: originalLine.waitAfterMs,
      waitAfterMs: originalLine.waitBeforeMs,
      waitBeforeName: originalLine.waitAfterName,
      waitAfterName: originalLine.waitBeforeName,
    };

    newLines.push(newLine);
  }

  r.startPoint = newStartPoint;
  r.lines = newLines;

  // 3. Reverse Sequence
  if (r.sequence && Array.isArray(r.sequence)) {
    r.sequence = r.sequence.reverse();
  }

  return r;
}

// --- New Transformation Utils ---

// Helper to rotate a heading
export function rotatePointHeading(point: Point, angle: number): Point {
  if (point.heading === "linear")
    return {
      ...point,
      startDeg: transformAngle(point.startDeg + angle),
      endDeg: transformAngle(point.endDeg + angle),
    };
  if (point.heading === "constant")
    return { ...point, degrees: transformAngle(point.degrees + angle) };
  return point;
}

export function translatePathData(
  data: { startPoint: Point; lines: Line[]; shapes: Shape[] },
  dx: number,
  dy: number,
) {
  const t = JSON.parse(JSON.stringify(data));

  const translate = (p: BasePoint) => {
    p.x += dx;
    p.y += dy;
  };

  if (t.startPoint) translate(t.startPoint);

  if (t.lines) {
    t.lines.forEach((line: Line) => {
      if (line.endPoint) translate(line.endPoint);
      if (line.controlPoints) {
        line.controlPoints.forEach((cp: ControlPoint) => translate(cp));
      }
    });
  }

  if (t.shapes) {
    t.shapes.forEach((s: Shape) =>
      s.vertices?.forEach((v: any) => translate(v)),
    );
  }

  return t;
}

export function rotatePathData(
  data: { startPoint: Point; lines: Line[]; shapes: Shape[] },
  angleDeg: number,
  cx: number,
  cy: number,
) {
  const t = JSON.parse(JSON.stringify(data));
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotate = (p: BasePoint) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    p.x = cx + dx * cos - dy * sin;
    p.y = cy + dx * sin + dy * cos;
  };

  if (t.startPoint) {
    rotate(t.startPoint);
    t.startPoint = rotatePointHeading(t.startPoint, angleDeg);
  }

  if (t.lines) {
    t.lines.forEach((line: Line) => {
      if (line.endPoint) {
        rotate(line.endPoint);
        line.endPoint = rotatePointHeading(line.endPoint, angleDeg);
      }
      if (line.controlPoints) {
        line.controlPoints.forEach((cp: ControlPoint) => rotate(cp));
      }
    });
  }

  if (t.shapes) {
    t.shapes.forEach((s: Shape) => s.vertices?.forEach((v: any) => rotate(v)));
  }

  return t;
}

export function flipPathData(
  data: { startPoint: Point; lines: Line[]; shapes: Shape[] },
  axis: "x" | "y",
  center: number,
) {
  const t = JSON.parse(JSON.stringify(data));

  const flip = (p: BasePoint) => {
    if (axis === "x") {
      p.x = center + (center - p.x);
    } else {
      p.y = center + (center - p.y);
    }
  };

  const flipHeading = (p: Point) => {
    if (axis === "x") {
      // Mirror across vertical line: 180 - angle
      if (p.heading === "linear") {
        p.startDeg = transformAngle(180 - p.startDeg);
        p.endDeg = transformAngle(180 - p.endDeg);
      } else if (p.heading === "constant") {
        p.degrees = transformAngle(180 - p.degrees);
      }
    } else {
      // Mirror across horizontal line: -angle
      if (p.heading === "linear") {
        p.startDeg = transformAngle(-p.startDeg);
        p.endDeg = transformAngle(-p.endDeg);
      } else if (p.heading === "constant") {
        p.degrees = transformAngle(-p.degrees);
      }
    }
    return p;
  };

  if (t.startPoint) {
    flip(t.startPoint);
    flipHeading(t.startPoint);
  }

  if (t.lines) {
    t.lines.forEach((line: Line) => {
      if (line.endPoint) {
        flip(line.endPoint);
        flipHeading(line.endPoint);
      }
      if (line.controlPoints) {
        line.controlPoints.forEach((cp: ControlPoint) => flip(cp));
      }
    });
  }

  if (t.shapes) {
    t.shapes.forEach((s: Shape) => s.vertices?.forEach((v: any) => flip(v)));
  }

  return t;
}
