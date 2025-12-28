
<script lang="ts">
  import { onMount, tick } from "svelte";
  import ResizableLayout from "../layout/ResizableLayout.svelte";
  import ControlTab from "../../ControlTab.svelte";
  import Navbar from "../../Navbar.svelte";
  import FieldVisualization from "../visualization/FieldVisualization.svelte";
  import InteractiveField from "../interactive/InteractiveField.svelte";
  import FieldOverlay from "../overlays/FieldOverlay.svelte";
  import MathTools from "../math/MathTools.svelte";
  import FieldCoordinates from "../FieldCoordinates.svelte";

  // App Logic Components
  import AppState from "./AppState.svelte";
  import ThemeManager from "./ThemeManager.svelte";
  import KeyBindings from "./KeyBindings.svelte";
  import ElectronMenuHandler from "./ElectronMenuHandler.svelte";
  import AnimationManager from "./AnimationManager.svelte";
  import FileOperations from "./FileOperations.svelte";
  import DataController from "./DataController.svelte";

  import { calculatePathTime, getAnimationDuration } from "../../../utils";
  import {
    DEFAULT_KEY_BINDINGS,
    FIELD_SIZE,
    DEFAULT_SETTINGS,
    getDefaultStartPoint,
    getDefaultLines,
    getDefaultShapes
  } from "../../../config";
  import { scaleLinear } from "d3";
  import {
    showSidebar,
    snapToGrid,
    showGrid
  } from "../../../stores";
  import { normalizeLines } from "../../../utils/path";
  import type { SequenceItem } from "../../../types";

  // --- State & Logic ---
  let appState: AppState;

  // Bound variables from AppState - Initialize with Defaults to prevent undefined errors
  let startPoint = getDefaultStartPoint();
  let lines = normalizeLines(getDefaultLines());
  let shapes = getDefaultShapes();
  let sequence: SequenceItem[] = lines.map((ln) => ({
    kind: "path" as const,
    lineId: ln.id!,
  }));
  let settings = { ...DEFAULT_SETTINGS };
  let robotWidth = DEFAULT_SETTINGS.rWidth;
  let robotHeight = DEFAULT_SETTINGS.rHeight;

  // Bind directly to exposed props of AppState
  let canUndo = false;
  let canRedo = false;

  // Derived
  let width = 0;
  let height = 0;
  let previewOptimizedLines: any = null;
  let wrapperDiv: HTMLElement;
  let twoElement: HTMLElement;

  $: x = scaleLinear().domain([0, FIELD_SIZE]).range([0, width || FIELD_SIZE]);
  $: y = scaleLinear().domain([0, FIELD_SIZE]).range([height || FIELD_SIZE, 0]);

  let animationManager: AnimationManager;
  let playing = false;
  let loopAnimation = true;
  let percent = 0;
  let animationDuration = 0;

  let robotXY = { x: 0, y: 0 };
  let robotHeading = 0;

  let dataController: DataController;
  let fileOperations: FileOperations;

  // --- Handlers ---

  function handlePercentChange(newPercent: number) {
      percent = newPercent;
      dataController.updateRobotState(percent, x, y);
  }

  function handlePlayingChange(isPlaying: boolean) {
      playing = isPlaying;
  }

  function handleSeek(val: number) {
      if (animationManager) animationManager.seek(val);
  }

  function resetAnimation() {
      if (animationManager) animationManager.reset();
  }

  function stepForward() {
     const newP = Math.min(100, percent + 1);
     handleSeek(newP);
  }

  function stepBackward() {
     const newP = Math.max(0, percent - 1);
     handleSeek(newP);
  }

  function triggerSaveProject() {
      fileOperations.saveProject();
  }

  function triggerSaveAs() {
      fileOperations.saveProject(); // TODO: Implement Save As properly in FileOperations
  }

  function triggerLoadFile(e: Event) {
      fileOperations.loadFile(e, (data) => {
          startPoint = data.startPoint;
          lines = data.lines;
          shapes = data.shapes;
          sequence = data.sequence;
          appState.recordChange();
      });
  }

</script>

<!-- Logic Components (Headless) -->
<AppState
    bind:this={appState}
    bind:startPoint
    bind:lines
    bind:shapes
    bind:sequence
    bind:settings
    bind:robotWidth
    bind:robotHeight
    bind:canUndo
    bind:canRedo
/>

<DataController
    bind:this={dataController}
    bind:startPoint
    bind:lines
    bind:shapes
    bind:sequence
    bind:settings
    bind:robotXY
    bind:robotHeading
    bind:animationDuration
    {x} {y}
/>

