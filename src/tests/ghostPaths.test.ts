
import { describe, it, expect } from "vitest";
import { generateGhostPaths } from "../utils/animation";
import type { Point, Line, TimelineEvent } from "../types";

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

    it("should fallback to geometric logic if timeline is missing", () => {
        const layers = generateGhostPaths(undefined, lines, startPoint, 10, 10, 2, 4);
        // Path length is 10. Spacing is 2.
        // We expect approx 5 layers.
        expect(layers.length).toBeGreaterThanOrEqual(4);
        expect(layers.length).toBeLessThanOrEqual(6);
    });

    it("should use timeline if provided (stationary rotation)", () => {
        // Construct a timeline with a stationary rotation
        const timeline: TimelineEvent[] = [
            {
                type: "wait",
                startTime: 0,
                endTime: 1, // 1 second duration
                duration: 1,
                atPoint: { x: 0, y: 0 },
                startHeading: 0,
                targetHeading: 90, // Rotate 90 degrees
                waitId: "wait1"
            }
        ];

        // Angle spacing is 4 degrees. 90 degrees rotation should generate ~22 layers.
        // Plus start and end points.
        const layers = generateGhostPaths(timeline, lines, startPoint, 10, 10, 2, 4);

        expect(layers.length).toBeGreaterThan(15);
        expect(layers[0].x).toBe(0);
        expect(layers[0].y).toBe(0);

        // Verify heading change
        const firstHeading = layers[0].heading;
        const lastHeading = layers[layers.length - 1].heading;
        expect(Math.abs(lastHeading - firstHeading)).toBeGreaterThan(80);
    });

    it("should capture movement from timeline", () => {
        const timeline: TimelineEvent[] = [
            {
                type: "travel",
                startTime: 0,
                endTime: 1,
                duration: 1,
                lineIndex: 0,
                // Simple linear motion profile for testing
                motionProfile: [0, 1], // at start t=0, at end t=1
                headingProfile: [0, 0]
            }
        ];

        // Path is 10 inches long. Spacing 2 inches.
        const layers = generateGhostPaths(timeline, lines, startPoint, 10, 10, 2, 4);
        expect(layers.length).toBeGreaterThanOrEqual(4);
    });
});
