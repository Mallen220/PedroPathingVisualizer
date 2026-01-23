
import { describe, it, expect, vi, beforeEach } from "vitest";
import { validatePath } from "../utils/validation";
import type {
  Line,
  Point,
  SequenceItem,
  Settings,
  Shape,
  CollisionMarker,
  SequenceMacroItem,
  SequencePathItem
} from "../types";

// Hoist mocks to be accessible inside vi.mock factory
const mocks = vi.hoisted(() => ({
  getCollisions: vi.fn(() => [] as CollisionMarker[]),
  collisionMarkersSet: vi.fn(),
  notificationSet: vi.fn(),
}));

// Mock PathOptimizer as a class
vi.mock("../utils/pathOptimizer", () => {
  return {
    PathOptimizer: class {
      constructor() {}
      getCollisions() {
        return mocks.getCollisions();
      }
    },
  };
});

// Mock stores
vi.mock("../stores", () => ({
  collisionMarkers: {
    set: mocks.collisionMarkersSet,
  },
  notification: {
    set: mocks.notificationSet,
  },
}));

describe("Macro Validation", () => {
  const dummySettings = {} as Settings;
  const dummyShapes = [] as Shape[];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCollisions.mockReturnValue([]);
  });

  it("should fail validation if lines array order does not match execution order", () => {
    // Scenario: Start -> Line 1 -> Macro (Line M1) -> Line 2
    // But lines array is [Line 1, Line 2, Line M1]

    const startPoint: Point = { x: 0, y: 0, heading: "constant", degrees: 0 };

    // Line 1: (0,0) -> (10,0)
    const line1: Line = {
      id: "L1",
      endPoint: { x: 10, y: 0, heading: "constant", degrees: 0 },
      controlPoints: [],
      color: "black"
    };

    // Macro Line M1: (10,0) -> (20,0)
    // Note: In reality, macro lines have IDs like macro-XXX-YYY
    const lineM1: Line = {
      id: "M1",
      endPoint: { x: 20, y: 0, heading: "constant", degrees: 0 },
      controlPoints: [],
      color: "red",
      isMacroElement: true,
      macroId: "macro1"
    };

    // Line 2: (20,0) -> (30,0)
    const line2: Line = {
      id: "L2",
      endPoint: { x: 30, y: 0, heading: "constant", degrees: 0 },
      controlPoints: [],
      color: "black"
    };

    // The lines array order as produced by regenerateProjectMacros: User lines first, then macro lines
    const lines = [line1, line2, lineM1];

    // The sequence defines the execution order
    const sequence: SequenceItem[] = [
      { kind: "path", lineId: "L1" } as SequencePathItem,
      {
        kind: "macro",
        id: "macro1",
        filePath: "macro.json",
        name: "MyMacro",
        sequence: [
            { kind: "path", lineId: "M1" } as SequencePathItem
        ]
      } as SequenceMacroItem,
      { kind: "path", lineId: "L2" } as SequencePathItem
    ];

    // Execution path:
    // Start (0,0) -> L1 end (10,0)
    // L1 end (10,0) -> M1 end (20,0)
    // M1 end (20,0) -> L2 end (30,0)
    // All segments have length 10.

    // However, validatePath iterates lines array:
    // 1. L1: Start (0,0) -> L1 end (10,0). Dist = 10. OK.
    // 2. L2: L1 end (10,0) -> L2 end (30,0). Dist = 20. OK (not zero-length).
    // 3. M1: L2 end (30,0) -> M1 end (20,0). Dist = 10. OK.

    // Wait, this specific case passes because no distance is zero.
    // I need to construct a case where the incorrect order causes a zero-length detection.

    // Case causing false positive zero-length:
    // Suppose Line 2 starts exactly where Line 1 ends.
    // i.e. The macro moves the robot back to where it started or doesn't move it?
    // No.

    // If validatePath checks L2 immediately after L1.
    // L1 ends at (10,0).
    // If L2 *also* ends at (10,0) (zero length relative to L1 end), it would flag.
    // But L2 is supposed to start after M1.
    // M1 moves from (10,0) to (20,0).
    // L2 moves from (20,0) to (20,0) -> This would be a true zero-length line.

    // Let's try to make a false positive.
    // We need dist < 0.001
    // currentStart = line[i-1].endPoint
    // line[i].endPoint

    // We iterate [L1, L2, M1]
    // 1. L1. Start=StartPoint. Dist(StartPoint, L1.end). Update Start=L1.end
    // 2. L2. Start=L1.end. Dist(L1.end, L2.end). Update Start=L2.end
    // 3. M1. Start=L2.end. Dist(L2.end, M1.end). Update Start=M1.end

    // If L1.end == L2.end, then step 2 sees distance 0.
    // But L2 is NOT supposed to follow L1. It follows M1.
    // M1 moves the robot.
    // So if L2 ends at same point as L1, but M1 moves robot there? No.

    // If L2 ends at (10,0). L1 ends at (10,0).
    // But in reality, L2 starts at M1.end.
    // If M1 goes (10,0) -> (20,0).
    // And L2 goes (20,0) -> (10,0).
    // L2 is valid (length 10).

    // But validatePath sees:
    // L1 ends at (10,0).
    // L2 ends at (10,0).
    // Dist is 0.
    // So it flags L2 as zero-length.

    // Constructing this case:
    // L1: (0,0) -> (10,0)
    // M1: (10,0) -> (20,0)
    // L2: (20,0) -> (10,0)

    // lines = [L1, L2, M1]
    // 1. L1: (0,0) -> (10,0). Dist 10.
    // 2. L2: (10,0) -> (10,0). Dist 0 -> ERROR!
    // 3. M1: (10,0) -> (20,0). Dist 10.

    // But execution is:
    // L1: (0,0) -> (10,0). Dist 10.
    // M1: (10,0) -> (20,0). Dist 10.
    // L2: (20,0) -> (10,0). Dist 10.
    // No zero-length lines in reality!

    const line2_buggy: Line = {
      id: "L2_buggy",
      endPoint: { x: 10, y: 0, heading: "constant", degrees: 0 }, // Back to 10,0
      controlPoints: [],
      color: "black"
    };

    const lines_buggy = [line1, line2_buggy, lineM1];

    const sequence_buggy: SequenceItem[] = [
      { kind: "path", lineId: "L1" } as SequencePathItem,
      {
        kind: "macro",
        id: "macro1",
        filePath: "macro.json",
        name: "MyMacro",
        sequence: [
            { kind: "path", lineId: "M1" } as SequencePathItem
        ]
      } as SequenceMacroItem,
      { kind: "path", lineId: "L2_buggy" } as SequencePathItem
    ];

    validatePath(startPoint, lines_buggy, dummySettings, sequence_buggy, dummyShapes);

    // Should NOT have zero-length error
    expect(mocks.collisionMarkersSet).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ type: "zero-length" })])
    );
  });
});
