// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { PathOptimizer } from "./pathOptimizer";
import { calculatePathTime, analyzePathSegment } from "./timeCalculator";
import { getLineStartHeading } from "./math";
import type {
  Point,
  Line,
  Settings,
  SequenceItem,
  Shape,
  TimelineEvent,
  CollisionMarker,
} from "../types";

export interface InspectionIssue {
  id: string; // unique id for keying
  severity: "error" | "warning";
  type:
    | "collision"
    | "boundary"
    | "zero-length"
    | "acceleration"
    | "velocity"
    | "other";
  message: string;
  description?: string;
  time?: number; // timestamp in the path
  segmentIndex?: number; // index of the line
  point?: { x: number; y: number };
  children?: InspectionIssue[];
}

export function inspectPath(
  startPoint: Point,
  lines: Line[],
  settings: Settings,
  sequence: SequenceItem[],
  shapes: Shape[],
): InspectionIssue[] {
  const rawIssues: InspectionIssue[] = [];

  // 1. Calculate Path Time & Timeline
  const timeResult = calculatePathTime(startPoint, lines, settings, sequence);
  const timeline = timeResult.timeline;

  // 2. Check for Collisions & Boundary Violations
  const optimizer = new PathOptimizer(
    startPoint,
    lines,
    settings,
    sequence,
    shapes,
  );

  // Get raw collisions without grouping (since we will group ourselves)
  const collisions = optimizer.getCollisions(timeline, lines);

  // Check for Zero-length segments
  let currentStart = startPoint;
  lines.forEach((line, index) => {
    if (line.endPoint) {
      const dx = line.endPoint.x - currentStart.x;
      const dy = line.endPoint.y - currentStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.001) {
        collisions.push({
          x: currentStart.x,
          y: currentStart.y,
          time: 0,
          segmentIndex: index,
          type: "zero-length" as any,
        });
      }
      currentStart = line.endPoint;
    }
  });

  // Convert collisions to InspectionIssues
  collisions.forEach((c, idx) => {
    if (c.type === "boundary") {
      rawIssues.push({
        id: `boundary-${idx}`,
        severity: "error",
        type: "boundary",
        message: "Robot goes out of field bounds",
        description: "The robot chassis exceeds the defined field boundaries.",
        time: c.time,
        segmentIndex: c.segmentIndex,
        point: { x: c.x, y: c.y },
      });
    } else if (c.type === "obstacle") {
      rawIssues.push({
        id: `obstacle-${idx}`,
        severity: "error",
        type: "collision",
        message: "Collision with obstacle",
        description:
          "The robot chassis collides with a defined field obstacle.",
        time: c.time,
        segmentIndex: c.segmentIndex,
        point: { x: c.x, y: c.y },
      });
    } else if (c.type === "zero-length") {
      rawIssues.push({
        id: `zero-${idx}`,
        severity: "error",
        type: "zero-length",
        message: "Zero-length path segment",
        description:
          "This segment has start and end points at the same location.",
        time: c.time,
        segmentIndex: c.segmentIndex,
        point: { x: c.x, y: c.y },
      });
    }
  });

  // 3. Physics / Feasibility Checks
  const G_CONST = 386.22; // in/s^2 (approx gravity)
  const WARNING_G = 0.8;
  const ACCEL_THRESHOLD = WARNING_G * G_CONST;

  timeline.forEach((event, eventIdx) => {
    if (
      event.type === "travel" &&
      typeof event.lineIndex === "number" &&
      event.velocityProfile
    ) {
      const line = lines[event.lineIndex];
      const prevLine = event.lineIndex > 0 ? lines[event.lineIndex - 1] : null;
      const pStart = prevLine ? prevLine.endPoint : startPoint;
      const startHeading =
        event.headingProfile && event.headingProfile.length > 0
          ? event.headingProfile[0]
          : 0;

      const analysis = analyzePathSegment(
        pStart,
        line.controlPoints,
        line.endPoint,
        100,
        startHeading,
      );

      const vProfile = event.velocityProfile;
      const steps = analysis.steps;

      for (let i = 0; i < steps.length; i++) {
        if (i >= vProfile.length) break;

        const v = vProfile[i];
        const r = steps[i].radius;

        if (r > 0.001) {
          const ac = (v * v) / r;
          if (ac > ACCEL_THRESHOLD) {
            const time = event.startTime + (i / steps.length) * event.duration;
            rawIssues.push({
              id: `accel-${eventIdx}-${i}`,
              severity: "warning",
              type: "acceleration",
              message: "High lateral acceleration",
              description: `Centripetal acceleration reaches ${(ac / G_CONST).toFixed(2)}G.`,
              time: time,
              segmentIndex: event.lineIndex,
            });
          }
        }
      }
    }
  });

  // 4. Grouping Logic
  // Sort issues by time
  rawIssues.sort((a, b) => (a.time || 0) - (b.time || 0));

  const groupedIssues: InspectionIssue[] = [];
  if (rawIssues.length === 0) return groupedIssues;

  let currentGroup: InspectionIssue = { ...rawIssues[0], children: [] };
  // If the first issue has children initialized, push the raw issue itself as a child?
  // Actually, we'll treat `currentGroup` as the potential parent.

  // We iterate through sorted raw issues.
  // If the next issue matches criteria with currentGroup, add to currentGroup.
  // Else, push currentGroup to results and start new group.

  // We need a fresh container for children
  let currentChildren: InspectionIssue[] = [rawIssues[0]];

  for (let i = 1; i < rawIssues.length; i++) {
    const issue = rawIssues[i];
    const prev = rawIssues[i - 1];

    const timeDiff = (issue.time || 0) - (prev.time || 0);
    const isSameType = issue.type === prev.type;
    const isSameSegment = issue.segmentIndex === prev.segmentIndex;
    const isClose = timeDiff < 0.5; // 0.5s window for clustering

    if (isSameType && isSameSegment && isClose) {
      currentChildren.push(issue);
    } else {
      // Close previous group
      if (currentChildren.length > 1) {
        // Create a summary parent
        const first = currentChildren[0];
        const last = currentChildren[currentChildren.length - 1];
        const duration = (last.time || 0) - (first.time || 0);
        groupedIssues.push({
          id: `group-${first.id}`,
          severity: first.severity,
          type: first.type,
          message: `${first.message} (${currentChildren.length} frames)`,
          description: `${first.description} (Duration: ~${duration.toFixed(2)}s)`,
          time: first.time,
          segmentIndex: first.segmentIndex,
          children: currentChildren,
        });
      } else {
        // Single issue
        groupedIssues.push(currentChildren[0]);
      }

      // Start new group
      currentChildren = [issue];
    }
  }

  // Flush last group
  if (currentChildren.length > 1) {
    const first = currentChildren[0];
    const last = currentChildren[currentChildren.length - 1];
    const duration = (last.time || 0) - (first.time || 0);
    groupedIssues.push({
      id: `group-${first.id}`,
      severity: first.severity,
      type: first.type,
      message: `${first.message} (${currentChildren.length} frames)`,
      description: `${first.description} (Duration: ~${duration.toFixed(2)}s)`,
      time: first.time,
      segmentIndex: first.segmentIndex,
      children: currentChildren,
    });
  } else if (currentChildren.length === 1) {
    groupedIssues.push(currentChildren[0]);
  }

  return groupedIssues;
}
