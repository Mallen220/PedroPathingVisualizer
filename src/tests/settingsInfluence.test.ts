// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { describe, it, expect } from "vitest";
import { calculatePathTime, analyzePathSegment } from "../utils/timeCalculator";
import type { Point, Line, Settings } from "../types";

describe("Settings Influence on Path Time", () => {
  const defaultSettings: Settings = {
    xVelocity: 10,
    yVelocity: 10,
    aVelocity: Math.PI, // 180 degrees/sec
    maxVelocity: 20,
    maxAcceleration: 10,
    maxDeceleration: 10,
    fieldMap: "decode.webp",
    kFriction: 0.5,
    rLength: 18,
    rWidth: 18,
    safetyMargin: 1,
    theme: "auto",
  };

  // A curved path: Start (0,0) -> Quadratic Bezier to (40, 40) via (40, 0).
  // This creates a turn.
  const startPoint: Point = {
    x: 0,
    y: 0,
    heading: "constant",
    degrees: 0,
  };

  const lines: Line[] = [
    {
      id: "curve1",
      endPoint: {
        x: 40,
        y: 40,
        heading: "tangential",
        reverse: false,
      },
      controlPoints: [{ x: 40, y: 0 }],
      color: "#fff",
    },
  ];

  it("changing aVelocity affects time (Rotation Limit)", () => {
    // High acceleration so we reach high speeds
    const specificSettings = {
        ...defaultSettings,
        maxVelocity: 200,
        maxAcceleration: 100, // Increased
        maxDeceleration: 100, // Increased
        kFriction: 5.0,
        aVelocity: 1.0 // Lower aVelocity to make it the bottleneck (Limit = 1.0 * 28 = 28 in/s)
    };
    // Peak reachable speed with Acc=100, Dist=65 is ~80 in/s.
    // So 28 in/s limit should be hit.

    const baseTime = calculatePathTime(startPoint, lines, specificSettings).totalTime;

    // Increase aVelocity -> Faster
    const fastSettings = { ...specificSettings, aVelocity: 2.0 };
    const fastTime = calculatePathTime(startPoint, lines, fastSettings).totalTime;
    expect(fastTime).toBeLessThan(baseTime);

    // Decrease aVelocity -> Slower
    const slowSettings = { ...specificSettings, aVelocity: 0.5 };
    const slowTime = calculatePathTime(startPoint, lines, slowSettings).totalTime;
    expect(slowTime).toBeGreaterThan(baseTime);
  });

  it("changing maxVelocity affects time", () => {
    const baseTime = calculatePathTime(startPoint, lines, defaultSettings).totalTime;

    // Decrease maxVelocity -> Slower
    const slowSettings = { ...defaultSettings, maxVelocity: 10 };
    const slowTime = calculatePathTime(startPoint, lines, slowSettings).totalTime;
    expect(slowTime).toBeGreaterThan(baseTime);

    // Increase maxVelocity -> Faster (or same if accel limited)
    const fastSettings = { ...defaultSettings, maxVelocity: 40 };
    const fastTime = calculatePathTime(startPoint, lines, fastSettings).totalTime;
    // Note: It might be the same if acceleration or friction limits it, but usually for this path it should be faster or same.
    expect(fastTime).toBeLessThanOrEqual(baseTime);
  });

  it("changing maxAcceleration affects time", () => {
    const baseTime = calculatePathTime(startPoint, lines, defaultSettings).totalTime;

    // Decrease maxAcceleration -> Slower
    const slowSettings = { ...defaultSettings, maxAcceleration: 2 };
    const slowTime = calculatePathTime(startPoint, lines, slowSettings).totalTime;
    expect(slowTime).toBeGreaterThan(baseTime);
  });

  it("changing maxDeceleration affects time", () => {
    const baseTime = calculatePathTime(startPoint, lines, defaultSettings).totalTime;

    // Decrease maxDeceleration -> Slower
    const slowSettings = { ...defaultSettings, maxDeceleration: 2 };
    const slowTime = calculatePathTime(startPoint, lines, slowSettings).totalTime;
    expect(slowTime).toBeGreaterThan(baseTime);
  });

  it("changing kFriction affects time (Cornering Speed)", () => {
    // High acceleration
    const specificSettings = {
        ...defaultSettings,
        maxVelocity: 200,
        maxAcceleration: 100,
        maxDeceleration: 100,
        aVelocity: 100,
        kFriction: 0.1 // Limit = 33 in/s (from debug log)
    };
    // Peak reachable ~80 in/s. Limit 33 should be hit.

    const baseTime = calculatePathTime(startPoint, lines, specificSettings).totalTime;

    // Decrease kFriction -> Slower (must take corner slower)
    const slipperySettings = { ...specificSettings, kFriction: 0.05 }; // Limit will be lower
    const slipperyTime = calculatePathTime(startPoint, lines, slipperySettings).totalTime;
    expect(slipperyTime).toBeGreaterThan(baseTime);

    // Increase kFriction -> Faster (can corner faster)
    const grippySettings = { ...specificSettings, kFriction: 0.5 }; // Limit 73
    const grippyTime = calculatePathTime(startPoint, lines, grippySettings).totalTime;
    expect(grippyTime).toBeLessThan(baseTime);
  });

  it("changing xVelocity and yVelocity affects time when Motion Profile is disabled", () => {
    // Force useMotionProfile = false by removing maxVelocity/maxAcceleration
    // We cast to any to bypass type check for this specific test case
    const noProfileSettings = { ...defaultSettings } as any;
    delete noProfileSettings.maxVelocity;
    delete noProfileSettings.maxAcceleration;

    const baseTime = calculatePathTime(startPoint, lines, noProfileSettings).totalTime;

    // Decrease velocities
    const slowSettings = { ...noProfileSettings, xVelocity: 5, yVelocity: 5 };
    const slowTime = calculatePathTime(startPoint, lines, slowSettings).totalTime;
    expect(slowTime).toBeGreaterThan(baseTime);
  });

  describe("In-Place Rotation", () => {
    // Scenario: Start Heading 0. Line requires Start Heading 180.
    const startPointHeading0: Point = {
        x: 0,
        y: 0,
        heading: "constant",
        degrees: 0,
    };

    // A line that goes straight up, requiring 180 degree heading (turn around)
    const lineTurnAround: Line[] = [
        {
            id: "lineTurn",
            endPoint: { x: 0, y: -10, heading: "constant", degrees: 180 },
            controlPoints: [],
            color: "#fff",
        }
    ];

    // Use settings that ensure we are velocity limited
    const rotationSettings = {
        ...defaultSettings,
        maxAcceleration: 100, // Very high accel
        maxDeceleration: 100,
        aVelocity: 1.0, // Low velocity limit (1 rad/s)
    };

    it("changing aVelocity affects rotation time", () => {
        const baseTime = calculatePathTime(startPointHeading0, lineTurnAround, rotationSettings).totalTime;
        // Total Time should be dominated by rotation.
        // Rotation is 3.14 rad. Vel = 1.0. Time approx 3.14s. (plus accel/decel)

        // Increase aVelocity -> Faster rotation
        const fastSettings = { ...rotationSettings, aVelocity: 2.0 };
        const fastTime = calculatePathTime(startPointHeading0, lineTurnAround, fastSettings).totalTime;
        expect(fastTime).toBeLessThan(baseTime);

        // Decrease aVelocity -> Slower rotation
        const slowSettings = { ...rotationSettings, aVelocity: 0.5 };
        const slowTime = calculatePathTime(startPointHeading0, lineTurnAround, slowSettings).totalTime;
        expect(slowTime).toBeGreaterThan(baseTime);
    });

    it("changing maxAcceleration affects rotation time", () => {
        const baseTime = calculatePathTime(startPointHeading0, lineTurnAround, defaultSettings).totalTime;

        // Decrease maxAcceleration -> Slower rotation (takes longer to spin up)
        const slowSettings = { ...defaultSettings, maxAcceleration: 2 };
        const slowTime = calculatePathTime(startPointHeading0, lineTurnAround, slowSettings).totalTime;
        expect(slowTime).toBeGreaterThan(baseTime);
    });

    it("changing maxDeceleration affects rotation time", () => {
        const baseTime = calculatePathTime(startPointHeading0, lineTurnAround, defaultSettings).totalTime;

        // Decrease maxDeceleration -> Slower rotation (takes longer to spin down)
        const slowSettings = { ...defaultSettings, maxDeceleration: 2 };
        const slowTime = calculatePathTime(startPointHeading0, lineTurnAround, slowSettings).totalTime;
        expect(slowTime).toBeGreaterThan(baseTime);
    });
  });
});
