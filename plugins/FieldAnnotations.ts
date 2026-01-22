/// <reference path="./pedro.d.ts" />

// Field Annotations Plugin
// Adds a drawing tool to annotate the field.

interface AnnotationPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

let overlayContainer: HTMLElement | null = null;
let currentPath: { x: number; y: number }[] = [];
let currentTool = "none"; // "pen", "eraser"
let currentColor = "#ef4444"; // Red
let currentWidth = 2;

// Drawing state
let isMouseDown = false;
let lastPoint: { x: number; y: number } | null = null;

// Panning state
let isPanning = false;
let startPan: { x: number; y: number } = { x: 0, y: 0 };

// UI Elements
let toolbar: HTMLElement | null = null;

// Initialize Overlay Hook
pedro.registries.hooks.register(
  "fieldOverlayInit",
  (container: HTMLElement) => {
    overlayContainer = container;
    setupOverlayEvents();
  },
);

// Register Navbar Action
pedro.registries.navbarActions.register({
  id: "annotate-tool",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>`,
  title: "Annotate",
  location: "right",
  onClick: () => {
    toggleToolbar();
  },
});

// Register Field Renderer
pedro.registries.fieldRenderers.register({
  id: "annotations-renderer",
  fn: (two: any) => {
    const data = pedro.stores.get(pedro.stores.project.extraDataStore);
    const paths: AnnotationPath[] = data.fieldAnnotations || [];

    // Create a group for annotations
    const group = two.makeGroup();

    paths.forEach((path) => {
      if (path.points.length < 2) return;

      // Access field view store to get current scales
      const fieldView = pedro.stores.get(pedro.stores.app.fieldViewStore);
      const { xScale, yScale } = fieldView;

      const vertices = path.points.flatMap((p) => [xScale(p.x), yScale(p.y)]);

      const line = two.makeCurve(...vertices, true);
      line.noFill();
      line.stroke = path.color;

      const ppI = Math.abs(xScale(1) - xScale(0));
      line.linewidth = path.width * ppI;

      line.cap = "round";
      line.join = "round";

      group.add(line);
    });
  },
});

function toggleToolbar() {
  if (toolbar) {
    toolbar.remove();
    toolbar = null;
    currentTool = "none";
    if (overlayContainer) overlayContainer.style.pointerEvents = "none";
  } else {
    createToolbar();
    currentTool = "pen";
    if (overlayContainer) overlayContainer.style.pointerEvents = "auto";
  }
}

function createToolbar() {
  toolbar = document.createElement("div");
  toolbar.className =
    "absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-800 shadow-lg rounded-lg p-2 flex gap-2 z-50 border border-neutral-200 dark:border-neutral-700";

  const colors = [
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#eab308",
    "#000000",
    "#ffffff",
  ];

  // Tools
  addBtn(toolbar, "Pen", true, () => {
    currentTool = "pen";
    updateCursor();
  });
  addBtn(toolbar, "Eraser", false, () => {
    currentTool = "eraser";
    updateCursor();
  });
  addBtn(toolbar, "Undo", false, () => {
    undoLastPath();
  });
  addBtn(toolbar, "Clear", false, () => {
    clearAll();
  });

  // Divider
  const div = document.createElement("div");
  div.className = "w-px bg-neutral-200 dark:bg-neutral-700 mx-1";
  toolbar.appendChild(div);

  // Colors
  colors.forEach((c) => {
    const btn = document.createElement("button");
    btn.className =
      "w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform";
    btn.style.backgroundColor = c;
    btn.onclick = () => {
      currentColor = c;
    };
    toolbar!.appendChild(btn);
  });

  // Close
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.className =
    "ml-2 w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900 font-bold";
  closeBtn.onclick = () => toggleToolbar();
  toolbar.appendChild(closeBtn);

  document.body.appendChild(toolbar);
  updateCursor();
}

function addBtn(
  parent: HTMLElement,
  text: string,
  active: boolean,
  onClick: () => void,
) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className =
    "px-3 py-1 rounded text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200";
  btn.onclick = onClick;
  parent.appendChild(btn);
}

function updateCursor() {
  if (!overlayContainer) return;
  if (currentTool === "pen") {
    overlayContainer.style.cursor = "crosshair";
  } else if (currentTool === "eraser") {
    // Simple custom cursor or just default
    overlayContainer.style.cursor = "not-allowed"; // Or something indicating deletion
  } else {
    overlayContainer.style.cursor = "default";
  }
}

function setupOverlayEvents() {
  if (!overlayContainer) return;

  // Disable context menu to allow Right Click panning
  overlayContainer.addEventListener("contextmenu", (e) => {
    if (currentTool !== "none") {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  overlayContainer.addEventListener("mousedown", (e) => {
    if (currentTool === "none") return;

    e.stopPropagation();
    e.preventDefault();

    // Right Click (2) or Middle Click (1) -> Pan
    if (e.button === 2 || e.button === 1) {
      isPanning = true;
      startPan = { x: e.clientX, y: e.clientY };
      overlayContainer!.style.cursor = "grabbing";
      return;
    }

    // Left Click (0) -> Draw or Erase
    if (e.button === 0) {
      if (currentTool === "pen") {
        isMouseDown = true;
        const { x, y } = getFieldCoords(e.clientX, e.clientY);
        currentPath = [{ x, y }];
        lastPoint = { x, y };
      } else if (currentTool === "eraser") {
        isMouseDown = true;
        eraseAt(e.clientX, e.clientY);
      }
    }
  });

  overlayContainer.addEventListener("mousemove", (e) => {
    if (currentTool === "none") return;

    e.stopPropagation();
    e.preventDefault();

    // Handle Panning
    if (isPanning) {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;

      const settings = pedro.stores.get(pedro.stores.project.settingsStore);
      const rotation = settings.fieldRotation || 0;

      const rad = -((rotation * Math.PI) / 180);
      const rdx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const rdy = dx * Math.sin(rad) + dy * Math.cos(rad);

      const fieldPanStore = (pedro.stores.app as any).fieldPan;
      if (fieldPanStore) {
        fieldPanStore.update((p: { x: number; y: number }) => ({
          x: p.x + rdx,
          y: p.y + rdy,
        }));
      }

      startPan = { x: e.clientX, y: e.clientY };
      return;
    }

    // Handle Drawing
    if (isMouseDown && currentTool === "pen") {
      const { x, y } = getFieldCoords(e.clientX, e.clientY);

      const dx = x - lastPoint!.x;
      const dy = y - lastPoint!.y;
      if (dx * dx + dy * dy > 0.1) {
        currentPath.push({ x, y });
        lastPoint = { x, y };
        renderTempSegment(
          currentPath[currentPath.length - 2],
          currentPath[currentPath.length - 1],
        );
      }
    }

    // Handle Eraser
    if (isMouseDown && currentTool === "eraser") {
      eraseAt(e.clientX, e.clientY);
    }
  });

  overlayContainer.addEventListener("mouseup", (e) => {
    if (currentTool === "none") return;

    e.stopPropagation();
    e.preventDefault();

    if (isPanning) {
      isPanning = false;
      updateCursor();
      return;
    }

    if (isMouseDown) {
      isMouseDown = false;

      if (currentTool === "pen") {
        if (currentPath.length > 1) {
          const newPath: AnnotationPath = {
            points: currentPath,
            color: currentColor,
            width: currentWidth,
          };

          pedro.stores.project.extraDataStore.update((data) => ({
            ...data,
            fieldAnnotations: [...(data.fieldAnnotations || []), newPath],
          }));
        }
        currentPath = [];
        clearTempDrawing();
      }
    }
  });

  overlayContainer.addEventListener("mouseleave", () => {
    isPanning = false;
    isMouseDown = false;
    currentPath = [];
    clearTempDrawing();
    updateCursor();
  });
}

function eraseAt(clientX: number, clientY: number) {
  const { x, y } = getFieldCoords(clientX, clientY);
  const eraserRadius = 4; // inches

  pedro.stores.project.extraDataStore.update((data) => {
    const paths = data.fieldAnnotations || [];
    const newPaths = paths.filter((path: AnnotationPath) => {
      // Check if any point in path is close to cursor
      // This is simple point-based collision, could be improved with segment distance
      return !path.points.some(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        return (dx * dx + dy * dy) < (eraserRadius * eraserRadius);
      });
    });

    if (paths.length !== newPaths.length) {
      return { ...data, fieldAnnotations: newPaths };
    }
    return data;
  });
}

let tempSvg: SVGSVGElement | null = null;
function renderTempSegment(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
) {
  if (!overlayContainer) return;
  if (!tempSvg) {
    tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tempSvg.style.position = "absolute";
    tempSvg.style.top = "0";
    tempSvg.style.left = "0";
    tempSvg.style.width = "100%";
    tempSvg.style.height = "100%";
    tempSvg.style.pointerEvents = "none";
    overlayContainer.appendChild(tempSvg);
  }

  const fieldView = pedro.stores.get(pedro.stores.app.fieldViewStore);
  const { xScale, yScale } = fieldView;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", String(xScale(p1.x)));
  line.setAttribute("y1", String(yScale(p1.y)));
  line.setAttribute("x2", String(xScale(p2.x)));
  line.setAttribute("y2", String(yScale(p2.y)));
  line.setAttribute("stroke", currentColor);

  const ppI = Math.abs(xScale(1) - xScale(0));
  line.setAttribute("stroke-width", String(currentWidth * ppI));
  line.setAttribute("stroke-linecap", "round");

  tempSvg.appendChild(line);
}

function clearTempDrawing() {
  if (tempSvg) {
    tempSvg.remove();
    tempSvg = null;
  }
}

function getFieldCoords(clientX: number, clientY: number) {
  if (!overlayContainer) return { x: 0, y: 0 };

  const rect = overlayContainer.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  const settings = pedro.stores.get(pedro.stores.project.settingsStore);
  const rotation = settings.fieldRotation || 0;

  const { x, y } = rotatePoint(relX, relY, rect.width, rect.height, -rotation);

  const fieldView = pedro.stores.get(pedro.stores.app.fieldViewStore);
  let fieldX = 0;
  let fieldY = 0;

  if (fieldView.xScale.invert) {
    fieldX = fieldView.xScale.invert(x);
    fieldY = fieldView.yScale.invert(y);
  } else {
    console.warn("xScale.invert missing");
  }

  return { x: fieldX, y: fieldY };
}

function rotatePoint(x: number, y: number, w: number, h: number, deg: number) {
  const cx = x - w / 2;
  const cy = y - h / 2;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const nx = cx * cos - cy * sin;
  const ny = cx * sin + cy * cos;
  return { x: nx + w / 2, y: ny + h / 2 };
}

function undoLastPath() {
  pedro.stores.project.extraDataStore.update((data) => {
    const paths = data.fieldAnnotations || [];
    if (paths.length === 0) return data;
    return {
      ...data,
      fieldAnnotations: paths.slice(0, -1),
    };
  });
}

function clearAll() {
  if (confirm("Clear all annotations?")) {
    pedro.stores.project.extraDataStore.update((data) => ({
      ...data,
      fieldAnnotations: [],
    }));
  }
}
