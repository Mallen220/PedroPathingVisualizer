// src/utils/pathOptimizer.ts
import _ from "lodash";
import type {
  Line,
  Point,
  SequenceItem,
  Settings,
  Shape,
  TimelineEvent,
} from "../types";
import { calculatePathTime } from "./timeCalculator";
import { FIELD_SIZE } from "../config";
import { calculateRobotState } from "./animation";
import { pointInPolygon, getRobotCorners } from "./geometry";

export interface OptimizationResult {
  generation: number;
  bestTime: number;
  bestLines: Line[];
}

export class PathOptimizer {
  private populationSize: number;
  private generations: number;
  private mutationRate: number;
  private mutationStrength: number; // Max inches to move a point

  private startPoint: Point;
  private originalLines: Line[];
  private settings: Settings;
  private sequence: SequenceItem[];
  private shapes: Shape[];

  constructor(
    startPoint: Point,
    lines: Line[],
    settings: Settings,
    sequence: SequenceItem[],
    shapes: Shape[] = [],
  ) {
    this.startPoint = _.cloneDeep(startPoint);
    this.originalLines = _.cloneDeep(lines);
    this.settings = settings;
    this.sequence = sequence;
    this.shapes = shapes;
    // Use settings values if provided, else defaults
    this.generations = settings.optimizationIterations ?? 100;
    this.populationSize = settings.optimizationPopulationSize ?? 50;
    this.mutationRate = settings.optimizationMutationRate ?? 0.4;
    this.mutationStrength = settings.optimizationMutationStrength ?? 6.0;
  }

