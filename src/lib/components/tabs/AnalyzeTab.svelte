<!-- Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0. -->
<script lang="ts">
  import type {
    Point,
    Line,
    SequenceItem,
    Settings,
    BasePoint,
    Shape
  } from "../../../types/index";
  import { calculatePathStats, type PathStats, type Insight } from "../../../utils/pathAnalyzer";
  import SimpleChart from "../tools/SimpleChart.svelte";
  import { formatTime } from "../../../utils";
  import { onMount } from "svelte";

  export let startPoint: Point;
  export let lines: Line[];
  export let sequence: SequenceItem[];
  export let settings: Settings;
  export let robotXY: BasePoint; // For current time tracking?
  export let shapes: Shape[];

  // Tab Props
  export let recordChange: (action?: string) => void;
  export let isActive: boolean = false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let onPreviewChange: ((lines: Line[] | null) => void) | null = null;

  $: {
    // Silence unused prop warnings
    void recordChange;
    void onPreviewChange;
    void shapes; // Could use for collision detail check if moved here
    void robotXY;
  }

  let stats: PathStats | null = null;
  let activeSection: "checklist" | "graphs" | "insights" = "checklist";

  // Reactive update
  $: if (isActive && startPoint && lines && sequence && settings) {
    stats = calculatePathStats(startPoint, lines, sequence, settings);
  }

  function getScoreColor(score: number) {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-amber-500";
    return "text-red-500";
  }

  function getScoreBg(score: number) {
    if (score >= 90) return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800";
    if (score >= 70) return "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800";
    return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800";
  }
</script>

<div class="w-full h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
  {#if stats}
    <!-- Header: Health Score -->
    <div class="flex-none p-6 pb-2">
      <div class={`flex items-center justify-between p-4 rounded-xl border ${getScoreBg(stats.healthScore)}`}>
        <div>
          <h2 class="text-lg font-bold text-neutral-900 dark:text-white">Path Health Score</h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            Based on safety, efficiency, and physical constraints.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class={`text-4xl font-bold ${getScoreColor(stats.healthScore)}`}>{stats.healthScore}</span>
          <span class="text-sm text-neutral-500 dark:text-neutral-400">/ 100</span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex-none px-6 pb-4">
        <div class="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
            <button
                class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeSection === 'checklist' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'}`}
                on:click={() => activeSection = 'checklist'}
            >
                Checklist & Metrics
            </button>
            <button
                class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeSection === 'graphs' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'}`}
                on:click={() => activeSection = 'graphs'}
            >
                Motion Graphs
            </button>
            <button
                class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeSection === 'insights' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'}`}
                on:click={() => activeSection = 'insights'}
            >
                Insights ({stats.insights.length})
            </button>
        </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {#if activeSection === 'checklist'}
            <div class="space-y-6">
                <!-- Metrics Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <div class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Total Time</div>
                        <div class="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{formatTime(stats.totalTime)}</div>
                    </div>
                    <div class="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <div class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Distance</div>
                        <div class="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{stats.totalDistance.toFixed(1)}"</div>
                    </div>
                    <div class="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <div class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Max Velocity</div>
                        <div class="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{stats.maxLinearVelocity.toFixed(1)} <span class="text-sm font-normal text-neutral-500">in/s</span></div>
                    </div>
                    <div class="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <div class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Est. Energy</div>
                        <div class="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{stats.totalEnergy ? stats.totalEnergy.toFixed(1) : 0} <span class="text-sm font-normal text-neutral-500">J</span></div>
                    </div>
                </div>

                <!-- Checklist Items -->
                <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    <div class="px-4 py-3 bg-neutral-50 dark:bg-neutral-700/30 border-b border-neutral-200 dark:border-neutral-700 font-semibold text-sm">
                        Safety Checks
                    </div>
                    <div class="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                        <div class="px-4 py-3 flex items-center gap-3">
                            {#if stats.maxLinearVelocity < (settings.maxVelocity || 100)}
                                <div class="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                                </div>
                                <span class="text-sm text-neutral-700 dark:text-neutral-300">Velocity within limits</span>
                            {:else}
                                <div class="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                </div>
                                <span class="text-sm font-medium text-red-600 dark:text-red-400">Velocity limit exceeded ({stats.maxLinearVelocity.toFixed(1)} > {settings.maxVelocity})</span>
                            {/if}
                        </div>

                        <div class="px-4 py-3 flex items-center gap-3">
                            {#if !stats.insights.some(i => i.message.includes("Wheel Slip"))}
                                <div class="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                                </div>
                                <span class="text-sm text-neutral-700 dark:text-neutral-300">No slip risk detected</span>
                            {:else}
                                <div class="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                </div>
                                <span class="text-sm font-medium text-red-600 dark:text-red-400">Risk of wheel slip detected</span>
                            {/if}
                        </div>

                        <!-- Placeholder for more checks if needed, e.g. Start Position -->
                        <div class="px-4 py-3 flex items-center gap-3">
                             <div class="w-5 h-5 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>
                            </div>
                            <span class="text-sm text-neutral-500">Field Boundary Check (Active in Editor)</span>
                        </div>
                    </div>
                </div>
            </div>

        {:else if activeSection === 'graphs'}
            <div class="space-y-6">
                <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                    <h3 class="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-300">Velocity Profile (in/s)</h3>
                    <SimpleChart data={stats.velocityData} color="#3b82f6" label="Velocity" unit="in/s" height={150} currentTime={0} />
                </div>
                <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                    <h3 class="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-300">Linear Acceleration (in/s²)</h3>
                    <SimpleChart data={stats.accelerationData} color="#ef4444" label="Accel" unit="in/s²" height={150} currentTime={0} />
                </div>
                <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                    <h3 class="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-300">Centripetal Acceleration (in/s²)</h3>
                    <SimpleChart data={stats.centripetalData} color="#f97316" label="Centripetal" unit="in/s²" height={150} currentTime={0} />
                </div>
            </div>

        {:else if activeSection === 'insights'}
            <div class="space-y-2">
                {#if stats.insights.length === 0}
                    <div class="text-center p-8 text-neutral-500 dark:text-neutral-400">
                        No insights available. Your path looks clean!
                    </div>
                {:else}
                    {#each stats.insights as insight}
                        <div class={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                            insight.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' :
                            insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' :
                            'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                        }`}>
                            <div class="mt-0.5 shrink-0">
                                {#if insight.type === 'error'}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                {:else if insight.type === 'warning'}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {/if}
                            </div>
                            <div class="flex-1">
                                <div class="font-semibold">{insight.message}</div>
                                <div class="mt-1 opacity-80 text-xs">
                                    at {formatTime(insight.startTime)}
                                    {#if insight.value}
                                        • Value: {insight.value.toFixed(1)}
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center text-neutral-500">
        Calculating stats...
    </div>
  {/if}
</div>
