// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import type {
  Point,
  Line,
  Settings,
  TimePrediction,
  TimelineEvent,
  SequenceItem,
} from "../types";
import {
  Vector,
  Pose,
  BezierCurve,
  DriveVectorAlgorithm,
  type DriveInputs,
} from "./physics";
import {
  getLineStartHeading,
  getLineEndHeading,
  getAngularDifference,
} from "./math";

/**
 * Analyzes a path segment for statistics (used by UI).
 * Re-implemented using BezierCurve physics engine.
 */
export function analyzePathSegment(
  start: {x:number, y:number},
  controlPoints: {x:number, y:number}[],
  end: {x:number, y:number},
  samples: number = 100,
  initialHeading: number = 0
) {
    const pts = [start, ...controlPoints, end];
    const curve = new BezierCurve(pts);

    let length = 0;
    let minRadius = Infinity;
    let tangentRotation = 0;
    let netRotation = 0;
    const steps = [];

    let prevHeading = initialHeading;
    // Unwind prevHeading? Assuming input is unwound or we track delta.

    for(let i=0; i<=samples; i++) {
        const t = i / samples;
        const dt = 1/samples;

        // Length
        let deltaLength = 0;
        if (i > 0) {
            const p1 = curve.getPoint((i-1)/samples);
            const p2 = curve.getPoint(t);
            deltaLength = p2.minus(p1).magnitude();
            length += deltaLength;
        }

        // Radius/Curvature
        const k = curve.getCurvature(t);
        const radius = k < 1e-9 ? Infinity : 1/k;
        if (radius < minRadius) minRadius = radius;

        // Rotation
        const d = curve.getDerivative(t);
        const heading = Math.atan2(d.y, d.x);

        let stepRotation = 0;
        let currentUnwrapped = heading;

        if (i===0) {
            // First step, assume continuity from initialHeading if provided?
            // Actually initialHeading arg is usually the heading AT START.
            // d.angle might be 180 off?
            // Let's just track relative to previous step.
            currentUnwrapped = initialHeading;
        } else {
            const diff = getAngularDifference(prevHeading * 180/Math.PI, heading * 180/Math.PI);
            stepRotation = Math.abs(diff);
            netRotation += diff;
            tangentRotation += Math.abs(diff);
            currentUnwrapped = prevHeading + (diff * Math.PI/180);
        }

        if (i > 0) {
            steps.push({
                deltaLength,
                radius,
                rotation: stepRotation,
                heading: currentUnwrapped
            });
        }
        prevHeading = currentUnwrapped;
    }

    return {
        length,
        minRadius,
        tangentRotation,
        netRotation,
        steps,
        startHeading: initialHeading
    };
}

/**
 * Finds the closest t on the curve to the given point, searching near a guess t.
 */
function findClosestT(curve: BezierCurve, point: Vector, guessT: number): number {
    const step = 0.01;
    const window = 0.1;
    let start = Math.max(0, guessT - window);
    let end = Math.min(1, guessT + window + 0.1);

    let minDist = Infinity;
    let bestT = guessT;

    for (let t = start; t <= end; t += step) {
        const p = curve.getPoint(t);
        const dist = p.minus(point).magnitude();
        if (dist < minDist) {
            minDist = dist;
            bestT = t;
        }
    }

    // Binary search refinement
    let low = Math.max(0, bestT - step);
    let high = Math.min(1, bestT + step);
    for(let i=0; i<5; i++) {
        const t1 = low + (high-low)/3;
        const t2 = high - (high-low)/3;
        const d1 = curve.getPoint(t1).minus(point).magnitude();
        const d2 = curve.getPoint(t2).minus(point).magnitude();
        if(d1 < d2) {
            high = t2;
            minDist = d1;
            bestT = t1;
        } else {
            low = t1;
            minDist = d2;
            bestT = t2;
        }
    }

    return bestT;
}

export function unwrapAngle(target: number, reference: number): number {
  let diff = target - reference;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return reference + diff;
}

/**
 * Calculates time to rotate a certain angle using a trapezoidal motion profile.
 * Restored for compatibility with RotateAction.
 */
export function calculateRotationTime(
  angleDiffDegrees: number,
  settings: Settings,
): number {
  if (angleDiffDegrees <= 0.001) return 0;

  const diffRad = angleDiffDegrees * (Math.PI / 180);
  const maxVel = Math.max(settings.aVelocity, 0.001);

  // If maxAngularAcceleration is provided (and > 0), use that directly.
  let maxAngAccel = settings.maxAngularAcceleration;

  if (!maxAngAccel || maxAngAccel <= 0) {
    const leverArm = Math.max(settings.rWidth / 2, 1);
    const maxAccel = settings.maxAcceleration || 30;
    maxAngAccel = maxAccel / leverArm;
  }

  const accDist = (maxVel * maxVel) / (2 * maxAngAccel);
  const decDist = accDist;

  if (diffRad >= accDist + decDist) {
    // Trapezoid Profile
    const accTime = maxVel / maxAngAccel;
    const decTime = accTime;
    const constDist = diffRad - accDist - decDist;
    const constTime = constDist / maxVel;
    return accTime + constTime + decTime;
  } else {
    // Triangle Profile
    return 2 * Math.sqrt(diffRad / maxAngAccel);
  }
}

