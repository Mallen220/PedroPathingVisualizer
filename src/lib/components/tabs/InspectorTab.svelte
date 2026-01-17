<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { onMount } from "svelte";
  import { inspectPath, type InspectionIssue } from "../../../utils/inspector";
  import { percentStore } from "../../projectStore";
  import { collisionMarkers, selectedLineId } from "../../../stores";
  import { calculatePathTime, formatTime } from "../../../utils/timeCalculator";
  import type {
    Point,
    Line,
    SequenceItem,
    Shape,
    Settings,
    BasePoint,
    CollisionMarker,
  } from "../../../types";
  import { slide } from "svelte/transition";

  export let startPoint: Point;
  export let lines: Line[];
  export let sequence: SequenceItem[];
  export let shapes: Shape[];
  export let settings: Settings;
  // Unused exports commented out to avoid build warnings
  // export let robotXY: BasePoint;
  // export let robotHeading: number;
  export let isActive: boolean;
  // export let recordChange: () => void;
  // export let onPreviewChange: ((lines: Line[] | null) => void) | null;

  let issues: InspectionIssue[] = [];
  let isAnalyzing = false;
  let totalTime = 0;

  // Track expanded groups by ID
  let expandedGroups: Record<string, boolean> = {};

  $: if (isActive && lines && sequence && settings && shapes) {
    runInspection();
  }

  function runInspection() {
    isAnalyzing = true;
    setTimeout(() => {
      const timeResult = calculatePathTime(
        startPoint,
        lines,
        settings,
        sequence,
      );
      totalTime = timeResult.totalTime;

      issues = inspectPath(startPoint, lines, settings, sequence, shapes);

      // Reset expansion state when re-inspecting
      expandedGroups = {};

      // Update collision markers store for visualization
      // We need to flatten the grouped issues to show all markers
      const markers: CollisionMarker[] = [];
      const processIssue = (i: InspectionIssue) => {
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
        if (i.children) {
          i.children.forEach(processIssue);
        }
      };

      issues.forEach(processIssue);
      collisionMarkers.set(markers);

      isAnalyzing = false;
    }, 10);
  }

  function handleIssueClick(issue: InspectionIssue) {
    if (issue.time !== undefined && totalTime > 0) {
      const p = (issue.time / totalTime) * 100;
      percentStore.set(Math.min(100, Math.max(0, p)));
    }

    if (typeof issue.segmentIndex === "number" && lines[issue.segmentIndex]) {
      if (lines[issue.segmentIndex].id) {
        selectedLineId.set(lines[issue.segmentIndex].id!);
      }
    }
  }

  function toggleGroup(id: string, e: MouseEvent) {
    e.stopPropagation();
    expandedGroups[id] = !expandedGroups[id];
  }

  // Calculate totals recursively
  function countSeverity(
    list: InspectionIssue[],
    severity: "error" | "warning",
  ): number {
    let count = 0;
    list.forEach((i) => {
      // If it's a group, we can count it as 1 issue or count all children.
      // Counting children gives a truer sense of "how many bad frames".
      // Counting group gives a sense of "how many problems to fix".
      // Let's count the group itself as 1 if it has children, or just the item.
      // Actually, the request implies grouping prevents flooding. So 1 group = 1 item in the list.
      if (i.severity === severity) count++;
    });
    return count;
  }

  $: errorCount = countSeverity(issues, "error");
  $: warningCount = countSeverity(issues, "warning");
</script>

