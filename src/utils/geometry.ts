/**
 * Geometry utility functions for obstacle detection and polygon operations
 */
import type { BasePoint } from "../types";

/**
 * Determines if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(point: number[], polygon: BasePoint[]): boolean {
  const x = point[0],
    y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate minimum distance from a point to a polygon's edges
 */
export function minDistanceToPolygon(
  point: number[],
  polygon: BasePoint[],
): number {
  let minDistance = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const distance = pointToLineDistance(point, [p1.x, p1.y], [p2.x, p2.y]);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

/**
 * Calculate shortest distance from a point to a line segment
 */
export function pointToLineDistance(
  point: number[],
  lineStart: number[],
  lineEnd: number[],
): number {
  const A = point[0] - lineStart[0];
  const B = point[1] - lineStart[1];
  const C = lineEnd[0] - lineStart[0];
  const D = lineEnd[1] - lineStart[1];

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart[0];
    yy = lineStart[1];
  } else if (param > 1) {
    xx = lineEnd[0];
    yy = lineEnd[1];
  } else {
    xx = lineStart[0] + param * C;
    yy = lineStart[1] + param * D;
  }

  const dx = point[0] - xx;
  const dy = point[1] - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the center (centroid) of a polygon
 */
export function polygonCenter(vertices: BasePoint[]): number[] {
  const sum = vertices.reduce(
    (acc, vertex) => {
      return [acc[0] + vertex.x, acc[1] + vertex.y];
    },
    [0, 0],
  );

  return [sum[0] / vertices.length, sum[1] / vertices.length];
}

/**
 * Calculate the four corner points of a robot at a given position and heading
 * Assumes the robot is a rectangle centered at (x, y) with the given heading angle
 * The heading convention: 0° = right, 90° = down, 180° = left, 270° = up
 * (this matches SVG/screen coordinates where Y increases downward)
 * @param x - Robot center X position (in inches)
 * @param y - Robot center Y position (in inches)
 * @param heading - Robot heading in degrees
 * @param width - Robot width in inches (extends left-right from center)
 * @param height - Robot height in inches (extends forward-backward from center)
 * @returns Array of 4 corner points in order: [front-left, front-right, back-right, back-left]
 */
export function getRobotCorners(
  x: number,
  y: number,
  heading: number,
  width: number,
  height: number,
): BasePoint[] {
  // Convert heading from degrees to radians
  const headingRad = (heading * Math.PI) / 180;

  // Half dimensions
  const hw = width / 2;
  const hh = height / 2;

  // Calculate rotation components
  const cos = Math.cos(headingRad);
  const sin = Math.sin(headingRad);

  // Corner offsets relative to center (before rotation)
  // Define corners in local robot frame:
  // - width extends perpendicular to heading direction (left/right)
  // - height extends along heading direction (forward/backward)
  const corners = [
    { dx: -hw, dy: -hh }, // front-left (forward, left)
    { dx: hw, dy: -hh }, // front-right (forward, right)
    { dx: hw, dy: hh }, // back-right (backward, right)
    { dx: -hw, dy: hh }, // back-left (backward, left)
  ];

  // Rotate and translate corners
  // Using standard 2D rotation matrix for screen coordinates
  return corners.map((corner) => ({
    x: x + corner.dx * cos - corner.dy * sin,
    y: y + corner.dx * sin + corner.dy * cos,
  }));
}
