<script lang="ts">
  import _ from "lodash";
  import { getRandomColor, optimizePath, validatePath } from "../utils";


  export let percent: number;
  export let playing: boolean;
  export let play: () => any;
  export let pause: () => any;
  export let startPoint: Point;
  export let lines: Line[];
  export let robotWidth: number = 16;
  export let robotHeight: number = 16;
  export let robotXY: BasePoint;
  export let robotHeading: number;
  export let x: d3.ScaleLinear<number, number, number>;
  export let y: d3.ScaleLinear<number, number, number>;
  export let settings: FPASettings;


  export let shapes: Shape[];

  function createTriangle(): Shape {
    return {
      id: `triangle-${shapes.length + 1}`,
      name: "", // Empty name to show placeholder
      vertices: [
        { x: 60, y: 60 },
        { x: 84, y: 60 },
        { x: 72, y: 84 }
      ],
      color: "#dc2626",
      fillColor: "#fca5a5"
    };
  }

  function createRectangle(): Shape {
    return {
      id: `rectangle-${shapes.length + 1}`,
      name: `Obstacle ${shapes.length + 1}`,
      vertices: [
        { x: 30, y: 30 },
        { x: 60, y: 30 },
        { x: 60, y: 50 },
        { x: 30, y: 50 }
      ],
      color: "#dc2626",
      fillColor: "#fca5a5"
    };
  }

  function createNGon(sides: number): Shape {
    const centerX = 45;
    const centerY = 45;
    const radius = 15;
    const vertices = [];
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides;
      vertices.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    }
    
    return {
      id: `${sides}-gon-${shapes.length + 1}`,
      name: `Obstacle ${shapes.length + 1}`,
      vertices,
      color: "#dc2626",
      fillColor: "#fca5a5"
    };
  }

  // Path optimization state
  let optimizationStatus: 'idle' | 'optimizing' | 'success' | 'error' = 'idle';
  let optimizationMessage = '';

  function handleOptimizePath() {
    optimizationStatus = 'optimizing';
    optimizationMessage = 'Optimizing path...';
    
    const result = optimizePath(startPoint, lines, shapes, settings);
    
    if (result.success && result.optimizedLines) {
      lines = result.optimizedLines;
      optimizationStatus = 'success';
      optimizationMessage = 'Path optimized successfully!';
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        if (optimizationStatus === 'success') {
          optimizationStatus = 'idle';
          optimizationMessage = '';
        }
      }, 3000);
    } else {
      optimizationStatus = 'error';
      optimizationMessage = result.error || 'Optimization failed';
    }
  }

  function handleValidatePath() {
    optimizationStatus = 'optimizing';
    optimizationMessage = 'Validating path...';
    
    const result = validatePath(startPoint, lines, shapes, settings);
    
    if (result.success) {
      optimizationStatus = 'success';
      optimizationMessage = 'Path is valid! No collisions detected.';
      
      setTimeout(() => {
        if (optimizationStatus === 'success') {
          optimizationStatus = 'idle';
          optimizationMessage = '';
        }
      }, 3000);
    } else {
      optimizationStatus = 'error';
      optimizationMessage = result.error || 'Path validation failed';
    }
  }

</script>

