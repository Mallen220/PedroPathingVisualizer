import type { Line, SequenceItem, Point, BasePoint } from "../types";
import _ from "lodash";

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function duplicatePathLine(
  lines: Line[],
  sequence: SequenceItem[],
  startPoint: Point,
  lineIndex: number,
  seqIndex: number,
): { lines: Line[]; sequence: SequenceItem[]; newLine: Line } {
  const currentLine = lines[lineIndex];

  // Determine the start point of the current line
  let prevEndPoint: BasePoint = startPoint;

  // Find the previous path item in the sequence to determine where the current line starts
  for (let i = seqIndex - 1; i >= 0; i--) {
    const item = sequence[i];
    if (item.kind === "path") {
      const ln = lines.find((l) => l.id === item.lineId);
      if (ln) {
        prevEndPoint = ln.endPoint;
        break;
      }
    }
  }

  // Calculate delta vector (End - Start)
  const deltaX = currentLine.endPoint.x - prevEndPoint.x;
  const deltaY = currentLine.endPoint.y - prevEndPoint.y;

  // Create new End Point
  const newEndPoint = _.cloneDeep(currentLine.endPoint);
  newEndPoint.x += deltaX;
  newEndPoint.y += deltaY;

  // Duplicate Control Points and shift them
  const newControlPoints = currentLine.controlPoints.map((cp) => {
    const newCp = _.cloneDeep(cp);
    newCp.x += deltaX;
    newCp.y += deltaY;
    return newCp;
  });

  const newLine: Line = {
    ..._.cloneDeep(currentLine),
    id: makeId(),
    name: currentLine.name ? `${currentLine.name} Copy` : "",
    endPoint: newEndPoint,
    controlPoints: newControlPoints,
    color: currentLine.color,
    locked: false,
    // Event markers are copied via cloneDeep but might need unique IDs if they have them
    eventMarkers: (currentLine.eventMarkers || []).map((m) => ({
      ...m,
      id: makeId(),
    })),
  };

  // Insert new line
  const newLines = [...lines];
  newLines.splice(lineIndex + 1, 0, newLine);

  // Insert into sequence
  const newSeq = [...sequence];
  newSeq.splice(seqIndex + 1, 0, { kind: "path", lineId: newLine.id! });

  return {
    lines: newLines,
    sequence: newSeq,
    newLine,
  };
}