<AnimationManager
    bind:this={animationManager}
    {animationDuration}
    {loopAnimation}
    onPercentChange={handlePercentChange}
    onPlayingChange={handlePlayingChange}
/>

<ThemeManager {settings} />

<FileOperations
    bind:this={fileOperations}
    bind:settings
    {startPoint}
    {lines}
    {shapes}
    {sequence}
    recordChange={() => appState.recordChange()}
/>

<KeyBindings
    {settings}
    {DEFAULT_KEY_BINDINGS}
    saveProject={triggerSaveProject}
    saveFileAs={triggerSaveAs}
    exportGif={() => {}}
    addNewLine={() => dataController.addNewLine() && appState.recordChange()}
    addWait={() => dataController.addWait() && appState.recordChange()}
    addControlPoint={() => dataController.addControlPoint() && appState.recordChange()}
    removeControlPoint={() => dataController.removeControlPoint() && appState.recordChange()}
    undoAction={() => appState.undo()}
    redoAction={() => appState.redo()}
    resetAnimation={resetAnimation}
    stepForward={stepForward}
    stepBackward={stepBackward}
    {playing}
    play={() => animationManager.play()}
    pause={() => animationManager.pause()}
/>

<ElectronMenuHandler
    saveProject={triggerSaveProject}
    saveFileAs={triggerSaveAs}
    exportGif={() => {}}
    undoAction={() => appState.undo()}
    redoAction={() => appState.redo()}
    openProjectNative={() => document.getElementById("file-upload")?.click()}
    recordChange={() => appState.recordChange()}
    onNewProject={() => {
        // Reset logic
    }}
    {startPoint} {lines} {sequence} {shapes}
/>

<!-- Layout -->
<div class="h-screen w-full flex flex-col overflow-hidden bg-neutral-200 dark:bg-neutral-950">
    <!-- Navbar -->
    <div class="flex-none z-50">
        <Navbar
            bind:lines
            bind:startPoint
            bind:shapes
            bind:sequence
            bind:settings
            bind:robotWidth
            bind:robotHeight
            saveProject={triggerSaveProject}
            saveFileAs={triggerSaveAs}
            loadFile={triggerLoadFile}
            exportGif={() => {}}
            undoAction={() => appState.undo()}
            redoAction={() => appState.redo()}
            recordChange={() => appState.recordChange()}
            {canUndo}
            {canRedo}
            onPreviewOptimizedLines={(newLines) => {
                previewOptimizedLines = newLines;
            }}
        />
    </div>

    <!-- Main Content -->
    <ResizableLayout
        bind:showSidebar={$showSidebar}
    >
        <div slot="left-pane" let:leftPaneWidth class="w-full h-full flex justify-center items-center">
             <div
                class="relative aspect-square"
                style={`width: ${Math.min(leftPaneWidth-16, 800)}px; height: ${Math.min(leftPaneWidth-16, 800)}px;`}
                bind:this={wrapperDiv}
              >
                 <InteractiveField
                    {settings}
                    {x} {y}
                    {robotXY} {robotHeading}
                    snapToGrid={$snapToGrid}
                    let:currentMouseX
                    let:currentMouseY
                    let:isMouseOverField
                    let:isObstructingHUD
                    on:recordChange={() => appState.recordChange()}
                 >
                    <FieldOverlay
                         bind:twoElement
                         {settings}
                         {x} {y}
                         {robotXY} {robotHeading}
                         {robotWidth} {robotHeight}
                    >
                         <FieldVisualization
                             bind:width
                             bind:height
                             {startPoint}
                             {lines}
                             {shapes}
                             {settings}
                             {previewOptimizedLines}
                             {sequence}
                         />

                         <MathTools {x} {y} {twoElement} {robotXY} {robotHeading} />
                    </FieldOverlay>

                    <FieldCoordinates
                      x={currentMouseX}
                      y={currentMouseY}
                      visible={isMouseOverField}
                      isObstructed={isObstructingHUD}
                    />
                 </InteractiveField>
              </div>
        </div>

        <div slot="right-pane" class="h-full">
            <ControlTab
                bind:playing
                play={() => animationManager.play()}
                pause={() => animationManager.pause()}
                bind:startPoint
                bind:lines
                bind:sequence
                bind:robotWidth
                bind:robotHeight
                bind:settings
                bind:percent
                bind:robotXY
                bind:robotHeading
                bind:shapes
                {x} {y}
                handleSeek={handleSeek}
                bind:loopAnimation

                recordChange={() => appState.recordChange()}
                onPreviewChange={(newLines) => {
                  previewOptimizedLines = newLines;
                }}
            />
        </div>
    </ResizableLayout>
</div>
