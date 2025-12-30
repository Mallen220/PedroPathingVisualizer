import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { pointToLineDistance } from "../../utils/geometry";
import { pointArbitrary } from "../generators";

describe("Geometry Utils Property Tests", () => {
  it("pointToLineDistance should be non-negative", () => {
    fc.assert(
      fc.property(
        pointArbitrary,
        pointArbitrary,
        pointArbitrary,
        (p, l1, l2) => {
          const dist = pointToLineDistance(
            [p.x, p.y],
            [l1.x, l1.y],
            [l2.x, l2.y],
          );
          return dist >= 0;
        },
      ),
    );
  });

  it("pointToLineDistance should be symmetric w.r.t line direction", () => {
    fc.assert(
      fc.property(
        pointArbitrary,
        pointArbitrary,
        pointArbitrary,
        (p, l1, l2) => {
          const dist1 = pointToLineDistance(
            [p.x, p.y],
            [l1.x, l1.y],
            [l2.x, l2.y],
          );
          const dist2 = pointToLineDistance(
            [p.x, p.y],
            [l2.x, l2.y],
            [l1.x, l1.y],
          );
          expect(dist1).toBeCloseTo(dist2);
        },
      ),
    );
  });

  it("pointToLineDistance should be zero if point is one of the line endpoints", () => {
    fc.assert(
      fc.property(pointArbitrary, pointArbitrary, (l1, l2) => {
        const dist = pointToLineDistance(
          [l1.x, l1.y],
          [l1.x, l1.y],
          [l2.x, l2.y],
        );
        expect(dist).toBeCloseTo(0);
      }),
    );
  });
});
