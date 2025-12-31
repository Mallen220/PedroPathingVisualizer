import type { Point, Line, SequenceItem, Shape } from "../types";
import { renderTemplate } from "./templateEngine";
import type { RenderResult } from "./templateEngine";
export { validateTemplate } from "./templateEngine";

interface TemplateContext {
  packageName: string;
  className: string;
  startPoint: {
    x: number;
    y: number;
    heading: number;
    headingRad: number;
  };
  paths: Array<any>;
  markers: Array<{ name: string }>;
  sequence: Array<any>;
  shapes: Array<Shape>;
  project: {
    startPoint: Point;
    lines: Line[];
    shapes: Shape[];
    sequence: SequenceItem[];
  };
}

export function generateCustomCode(
  startPoint: Point,
  lines: Line[],
  sequence: SequenceItem[] | undefined,
  shapes: Shape[] | undefined,
  template: string,
  mode: "full" | "class-body" = "full",
  packageName: string = "com.example",
  className: string = "AutoPath",
): RenderResult {
  const context = prepareTemplateContext(
    startPoint,
    lines,
    sequence,
    shapes,
    packageName,
    className,
  );

  let finalTemplate = template;
  let offsetLines = 0;

  if (mode === "class-body") {
    // We wrap it, so line numbers in error report will be offset.
    const prefix = `package {{ packageName }};

import com.pedropathing.follower.Follower;
import com.pedropathing.geometry.Pose;
import com.pedropathing.pathing.PathChain;
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.OpMode;

@Autonomous(name = "{{ className }}", group = "Autonomous")
public class {{ className }} extends OpMode {

`;
    // Count newlines in prefix to adjust error line report if we wanted to map back to user template
    // But since the user only edits the body, we might want to adjust the reported line number BACK by this amount.
    offsetLines = (prefix.match(/\n/g) || []).length;

    finalTemplate = `${prefix}${template}

}`;
  }

  const result = renderTemplate(finalTemplate, context);

  // Adjust error line if needed
  if (result.error && mode === "class-body") {
    result.error.line = Math.max(1, result.error.line - offsetLines);
  }

  return result;
}

export function prepareTemplateContext(
  startPoint: Point,
  lines: Line[],
  sequence: SequenceItem[] | undefined,
  shapes: Shape[] | undefined,
  packageName: string,
  className: string,
): TemplateContext {
  const formattedStartPoint = {
    x: startPoint.x,
    y: startPoint.y,
    heading: (startPoint as any).startDeg ?? 0,
    headingRad: (Math.PI / 180) * ((startPoint as any).startDeg ?? 0),
  };

  // Process Paths
  const paths = lines.map((line, idx) => {
    const name = line.name || `path${idx + 1}`;
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, "");

    return {
      name: cleanName,
      index: idx,
      startPoint: idx === 0 ? formattedStartPoint : lines[idx - 1].endPoint,
      endPoint: {
        x: line.endPoint.x,
        y: line.endPoint.y,
        heading:
          (line.endPoint as any).endDeg ?? (line.endPoint as any).degrees ?? 0,
      },
      controlPoints: line.controlPoints,
      eventMarkers: line.eventMarkers || [],
      reversed: !!line.endPoint.reverse,
    };
  });

  // Unique Markers
  const markersSet = new Set<string>();
  paths.forEach((p) =>
    p.eventMarkers.forEach((m: any) => markersSet.add(m.name)),
  );
  const markers = Array.from(markersSet).map((name) => ({ name }));

  // Sequence
  const defaultSequence = lines.map((ln, idx) => ({
    kind: "path",
    lineId: ln.id || `line-${idx + 1}`,
  }));

  const seqSource = sequence && sequence.length ? sequence : defaultSequence;

  const processedSequence = seqSource.map((item, idx) => {
    const isLast = idx === seqSource.length - 1;
    if ((item as any).kind === "wait") {
      return {
        type: "wait",
        duration: (item as any).durationMs || 0,
        waitSeconds: ((item as any).durationMs || 0) / 1000.0,
        hasNext: !isLast,
      };
    } else {
      const line = lines.find((l) => l.id === (item as any).lineId);
      const name = line
        ? (line.name || `path${lines.indexOf(line) + 1}`).replace(
            /[^a-zA-Z0-9]/g,
            "",
          )
        : "unknown";

      let nextPathName = "";
      if (!isLast) {
        const nextItem = seqSource[idx + 1];
        if ((nextItem as any).kind === "path") {
          const nextLine = lines.find((l) => l.id === (nextItem as any).lineId);
          nextPathName = nextLine
            ? (nextLine.name || `path${lines.indexOf(nextLine) + 1}`).replace(
                /[^a-zA-Z0-9]/g,
                "",
              )
            : "";
        }
      }

      return {
        type: "path",
        name: name,
        hasNext: !isLast,
        nextPathName: nextPathName,
      };
    }
  });

  return {
    packageName,
    className,
    startPoint: formattedStartPoint,
    paths,
    markers,
    sequence: processedSequence,
    shapes: shapes || [],
    project: {
      startPoint,
      lines,
      shapes: shapes || [],
      sequence: seqSource,
    },
  };
}
