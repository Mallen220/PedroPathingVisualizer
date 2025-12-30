import * as fc from "fast-check";
import type { Point, Line, BasePoint, ControlPoint } from "../types";

// Generate a valid finite number within a reasonable range to avoid extreme float precision issues
// FTC field is 144 inches. We test up to 100,000 to cover zooms/pans/edge cases without hitting e+30.
export const validNumber = fc.float({
  min: -100000,
  max: 100000,
  noNaN: true,
  noDefaultInfinity: true,
});

// Common properties for all points
const basePointProps = {
  x: validNumber,
  y: validNumber,
  locked: fc.option(fc.boolean(), { nil: undefined }),
};

// Generate a BasePoint (used for ControlPoints)
export const basePointArbitrary: fc.Arbitrary<BasePoint> =
  fc.record(basePointProps);

// Generate a Point (Union type based on heading)
export const pointArbitrary: fc.Arbitrary<Point> = fc.oneof(
  // Linear heading
  fc.record({
    ...basePointProps,
    heading: fc.constant("linear"),
    startDeg: fc.float({ min: -180, max: 180 }),
    endDeg: fc.float({ min: -180, max: 180 }),
    degrees: fc.constant(undefined),
    reverse: fc.constant(undefined),
  }),
  // Constant heading
  fc.record({
    ...basePointProps,
    heading: fc.constant("constant"),
    degrees: fc.float({ min: -180, max: 180 }),
    startDeg: fc.constant(undefined),
    endDeg: fc.constant(undefined),
    reverse: fc.constant(undefined),
  }),
  // Tangential heading
  fc.record({
    ...basePointProps,
    heading: fc.constant("tangential"),
    reverse: fc.boolean(),
    degrees: fc.constant(undefined),
    startDeg: fc.constant(undefined),
    endDeg: fc.constant(undefined),
  }),
) as fc.Arbitrary<Point>;

// Generate a ControlPoint (alias for BasePoint)
export const controlPointArbitrary: fc.Arbitrary<ControlPoint> =
  basePointArbitrary;

// Custom hex color generator
const hexColorArbitrary = fc
  .string({ minLength: 6, maxLength: 6 })
  .map((s) => "#" + s);

// Generate a Line
export const lineArbitrary: fc.Arbitrary<Line> = fc.record({
  id: fc.option(fc.uuid(), { nil: undefined }),
  endPoint: pointArbitrary,
  controlPoints: fc.array(controlPointArbitrary, {
    minLength: 0,
    maxLength: 2,
  }),
  color: hexColorArbitrary,
  name: fc.option(fc.string(), { nil: undefined }),
  locked: fc.option(fc.boolean(), { nil: undefined }),
});
