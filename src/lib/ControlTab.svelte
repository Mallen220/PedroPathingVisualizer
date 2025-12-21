<script lang="ts">
  import type {
    Point,
    Line,
    BasePoint,
    Settings,
    Shape,
    SequenceItem,
  } from "../types";
  import _ from "lodash";
  import { getRandomColor } from "../utils";
  import ObstaclesSection from "./components/ObstaclesSection.svelte";
  import RobotPositionDisplay from "./components/RobotPositionDisplay.svelte";
  import StartingPointSection from "./components/StartingPointSection.svelte";
  import PathLineSection from "./components/PathLineSection.svelte";
  import PlaybackControls from "./components/PlaybackControls.svelte";
  import WaitRow from "./components/WaitRow.svelte";

  export let percent: number;
  export let playing: boolean;
  export let play: () => any;
  export let pause: () => any;
  export let startPoint: Point;
  export let lines: Line[];
  export let sequence: SequenceItem[];
  export let robotWidth: number = 16;
  export let robotHeight: number = 16;
  export let robotXY: BasePoint;
  export let robotHeading: number;
  export let x: d3.ScaleLinear<number, number, number>;
  export let y: d3.ScaleLinear<number, number, number>;
  export let settings: Settings;
  export let handleSeek: (percent: number) => void;
  export let loopAnimation: boolean;

  export let shapes: Shape[];
  export let recordChange: () => void;

  let collapsedEventMarkers: boolean[] = lines.map(() => false);

  // State for collapsed sections
  let collapsedSections = {
    obstacles: shapes.map(() => true),
    lines: lines.map(() => false),
    controlPoints: lines.map(() => true), // Start with control points collapsed
  };

  // Reactive statements to update UI state when lines or shapes change from file load
  $: if (lines.length !== collapsedSections.lines.length) {
    collapsedEventMarkers = lines.map(() => false);
    collapsedSections = {
      obstacles: shapes.map(() => true),
      lines: lines.map(() => false),
      controlPoints: lines.map(() => true),
    };
  }

  $: if (shapes.length !== collapsedSections.obstacles.length) {
    collapsedSections.obstacles = shapes.map(() => true);
  }

  const makeId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  function getWait(i: any) {
    return i as any;
  }

  function insertLineAfter(seqIndex: number) {
    const seqItem = sequence[seqIndex];
    if (!seqItem || seqItem.kind !== "path") return;
    const lineIndex = lines.findIndex((l) => l.id === seqItem.lineId);
    const currentLine = lines[lineIndex];

    // Calculate a new point offset from the current line's end point
    let newPoint: Point;
    if (currentLine.endPoint.heading === "linear") {
      newPoint = {
        x: _.random(36, 108),
        y: _.random(36, 108),
        heading: "linear",
        startDeg: currentLine.endPoint.startDeg,
        endDeg: currentLine.endPoint.endDeg,
      };
    } else if (currentLine.endPoint.heading === "constant") {
      newPoint = {
        x: _.random(36, 108),
        y: _.random(36, 108),
        heading: "constant",
        degrees: currentLine.endPoint.degrees,
      };
    } else {
      newPoint = {
        x: _.random(36, 108),
        y: _.random(36, 108),
        heading: "tangential",
        reverse: currentLine.endPoint.reverse,
      };
    }

    // Create a new line that starts where the current line ends
    const newLine = {
      id: makeId(),
      endPoint: newPoint,
      controlPoints: [],
      color: getRandomColor(),
      name: `Path ${lines.length + 1}`,
      eventMarkers: [],
      waitBeforeMs: 0,
      waitAfterMs: 0,
      waitBeforeName: "",
      waitAfterName: "",
    };

    // Insert the new line after the current one and a sequence item after current seq index
    const newLines = [...lines];
    newLines.splice(lineIndex + 1, 0, newLine);
    lines = newLines;

    const newSeq = [...sequence];
    newSeq.splice(seqIndex + 1, 0, { kind: "path", lineId: newLine.id! });
    sequence = newSeq;

    collapsedSections.lines.splice(lineIndex + 1, 0, false);
    collapsedSections.controlPoints.splice(lineIndex + 1, 0, true);
    collapsedEventMarkers.splice(lineIndex + 1, 0, false);

    // Force reactivity
    collapsedSections = { ...collapsedSections };
    collapsedEventMarkers = [...collapsedEventMarkers];
  }

  function removeLine(idx: number) {
    const removedId = lines[idx]?.id;
    let _lns = lines;
    lines.splice(idx, 1);
    lines = _lns;
    if (removedId) {
      sequence = sequence.filter(
        (s) => s.kind === "wait" || s.lineId !== removedId,
      );
    }
    recordChange();
  }

  function addLine() {
    const newLine: Line = {
      id: makeId(),
      name: `Path ${lines.length + 1}`,
      endPoint: {
        x: _.random(0, 144),
        y: _.random(0, 144),
        heading: "tangential",
        reverse: false,
      },
      controlPoints: [],
      color: getRandomColor(),
      waitBeforeMs: 0,
      waitAfterMs: 0,
      waitBeforeName: "",
      waitAfterName: "",
    };
    lines = [...lines, newLine];
    sequence = [...sequence, { kind: "path", lineId: newLine.id! }];
    collapsedSections.lines.push(false);
    collapsedSections.controlPoints.push(true);
    recordChange();
  }

  function addWait() {
    const wait = {
      kind: "wait",
      id: makeId(),
      name: "Wait",
      durationMs: 0,
    } as SequenceItem;
    sequence = [...sequence, wait];
  }

  function insertWaitAfter(seqIndex: number) {
    const newSeq = [...sequence];
    newSeq.splice(seqIndex + 1, 0, {
      kind: "wait",
      id: makeId(),
      name: "Wait",
      durationMs: 0,
    });
    sequence = newSeq;
  }

  function insertPathAfter(seqIndex: number) {
    // Create a new line with default settings
    const newLine: Line = {
      id: makeId(),
      name: `Path ${lines.length + 1}`,
      endPoint: {
        x: _.random(36, 108),
        y: _.random(36, 108),
        heading: "tangential",
        reverse: false,
      },
      controlPoints: [],
      color: getRandomColor(),
      eventMarkers: [],
      waitBeforeMs: 0,
      waitAfterMs: 0,
      waitBeforeName: "",
      waitAfterName: "",
    };

    // Add the new line to the lines array
    lines = [...lines, newLine];

    // Insert the new path in the sequence after the wait
    const newSeq = [...sequence];
    newSeq.splice(seqIndex + 1, 0, { kind: "path", lineId: newLine.id! });
    sequence = newSeq;

    // Add UI state for the new line
    collapsedSections.lines.push(false);
    collapsedSections.controlPoints.push(true);
    collapsedEventMarkers.push(false);

    // Force reactivity
    collapsedSections = { ...collapsedSections };
    collapsedEventMarkers = [...collapsedEventMarkers];
    recordChange();
  }
