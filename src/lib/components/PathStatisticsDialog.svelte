<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { cubicInOut } from "svelte/easing";
  import type { TimePrediction, Line, Point, SequenceItem } from "../../types";
  import { formatTime } from "../../utils";
  import { analyzePathSegment } from "../../utils";

  export let isOpen = false;
  export let timePrediction: TimePrediction | null;
  export let lines: Line[];
  export let startPoint: Point;
  // sequence is exported for compatibility but not strictly needed for recalc if using timeline
  export let sequence: SequenceItem[] | undefined = undefined;
  export let onClose: () => void;

  // Prevent unused export warning
  $: sequence;

  // Compute detailed statistics when dialog is open and data is available
  let stats = {
    totalDistance: 0,
    totalTime: 0,
    maxVelocity: 0,
    maxAcceleration: 0,
    maxAngularVelocity: 0,
    segments: [] as any[],
  };

  $: if (isOpen && timePrediction && lines) {
    recalculateDetailedStats();
  }

  function recalculateDetailedStats() {
    if (!timePrediction) return;

    let maxVel = 0;
    let maxAngVel = 0;
    const segmentStats = [] as any[];

    let currentHeading = 0;
    if (startPoint.heading === "linear") currentHeading = startPoint.startDeg;
    else if (startPoint.heading === "constant")
      currentHeading = startPoint.degrees;
    else if (startPoint.heading === "tangential") currentHeading = 0; // approximation if no previous

    // Need to track current point
    let lastPoint = startPoint;

    timePrediction.timeline.forEach((event, idx) => {
      if (event.type === "wait") {
        // Wait event
        segmentStats.push({
          id: idx,
          name: event.name || "Wait",
          type: "wait",
          duration: event.duration,
          distance: 0,
          avgVelocity: 0,
          maxVelocity: 0,
        });

        // Update heading if it changed during wait
        if (event.targetHeading !== undefined) {
          const diff = Math.abs(
            event.targetHeading - (event.startHeading || currentHeading),
          );
          if (event.duration > 0) {
            const angVel = diff / event.duration; // degrees / sec
            if (angVel > maxAngVel) maxAngVel = angVel;
          }
          currentHeading = event.targetHeading;
        }
      } else if (event.type === "travel" && event.lineIndex !== undefined) {
        const line = lines[event.lineIndex];
        const prevPoint = lastPoint;

        // Use 100 samples to match standard visualizer resolution and potentially motion profile
        const analysis = analyzePathSegment(
          prevPoint,
          line.controlPoints,
          line.endPoint,
          100,
          currentHeading,
        );

        const dist = analysis.length;
        const duration = event.duration;
        const avgVel = duration > 0 ? dist / duration : 0;

        let segMaxVel = 0;

        if (event.motionProfile && event.motionProfile.length > 1) {
          // event.motionProfile length is typically N+1 (time at 0...N steps)
          // analysis.steps length is N (segments between points)

          // Ensure we don't go out of bounds
          const limit = Math.min(
            event.motionProfile.length - 1,
            analysis.steps.length,
          );

          for (let i = 0; i < limit; i++) {
            const tStart = event.motionProfile[i];
            const tEnd = event.motionProfile[i + 1];
            const dt = tEnd - tStart;
            const ds = analysis.steps[i].deltaLength;

            if (dt > 0.0001) {
              const v = ds / dt;
              if (v > segMaxVel) segMaxVel = v;
            }
          }

          // Smooth potential noise spikes slightly or trust raw?
          // Raw is better for "Max Reached".
          if (segMaxVel > maxVel) maxVel = segMaxVel;
        } else {
          // Fallback
          segMaxVel = avgVel;
        }

        // Angular velocity check
        // Check heading profile if available
        if (
          event.headingProfile &&
          event.headingProfile.length > 1 &&
          event.motionProfile &&
          event.motionProfile.length > 1
        ) {
          const limit = Math.min(
            event.headingProfile.length - 1,
            event.motionProfile.length - 1,
          );
          for (let i = 0; i < limit; i++) {
            const tStart = event.motionProfile[i];
            const tEnd = event.motionProfile[i + 1];
            const dt = tEnd - tStart;

            const hStart = event.headingProfile[i];
            const hEnd = event.headingProfile[i + 1];
            const dTheta = Math.abs(hEnd - hStart); // Unwrapped heading diff

            if (dt > 0.0001) {
              const w = dTheta / dt;
              if (w > maxAngVel) maxAngVel = w;
            }
          }
        }

        segmentStats.push({
          id: idx,
          name: line.name || `Path ${event.lineIndex + 1}`,
          type: "travel",
          duration: duration,
          distance: dist,
          avgVelocity: avgVel,
          maxVelocity: segMaxVel,
        });

        lastPoint = line.endPoint;
        // analysis.netRotation is cumulative change
        // But strictly we should trust the next iteration's start logic or update here.
        // calculatePathTime updates `currentHeading` to `endHeading`.
        // We can approximate by just taking the last heading from profile if available.
        if (event.headingProfile && event.headingProfile.length > 0) {
          currentHeading =
            event.headingProfile[event.headingProfile.length - 1];
        } else {
          // Fallback if no profile (e.g. constant heading)
          // This part is tricky without duplicating all `calculatePathTime` logic.
          // But usually `timeline` is sequential so the next event knows its start heading?
          // Actually `timeline` events store `startHeading`. We can just use that for next loop if we wanted.
          // But here we are iterating linearly.
        }
      }
    });

    stats = {
      totalDistance: timePrediction.totalDistance,
      totalTime: timePrediction.totalTime,
      maxVelocity: maxVel,
      maxAcceleration: 0,
      maxAngularVelocity: maxAngVel,
      segments: segmentStats,
    };
  }
