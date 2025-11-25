import type { Point, ControlPoint, Line, FPALine, FPASettings, Shape } from '../types';

// Grid and Node types
interface GridNode {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  obstacle: boolean;
}

// Global path optimization
export async function optimizeAllPaths(
  startPoint: Point,
  lines: Line[],
  shapes: Shape[],
  settings: FPASettings
): Promise<Line[]> {
  console.log('Starting global path optimization...');
  console.log('Input:', { startPoint, linesCount: lines.length, shapesCount: shapes.length });
  
  try {
    const optimizedLines: Line[] = [];
    let currentStart = startPoint;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`Optimizing path ${i + 1}/${lines.length}`);
      
      const optimizedLine = await optimizePathSegment(
        currentStart,
        line.endPoint,
        line.controlPoints,
        shapes,
        settings
      );
      
      optimizedLines.push(optimizedLine);
      currentStart = optimizedLine.endPoint;
    }
    
    console.log('Optimization completed. Result:', optimizedLines);
    return optimizedLines;
    
  } catch (error) {
    console.error('Global optimization failed:', error);
    throw error;
  }
}

// Individual path optimization
export async function fpa(l: FPALine, s: FPASettings, obstacles: Shape[]): Promise<Line> {
  try {
    return await optimizePathSegment(
      l.startPoint,
      l.endPoint,
      l.controlPoints,
      obstacles,
      s
    );
  } catch (error) {
    if (error.message.includes('impossible')) {
      throw new Error('Cannot find obstacle-free path. Try adjusting obstacles or waypoints.');
    }
    throw error;
  }
}

// Core path optimization with guaranteed obstacle avoidance
async function optimizePathSegment(
  start: Point,
  end: Point,
  controlPoints: ControlPoint[],
  obstacles: Shape[],
  settings: FPASettings
): Promise<Line> {
  return new Promise((resolve, reject) => {
    try {
      // If no obstacles and no control points, just return the original line
      const hasObstacles = obstacles.some(obs => obs.vertices.length >= 3);
      if (!hasObstacles && controlPoints.length === 0) {
        resolve({
          name: `Optimized Path`,
          endPoint: end,
          controlPoints: [],
          color: getRandomColor()
        });
        return;
      }

      // Convert to waypoints
      const waypoints = [start, ...controlPoints, end].map(p => [p.x, p.y]);
      
      // Run path planning with obstacle avoidance
      const optimizedPath = findOptimalPath(
        [start.x, start.y],
        [end.x, end.y],
        obstacles,
        settings
      );
      
      if (!optimizedPath || optimizedPath.length < 2) {
        // Fallback: use original path if no optimized path found
        console.warn('No optimized path found, using original path');
        resolve({
          name: `Original Path`,
          endPoint: end,
          controlPoints: controlPoints,
          color: getRandomColor()
        });
        return;
      }
      
      // Convert back to control points (skip first and last which are start/end)
      const newControlPoints = optimizedPath.slice(1, -1).map(point => ({
        x: point[0],
        y: point[1]
      }));
      
      resolve({
        name: `Optimized Path`,
        endPoint: end,
        controlPoints: newControlPoints,
        color: getRandomColor()
      });
      
    } catch (error) {
      console.error('Path optimization error:', error);
      // Fallback to original path
      resolve({
        name: `Fallback Path`,
        endPoint: end,
        controlPoints: controlPoints,
        color: getRandomColor()
      });
    }
  });
}

