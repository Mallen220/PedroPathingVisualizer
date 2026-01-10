// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
interface BasePoint {
  x: number;
  y: number;
  locked?: boolean;
}

interface WaitSegment {
  name?: string;
  durationMs: number;
  position?: "before" | "after";
}

export type TimelineEventType = "travel" | "wait";

export interface TimelineEvent {
  type: TimelineEventType;
  duration: number;
  startTime: number;
  endTime: number;
  name?: string;
  waitPosition?: "before" | "after";

  // For 'travel' events
  lineIndex?: number;

  // For 'wait/rotate' events
  startHeading?: number;
  targetHeading?: number;
  atPoint?: BasePoint;
}

interface TimePrediction {
  totalTime: number;
  segmentTimes: number[];
  totalDistance: number;
  timeline: TimelineEvent[];
}

type Point = BasePoint &
  (
    | {
        heading: "linear";
        startDeg: number;
        endDeg: number;
        degrees?: never;
        reverse?: never;
      }
    | {
        heading: "constant";
        degrees: number;
        startDeg?: never;
        endDeg?: never;
        reverse?: never;
      }
    | {
        heading: "tangential";
        degrees?: never;
        startDeg?: never;
        endDeg?: never;
        reverse: boolean;
      }
  );

type ControlPoint = BasePoint;

interface Line {
  id?: string;
  endPoint: Point;
  controlPoints: ControlPoint[];
  color: string;
  name?: string;
  eventMarkers?: EventMarker[];
  locked?: boolean;
  waitBefore?: WaitSegment;
  waitAfter?: WaitSegment;
  waitBeforeMs?: number;
  waitAfterMs?: number;
  waitBeforeName?: string;
  waitAfterName?: string;
}

type SequencePathItem = {
  kind: "path";
  lineId: string;
};

type SequenceWaitItem = {
  kind: "wait";
  id: string;
  name: string;
  durationMs: number;
  eventMarkers?: EventMarker[];
};

type SequenceRotateItem = {
  kind: "rotate";
  id: string;
  name: string;
  degrees: number;
  eventMarkers?: EventMarker[];
};

type SequenceItem = SequencePathItem | SequenceWaitItem | SequenceRotateItem;

interface Settings {
  xVelocity: number;
  yVelocity: number;
  aVelocity: number;
  kFriction: number;
  rWidth: number;
  rHeight: number;
  safetyMargin: number;
  maxVelocity: number; // inches/sec
  maxAcceleration: number; // inches/sec²
  maxDeceleration?: number; // inches/sec²
  fieldMap: string;
  robotImage?: string;
  theme: "light" | "dark" | "auto";
}

interface Shape {
  id: string;
  name?: string;
  vertices: BasePoint[];
  color: string;
  fillColor: string;
}

interface EventMarker {
  id: string;
  name: string;
  position: number; // 0-1 within the path segment
  lineIndex: number;
  parameters?: Record<string, any>; // Optional parameters for the command
}

interface NamedCommand {
  name: string;
  description?: string;
  parameters?: string[]; // Parameter names
}

interface DirectorySettings {
  autoPathsDirectory: string;
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: Date;
  error?: string;
}