  // Generate a mutated version of the lines
  private mutate(lines: Line[]): Line[] {
    const newLines = _.cloneDeep(lines);
    const MIN_DIST = 10; // Minimum distance in inches for control points

    let prevPoint = this.startPoint;

    newLines.forEach((line) => {
      // Don't mutate locked lines
      if (line.locked) {
        prevPoint = line.endPoint;
        return;
      }

      // Mutate control points
      line.controlPoints.forEach((cp) => {
        if (Math.random() < this.mutationRate) {
          cp.x += (Math.random() - 0.5) * this.mutationStrength;
          cp.y += (Math.random() - 0.5) * this.mutationStrength;

          // Clamp to field bounds
          cp.x = Math.max(0, Math.min(FIELD_SIZE, cp.x));
          cp.y = Math.max(0, Math.min(FIELD_SIZE, cp.y));
        }
      });

      // Enforce minimum distance constraints
      if (line.controlPoints.length > 0) {
        // 1. Check first control point vs prevPoint (start of line)
        const firstCP = line.controlPoints[0];
        let dx = firstCP.x - prevPoint.x;
        let dy = firstCP.y - prevPoint.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MIN_DIST) {
          if (dist < 0.0001) {
            firstCP.x += MIN_DIST;
          } else {
            const scale = MIN_DIST / dist;
            firstCP.x = prevPoint.x + dx * scale;
            firstCP.y = prevPoint.y + dy * scale;
          }
        }

        // 2. Check last control point vs endPoint (end of line)
        const lastCP = line.controlPoints[line.controlPoints.length - 1];
        dx = lastCP.x - line.endPoint.x;
        dy = lastCP.y - line.endPoint.y;
        dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MIN_DIST) {
          if (dist < 0.0001) {
            // If identical, move it away (e.g. towards start? or just +x)
            // Just shifting X is safe enough to create distance
            lastCP.x -= MIN_DIST;
          } else {
            const scale = MIN_DIST / dist;
            lastCP.x = line.endPoint.x + dx * scale;
            lastCP.y = line.endPoint.y + dy * scale;
          }
        }
      }

      prevPoint = line.endPoint;
    });

    return newLines;
  }

  private checkCollision(timeline: TimelineEvent[], lines: Line[]): boolean {
    if (!this.shapes || this.shapes.length === 0) return false;

    // Filter out shapes with fewer than 3 vertices
    const activeShapes = this.shapes.filter((s) => s.vertices.length >= 3);
    if (activeShapes.length === 0) return false;

    const totalTime = timeline[timeline.length - 1].endTime;
    const step = 0.2; // Check every 0.2 seconds for performance
    const identityScale: any = (x: number) => x;

    for (let t = 0; t <= totalTime; t += step) {
      const percent = (t / totalTime) * 100;
      const state = calculateRobotState(
        percent,
        timeline,
        lines,
        this.startPoint,
        identityScale,
        identityScale,
      );

      const corners = getRobotCorners(
        state.x,
        state.y,
        state.heading,
        this.settings.rWidth,
        this.settings.rHeight,
      );

      for (const shape of activeShapes) {
        // Check if any robot corner is in shape
        for (const corner of corners) {
          if (pointInPolygon([corner.x, corner.y], shape.vertices)) return true;
        }

        // Also check if any shape vertex is inside the robot (for cases where obstacle is smaller than robot)
        for (const v of shape.vertices) {
          if (pointInPolygon([v.x, v.y], corners)) return true;
        }
      }
    }
    return false;
  }

  private calculateFitness(lines: Line[]): number {
    const result = calculatePathTime(
      this.startPoint,
      lines,
      this.settings,
      this.sequence,
    );

    // Penalize collisions heavily
    if (this.checkCollision(result.timeline, lines)) {
      return Infinity;
    }

    return result.totalTime;
  }

  public async optimize(
    onUpdate: (result: OptimizationResult) => void,
  ): Promise<Line[]> {
    // Initialize population
    let population: { lines: Line[]; time: number }[] = [];

    // Add original as the first candidate (Elitism)
    population.push({
      lines: this.originalLines,
      time: this.calculateFitness(this.originalLines),
    });

    // Fill rest of population
    for (let i = 1; i < this.populationSize; i++) {
      const mutated = this.mutate(this.originalLines);
      population.push({
        lines: mutated,
        time: this.calculateFitness(mutated),
      });
    }

    let lastYieldTime = performance.now();

    // Run generations
    for (let gen = 0; gen < this.generations; gen++) {
      // Sort by time (lowest first)
      population.sort((a, b) => a.time - b.time);

      // Report progress
      onUpdate({
        generation: gen + 1,
        bestTime: population[0].time,
        bestLines: population[0].lines,
      });

      // Allow UI to update - throttle to keep UI responsive without killing performance
      // Yield every 15ms or so (approx 60fps) to let the main thread breathe,
      // instead of every generation which is too aggressive.
      const now = performance.now();
      if (now - lastYieldTime > 15) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        lastYieldTime = performance.now();
      }

      // Create next generation
      const nextGen: { lines: Line[]; time: number }[] = [];

      // Keep top 20% (Elitism)
      const eliteCount = Math.floor(this.populationSize * 0.2);
      nextGen.push(...population.slice(0, eliteCount));

      // Fill the rest by mutating the top 50%
      const parentPool = population.slice(
        0,
        Math.floor(this.populationSize * 0.5),
      );

      // If all parents have infinite time (all colliding), we might be stuck.
      // In that case, we should probably allow high mutations or keep trying.
      // But genetic algorithm usually finds a way if at least one valid path exists.
      // If parentPool is empty or all invalid, we continue mutating anyway.

      while (nextGen.length < this.populationSize) {
        let parent = parentPool[0]; // Default to best
        if (parentPool.length > 0) {
          parent = parentPool[Math.floor(Math.random() * parentPool.length)];
        }

        const childLines = this.mutate(parent.lines);
        nextGen.push({
          lines: childLines,
          time: this.calculateFitness(childLines),
        });
      }

      population = nextGen;
    }

    // Return best path
    population.sort((a, b) => a.time - b.time);
    return population[0].lines;
  }
}