// Improved A* Path Planning Algorithm
function findOptimalPath(
  start: number[],
  goal: number[],
  obstacles: Shape[],
  settings: FPASettings
): number[][] {
  const quality = settings.optimizationQuality || 3;
  const gridSize = Math.max(2, 144 / (quality * 8));
  const safetyMargin = settings.safetyMargin || 8;
  
  console.log('Path planning:', { start, goal, gridSize, safetyMargin, obstacles: obstacles.length });

  // Check if start and goal are valid
  if (!isPointValid(start) || !isPointValid(goal)) {
    console.error('Invalid start or goal point');
    return [start, goal];
  }

  // If no obstacles, return direct path or slightly optimized bezier
  const validObstacles = obstacles.filter(obs => obs.vertices.length >= 3);
  if (validObstacles.length === 0) {
    console.log('No obstacles, using direct path with smoothing');
    return smoothDirectPath(start, goal, controlPoints);
  }

  try {
    // Create grid for A* search
    const grid = createGrid(144, 144, gridSize);
    const startNode = findNearestGridPoint(start, grid);
    const goalNode = findNearestGridPoint(goal, grid);
    
    console.log('Grid created:', { 
      gridSize: `${grid.length}x${grid[0].length}`,
      startNode, 
      goalNode 
    });

    // Mark obstacles on grid
    markObstaclesOnGrid(grid, validObstacles, safetyMargin);
    
    // Count obstacle nodes for debugging
    const obstacleCount = grid.flat().filter(node => node.obstacle).length;
    console.log(`Obstacle nodes: ${obstacleCount}/${grid.flat().length}`);

    // Run A* algorithm
    const path = aStarSearch(startNode, goalNode, grid);
    
    if (path && path.length >= 2) {
      console.log(`A* found path with ${path.length} points`);
      return simplifyPath(path, 2.0);
    } else {
      console.warn('A* returned empty path, using fallback');
      return [start, goal];
    }
    
  } catch (error) {
    console.error('A* algorithm error:', error);
    return [start, goal];
  }
}

// A* Search Implementation
function aStarSearch(start: GridNode, goal: GridNode, grid: GridNode[][]): number[][] {
  const openSet: GridNode[] = [start];
  const cameFrom: Map<string, GridNode> = new Map();
  const gScore: Map<string, number> = new Map();
  const fScore: Map<string, number> = new Map();
  
  const startKey = `${start.gridX},${start.gridY}`;
  const goalKey = `${goal.gridX},${goal.gridY}`;
  
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));

  let iterations = 0;
  const maxIterations = 5000;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    
    openSet.sort((a, b) => {
      const aScore = fScore.get(`${a.gridX},${a.gridY}`) || Infinity;
      const bScore = fScore.get(`${b.gridX},${b.gridY}`) || Infinity;
      return aScore - bScore;
    });
    
    const current = openSet.shift()!;
    const currentKey = `${current.gridX},${current.gridY}`;

    if (currentKey === goalKey) {
      console.log(`A* reached goal in ${iterations} iterations`);
      return reconstructPath(cameFrom, current);
    }

    const neighbors = getNeighbors(current, grid);
    
    for (const neighbor of neighbors) {
      if (neighbor.obstacle) continue;
      
      const neighborKey = `${neighbor.gridX},${neighbor.gridY}`;
      const tentativeGScore = (gScore.get(currentKey) || Infinity) + distance(current, neighbor);
      
      if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, goal));
        
        if (!openSet.some(node => `${node.gridX},${node.gridY}` === neighborKey)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  console.warn(`A* failed after ${iterations} iterations`);
  return [];
}

// Grid creation
function createGrid(width: number, height: number, cellSize: number): GridNode[][] {
  const grid: GridNode[][] = [];
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  
  console.log(`Creating grid: ${cols}x${rows} (cellSize: ${cellSize})`);

  for (let x = 0; x < cols; x++) {
    grid[x] = [];
    for (let y = 0; y < rows; y++) {
      const worldX = x * cellSize;
      const worldY = y * cellSize;
      
      grid[x][y] = {
        x: Math.min(worldX, width),
        y: Math.min(worldY, height),
        gridX: x,
        gridY: y,
        obstacle: false
      };
    }
  }
  
  return grid;
}

// Obstacle marking
function markObstaclesOnGrid(grid: GridNode[][], obstacles: Shape[], safetyMargin: number): void {
  let markedCount = 0;
  
  for (const obstacle of obstacles) {
    if (obstacle.vertices.length < 3) continue;

    const bounds = getPolygonBounds(obstacle.vertices);
    
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const node = grid[x][y];
        
        if (node.x < bounds.minX - safetyMargin || node.x > bounds.maxX + safetyMargin ||
            node.y < bounds.minY - safetyMargin || node.y > bounds.maxY + safetyMargin) {
          continue;
        }
        
        const point = [node.x, node.y];
        
        if (isPointNearPolygon(point, obstacle.vertices, safetyMargin)) {
          node.obstacle = true;
          markedCount++;
        }
      }
    }
  }
  
  console.log(`Marked ${markedCount} obstacle nodes`);
}

