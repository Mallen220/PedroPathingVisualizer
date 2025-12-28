
<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import Two from 'two.js';
  import { scaleLinear } from 'd3';
  import type { Point, Line, Shape, SequenceItem, Settings } from '../../../types';
  import {
    generateGhostPathPoints,
    generateOnionLayers,
  } from '../../../utils/animation';
  import {
    getCurvePoint,
    quadraticToCubic
  } from '../../../utils/math';
  import { FIELD_SIZE, POINT_RADIUS, LINE_WIDTH } from '../../../config/defaults';

  // --- Props ---
  export let width: number;
  export let height: number;
  export let startPoint: Point;
  export let lines: Line[];
  export let shapes: Shape[];
  export let settings: Settings;
  export let previewOptimizedLines: Line[] | null = null;
  export let sequence: SequenceItem[] = []; // Used for wait markers
  export let timePrediction: any = null; // Used for wait markers

  // --- Two.js Setup ---
  let container: HTMLElement;
  let two: Two | null = null;
  // Type assertion or allow implicit any for Two.Group/Path if types are tricky
  let lineGroup: any;
  let pointGroup: any;
  let shapeGroup: any;
  let eventGroup: any;

  // --- D3 Scales ---
  $: x = scaleLinear()
    .domain([0, FIELD_SIZE])
    .range([0, width || FIELD_SIZE]);

  $: y = scaleLinear()
    .domain([0, FIELD_SIZE])
    .range([height || FIELD_SIZE, 0]);

  onMount(() => {
    if (!container) return;

    // Use "as any" to bypass strict checks if Two types are causing namespace issues
    two = new Two({
      width: width || 800,
      height: height || 800,
      autostart: true,
      type: Two.Types.svg
    }).appendTo(container);

    lineGroup = new Two.Group();
    pointGroup = new Two.Group();
    shapeGroup = new Two.Group();
    eventGroup = new Two.Group();

    two.add(shapeGroup);
    two.add(lineGroup);
    two.add(pointGroup);
    two.add(eventGroup);

    return () => {
        // cleanup if needed
    };
  });

  $: if (two && (width !== two.width || height !== two.height)) {
    two.width = width;
    two.height = height;
    two.update();
  }

  // --- Element Generation ---

  // 1. Points
  $: points = (() => {
    if (!x || !y) return [];
    let _points: any[] = [];

    // Start Point
    let startPointElem = new Two.Circle(
      x(startPoint.x),
      y(startPoint.y),
      x(POINT_RADIUS),
    );
    startPointElem.id = `point-0-0`;
    startPointElem.fill = lines.length > 0 ? lines[0].color : '#666'; // fallback color if no lines
    startPointElem.noStroke();
    _points.push(startPointElem);

    lines.forEach((line, idx) => {
      if (!line || !line.endPoint) return;
      [line.endPoint, ...line.controlPoints].forEach((point, idx1) => {
        if (idx1 > 0) {
          let pointGroup = new Two.Group();
          pointGroup.id = `point-${idx + 1}-${idx1}`;

          let pointElem = new Two.Circle(
            x(point.x),
            y(point.y),
            x(POINT_RADIUS),
          );
          pointElem.id = `point-${idx + 1}-${idx1}-background`;
          pointElem.fill = line.color;
          pointElem.noStroke();

          // Fix: Ensure 4th argument is a style object or similar, if Two.Text signature expects it.
          // Or remove it if it's incorrect. Looking at Two.js docs or typical usage, Two.Text(message, x, y, styles).
          // styles is an object. `x(POINT_RADIUS)` is a number. This was causing a type error.
          // Probably intended to be 'styles'? Or maybe radius was passed incorrectly?
          // If I look at App.svelte: `let pointText = new Two.Text("${idx1}", x(point.x), y(point.y - 0.15), x(POINT_RADIUS));`
          // Maybe it's NOT style, but something else? Or maybe types are wrong.
          // If I pass an object `{ size: x(1.55) }` etc, it might be better.
          // But constructor is `constructor(message?: string, x?: number, y?: number, styles?: any)`
          // If I just omit the 4th arg and set properties later, it's safer.

          let pointText = new Two.Text(
            `${idx1}`,
            x(point.x),
            y(point.y - 0.15)
          );
          // Set styles on the instance
          pointText.size = x(1.55);
          pointText.leading = 1;
          pointText.family = "ui-sans-serif, system-ui, sans-serif";
          pointText.alignment = "center";
          pointText.baseline = "middle";
          pointText.fill = "white";
          pointText.noStroke();

          pointGroup.add(pointElem, pointText);
          _points.push(pointGroup);
        } else {
            // Endpoint
          let pointElem = new Two.Circle(
            x(point.x),
            y(point.y),
            x(POINT_RADIUS),
          );
          pointElem.id = `point-${idx + 1}-${idx1}`;
          pointElem.fill = line.color;
          pointElem.noStroke();
          _points.push(pointElem);
        }
      });
    });

    // Obstacle vertices
    shapes.forEach((shape, shapeIdx) => {
      shape.vertices.forEach((vertex, vertexIdx) => {
        let pointGroup = new Two.Group();
        pointGroup.id = `obstacle-${shapeIdx}-${vertexIdx}`;

        let pointElem = new Two.Circle(
          x(vertex.x),
          y(vertex.y),
          x(POINT_RADIUS),
        );
        pointElem.id = `obstacle-${shapeIdx}-${vertexIdx}-background`;
        pointElem.fill = "#991b1b";
        pointElem.noStroke();

        let pointText = new Two.Text(
          `${vertexIdx + 1}`,
          x(vertex.x),
          y(vertex.y - 0.15)
        );
        pointText.size = x(1.55);
        pointText.leading = 1;
        pointText.family = "ui-sans-serif, system-ui, sans-serif";
        pointText.alignment = "center";
        pointText.baseline = "middle";
        pointText.fill = "white";
        pointText.noStroke();
        pointGroup.add(pointElem, pointText);
        _points.push(pointGroup);
      });
    });

    return _points;
  })();

  // 2. Lines (Path)
  $: pathElements = (() => {
    if (!x || !y) return [];
    let _path: any[] = []; // Use any[] to avoid strict Two namespace issues

    lines.forEach((line, idx) => {
        if (!line || !line.endPoint) return;

        // Find start point for this segment
        let _startPoint = idx === 0 ? startPoint : lines[idx - 1]?.endPoint || null;
        if (!_startPoint) return; // Should not happen if data is consistent

        let lineElem: any;

        if (line.controlPoints.length > 2) {
            // Sampling for higher order curves
            const samples = 100;
            const cps = [_startPoint, ...line.controlPoints, line.endPoint];
            let points = [
              new Two.Anchor(x(_startPoint.x), y(_startPoint.y), 0, 0, 0, 0, Two.Commands.move)
            ];
            for (let i = 1; i <= samples; ++i) {
                const point = getCurvePoint(i/samples, cps);
                points.push(new Two.Anchor(x(point.x), y(point.y), 0, 0, 0, 0, Two.Commands.line));
            }
            points.forEach(point => point.relative = false);
            lineElem = new Two.Path(points);
            lineElem.automatic = false;
        } else if (line.controlPoints.length > 0) {
            // Quadratic or Cubic
            let cp1 = line.controlPoints[1]
              ? line.controlPoints[0]
              : quadraticToCubic(_startPoint, line.controlPoints[0], line.endPoint).Q1;
            let cp2 = line.controlPoints[1] ??
              quadraticToCubic(_startPoint, line.controlPoints[0], line.endPoint).Q2;

            let points = [
                new Two.Anchor(
                    x(_startPoint.x), y(_startPoint.y),
                    x(_startPoint.x), y(_startPoint.y),
                    x(cp1.x), y(cp1.y),
                    Two.Commands.move
                ),
                new Two.Anchor(
                    x(line.endPoint.x), y(line.endPoint.y),
                    x(cp2.x), y(cp2.y),
                    x(line.endPoint.x), y(line.endPoint.y),
                    Two.Commands.curve
                )
            ];
            points.forEach(point => point.relative = false);
            lineElem = new Two.Path(points);
            lineElem.automatic = false;
        } else {
            // Linear
            lineElem = new Two.Line(
                x(_startPoint.x), y(_startPoint.y),
                x(line.endPoint.x), y(line.endPoint.y)
            );
        }

        lineElem.id = `line-${idx + 1}`;
        lineElem.stroke = line.color;
        lineElem.linewidth = x(LINE_WIDTH);
        lineElem.noFill();

        _path.push(lineElem);
    });
    return _path;
  })();

  // 3. Shapes
  $: shapeElements = (() => {
    if (!x || !y) return [];
    let _shapes: any[] = [];

    shapes.forEach((shape, idx) => {
        if (shape.vertices.length < 3) return;

        let vertices = [];
        // Move to first
        vertices.push(new Two.Anchor(x(shape.vertices[0].x), y(shape.vertices[0].y), 0, 0, 0, 0, Two.Commands.move));

        // Lines to others
        for (let i = 1; i < shape.vertices.length; i++) {
            vertices.push(new Two.Anchor(x(shape.vertices[i].x), y(shape.vertices[i].y), 0, 0, 0, 0, Two.Commands.line));
        }

        // Close
        vertices.push(new Two.Anchor(x(shape.vertices[0].x), y(shape.vertices[0].y), 0, 0, 0, 0, Two.Commands.close));
        vertices.forEach(point => point.relative = false);

        let shapeElement = new Two.Path(vertices);
        shapeElement.id = `shape-${idx}`;
        shapeElement.stroke = shape.color;
        shapeElement.fill = shape.color;
        shapeElement.opacity = 0.4;
        shapeElement.linewidth = x(0.8);
        shapeElement.automatic = false;

        _shapes.push(shapeElement);
    });
    return _shapes;
  })();

  // 4. Ghost Path
  $: ghostPathElement = (() => {
      if (!x || !y || !settings.showGhostPaths || lines.length === 0) return null;

      const ghostPoints = generateGhostPathPoints(startPoint, lines, settings.rWidth, settings.rHeight, 50);
      if (ghostPoints.length < 3) return null;

      let vertices = [];
      vertices.push(new Two.Anchor(x(ghostPoints[0].x), y(ghostPoints[0].y), 0, 0, 0, 0, Two.Commands.move));
      for (let i = 1; i < ghostPoints.length; i++) {
          vertices.push(new Two.Anchor(x(ghostPoints[i].x), y(ghostPoints[i].y), 0, 0, 0, 0, Two.Commands.line));
      }
      vertices.push(new Two.Anchor(x(ghostPoints[0].x), y(ghostPoints[0].y), 0, 0, 0, 0, Two.Commands.close));
      vertices.forEach(p => p.relative = false);

      let ghostPath = new Two.Path(vertices);
      ghostPath.id = "ghost-path";
      ghostPath.stroke = "#a78bfa";
      ghostPath.fill = "#a78bfa";
      ghostPath.opacity = 0.15;
      ghostPath.linewidth = x(0.5);
      ghostPath.automatic = false;
      return ghostPath;
  })();

  // 5. Onion Layers
  $: onionLayerElements = (() => {
      if (!x || !y || !settings.showOnionLayers || lines.length === 0) return [];

      let onionLayers: any[] = [];
      const spacing = settings.onionLayerSpacing || 6;
      const layers = generateOnionLayers(startPoint, lines, settings.rWidth, settings.rHeight, spacing);

      layers.forEach((layer: any, idx: any) => {
          let vertices = [];
          vertices.push(new Two.Anchor(x(layer.corners[0].x), y(layer.corners[0].y), 0, 0, 0, 0, Two.Commands.move));
          for (let i=1; i<layer.corners.length; i++) {
             vertices.push(new Two.Anchor(x(layer.corners[i].x), y(layer.corners[i].y), 0, 0, 0, 0, Two.Commands.line));
          }
          vertices.push(new Two.Anchor(x(layer.corners[0].x), y(layer.corners[0].y), 0, 0, 0, 0, Two.Commands.close));
          vertices.forEach(p => p.relative = false);

          let onionRect = new Two.Path(vertices);
          onionRect.id = `onion-layer-${idx}`;
          onionRect.stroke = "#818cf8";
          onionRect.noFill();
          onionRect.opacity = 0.35;
          onionRect.linewidth = x(0.5);
          onionRect.automatic = false;
          onionLayers.push(onionRect);
      });
      return onionLayers;
  })();

  // 6. Preview Optimized Lines
  $: previewPathElements = (() => {
      if (!x || !y || !previewOptimizedLines || previewOptimizedLines.length === 0) return [];

      let _previewPaths: any[] = [];
      previewOptimizedLines.forEach((line, idx) => {
          if (!line || !line.endPoint) return;
          let _startPoint = idx === 0 ? startPoint : previewOptimizedLines![idx - 1]?.endPoint || null;
          if (!_startPoint) return;

          let lineElem: any;
          // Logic mirrors main line generation but with dashed style
          if (line.controlPoints.length > 2) {
             const samples = 100;
             const cps = [_startPoint, ...line.controlPoints, line.endPoint];
             let points = [new Two.Anchor(x(_startPoint.x), y(_startPoint.y), 0, 0, 0, 0, Two.Commands.move)];
             for(let i=1; i<=samples; ++i) {
                 const pt = getCurvePoint(i/samples, cps);
                 points.push(new Two.Anchor(x(pt.x), y(pt.y), 0, 0, 0, 0, Two.Commands.line));
             }
             points.forEach(p => p.relative = false);
             lineElem = new Two.Path(points);
             lineElem.automatic = false;
          } else if (line.controlPoints.length > 0) {
             let cp1 = line.controlPoints[1] ? line.controlPoints[0] : quadraticToCubic(_startPoint, line.controlPoints[0], line.endPoint).Q1;
             let cp2 = line.controlPoints[1] ?? quadraticToCubic(_startPoint, line.controlPoints[0], line.endPoint).Q2;
             let points = [
                 new Two.Anchor(x(_startPoint.x), y(_startPoint.y), x(_startPoint.x), y(_startPoint.y), x(cp1.x), y(cp1.y), Two.Commands.move),
                 new Two.Anchor(x(line.endPoint.x), y(line.endPoint.y), x(cp2.x), y(cp2.y), x(line.endPoint.x), y(line.endPoint.y), Two.Commands.curve)
             ];
             points.forEach(p => p.relative = false);
             lineElem = new Two.Path(points);
             lineElem.automatic = false;
          } else {
             lineElem = new Two.Line(x(_startPoint.x), y(_startPoint.y), x(line.endPoint.x), y(line.endPoint.y));
          }

          lineElem.id = `preview-line-${idx + 1}`;
          lineElem.stroke = "#60a5fa";
          lineElem.linewidth = x(LINE_WIDTH);
          lineElem.noFill();
          lineElem.dashes = [x(4), x(4)];
          lineElem.opacity = 0.7;
          _previewPaths.push(lineElem);
      });
      return _previewPaths;
  })();

  // 7. Event Markers
  $: eventMarkerElements = (() => {
      if (!x || !y) return [];
      let markers: any[] = [];

      // Path-based markers
      lines.forEach((line, idx) => {
          if (!line || !line.endPoint || !line.eventMarkers || line.eventMarkers.length === 0) return;
          const _startPoint = idx === 0 ? startPoint : lines[idx - 1]?.endPoint || null;
          if (!_startPoint) return;

          line.eventMarkers.forEach((ev, evIdx) => {
              const t = Math.max(0, Math.min(1, ev.position ?? 0.5));
              let pos = {x: 0, y: 0};
              if (line.controlPoints.length > 0) {
                  const cps = [_startPoint, ...line.controlPoints, line.endPoint];
                  const pt = getCurvePoint(t, cps);
                  pos = pt;
              } else {
                  pos.x = _startPoint.x + (line.endPoint.x - _startPoint.x) * t;
                  pos.y = _startPoint.y + (line.endPoint.y - _startPoint.y) * t;
              }

              const px = x(pos.x);
              const py = y(pos.y);

              let grp = new Two.Group();
              grp.id = `event-${idx}-${evIdx}`;

              let circle = new Two.Circle(px, py, x(1.8));
              circle.fill = "#a78bfa";
              circle.noStroke();

              grp.add(circle);
              markers.push(grp);
          });
      });

      // Wait-based markers
      if (timePrediction && timePrediction.timeline && sequence && sequence.length > 0) {
          const waitById = new Map<string, any>();
          sequence.forEach(it => { if (it.kind === 'wait') waitById.set(it.id, it); });

          timePrediction.timeline.forEach((ev: any, tIdx: any) => {
              if (ev.type !== 'wait' || !ev.waitId || !ev.atPoint) return;
              const seqWait = waitById.get(ev.waitId);
              if (!seqWait || !seqWait.eventMarkers || seqWait.eventMarkers.length === 0) return;

              const point = ev.atPoint;
              seqWait.eventMarkers.forEach((event: any, eventIdx: number) => {
                  const markerGroup = new Two.Group();
                  markerGroup.id = `wait-event-${ev.waitId}-${eventIdx}`;

                  const markerCircle = new Two.Circle(x(point.x), y(point.y), x(POINT_RADIUS * 1.3));
                  markerCircle.id = `wait-event-circle-${ev.waitId}-${eventIdx}`;
                  markerCircle.fill = "#8b5cf6";
                  markerCircle.stroke = "#ffffff";
                  markerCircle.linewidth = x(0.3);

                  const flagSize = x(1);
                  const flagPoints = [
                    new Two.Anchor(x(point.x), y(point.y) - flagSize / 2),
                    new Two.Anchor(x(point.x) + flagSize / 2, y(point.y)),
                    new Two.Anchor(x(point.x), y(point.y) + flagSize / 2),
                  ];
                  const flag = new Two.Path(flagPoints, true);
                  flag.fill = "#ffffff";
                  flag.stroke = "none";
                  flag.id = `wait-event-flag-${ev.waitId}-${eventIdx}`;

                  markerGroup.add(markerCircle, flag);
                  markers.push(markerGroup);
              });
          });
      }

      return markers;
  })();


  // --- Render Loop ---
  $: if (two) {
      // Clear groups
      shapeGroup.remove(...shapeGroup.children);
      lineGroup.remove(...lineGroup.children);
      pointGroup.remove(...pointGroup.children);
      eventGroup.remove(...eventGroup.children);

      // Add back
      if (shapeElements) shapeGroup.add(...shapeElements);
      if (ghostPathElement) shapeGroup.add(ghostPathElement);
      if (onionLayerElements) shapeGroup.add(...onionLayerElements);

      if (pathElements) lineGroup.add(...pathElements);
      if (previewPathElements) lineGroup.add(...previewPathElements);

      if (points) pointGroup.add(...points);
      if (eventMarkerElements) eventGroup.add(...eventMarkerElements);

      two.update();
  }

</script>

<div bind:this={container} class="w-full h-full"></div>