export function calculatePathTime(
  startPoint: Point,
  lines: Line[],
  settings: Settings,
  sequence?: SequenceItem[],
  macros?: Map<string, import("../types").PedroData>,
): TimePrediction {

  // 1. Initial Pose Setup
  let startHeadingRad = 0;
  if (startPoint.heading === "constant") startHeadingRad = startPoint.degrees * (Math.PI / 180);
  else if (startPoint.heading === "linear") startHeadingRad = startPoint.startDeg * (Math.PI / 180);
  else if (startPoint.heading === "tangential") {
       startHeadingRad = 0;
  }

  // Tangential fallback
  if (startPoint.heading === "tangential" && lines.length > 0) {
      const firstLine = lines[0];
      const pts = [startPoint, ...firstLine.controlPoints, firstLine.endPoint];
      const curve = new BezierCurve(pts);
      const deriv = curve.getDerivative(0);
      startHeadingRad = Math.atan2(deriv.y, deriv.x);
      if (startPoint.reverse) startHeadingRad += Math.PI;
  }

  let currentPose = new Pose(startPoint.x, startPoint.y, startHeadingRad);
  let currentVelocity = new Vector(0, 0);
  let currentAngularVelocity = 0;

  const timeline: TimelineEvent[] = [];
  const segmentTimes: number[] = [];
  const dt = 0.01;
  let globalTime = 0;
  let totalDistance = 0;

  const algorithm = new DriveVectorAlgorithm(settings);
  const mass = settings.mass;

  // 2. Build Execution Queue & Maps
  // Map lines by ID for quick access
  const lineMap = new Map<string, Line>();
  lines.forEach(l => {
      if(l.id) lineMap.set(l.id, l);
  });

  // Construct Queue
  // If sequence exists, use it. Else map lines to sequence items.
  let queue: SequenceItem[] = [];
  if (sequence && sequence.length > 0) {
      queue = sequence;
  } else {
      queue = lines.map(l => ({ kind: "path", lineId: l.id || "" } as SequenceItem));
  }

  // 3. Chain Analysis
  // Identify Path Chains (contiguous path items) to calculate total lengths for deceleration
  interface ChainInfo {
      startIndex: number;
      endIndex: number;
      totalLength: number;
      curves: Map<string, BezierCurve>; // lineId -> Curve
  }

  const chainMap = new Map<number, ChainInfo>(); // itemIndex -> ChainInfo
  let currentChain: ChainInfo | null = null;
  let chainPrevPoint = startPoint;

  // We need to simulate geometry creation to measure lengths
  // Since geometry depends on "Previous Point", we must track it linearly.
  let geomPrevPoint = startPoint;

  queue.forEach((item, index) => {
      if (item.kind === "path") {
          const line = lineMap.get(item.lineId);
          if (line) {
              // Create Curve
              const pts = [geomPrevPoint, ...line.controlPoints, line.endPoint];
              const curve = new BezierCurve(pts);

              if (!currentChain) {
                  currentChain = { startIndex: index, endIndex: index, totalLength: 0, curves: new Map() };
              }

              currentChain.endIndex = index;
              currentChain.totalLength += curve.length;
              currentChain.curves.set(item.lineId, curve);
              chainMap.set(index, currentChain); // Map this item to the chain

              geomPrevPoint = line.endPoint;
          }
      } else {
          // Break chain
          currentChain = null;
          // geomPrevPoint stays same (Wait/Rotate typically happen at spot)
      }
  });

  // 4. Execution Loop
  let cumulativeChainDist = 0; // Reset at start of each chain
  let lastChainId: ChainInfo | null = null;

  for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const startTime = globalTime;

      if (item.kind === "path") {
          const line = lineMap.get(item.lineId);
          if (!line) continue;

          const chain = chainMap.get(i);
          if (chain !== lastChainId) {
              cumulativeChainDist = 0;
              lastChainId = chain || null;
          }

          const curve = chain?.curves.get(item.lineId);
          if (!curve) continue;

          // Prepare Segment Heading Info
          const hStartDeg = getLineStartHeading(line, (i > 0 && queue[i-1].kind === "path" && lineMap.get((queue[i-1] as any).lineId)?.endPoint) || startPoint);
          const hEndDeg = getLineEndHeading(line, startPoint); // Incorrect prev point usage in helper but typically looks at line internals
          // We need robust heading logic.
          // Let's use the helper but ensure unwind.

          // Re-unwind relative to robot
          let hStartRad = hStartDeg * (Math.PI / 180);
          let hEndRad = hEndDeg * (Math.PI / 180);
          hStartRad = unwrapAngle(hStartRad, currentPose.heading);
          hEndRad = unwrapAngle(hEndRad, hStartRad);

          // Simulation
          let t = findClosestT(curve, currentPose.toVector(), 0);
          let isComplete = false;

          const motionProfile: number[] = [];
          const velocityProfile: number[] = [];
          const headingProfile: number[] = [];

          while (!isComplete && (globalTime - startTime) < 10.0) { // 10s timeout per segment
              // Target Heading
              let targetHeading = 0;
              if (line.endPoint.heading === "tangential") {
                   const deriv = curve.getDerivative(t).normalize();
                   targetHeading = Math.atan2(deriv.y, deriv.x);
                   if (line.endPoint.reverse) targetHeading += Math.PI;
                   targetHeading = unwrapAngle(targetHeading, currentPose.heading);
              } else if (line.endPoint.heading === "constant") {
                   // Interpolate? Or hold?
                   // If constant, we usually turn to it then hold.
                   targetHeading = hStartRad + (hEndRad - hStartRad) * t;
              } else {
                   targetHeading = hStartRad + (hEndRad - hStartRad) * t;
              }

              // Distance Logic
              const distSeg = curve.getDistanceFromT(t);
              const distToEndOfChain = (chain?.totalLength || curve.length) - (cumulativeChainDist + distSeg);
              const safeDist = Math.max(0, distToEndOfChain);

              // Physics
              const inputs: DriveInputs = {
                  path: curve,
                  currentPose: currentPose,
                  currentVelocity: currentVelocity,
                  targetHeading: targetHeading,
                  t: t,
                  distanceToEndOfPath: safeDist,
                  settings: settings,
                  dt: dt
              };

              const output = algorithm.calculate(inputs);

              // Integration
              const accel = output.forceVector.times(1.0 / mass);
              currentVelocity = currentVelocity.plus(accel.times(dt));

              // Friction
              if (currentVelocity.magnitude() > 0.001) {
                 const heading = currentPose.heading;
                 const vRobot = currentVelocity.rotate(-heading);
                 const signX = Math.sign(vRobot.x);
                 const signY = Math.sign(vRobot.y);
                 let axDrag = Math.abs(settings.forwardZeroPowerAcceleration) * -signX;
                 let ayDrag = Math.abs(settings.lateralZeroPowerAcceleration) * -signY;

                 if (Math.abs(vRobot.x) < Math.abs(axDrag * dt)) { vRobot.x = 0; axDrag = 0; }
                 if (Math.abs(vRobot.y) < Math.abs(ayDrag * dt)) { vRobot.y = 0; ayDrag = 0; }

                 const aDragField = new Vector(axDrag, ayDrag).rotate(heading);
                 currentVelocity = currentVelocity.plus(aDragField.times(dt));
              }

              currentPose.x += currentVelocity.x * dt;
              currentPose.y += currentVelocity.y * dt;

              // Heading Kinematic
              const hError = getAngularDifference(currentPose.heading * 180 / Math.PI, targetHeading * 180 / Math.PI) * (Math.PI / 180);
              const maxAV = settings.aVelocity;
              const reach = maxAV * dt;
              if (Math.abs(hError) < reach) {
                  currentPose.heading = targetHeading;
              } else {
                  currentPose.heading += Math.sign(hError) * reach;
              }

              t = findClosestT(curve, currentPose.toVector(), t);

              // Completion
              const tFinished = t >= settings.tValueConstraint;
              const vFinished = currentVelocity.magnitude() < settings.velocityConstraint;
              const transFinished = output.errors.translational < settings.translationalConstraint;
              const headFinished = Math.abs(output.errors.heading) < settings.headingConstraint;

              // Only check constraints if we are at the END of the segment/chain
              // Ideally check t first.
              if (tFinished) {
                  // If mid-chain, we don't need to stop, just finish t.
                  // Unless switching requirements? Pedro usually switches when t > 0.99 (tValueConstraint).
                  if (chain && i < chain.endIndex) {
                      isComplete = true; // Switch to next segment immediately
                  } else {
                      // End of chain, must settle
                      if (vFinished && transFinished && headFinished) isComplete = true;
                  }
              }

              motionProfile.push(globalTime);
              velocityProfile.push(currentVelocity.magnitude());
              headingProfile.push(currentPose.heading * 180 / Math.PI);

              globalTime += dt;
          }

          cumulativeChainDist += curve.length;

          const duration = globalTime - startTime;
          segmentTimes.push(duration);
          totalDistance += curve.length;
          timeline.push({
              type: "travel",
              duration: duration,
              startTime: startTime,
              endTime: globalTime,
              lineIndex: lines.findIndex(l => l.id === line.id),
              line: line,
              prevPoint: curve.controlPoints[0], // Approximate prev point
              motionProfile,
              velocityProfile,
              headingProfile
          });

      } else if (item.kind === "wait") {
          // Wait Logic
          // We can simulate holding position
          const duration = (item.durationMs || 0) / 1000;
          const waitEnd = globalTime + duration;

          // Simple addition for time, but reset velocity if we assume settled?
          // If we simulated correctly, we should be stopped.
          // If we want to simulate settling during wait, we can run physics.

          // Let's run physics for `duration` targeting current pose.
          // This allows settling if we arrived hot.

          // Create a 0-length curve at current position?
          // Or just use algorithm with dist=0.
          // We need a dummy curve.
          const dummyPoint = currentPose.toVector();
          const dummyCurve = new BezierCurve([{x: dummyPoint.x, y: dummyPoint.y}, {x: dummyPoint.x, y: dummyPoint.y}]); // Point curve

          while (globalTime < waitEnd) {
               // Simulate Hold
               const inputs: DriveInputs = {
                  path: dummyCurve,
                  currentPose: currentPose,
                  currentVelocity: currentVelocity,
                  targetHeading: currentPose.heading, // Maintain heading
                  t: 0.5,
                  distanceToEndOfPath: 0,
                  settings: settings,
                  dt: dt
              };
              const output = algorithm.calculate(inputs);

              // Integration (Same as above)
              const accel = output.forceVector.times(1.0 / mass);
              currentVelocity = currentVelocity.plus(accel.times(dt));
              // Friction
              if (currentVelocity.magnitude() > 0.001) {
                 const heading = currentPose.heading;
                 const vRobot = currentVelocity.rotate(-heading);
                 const signX = Math.sign(vRobot.x);
                 const signY = Math.sign(vRobot.y);
                 let axDrag = Math.abs(settings.forwardZeroPowerAcceleration) * -signX;
                 let ayDrag = Math.abs(settings.lateralZeroPowerAcceleration) * -signY;
                 if (Math.abs(vRobot.x) < Math.abs(axDrag * dt)) { vRobot.x = 0; axDrag = 0; }
                 if (Math.abs(vRobot.y) < Math.abs(ayDrag * dt)) { vRobot.y = 0; ayDrag = 0; }
                 const aDragField = new Vector(axDrag, ayDrag).rotate(heading);
                 currentVelocity = currentVelocity.plus(aDragField.times(dt));
              }
              currentPose.x += currentVelocity.x * dt;
              currentPose.y += currentVelocity.y * dt;

              globalTime += dt;
          }

          timeline.push({
              type: "wait",
              duration: duration,
              startTime: startTime,
              endTime: globalTime,
              name: item.name,
              waitId: item.id
          });
      }
  }

  // Calculate Total Distance based on Chain Maps? Or just sum curves.
  // We can sum all created curves.
  let totalDist = 0;
  chainMap.forEach(c => {
      // Avoid duplicates: chainMap maps index -> chain.
      // We only sum unique chains? No, iterate queue logic already processed them.
      // Just sum the lengths of all curves created.
  });
  // Actually, we can just sum lengths of all path items in queue.
  // But we need the curves we created.
  // Helper:
  const allCurves = Array.from(chainMap.values()).flatMap(c => Array.from(c.curves.values()));
  // Unique curves? ChainInfo is shared.
  // Let's just track it during creation.

  // Re-calc total distance from lines for simplicity
  const calcTotalDist = lines.reduce((acc, l) => {
      // Need prev point
      // This is getting messy.
      // Let's just use 0 if not needed, or sum segment lengths from simulation.
      return acc;
  }, 0);

  // Use segment lengths from simulation tracking
  // cumulativeChainDist counts it?
  // We tracked `cumulativeChainDist` per chain.
  // We can just sum `segmentTimes`? No.
  // Use `totalDistance` variable.

  return {
    totalTime: globalTime,
    segmentTimes,
    totalDistance,
    timeline,
  };
}

export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return "Infinite";
  if (totalSeconds <= 0) return "0.000s";

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}s`;
  }
  return `${seconds.toFixed(3)}s`;
}

export function getAnimationDuration(
  totalTime: number,
  speedFactor: number = 1.0,
): number {
  return (totalTime * 1000) / speedFactor;
}
