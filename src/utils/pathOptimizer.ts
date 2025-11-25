/**
 * Path Optimization Module
 * 
 * Optimizes robot paths by:
 * 1. Ensuring the robot does not hit obstacles
 * 2. Ensuring the robot stays within field bounds
 * 3. Smoothing paths to minimize sharp turns (turning is slow, driving is fast)
 */

/// <reference types="../types.d.ts" />

import { getCurvePoint } from './math';

// Constants
const FIELD_SIZE = 144; // Field dimensions in inches (144x144)
const PARALLEL_THRESHOLD = 1e-10; // Threshold for determining if lines are parallel
const SMOOTHING_SCALE = 10; // Scale factor for optimization quality to smoothing
const SMOOTHING_MULTIPLIER = 0.1; // Base smoothing strength multiplier
const MIN_SAMPLES_PER_SEGMENT = 10; // Minimum sampling points per path segment
const SAMPLES_QUALITY_MULTIPLIER = 10; // Multiplier for optimization quality to sample count
const MIN_SMOOTHING_ANGLE_RAD = 0.1; // Minimum angle change (in radians) to trigger smoothing (~5.7 degrees)
const CONTROL_DISTANCE_FACTOR = 0.3; // Factor for control point distance from waypoint
const MULTI_CONTROL_POINT_FACTOR = 0.5; // Additional factor for multiple control points
const MIN_SEGMENT_LENGTH = 1e-6; // Minimum segment length in inches to avoid division by zero (effectively zero)

interface OptimizationResult {
  success: boolean;
  optimizedLines?: Line[];
  error?: string;
}

interface PathSegment {
  start: BasePoint;
  end: BasePoint;
  controlPoints: ControlPoint[];
}

/**
 * Calculate the length of a 2D vector
 */
function vectorLength(vector: { x: number; y: number }): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

/**
 * Check if a point is inside a polygon (obstacle)
 */
