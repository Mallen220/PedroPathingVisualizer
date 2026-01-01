/*
 * Copyright 2026 Matthew Allen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect } from "vitest";

import { createRequire } from "module";
import { existsSync } from "fs";
import path from "path";

const fastCheckInstalled = existsSync(
  path.join(process.cwd(), "node_modules", "fast-check"),
);
const require = createRequire(import.meta.url);
let fc: any;
if (!fastCheckInstalled) {
  describe("Geometry Utils Property Tests (skipped)", () => {
    it("skipped because fast-check is not installed", () => {
      expect(true).toBe(true);
    });
  });
} else {
  fc = require("fast-check");
}

import { pointToLineDistance } from "../../utils/geometry";
import { pointArbitrary } from "../generators";

if (fc) {
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
}
