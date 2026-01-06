// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { PathOptimizer } from "./pathOptimizer";
import { collisionMarkers, notification } from "../stores";
import type { Line, Point, SequenceItem, Settings, Shape } from "../types";

export function validatePath(
  startPoint: Point,
  lines: Line[],
  settings: Settings,
  sequence: SequenceItem[],
  shapes: Shape[],
) {
  const optimizer = new PathOptimizer(
    startPoint,
    lines,
    settings,
    sequence,
    shapes,
  );
  const markers = optimizer.getCollisions();

  // Check for zero-length paths
  // Start point for first line is startPoint
  // Start point for subsequent lines is previous line's endPoint
  let currentStart = startPoint;
  lines.forEach((line, idx) => {
    const dist = Math.hypot(
      line.endPoint.x - currentStart.x,
      line.endPoint.y - currentStart.y,
    );
    if (dist < 0.001) {
      // Add a marker for zero length
      markers.push({
        x: line.endPoint.x,
        y: line.endPoint.y,
        time: 0, // irrelevant for static warning
        type: "boundary", // Use boundary style (orange) or similar warning style
      });
      // We can also trigger a toast immediately or let the count handle it
    }
    currentStart = line.endPoint;
  });

  collisionMarkers.set(markers);

  const zeroLengthCount = markers.filter(
    (m) => m.type === "boundary" && m.time === 0,
  ).length; // Heuristic
  // Actually we just added them with type boundary.

  if (markers.length > 0) {
    if (zeroLengthCount > 0) {
      notification.set({
        message: `Found ${markers.length} issues (including zero-length paths)!`,
        type: "warning",
        timeout: 5000,
      });
    } else {
      notification.set({
        message: `Found ${markers.length} collisions! Check the field.`,
        type: "error",
        timeout: 5000,
      });
    }
  } else {
    notification.set({
      message: "Path is valid! No collisions detected.",
      type: "success",
      timeout: 3000,
    });
  }
}