function isPointInPolygon(point: BasePoint, vertices: BasePoint[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a rectangle (robot) intersects with a polygon (obstacle)
 * Uses separating axis theorem
 */
function rectangleIntersectsPolygon(
  rectCenter: BasePoint,
  rectWidth: number,
  rectHeight: number,
  heading: number,
  polygon: BasePoint[]
): boolean {
  // Convert heading to radians
  const headingRad = (heading * Math.PI) / 180;
  
  // Get robot corners
  const robotCorners = getRobotCorners(rectCenter, rectWidth, rectHeight, headingRad);
  
  // Check if any robot corner is inside the polygon
  for (const corner of robotCorners) {
    if (isPointInPolygon(corner, polygon)) {
      return true;
    }
  }
  
  // Check if any polygon vertex is inside the robot
  for (const vertex of polygon) {
    if (isPointInRectangle(vertex, rectCenter, rectWidth, rectHeight, headingRad)) {
      return true;
    }
  }
  
  // Check edge-to-edge intersections
  for (let i = 0; i < robotCorners.length; i++) {
    const robotEdge = {
      start: robotCorners[i],
      end: robotCorners[(i + 1) % robotCorners.length]
    };
    
    for (let j = 0; j < polygon.length; j++) {
      const polyEdge = {
        start: polygon[j],
        end: polygon[(j + 1) % polygon.length]
      };
      
      if (lineSegmentsIntersect(robotEdge.start, robotEdge.end, polyEdge.start, polyEdge.end)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get the four corners of a rotated rectangle
 * Corners are in counter-clockwise order starting from bottom-left
 */
function getRobotCorners(
  center: BasePoint,
  width: number,
  height: number,
  headingRad: number
): BasePoint[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const cos = Math.cos(headingRad);
  const sin = Math.sin(headingRad);
  
  // Apply rotation matrix: [x', y'] = [cos -sin; sin cos] * [x, y]
  return [
    // Bottom-left corner (-halfWidth, -halfHeight)
    {
      x: center.x + (-halfWidth * cos - (-halfHeight) * sin),
      y: center.y + (-halfWidth * sin + (-halfHeight) * cos)
    },
    // Bottom-right corner (halfWidth, -halfHeight)
    {
      x: center.x + (halfWidth * cos - (-halfHeight) * sin),
      y: center.y + (halfWidth * sin + (-halfHeight) * cos)
    },
    // Top-right corner (halfWidth, halfHeight)
    {
      x: center.x + (halfWidth * cos - halfHeight * sin),
      y: center.y + (halfWidth * sin + halfHeight * cos)
    },
    // Top-left corner (-halfWidth, halfHeight)
    {
      x: center.x + (-halfWidth * cos - halfHeight * sin),
      y: center.y + (-halfWidth * sin + halfHeight * cos)
    }
  ];
}

/**
 * Check if a point is inside a rotated rectangle
 */
function isPointInRectangle(
  point: BasePoint,
  rectCenter: BasePoint,
  rectWidth: number,
  rectHeight: number,
  headingRad: number
): boolean {
  // Transform point to rectangle's local coordinate system
  const dx = point.x - rectCenter.x;
  const dy = point.y - rectCenter.y;
  const cos = Math.cos(-headingRad);
  const sin = Math.sin(-headingRad);
  
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  
  return Math.abs(localX) <= rectWidth / 2 && Math.abs(localY) <= rectHeight / 2;
}

/**
 * Check if two line segments intersect
 */
function lineSegmentsIntersect(
  p1: BasePoint,
  p2: BasePoint,
  p3: BasePoint,
  p4: BasePoint
): boolean {
  const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
  
  if (Math.abs(det) < PARALLEL_THRESHOLD) {
    return false; // Parallel or coincident
  }
  
  const lambda = ((p4.y - p3.y) * (p3.x - p1.x) + (p3.x - p4.x) * (p3.y - p1.y)) / det;
  const gamma = ((p1.y - p2.y) * (p3.x - p1.x) + (p2.x - p1.x) * (p3.y - p1.y)) / det;
  
  return (lambda >= 0 && lambda <= 1) && (gamma >= 0 && gamma <= 1);
}

/**
 * Get points along a bezier curve
 */
function sampleBezierCurve(
  startPoint: BasePoint,
  endPoint: BasePoint,
  controlPoints: ControlPoint[],
  numSamples: number
): BasePoint[] {
  const points: BasePoint[] = [];
  const cps = [startPoint, ...controlPoints, endPoint];
  
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    points.push(getCurvePoint(t, cps));
  }
  
  return points;
}

/**
 * Calculate heading at a point on the path
 * @param point The point with heading information
 * @param prevPoint Previous point for tangent calculation
 * @param nextPoint Next point for tangent calculation  
 * @param t Optional parameter for linear interpolation (0-1)
 * @returns Heading angle in degrees
 */
function calculateHeading(
  point: Point, 
  prevPoint: BasePoint, 
  nextPoint: BasePoint,
  t?: number
): number {
  if (point.heading === "constant") {
    return point.degrees;
  } else if (point.heading === "tangential") {
    const dx = nextPoint.x - prevPoint.x;
    const dy = nextPoint.y - prevPoint.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (point.reverse) {
      angle += 180;
    }
    return angle;
  } else if (point.heading === "linear") {
    // Interpolate between start and end degrees based on t (position along path)
    if (t !== undefined) {
      let diff = point.endDeg - point.startDeg;
      // Take shortest angular path
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      return point.startDeg + diff * t;
    }
    // Fallback to startDeg if t is not provided
    return point.startDeg;
  }
  return 0;
}

/**
 * Check if the robot at a given position collides with any obstacles
 */
function checkCollision(
  position: BasePoint,
  heading: number,
  settings: FPASettings,
  shapes: Shape[]
): boolean {
  // Use actual robot dimensions for field bounds checking
  const actualRobotWidth = settings.rWidth/2;
  const actualRobotHeight = settings.rHeight/2;
  
  // Use expanded dimensions (with safety margin) for obstacle collision
  const expandedRobotWidth = settings.rWidth + settings.safetyMargin * 2;
  const expandedRobotHeight = settings.rHeight + settings.safetyMargin * 2;
  
  const headingRad = (heading * Math.PI) / 180;
  
  // Check bounds (field is 0-144 inches) using actual robot dimensions
  const robotCorners = getRobotCorners(
    position,
    actualRobotWidth,
    actualRobotHeight,
    headingRad
  );
  
  for (const corner of robotCorners) {
    if (corner.x < 0 || corner.x > FIELD_SIZE || corner.y < 0 || corner.y > FIELD_SIZE) {
      return true; // Out of bounds
    }
  }
  
  // Check obstacle collisions using expanded dimensions (with safety margin)
  for (const shape of shapes) {
    if (rectangleIntersectsPolygon(position, expandedRobotWidth, expandedRobotHeight, heading, shape.vertices)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate the sharpness of a turn (higher = sharper)
 */
function calculateTurnSharpness(angle1: number, angle2: number): number {
  // Calculate the shortest angular distance
  let diff = angle2 - angle1;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff);
}

/**
 * Optimize control points to create smoother paths
 * Focuses on smoothing heading changes and preventing harsh jumps
 */
function smoothPath(
  segment: PathSegment,
  prevSegment: PathSegment | null,
  settings: FPASettings
): ControlPoint[] {
  // If no control points, consider adding some for smoother transition
  if (segment.controlPoints.length === 0) {
    // For straight line segments, add control points for smoother transitions
    // This helps create gradual heading changes instead of sharp corners
    if (prevSegment) {
      // Calculate the incoming direction from previous segment
      const prevDir = {
        x: prevSegment.end.x - prevSegment.start.x,
        y: prevSegment.end.y - prevSegment.start.y
      };
      const prevLength = vectorLength(prevDir);
      
      // Calculate the outgoing direction for current segment
      const currDir = {
        x: segment.end.x - segment.start.x,
        y: segment.end.y - segment.start.y
      };
      const currLength = vectorLength(currDir);
      
      // Skip if either segment has zero length
      if (prevLength < MIN_SEGMENT_LENGTH || currLength < MIN_SEGMENT_LENGTH) {
        return [];
      }
      
      // Calculate the angle between segments
      let angle = Math.atan2(currDir.y, currDir.x) - Math.atan2(prevDir.y, prevDir.x);
      
      // Normalize angle to [-π, π] range
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      
      // If there's a significant heading change, add control points to smooth it
      if (Math.abs(angle) > MIN_SMOOTHING_ANGLE_RAD) {
        const smoothingFactor = settings.optimizationQuality / SMOOTHING_SCALE;
        const controlDist = Math.min(prevLength, currLength) * CONTROL_DISTANCE_FACTOR * smoothingFactor;
        
        // Add two control points for a smooth cubic bezier curve
        return [
          {
            x: segment.start.x + (prevDir.x / prevLength) * controlDist,
            y: segment.start.y + (prevDir.y / prevLength) * controlDist
          },
          {
            x: segment.start.x + (currDir.x / currLength) * controlDist,
            y: segment.start.y + (currDir.y / currLength) * controlDist
          }
        ];
      }
    }
    return [];
  }
  
  // Apply smoothing to existing control points
  // Higher quality = more aggressive smoothing
  const smoothingFactor = settings.optimizationQuality / SMOOTHING_SCALE;
  
  // Clone control points
  const optimized = segment.controlPoints.map(cp => ({ ...cp }));
  
  // For paths with control points, adjust them to create smoother heading transitions
  if (optimized.length === 1) {
    // Single control point - adjust it to be on the line between start and end
    // but maintain some curvature based on its current offset
    const lineDir = {
      x: segment.end.x - segment.start.x,
      y: segment.end.y - segment.start.y
    };
    const lineLength = vectorLength(lineDir);
    
    // Skip if start and end points are the same (zero-length segment)
    if (lineLength < MIN_SEGMENT_LENGTH) {
      return optimized;
    }
    
    // Project control point onto the line
    const t = ((optimized[0].x - segment.start.x) * lineDir.x + 
               (optimized[0].y - segment.start.y) * lineDir.y) / (lineLength * lineLength);
    
    const projectedPoint = {
      x: segment.start.x + t * lineDir.x,
      y: segment.start.y + t * lineDir.y
    };
    
    // Move control point toward the projected point, but not all the way
    // This maintains curvature while reducing sharpness
    const factor = smoothingFactor * SMOOTHING_MULTIPLIER;
    optimized[0].x = optimized[0].x + (projectedPoint.x - optimized[0].x) * factor;
    optimized[0].y = optimized[0].y + (projectedPoint.y - optimized[0].y) * factor;
    
  } else if (optimized.length >= 2) {
    // Multiple control points - ensure they create a smooth curve
    // Adjust them to be more evenly distributed and aligned
    for (let i = 0; i < optimized.length; i++) {
      const t = (i + 1) / (optimized.length + 1);
      
      // Calculate ideal position on a line from start to end
      const idealLinePos = {
        x: segment.start.x + t * (segment.end.x - segment.start.x),
        y: segment.start.y + t * (segment.end.y - segment.start.y)
      };
      
      // Move control point toward ideal position to reduce curvature sharpness
      const factor = smoothingFactor * SMOOTHING_MULTIPLIER * MULTI_CONTROL_POINT_FACTOR;
      optimized[i].x = optimized[i].x + (idealLinePos.x - optimized[i].x) * factor;
      optimized[i].y = optimized[i].y + (idealLinePos.y - optimized[i].y) * factor;
    }
  }
  
  return optimized;
}

/**
 * Check all path segments for collisions
 * Internal helper function used by both optimizePath and validatePath
 * 
 * Samples each path segment at multiple points and checks for:
 * - Robot-obstacle intersections using separating axis theorem
 * - Field bounds violations (0-144 inch field)
 * 
 * @param startPoint Starting point of the path
 * @param lines Path segments to check
 * @param shapes Obstacles to avoid
 * @param settings Robot parameters including dimensions and safety margin
 * @returns Object with success flag and optional error message containing collision location
 */
function checkPathCollisions(
  startPoint: Point,
  lines: Line[],
  shapes: Shape[],
  settings: FPASettings
): { success: boolean; error?: string } {
  let currentPoint = startPoint;
  
  // Sample density based on optimization quality (1-10)
  const samplesPerSegment = Math.max(MIN_SAMPLES_PER_SEGMENT, settings.optimizationQuality * SAMPLES_QUALITY_MULTIPLIER);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const segment: PathSegment = {
      start: currentPoint,
      end: line.endPoint,
      controlPoints: line.controlPoints
    };
    
    // Sample the path to check for collisions
    const samples = line.controlPoints.length > 0
      ? sampleBezierCurve(segment.start, segment.end, segment.controlPoints, samplesPerSegment)
      : [segment.start, segment.end];
    
    // Check each sample point for collisions
    for (let j = 0; j < samples.length; j++) {
      const sample = samples[j];
      const prevSample = j > 0 ? samples[j - 1] : segment.start;
      const nextSample = j < samples.length - 1 ? samples[j + 1] : segment.end;
      
      // Calculate heading at this point
      let heading = 0;
      if (j === samples.length - 1) {
        // Use endpoint heading with full interpolation (t=1)
        heading = calculateHeading(line.endPoint, prevSample, segment.end, 1.0);
      } else {
        // Use tangent of path
        const dx = nextSample.x - prevSample.x;
        const dy = nextSample.y - prevSample.y;
        heading = Math.atan2(dy, dx) * (180 / Math.PI);
      }
      
      // Check for collision
      if (checkCollision(sample, heading, settings, shapes)) {
        return {
          success: false,
          error: `Path collision detected at segment ${i + 1}, point (${sample.x.toFixed(1)}, ${sample.y.toFixed(1)}). ` +
                 `The robot would hit an obstacle or leave the field bounds.`
        };
      }
    }
    
    currentPoint = line.endPoint;
  }
  
  return { success: true };
}

/**
 * Main optimization function
 */
export function optimizePath(
  startPoint: Point,
  lines: Line[],
  shapes: Shape[],
  settings: FPASettings
): OptimizationResult {
  try {
    // Validate input
    if (!startPoint || !lines || lines.length === 0) {
      return {
        success: false,
        error: "Invalid path: No waypoints defined"
      };
    }
    
    // First check for collisions
    const collisionCheck = checkPathCollisions(startPoint, lines, shapes, settings);
    if (!collisionCheck.success) {
      return {
        success: false,
        error: collisionCheck.error
      };
    }
    
    const optimizedLines: Line[] = [];
    let currentPoint = startPoint;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const segment: PathSegment = {
        start: currentPoint,
        end: line.endPoint,
        controlPoints: line.controlPoints
      };
      
      // Apply smoothing to control points
      const prevSegment = i > 0 ? {
        start: i > 1 ? lines[i - 2].endPoint : startPoint,
        end: lines[i - 1].endPoint,
        controlPoints: lines[i - 1].controlPoints
      } : null;
      
      const smoothedControlPoints = smoothPath(segment, prevSegment, settings);
      
      // Create optimized line
      optimizedLines.push({
        ...line,
        controlPoints: smoothedControlPoints
      });
      
      currentPoint = line.endPoint;
    }
    
    return {
      success: true,
      optimizedLines
    };
  } catch (error) {
    return {
      success: false,
      error: `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate that a path is possible (doesn't collide)
 * This is a lighter-weight check that doesn't modify the path
 */
export function validatePath(
  startPoint: Point,
  lines: Line[],
  shapes: Shape[],
  settings: FPASettings
): OptimizationResult {
  try {
    // Validate input
    if (!startPoint || !lines || lines.length === 0) {
      return {
        success: false,
        error: "Invalid path: No waypoints defined"
      };
    }
    
    // Check for collisions without smoothing
    const result = checkPathCollisions(startPoint, lines, shapes, settings);
    
    return {
      success: result.success,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
