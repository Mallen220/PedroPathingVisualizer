
import { describe, it, expect } from "vitest";
import { generateGhostPaths } from "../utils/animation";
import type { Point, Line } from "../types";

describe("generateGhostPaths", () => {
    const startPoint: Point = { x: 0, y: 0, heading: "constant", degrees: 0 };
    const lines: Line[] = [
        {
            id: "line1",
            endPoint: { x: 10, y: 0, heading: "constant", degrees: 0 },
            controlPoints: [],
            color: "red"
        }
    ];

    it("should generate ghost paths", () => {
        const layers = generateGhostPaths(startPoint, lines, 10, 10, 2);
        // Path length is 10. Spacing is 2.
        // We expect approx 5 layers.
        expect(layers.length).toBeGreaterThanOrEqual(4);
        expect(layers.length).toBeLessThanOrEqual(6);
    });

    it("should include corners in each layer", () => {
        const layers = generateGhostPaths(startPoint, lines, 10, 10, 2);
        expect(layers[0].corners).toBeDefined();
        expect(layers[0].corners.length).toBe(4);
    });

    it("should respect spacing", () => {
        const layers = generateGhostPaths(startPoint, lines, 10, 10, 1);
        // Spacing 1 should give approx 10 layers
        expect(layers.length).toBeGreaterThanOrEqual(9);
    });
});
