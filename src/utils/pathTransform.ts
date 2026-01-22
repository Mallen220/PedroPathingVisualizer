// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import type { Point, ControlPoint, Line, Shape, SequenceItem } from "../types";

// Helper to mirror a single point's heading
export function mirrorPointHeading(point: Point): Point {
  if (point.heading === "linear")
    return {
      ...point,
      startDeg: 180 - point.startDeg,
      endDeg: 180 - point.endDeg,
    };
  if (point.heading === "constant")
    return { ...point, degrees: 180 - point.degrees };
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

// --- New Transformation Functions ---

export function translatePath(
  data: { startPoint: Point; lines: Line[]; shapes?: Shape[] },
  dx: number,
  dy: number,
) {
  const t = JSON.parse(JSON.stringify(data));

  if (t.startPoint) {
    t.startPoint.x += dx;
    t.startPoint.y += dy;
  }

  if (t.lines) {
    t.lines.forEach((line: Line) => {
      if (line.endPoint) {
        line.endPoint.x += dx;
        line.endPoint.y += dy;
      }
      if (line.controlPoints) {
        line.controlPoints.forEach((cp: ControlPoint) => {
          cp.x += dx;
          cp.y += dy;
        });
      }
    });
  }

  if (t.shapes) {
    t.shapes.forEach((s: Shape) =>
      s.vertices?.forEach((v: any) => {
        v.x += dx;
        v.y += dy;
      }),
    );
  }

  return t;
}

export function rotatePath(
  data: { startPoint: Point; lines: Line[]; shapes?: Shape[] },
  angleDeg: number,
  pivot: { x: number; y: number },
) {
  const r = JSON.parse(JSON.stringify(data));
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotatePoint = (p: { x: number; y: number }) => {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    p.x = pivot.x + dx * cos - dy * sin;
    p.y = pivot.y + dx * sin + dy * cos;
  };

  const rotateHeading = (p: Point) => {
    if (p.heading === "constant") {
      p.degrees = (p.degrees + angleDeg) % 360;
    } else if (p.heading === "linear") {
      p.startDeg = (p.startDeg + angleDeg) % 360;
      p.endDeg = (p.endDeg + angleDeg) % 360;
    }
  };

  if (r.startPoint) {
    rotatePoint(r.startPoint);
    rotateHeading(r.startPoint);
  }

  if (r.lines) {
    r.lines.forEach((line: Line) => {
      if (line.endPoint) {
        rotatePoint(line.endPoint);
        rotateHeading(line.endPoint);
      }
      if (line.controlPoints) {
        line.controlPoints.forEach((cp: ControlPoint) => rotatePoint(cp));
      }
    });
  }

  if (r.shapes) {
    r.shapes.forEach((s: Shape) =>
      s.vertices?.forEach((v: any) => rotatePoint(v)),
    );
  }

  return r;
}

export function flipPath(
  data: { startPoint: Point; lines: Line[]; shapes?: Shape[] },
  axis: "horizontal" | "vertical",
  anchor: number,
) {
  const f = JSON.parse(JSON.stringify(data));

  const flipPoint = (p: { x: number; y: number }) => {
    if (axis === "horizontal") {
      // Flip across vertical line X = anchor
      // x' = anchor - (x - anchor) = 2*anchor - x
      p.x = 2 * anchor - p.x;
    } else {
      // Flip across horizontal line Y = anchor
      p.y = 2 * anchor - p.y;
    }
  };

  const flipHeading = (p: Point) => {
    if (p.heading === "constant") {
      if (axis === "horizontal") {
        p.degrees = 180 - p.degrees;
      } else {
        p.degrees = -p.degrees;
      }
      p.degrees = (p.degrees + 360) % 360;
    } else if (p.heading === "linear") {
      if (axis === "horizontal") {
        p.startDeg = 180 - p.startDeg;
        p.endDeg = 180 - p.endDeg;
      } else {
        p.startDeg = -p.startDeg;
        p.endDeg = -p.endDeg;
      }
      p.startDeg = (p.startDeg + 360) % 360;
      p.endDeg = (p.endDeg + 360) % 360;
    }
  };

  if (f.startPoint) {
    flipPoint(f.startPoint);
    flipHeading(f.startPoint);
  }

  if (f.lines) {
    f.lines.forEach((line: Line) => {
      if (line.endPoint) {
        flipPoint(line.endPoint);
        flipHeading(line.endPoint);
      }
      if (line.controlPoints) {
        line.controlPoints.forEach((cp: ControlPoint) => flipPoint(cp));
      }
    });
  }

  if (f.shapes) {
    f.shapes.forEach((s: Shape) =>
      s.vertices?.forEach((v: any) => flipPoint(v)),
    );
  }

  return f;
}
