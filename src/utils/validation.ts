// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { inspectPath } from "./inspector";
import { collisionMarkers, notification } from "../stores";
import type {
  Line,
  Point,
  SequenceItem,
  Settings,
  Shape,
  CollisionMarker,
} from "../types";

export function validatePath(
  startPoint: Point,
  lines: Line[],
  settings: Settings,
  sequence: SequenceItem[],
  shapes: Shape[],
) {
  // Use the inspector logic to find issues
  const issues = inspectPath(startPoint, lines, settings, sequence, shapes);

  // Convert issues back to collision markers for visualization
  const markers: CollisionMarker[] = [];
  issues.forEach((i) => {
    if (
      (i.type === "collision" ||
        i.type === "boundary" ||
        i.type === "zero-length") &&
      i.point
    ) {
      markers.push({
        x: i.point.x,
        y: i.point.y,
        time: i.time || 0,
        segmentIndex: i.segmentIndex,
        type: i.type === "collision" ? "obstacle" : (i.type as any),
      });
    }
  });

  collisionMarkers.set(markers);

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (errors.length > 0) {
    const boundaryCount = errors.filter((m) => m.type === "boundary").length;
    const zeroLengthCount = errors.filter(
      (m) => m.type === "zero-length",
    ).length;
    const obstacleCount = errors.filter((m) => m.type === "collision").length;

    let msg = `Found ${errors.length} issues! `;
    const parts = [];
    if (obstacleCount > 0) parts.push(`${obstacleCount} obstacle`);
    if (boundaryCount > 0) parts.push(`${boundaryCount} boundary`);
    if (zeroLengthCount > 0) parts.push(`${zeroLengthCount} zero-length`);

    if (parts.length > 0) msg += `(${parts.join(", ")})`;

    notification.set({
      message: msg,
      type: "error",
      timeout: 5000,
    });
  } else if (warnings.length > 0) {
    notification.set({
      message: `Path is valid, but found ${warnings.length} warnings. Check Inspector tab.`,
      type: "warning",
      timeout: 4000,
    });
  } else {
    notification.set({
      message: "Path is valid! No collisions detected.",
      type: "success",
      timeout: 3000,
    });
  }
}
