
import { describe, it, expect } from "vitest";
import { PathOptimizer } from "../utils/pathOptimizer";
import { CollisionMarker, Line, Point, SequenceItem, Settings, Shape } from "../types";

describe("PathOptimizer Macro Bug Reproduction", () => {
  it("should correctly identify prevPoint based on sequence, not line index", () => {
    // 1. Setup Lines: A, B, C
    // A: (0,0) -> (10,0)
    // B: (0,50) -> (10,50)  <-- 'B' is far away
    // C: (20,0) -> (30,0)   <-- 'C' follows 'A' spatially

    // Path A -> C is safe (y=0).
    // Path B -> C goes from (10,50) to (20,0). Crosses y=25.

    const startPoint: Point = {
      x: 0,
      y: 0,
      heading: "constant",
      degrees: 0,
    };

    const lineA: Line = {
      id: "lineA",
      endPoint: { x: 10, y: 0, heading: "constant", degrees: 0 },
      controlPoints: [],
      color: "red"
    };

    const lineB: Line = {
      id: "lineB",
      endPoint: { x: 10, y: 50, heading: "constant", degrees: 0 },
      controlPoints: [],
      color: "blue"
    };

    const lineC: Line = {
      id: "lineC",
      endPoint: { x: 30, y: 0, heading: "constant", degrees: 0 }, // Starts from 20 implicitly if connected to A? No, lines are just segments.
      // Wait, standard lines don't have start points. They start from prev point.
      // So 'C' ending at (30,0).
      // If comes from A (10,0), it goes (10,0) -> (30,0).
      // If comes from B (10,50), it goes (10,50) -> (30,0).
      controlPoints: [],
      color: "green"
    };

    const lines = [lineA, lineB, lineC];

    // 2. Setup Sequence: A -> C (Skipping B)
    const sequence: SequenceItem[] = [
      { kind: "path", lineId: "lineA" },
      { kind: "path", lineId: "lineC" }
    ];

    // 3. Setup Obstacle at y=25, x=20.
    // Path B->C is (10,50)->(30,0). Midpoint is (20,25).
    // This blocks the path from B to C.
    // But does NOT block A to C (which is at y=0).
    const shapes: Shape[] = [
      {
        id: "obstacle",
        vertices: [
          { x: 18, y: 20 },
          { x: 22, y: 20 },
          { x: 22, y: 30 },
          { x: 18, y: 30 }
        ],
        color: "black",
        fillColor: "black",
        type: "obstacle"
      }
    ];

    const settings: Settings = {
      xVelocity: 10,
      yVelocity: 10,
      aVelocity: 10,
      kFriction: 0,
      rLength: 2,
      rWidth: 2,
      safetyMargin: 0,
      maxVelocity: 10,
      maxAcceleration: 10,
      fieldMap: "",
      theme: "light",
      validateFieldBoundaries: false
    };

    const optimizer = new PathOptimizer(
        startPoint,
        lines,
        settings,
        sequence,
        shapes
    );

    // Get collisions
    const collisions = optimizer.getCollisions();

    // If bug exists, it thinks path is B->C and hits obstacle.
    // If fixed, it knows path is A->C and is clear.

    // We expect NO collisions.
    const obstacleCollisions = collisions.filter(c => c.type === "obstacle");
    expect(obstacleCollisions.length).toBe(0);
  });
});
