// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import type {
  ActionDefinition,
  FieldRenderContext,
  CodeExportContext,
  JavaCodeResult,
  TimeCalculationContext,
  TimeCalculationResult,
} from "../actionRegistry";
import ServoTableRow from "../components/table/ServoTableRow.svelte";
import ServoSection from "../components/sections/ServoSection.svelte";
import type { SequenceItem, SequenceServoItem } from "../../types";
import { makeId } from "../../utils/nameGenerator";

// Tailwind Safelist for dynamic classes:
// bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:ring-indigo-200 dark:focus:ring-indigo-500
// bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/30

export const ServoAction: ActionDefinition = {
  kind: "servo",
  label: "Servo",
  buttonColor: "indigo",
  component: ServoTableRow,
  sectionComponent: ServoSection,

  createDefault: () => ({
    kind: "servo",
    id: makeId(),
    name: "",
    port: "",
    position: 0.5,
    durationMs: 0,
    locked: false,
  }),

  renderField: (item: SequenceItem, context: FieldRenderContext) => {
    // Servos do not render on the field
    return [];
  },

  toJavaCode: (
    item: SequenceItem,
    context: CodeExportContext,
  ): JavaCodeResult => {
    const servoItem = item as SequenceServoItem;
    const stateStep = context.stateStep || 0;
    const servoName = servoItem.port || "servo";
    const pos = servoItem.position || 0;
    const duration = servoItem.durationMs || 0;

    let code = `
        case ${stateStep}:
          ${servoName}.setPosition(${pos});
          setPathState(${stateStep + 1});
          break;`;

    let stepsUsed = 1;

    if (duration > 0) {
      code = `
        case ${stateStep}:
          ${servoName}.setPosition(${pos});
          setPathState(${stateStep + 1});
          break;

        case ${stateStep + 1}:
          if(pathTimer.getMilliseconds() > ${duration}) {
            setPathState(${stateStep + 2});
          }
          break;`;
      stepsUsed = 2;
    }

    return { code, stepsUsed };
  },

  toSequentialCommand: (
    item: SequenceItem,
    context: CodeExportContext,
  ): string => {
    const servoItem = item as SequenceServoItem;
    const servoName = servoItem.port || "servo";
    const pos = servoItem.position || 0;
    const duration = servoItem.durationMs || 0;
    const isNextFTC = context.isNextFTC || false;

    const InstantCmdClass = "InstantCommand";
    const WaitCmdClass = isNextFTC ? "Delay" : "WaitCommand";
    const SequentialGroupClass = isNextFTC
      ? "SequentialGroup"
      : "SequentialCommandGroup";

    const getWaitValue = (ms: number) =>
      isNextFTC ? (ms / 1000.0).toFixed(3) : ms.toFixed(0);

    const setPosCmd = `new ${InstantCmdClass}(() -> ${servoName}.setPosition(${pos}))`;

    if (duration > 0) {
      return `new ${SequentialGroupClass}(
                    ${setPosCmd},
                    new ${WaitCmdClass}(${getWaitValue(duration)})
                )`;
    }

    return setPosCmd;
  },

  calculateTime: (
    item: SequenceItem,
    context: TimeCalculationContext,
  ): TimeCalculationResult => {
    const servoItem = item as SequenceServoItem;
    const durationSeconds = (servoItem.durationMs || 0) / 1000;
    const { currentTime, currentHeading, lastPoint } = context;

    if (durationSeconds <= 0) {
      return { events: [], duration: 0 };
    }

    const event = {
      type: "wait" as const, // Treat as wait for timeline visualization if it blocks
      name: servoItem.name || `Servo ${servoItem.port}`,
      duration: durationSeconds,
      startTime: currentTime,
      endTime: currentTime + durationSeconds,
      waitId: servoItem.id, // ID mapping for selection
      startHeading: currentHeading,
      targetHeading: currentHeading,
      atPoint: lastPoint,
    };

    return {
      events: [event],
      duration: durationSeconds,
    };
  },
};