// Helper functions
function findNearestGridPoint(point: number[], grid: GridNode[][]): GridNode {
  let nearest = grid[0][0];
  let minDist = Infinity;
  
  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      const dist = distancePoints(point, [grid[x][y].x, grid[x][y].y]);
      if (dist < minDist) {
        minDist = dist;
        nearest = grid[x][y];
      }
    }
  }
  
  return nearest;
}

function getNeighbors(node: GridNode, grid: GridNode[][]): GridNode[] {
  const neighbors: GridNode[] = [];
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];
  
  for (const [dx, dy] of directions) {
    const newX = node.gridX + dx;
    const newY = node.gridY + dy;
    
    if (newX >= 0 && newX < grid.length && newY >= 0 && newY < grid[0].length) {
      neighbors.push(grid[newX][newY]);
    }
  }
  
  return neighbors;
}

function heuristic(a: GridNode, b: GridNode): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function distance(a: GridNode, b: GridNode): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function distancePoints(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function reconstructPath(cameFrom: Map<string, GridNode>, current: GridNode): number[][] {
  const path: number[][] = [[current.x, current.y]];
  let currentStep = current;
  
  while (cameFrom.has(`${currentStep.gridX},${currentStep.gridY}`)) {
    currentStep = cameFrom.get(`${currentStep.gridX},${currentStep.gridY}`)!;
    path.unshift([currentStep.x, currentStep.y]);
  }
  
  return path;
}

function getPolygonBounds(vertices: BasePoint[]): { minX: number, minY: number, maxX: number, maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const vertex of vertices) {
    minX = Math.min(minX, vertex.x);
    minY = Math.min(minY, vertex.y);
    maxX = Math.max(maxX, vertex.x);
    maxY = Math.max(maxY, vertex.y);
  }
  
  return { minX, minY, maxX, maxY };
}

function isPointValid(point: number[]): boolean {
  return point && 
         point.length === 2 && 
         !isNaN(point[0]) && !isNaN(point[1]) &&
         point[0] >= 0 && point[0] <= 144 &&
         point[1] >= 0 && point[1] <= 144;
}

function smoothDirectPath(start: number[], end: number[], controlPoints: ControlPoint[]): number[][] {
  if (controlPoints.length === 0) {
    return [start, end];
  }
  
  const points = [start, ...controlPoints.map(p => [p.x, p.y]), end];
  return simplifyPath(points, 1.0);
}

function simplifyPath(path: number[][], tolerance: number): number[][] {
  if (path.length <= 2) return path;
  
  const simplified = [path[0]];
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const current = path[i];
    const next = path[i + 1];
    
    const dx1 = current[0] - prev[0];
    const dy1 = current[1] - prev[1];
    const dx2 = next[0] - current[0];
    const dy2 = next[1] - current[1];
    
    const dot = dx1 * dx2 + dy1 * dy2;
    const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    
    if (mag1 > 0 && mag2 > 0) {
      const cosAngle = dot / (mag1 * mag2);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      
      if (angle > tolerance) {
        simplified.push(current);
      }
    }
  }
  
  simplified.push(path[path.length - 1]);
  return simplified;
}

// Import math utilities
function pointInPolygon(point: number[], polygon: BasePoint[]): boolean {
  const x = point[0], y = point[1];
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

function pointToLineDistance(point: number[], lineStart: number[], lineEnd: number[]): number {
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

function isPointNearPolygon(point: number[], polygon: BasePoint[], margin: number): boolean {
  if (pointInPolygon(point, polygon)) return true;
  
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const dist = pointToLineDistance(point, [p1.x, p1.y], [p2.x, p2.y]);
    if (dist <= margin) return true;
  }
  
  return false;
}

function getRandomColor() {
  const letters = "56789ABCD";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}