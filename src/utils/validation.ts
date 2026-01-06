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
  collisionMarkers.set(markers);

  if (markers.length > 0) {
    const boundaryCount = markers.filter((m) => m.type === "boundary").length;
    const obstacleCount = markers.length - boundaryCount;
    let msg = `Found ${markers.length} collisions! `;
    if (boundaryCount > 0 && obstacleCount > 0) {
      msg += `(${obstacleCount} obstacle, ${boundaryCount} boundary)`;
    } else if (boundaryCount > 0) {
      msg += "(Field Boundary Violation)";
    } else {
      msg += "(Obstacle Collision)";
    }
    notification.set({
      message: msg,
      type: "error",
      timeout: 5000,
    });
  } else {
    notification.set({
      message: "Path is valid! No collisions detected.",
      type: "success",
      timeout: 3000,
    });
  }
}