</script>

<div class="flex-1 flex flex-col justify-start items-center gap-2 h-full">
  <div
    class="flex flex-col justify-start items-start w-full rounded-lg bg-neutral-50 dark:bg-neutral-900 shadow-md p-4 overflow-y-scroll overflow-x-hidden h-full gap-6"
  >
    <ObstaclesSection
      bind:shapes
      bind:collapsedObstacles={collapsedSections.obstacles}
    />

    <RobotPositionDisplay {robotXY} {robotHeading} {x} {y} />

    <StartingPointSection bind:startPoint />

    <!-- Unified sequence render: paths and waits -->
    {#each sequence as item, sIdx}
      {#if item.kind === "path"}
        {#each lines.filter((l) => l.id === item.lineId) as ln (ln.id)}
          <PathLineSection
            bind:line={ln}
            idx={lines.findIndex((l) => l.id === ln.id)}
            bind:lines
            bind:collapsed={
              collapsedSections.lines[lines.findIndex((l) => l.id === ln.id)]
            }
            bind:collapsedEventMarkers={
              collapsedEventMarkers[lines.findIndex((l) => l.id === ln.id)]
            }
            bind:collapsedControlPoints={
              collapsedSections.controlPoints[
                lines.findIndex((l) => l.id === ln.id)
              ]
            }
            onRemove={() => removeLine(lines.findIndex((l) => l.id === ln.id))}
            onInsertAfter={() => insertLineAfter(sIdx)}
            onAddWaitAfter={() => insertWaitAfter(sIdx)}
            {recordChange}
          />
        {/each}
      {:else}
        <WaitRow
          name={getWait(item).name}
          durationMs={getWait(item).durationMs}
          onChange={(newName, newDuration) => {
            const newSeq = [...sequence];
            newSeq[sIdx] = {
              ...getWait(item),
              name: newName,
              durationMs: Math.max(0, Number(newDuration) || 0),
            };
            sequence = newSeq;
          }}
          onRemove={() => {
            const newSeq = [...sequence];
            newSeq.splice(sIdx, 1);
            sequence = newSeq;
          }}
          onInsertAfter={() => {
            const newSeq = [...sequence];
            newSeq.splice(sIdx + 1, 0, {
              kind: "wait",
              id: makeId(),
              name: "Wait",
              durationMs: 0,
            });
            sequence = newSeq;
          }}
          onAddPathAfter={() => insertPathAfter(sIdx)}
        />
      {/if}
    {/each}

    <!-- Add Line Button -->
    <div class="flex flex-row items-center gap-4">
      <button
        on:click={addLine}
        class="font-semibold text-green-500 text-sm flex flex-row justify-start items-center gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2}
          stroke="currentColor"
          class="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        <p>Add Line</p>
      </button>

      <button
        on:click={addWait}
        class="font-semibold text-amber-500 text-sm flex flex-row justify-start items-center gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="size-5"
        >
          <circle cx="12" cy="12" r="9" />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 7v5l3 2"
          />
        </svg>
        <p>Add Wait</p>
      </button>
    </div>
  </div>

  <PlaybackControls
    bind:playing
    {play}
    {pause}
    bind:percent
    {handleSeek}
    bind:loopAnimation
  />
</div>
