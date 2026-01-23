
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
    const lineM1: Line = {
      id: "M1",
      endPoint: { x: 20, y: 0, heading: "constant", degrees: 0 },
      controlPoints: [],
      color: "red",
      isMacroElement: true,
      macroId: "macro1"
    };

    // Line 2 buggy: ends at same point as L1 (10,0).
    // If evaluated immediately after L1, it would be zero-length.
    const line2_buggy: Line = {
      id: "L2_buggy",
      endPoint: { x: 10, y: 0, heading: "constant", degrees: 0 }, // Back to 10,0
      controlPoints: [],
      color: "black"
    };

    // Lines array in "storage" order (or arbitrary order)
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

    // Should NOT have zero-length error because logic should follow sequence:
    // L1: 0->10 (Dist 10)
    // M1: 10->20 (Dist 10)
    // L2: 20->10 (Dist 10)
    expect(mocks.collisionMarkersSet).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ type: "zero-length" })])
    );
  });

  it("should ignore fake lines that are not in the sequence", () => {
    const startPoint: Point = { x: 0, y: 0, heading: "constant", degrees: 0 };

    // Real Line: (0,0) -> (10,0)
    const line1: Line = {
      id: "L1",
      endPoint: { x: 10, y: 0, heading: "constant", degrees: 0 },
      controlPoints: [],
      color: "black"
    };

    // Fake Line (Zero Length): Ends at (10,0) which is where L1 ends.
    // If checked after L1, it would be zero length.
    const fakeLine: Line = {
      id: "Fake",
      endPoint: { x: 10, y: 0, heading: "constant", degrees: 0 },
      controlPoints: [],
      color: "gray"
    };

    const lines = [line1, fakeLine];
    const sequence: SequenceItem[] = [
      { kind: "path", lineId: "L1" } as SequencePathItem
    ];

    validatePath(startPoint, lines, dummySettings, sequence, dummyShapes);

    // Should NOT report zero-length for the fake line
    expect(mocks.collisionMarkersSet).toHaveBeenCalledWith(
        expect.not.arrayContaining([expect.objectContaining({ type: "zero-length" })])
    );
  });
});
