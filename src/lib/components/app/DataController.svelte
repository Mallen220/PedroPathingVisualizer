
<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    POINT_RADIUS,
    LINE_WIDTH,
    FIELD_SIZE,
    DEFAULT_KEY_BINDINGS,
    getDefaultStartPoint,
    getDefaultLines,
    getDefaultShapes,
    DEFAULT_SETTINGS
  } from "../../../config";
  import {
    calculateRobotState,
    calculatePathTime,
    getAnimationDuration,
    getRandomColor,
    loadRobotImage,
    updateRobotImageDisplay,
    getCurvePoint,
    quadraticToCubic,
    downloadTrajectory
  } from "../../../utils";
  import { normalizeLines } from "../../../utils/path";
  import { loadSettings } from "../../../utils/settingsPersistence";
  import { createHistory, type AppState } from "../../../utils/history";

  // Stores
  import {
    snapToGrid,
    gridSize,
    currentFilePath,
    isUnsaved,
    showGrid,
    showProtractor,
    showShortcuts,
    showSettings,
    exportDialogState,
    selectedLineId,
    selectedPointId,
    toggleCollapseAllTrigger,
  } from "../../../stores";

  // Re-export types that might be needed
  import type { Point, Line, SequenceItem, Shape, Settings, BasePoint } from "../../../types";
  import _ from "lodash";

  // --- Props / Bindings for Parent ---
  export let startPoint: Point;
  export let lines: Line[];
  export const shapes: Shape[] = []; // Not manipulated here, but needed for completeness if we expand
  export let sequence: SequenceItem[];
  export let settings: Settings;

  // UI State
  export let robotXY: BasePoint = { x: 0, y: 0 };
  export let robotHeading: number = 0;
  export const previewOptimizedLines: Line[] | null = null;
  export let animationDuration: number = 0;

  export const x: any = null;
  export const y: any = null;

  // --- Derived ---
  $: timePrediction = calculatePathTime(startPoint, lines, settings, sequence);
  $: {
      animationDuration = getAnimationDuration(timePrediction.totalTime / 1000);
  }

  // Robot State Update
  export function updateRobotState(percent: number, x: any, y: any) {
    if (timePrediction && timePrediction.timeline && lines.length > 0) {
      const state = calculateRobotState(
        percent,
        timePrediction.timeline,
        lines,
        startPoint,
        x,
        y,
      );
      robotXY = { x: state.x, y: state.y };
      robotHeading = state.heading;
    } else {
      // Fallback
      robotXY = { x: x(startPoint.x), y: y(startPoint.y) };
      if (startPoint.heading === "linear") robotHeading = -startPoint.startDeg;
      else if (startPoint.heading === "constant")
        robotHeading = -startPoint.degrees;
      else robotHeading = 0;
    }
  }

  // Data Manipulation
  export function normalizeLinesWrapper(input: Line[]): Line[] {
      return normalizeLines(input); // Assuming this util exists or we need to move it
  }

  export function addNewLine() {
    const newLine = {
        id: `line-${Math.random().toString(36).slice(2)}`,
        endPoint: {
          x: _.random(36, 108),
          y: _.random(36, 108),
          heading: "tangential",
          reverse: false,
        } as Point,
        controlPoints: [],
        color: getRandomColor(),
        locked: false,
        waitBeforeMs: 0,
        waitAfterMs: 0,
        waitBeforeName: "",
        waitAfterName: "",
    };

    lines = [...lines, newLine];
    sequence = [
      ...sequence,
      { kind: "path", lineId: newLine.id! },
    ];
    // Return true to indicate change recorded?
    return true;
  }

  export function addWait() {
    const wait = {
      kind: "wait",
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: "Wait",
      durationMs: 1000,
      locked: false,
    } as SequenceItem;
    sequence = [...sequence, wait];
    return true;
  }

  export function addControlPoint() {
      if (lines.length === 0) return false;

      const targetId = $selectedLineId || lines[lines.length - 1].id;
      const targetLine = lines.find((l) => l.id === targetId) || lines[lines.length - 1];
      if (!targetLine) return false;

      targetLine.controlPoints.push({
          x: _.random(36, 108),
          y: _.random(36, 108),
      });

      lines = [...lines]; // Trigger reactivity
      return true;
  }

  export function removeControlPoint() {
      if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          if (lastLine.controlPoints.length > 0) {
              lastLine.controlPoints.pop();
              lines = [...lines];
              return true;
          }
      }
      return false;
  }

</script>