<div class="flex-1 flex flex-col justify-start items-center gap-2 h-full">
  <div
    class="flex flex-col justify-start items-start w-full rounded-lg bg-neutral-50 dark:bg-neutral-900 shadow-md p-4 overflow-y-scroll overflow-x-hidden h-full gap-6"
  >
    <div class="flex flex-col w-full justify-start items-start gap-0.5 text-sm">
      <div class="font-semibold">Canvas Options</div>
      <div class="flex flex-row justify-start items-center gap-2">
        <div class="font-extralight">Robot Length:</div>
        <input
          bind:value={robotWidth}
          on:change={() => {
            if (settings) {
              settings.rWidth = robotWidth;
            }
          }}
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-16"
          step="1"
        />
        <div class="font-extralight">Robot Width:</div>
        <input
          bind:value={robotHeight}
          on:change={() => {
            if (settings) {
              settings.rHeight = robotHeight;
            }
          }}
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 border-[0.5px] focus:outline-none w-16 dark:bg-neutral-950 dark:border-neutral-700"
          step="1"
        />
      </div>
    </div>

    <div class="flex flex-col w-full justify-start items-start gap-0.5 text-sm">
      <div class="font-semibold">Obstacles</div>
      
      {#each shapes as shape, shapeIdx}
        <div class="flex flex-col w-full justify-start items-start gap-1 p-2 border rounded-md border-neutral-300 dark:border-neutral-600">
          <div class="flex flex-row w-full justify-between items-center">

            <div class="font-medium text-sm flex flex-row items-center gap-2">
              <input
                bind:value={shape.name}
                placeholder="Obstacle {shapeIdx + 1}"
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none text-sm font-medium"
              />
              <div class="relative size-5 rounded-full overflow-hidden shadow-sm border border-neutral-300 dark:border-neutral-600 shrink-0" style="background-color: {shape.color}">
                <input 
                  type="color" 
                  bind:value={shape.color} 
                  class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  title="Change Obstacle Color"
                />
              </div>
            </div>

            <div class="flex flex-row gap-1">
              <button
                title="Add Vertex"
                on:click={() => {
                  shape.vertices = [...shape.vertices, { x: 50, y: 50 }];
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={2} class="size-4 stroke-green-500">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              {#if shapes.length > 0}
                <button
                  title="Remove Shape"
                  on:click={() => {
                    shapes.splice(shapeIdx, 1);
                    shapes = shapes;
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={2} class="size-4 stroke-red-500">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
          
          {#each shape.vertices as vertex, vertexIdx}
            <div class="flex flex-row justify-start items-center gap-2">
              <div class="font-bold text-sm">{vertexIdx + 1}:</div>
              <div class="font-extralight text-sm">X:</div>
              <input
                bind:value={vertex.x}
                type="number"
                min="0"
                max="144"
                step="0.1"
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-24 text-sm"
              />
              <div class="font-extralight text-sm">Y:</div>
              <input
                bind:value={vertex.y}
                type="number"
                min="0"
                max="144"
                step="0.1"
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-24 text-sm"
              />
              {#if shape.vertices.length > 3}
                <button
                  title="Remove Vertex"
                  on:click={() => {
                    shape.vertices.splice(vertexIdx, 1);
                    shape.vertices = shape.vertices;
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={2} class="size-4 stroke-red-500">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
      
      <button
        on:click={() => {
          shapes = [...shapes, createTriangle()];
        }}
        class="font-semibold text-red-500 text-sm flex flex-row justify-start items-center gap-1"
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
        <p>Add Obstacle</p>
      </button>
    </div>

    <div class="flex flex-col w-full justify-start items-start gap-2 text-sm border-t pt-4 border-neutral-300 dark:border-neutral-600">
      <div class="font-semibold">Path Optimization</div>
      
      <div class="flex flex-row w-full gap-2">
        <button
          on:click={handleValidatePath}
          disabled={optimizationStatus === 'optimizing'}
          class="flex-1 px-3 py-2 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {optimizationStatus === 'optimizing' ? 'Checking...' : 'Validate Path'}
        </button>
        
        <button
          on:click={handleOptimizePath}
          disabled={optimizationStatus === 'optimizing'}
          class="flex-1 px-3 py-2 rounded-md bg-green-500 text-white font-medium hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {optimizationStatus === 'optimizing' ? 'Optimizing...' : 'Optimize Path'}
        </button>
      </div>
      
      {#if optimizationMessage}
        <div 
          class="w-full p-2 rounded-md text-sm {
            optimizationStatus === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' :
            optimizationStatus === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' :
            'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
          }"
        >
          {optimizationMessage}
        </div>
      {/if}
      
      <div class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
        <p class="mb-1"><strong>Validate Path:</strong> Checks if the robot will collide with obstacles or leave the field.</p>
        <p><strong>Optimize Path:</strong> Smooths the path to reduce sharp turns while avoiding collisions.</p>
      </div>
    </div>

    <div class="flex flex-col w-full justify-start items-start gap-0.5 text-sm">
      <div class="font-semibold">Current Robot Position</div>
      <div class="flex flex-row justify-start items-center gap-2">
        <div class="font-extralight">X:</div>
        <div class="w-16">{x.invert(robotXY.x).toFixed(3)}</div>
        <div class="font-extralight">Y:</div>
        <div class="w-16">{y.invert(robotXY.y).toFixed(3)}</div>
        <div class="font-extralight">Heading:</div>
        <div>
          {robotHeading.toFixed(0) === "-0"
            ? "0"
            : -robotHeading.toFixed(0)}&deg;
        </div>
      </div>
    </div>

    <div class="flex flex-col w-full justify-start items-start gap-0.5">
      <div class="font-semibold">Starting Point</div>
      <div class="flex flex-row justify-start items-center gap-2">
        <div class="font-extralight">X:</div>
        <input
          bind:value={startPoint.x}
          min="0"
          max="144"
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 border-[0.5px] focus:outline-none w-28 dark:bg-neutral-950 dark:border-neutral-700"
          step="0.1"
        />
        <div class="font-extralight">Y:</div>
        <input
          bind:value={startPoint.y}
          min="0"
          max="144"
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 border-[0.5px] focus:outline-none w-28 dark:bg-neutral-950 dark:border-neutral-700"
          step="0.1"
        />
      </div>
    </div>

    {#each lines as line, idx}
      <div class="flex flex-col w-full justify-start items-start gap-1">
        <div class="flex flex-row w-full justify-between">
          <div
            class="font-semibold flex flex-row justify-start items-center gap-2"
          >

            <input
              bind:value={line.name}
              placeholder="Path {idx + 1}"
              class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none text-sm font-semibold"
            />
            <div class="relative size-5 rounded-full overflow-hidden shadow-sm border border-neutral-300 dark:border-neutral-600 shrink-0" style="background-color: {line.color}">
                <input 
                  type="color" 
                  bind:value={line.color} 
                  class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  title="Change Path Color"
                />
            </div>
            
          </div>
          <div class="flex flex-row justify-end items-center gap-1">
            <button
              title="Add Control Point"
              on:click={() => {
                line.controlPoints = [
                  ...line.controlPoints,
                  {
                    x: _.random(36, 108),
                    y: _.random(36, 108),
                  },
                ];
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width={2}
                class="size-5 stroke-green-500"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
            {#if lines.length > 1}
              <button
                title="Remove Line"
                on:click={() => {
                  let _lns = lines;
                  lines.splice(idx, 1);
                  lines = _lns;
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width={2}
                  class="size-5 stroke-red-500"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </button>
            {/if}
          </div>
        </div>
        <div class={`h-[0.75px] w-full`} style={`background: ${line.color}`} />
        <div class="flex flex-col justify-start items-start">
          <div class="font-light">Point Position:</div>
          <div class="flex flex-row justify-start items-center gap-2">
            <div class="font-extralight">X:</div>
            <input
              class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
              step="0.1"
              type="number"
              min="0"
              max="144"
              bind:value={line.endPoint.x}
            />
            <div class="font-extralight">Y:</div>
            <input
              class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
              step="0.1"
              min="0"
              max="144"
              type="number"
              bind:value={line.endPoint.y}
            />

            <select
              bind:value={line.endPoint.heading}
              class=" rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28 text-sm"
              title="The heading style of the robot. 
With constant heading, the robot maintains the same heading throughout the line. 
With linear heading, heading changes linearly between given start and end angles. 
With tangential heading, the heading follows the direction of the line."
            >
              <option value="constant">Constant</option>
              <option value="linear">Linear</option>
              <option value="tangential">Tangential</option>
            </select>

            {#if line.endPoint.heading === "linear"}
              <input
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
                step="1"
                type="number"
                min="-180"
                max="180"
                bind:value={line.endPoint.startDeg}
                title="The heading the robot starts this line at (in degrees)"
              />
              <input
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
                step="1"
                type="number"
                min="-180"
                max="180"
                bind:value={line.endPoint.endDeg}
                title="The heading the robot ends this line at (in degrees)"
              />
            {:else if line.endPoint.heading === "constant"}
              <input
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
                step="1"
                type="number"
                min="-180"
                max="180"
                bind:value={line.endPoint.degrees}
                title="The constant heading the robot maintains throughout this line (in degrees)"
              />
            {:else if line.endPoint.heading === "tangential"}
              <p class="text-sm font-extralight">Reverse:</p>
              <input type="checkbox" bind:checked={line.endPoint.reverse} title="Reverse the direction the robot faces along the tangential path" />
            {/if}
          </div>
        </div>
        {#each line.controlPoints as point, idx1}
          <div class="flex flex-col justify-start items-start">
            <div class="font-light">Control Point {idx1 + 1}:</div>
            <div class="flex flex-row justify-start items-center gap-2">
              <div class="font-extralight">X:</div>
              <input
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
                step="0.1"
                type="number"
                bind:value={point.x}
                min="0"
                max="144"
              />
              <div class="font-extralight">Y:</div>
              <input
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
                step="0.1"
                type="number"
                bind:value={point.y}
                min="0"
                max="144"
              />
              <button
                title="Remove Control Point"
                on:click={() => {
                  let _pts = line.controlPoints;
                  _pts.splice(idx1, 1);
                  line.controlPoints = _pts;
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width={2}
                  class="size-5 stroke-red-500"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/each}
    <button
      on:click={() => {
        lines = [
          ...lines,
          {
            name: `Path ${lines.length + 1}`,
            endPoint: {
              x: _.random(0, 144),
              y: _.random(0, 144),
              heading: "tangential",
              reverse: false,
            },
            controlPoints: [],
            color: getRandomColor(),
          },
        ];
      }}
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

  </div>
  <div
    class="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 flex flex-row justify-start items-center gap-3 shadow-lg"
  >
    <button
      title="Play/Pause"
      on:click={() => {
        if (playing) {
          pause();
        } else {
          play();
        }
      }}
    >
      {#if !playing}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="size-6 stroke-green-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
          />
        </svg>
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="size-6 stroke-green-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 5.25v13.5m-7.5-13.5v13.5"
          />
        </svg>
      {/if}
    </button>
    <input
      bind:value={percent}
      type="range"
      min="0"
      max="100"
      step="0.000001"
      class="w-full appearance-none slider focus:outline-none"
    />
  </div>
</div>