<div class="h-full flex flex-col">
  <!-- Header / Summary -->
  <div
    class="flex-none p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50"
  >
    <div class="flex items-center justify-between">
      <h3
        class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide"
      >
        Path Health
      </h3>
      {#if isAnalyzing}
        <span class="text-xs text-neutral-500 animate-pulse">Analyzing...</span>
      {:else}
        <div class="flex gap-3 text-sm">
          {#if issues.length === 0}
            <span
              class="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="size-4"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clip-rule="evenodd"
                />
              </svg>
              Healthy
            </span>
          {:else}
            {#if errorCount > 0}
              <span
                class="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="size-4"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                    clip-rule="evenodd"
                  />
                </svg>
                {errorCount} Error{errorCount !== 1 ? "s" : ""}
              </span>
            {/if}
            {#if warningCount > 0}
              <span
                class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="size-4"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clip-rule="evenodd"
                  />
                </svg>
                {warningCount} Warning{warningCount !== 1 ? "s" : ""}
              </span>
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Issues List -->
  <div class="flex-1 overflow-y-auto p-4 space-y-3">
    {#if issues.length === 0 && !isAnalyzing}
      <div
        class="h-full flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-500 py-12"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-16 mb-4 opacity-50"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
          />
        </svg>
        <p class="text-lg font-medium text-neutral-600 dark:text-neutral-300">
          All Systems Go
        </p>
        <p class="text-sm max-w-xs mt-2">
          No errors, warnings, or collisions detected in your path.
        </p>
      </div>
    {:else}
      {#each issues as issue (issue.id)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="group bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          on:click={() => handleIssueClick(issue)}
        >
          <!-- Severity Indicator Strip -->
          <div
            class="absolute left-0 top-0 bottom-0 w-1 {issue.severity ===
            'error'
              ? 'bg-red-500'
              : 'bg-amber-500'}"
          ></div>

          <div class="p-3 pl-4 flex gap-3">
            <!-- Icon -->
            <div class="flex-none mt-0.5">
              {#if issue.severity === "error"}
                <div
                  class="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                >
                  {#if issue.type === "collision"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="size-4"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else if issue.type === "boundary"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="size-4"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm2.25-.75a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h11.5a.75.75 0 00.75-.75V4.25a.75.75 0 00-.75-.75H4.25z"
                        clip-rule="evenodd"
                      />
                      <path
                        fill-rule="evenodd"
                        d="M6.578 12.022a.75.75 0 010-1.06l1.543-1.544-1.543-1.543a.75.75 0 011.06-1.06l1.544 1.543 1.543-1.543a.75.75 0 011.06 1.06l-1.543 1.543 1.543 1.544a.75.75 0 01-1.06 1.06l-1.543-1.543-1.544 1.543a.75.75 0 01-1.06 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="size-4"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {/if}
                </div>
              {:else}
                <div
                  class="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="size-4"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              {/if}
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <h4
                  class="text-sm font-semibold text-neutral-900 dark:text-white truncate pr-2"
                >
                  {issue.message}
                </h4>
                {#if issue.time !== undefined && !issue.children}
                  <span
                    class="text-xs font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded"
                  >
                    {formatTime(issue.time)}
                  </span>
                {/if}
                {#if issue.children}
                  <button
                    class="p-1 -m-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
                    on:click={(e) => toggleGroup(issue.id, e)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="size-4 text-neutral-500 transition-transform duration-200 {expandedGroups[
                        issue.id
                      ]
                        ? 'rotate-180'
                        : ''}"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                {/if}
              </div>
              {#if issue.description}
                <p
                  class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed"
                >
                  {issue.description}
                </p>
              {/if}
              <div class="mt-2 flex items-center gap-2">
                <span
                  class="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wide font-medium"
                >
                  {issue.type}
                </span>
                <span
                  class="text-[10px] text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                >
                  Jump to Issue &rarr;
                </span>
              </div>
            </div>
          </div>

          <!-- Children (Dropdown) -->
          {#if issue.children && expandedGroups[issue.id]}
            <div
              class="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/30"
              transition:slide={{ duration: 200 }}
            >
              {#each issue.children as child}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                  class="px-4 py-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer border-b border-neutral-100 dark:border-neutral-800 last:border-0 pl-11"
                  on:click={(e) => {
                    e.stopPropagation(); // Don't trigger parent click
                    handleIssueClick(child);
                  }}
                >
                  <div class="text-xs text-neutral-700 dark:text-neutral-300">
                    {child.message}
                  </div>
                  {#if child.time !== undefined}
                    <span
                      class="text-[10px] font-mono text-neutral-500 dark:text-neutral-400"
                    >
                      {formatTime(child.time)}
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