</script>

<svelte:window on:keydown={(e) => e.key === "Escape" && onClose()} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div
    transition:fade={{ duration: 200, easing: cubicInOut }}
    class="fixed inset-0 z-[1006] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="stats-title"
    on:click|self={onClose}
  >
    <div
      transition:fly={{ duration: 300, y: 20, easing: cubicInOut }}
      class="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-neutral-200 dark:border-neutral-800"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-between items-center"
      >
        <div class="flex items-center gap-3">
          <div
            class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
              />
            </svg>
          </div>
          <div>
            <h2
              id="stats-title"
              class="text-xl font-bold text-neutral-900 dark:text-white"
            >
              Path Statistics
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              Detailed analysis of your autonomous routine
            </p>
          </div>
        </div>
        <button
          on:click={onClose}
          class="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 bg-white dark:bg-neutral-900">
        <!-- Key Metrics Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div
            class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800"
          >
            <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Total Time
            </div>
            <div class="text-2xl font-bold text-neutral-900 dark:text-white">
              {formatTime(stats.totalTime)}
            </div>
          </div>
          <div
            class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800"
          >
            <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Total Distance
            </div>
            <div class="text-2xl font-bold text-neutral-900 dark:text-white">
              {stats.totalDistance.toFixed(1)}
              <span class="text-sm font-normal text-neutral-500">in</span>
            </div>
          </div>
          <div
            class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800"
          >
            <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Avg. Velocity
            </div>
            <div class="text-2xl font-bold text-neutral-900 dark:text-white">
              {(stats.totalTime > 0
                ? stats.totalDistance / stats.totalTime
                : 0
              ).toFixed(1)}
              <span class="text-sm font-normal text-neutral-500">in/s</span>
            </div>
          </div>
          <div
            class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800"
          >
            <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Max Angular Vel
            </div>
            <div class="text-2xl font-bold text-neutral-900 dark:text-white">
              {stats.maxAngularVelocity.toFixed(1)}
              <span class="text-sm font-normal text-neutral-500">deg/s</span>
            </div>
          </div>
        </div>

        <!-- Segment Table -->
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Segment Breakdown
        </h3>
        <div
          class="border rounded-lg border-neutral-200 dark:border-neutral-800 overflow-hidden"
        >
          <table class="w-full text-left text-sm">
            <thead
              class="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 font-medium"
            >
              <tr>
                <th class="px-4 py-3">Segment</th>
                <th class="px-4 py-3">Type</th>
                <th class="px-4 py-3 text-right">Time</th>
                <th class="px-4 py-3 text-right">Dist (in)</th>
                <th class="px-4 py-3 text-right">Avg Vel (in/s)</th>
                <th class="px-4 py-3 text-right">Max Vel (in/s)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
              {#each stats.segments as seg}
                <tr
                  class="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                >
                  <td
                    class="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-200"
                    >{seg.name}</td
                  >
                  <td class="px-4 py-3">
                    <span
                      class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${seg.type === "wait" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"}`}
                    >
                      {seg.type === "wait" ? "Wait" : "Path"}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right font-mono"
                    >{formatTime(seg.duration)}</td
                  >
                  <td
                    class="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400"
                    >{seg.distance > 0 ? seg.distance.toFixed(1) : "-"}</td
                  >
                  <td
                    class="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400"
                    >{seg.avgVelocity > 0
                      ? seg.avgVelocity.toFixed(1)
                      : "-"}</td
                  >
                  <td
                    class="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400"
                    >{seg.maxVelocity > 0
                      ? seg.maxVelocity.toFixed(1)
                      : "-"}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <div
        class="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end"
      >
        <button
          on:click={onClose}
          class="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
