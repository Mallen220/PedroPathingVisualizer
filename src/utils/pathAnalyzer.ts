// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import {
  analyzePathSegment,
  calculatePathTime,
} from "./timeCalculator";
import type {
  Point,
  Line,
  SequenceItem,
  Settings,
} from "../types/index";
import { getAngularDifference } from "./math";

export interface SegmentStat {
  name: string;
  length: number;
  time: number;
  maxVel: number;
  maxAngVel: number;
  degrees: number;
  color: string;
}

export interface Insight {
  startTime: number;
  endTime?: number;
  type: "warning" | "info" | "error";
  message: string;
  value?: number;
}

export interface PathStats {
  totalTime: number;
  totalDistance: number;
  maxLinearVelocity: number;
  maxAngularVelocity: number;
  totalEnergy?: number; // Joules (estimated)
  segments: SegmentStat[];
  velocityData: { time: number; value: number }[];
  angularVelocityData: { time: number; value: number }[];
  accelerationData: { time: number; value: number }[];
  centripetalData: { time: number; value: number }[];
  insights: Insight[];
  healthScore: number;
}

export function calculatePathStats(
  startPoint: Point,
  lines: Line[],
  sequence: SequenceItem[],
  settings: Settings,
): PathStats {
  // Basic time and distance from standard calculator
  const timePred = calculatePathTime(startPoint, lines, settings, sequence);

  // Detailed segment analysis
  let segments: SegmentStat[] = [];
  let maxLinearVelocity = 0;
  let maxAngularVelocity = 0;

  // Data for charts
  let velocityData: { time: number; value: number }[] = [];
  let angularVelocityData: { time: number; value: number }[] = [];
  let accelerationData: { time: number; value: number }[] = [];
  let centripetalData: { time: number; value: number }[] = [];
  let insights: Insight[] = [];

  // Pre-calculate constants for insight thresholds
  const maxAccel = settings.maxAcceleration || 30;
  const maxVel = settings.maxVelocity || 100;
  const kFriction = settings.kFriction || 0;
  const gravity = 386.22; // in/s^2
  const frictionLimitAccel = kFriction * gravity;

  // Robot Mass for Energy (lbs -> slugs: lbs / 32.174)
  // Or just use F=ma with mass in arbitrary units, but we want Energy in Joules?
  // If we stick to Imperial units (inches, lbs, seconds):
  // Energy = Work = Force * Distance.
  // Force = Mass * Accel.
  // Mass in slugs = lbs / 32.174.
  // Accel in ft/s^2 = in/s^2 / 12.
  // Distance in ft = in / 12.
  // Result is ft-lbs.
  // 1 ft-lb ~= 1.3558 Joules.
  const robotMassLbs = (settings as any).robotMass || 30;
  const massSlugs = robotMassLbs / 32.174;
  let totalEnergyFtLbs = 0;

  // Re-simulation loop setup
  let simHeading =
    startPoint.heading === "linear"
      ? startPoint.startDeg
      : startPoint.heading === "constant"
        ? startPoint.degrees
        : 0;
  // Tangential start logic
  if (startPoint.heading === "tangential" && lines.length > 0) {
    const l = lines[0];
    const next = l.controlPoints.length > 0 ? l.controlPoints[0] : l.endPoint;
    simHeading =
      Math.atan2(next.y - startPoint.y, next.x - startPoint.x) *
      (180 / Math.PI);
    if (startPoint.reverse) simHeading += 180;
  }

  let simPoint = startPoint;
  const lineById = new Map(lines.map((l) => [l.id!, l]));

  let _maxLin = 0;
  let _maxAng = 0;

  // Track active warnings for coalescing
  let activeVelocityWarning: Insight | null = null;
  let activeFrictionWarning: Insight | null = null;

  // Helper to add data point to charts
  const addDataPoint = (
    t: number,
    vLin: number,
    vAng: number,
    accLin: number,
    accCent: number,
    dt: number = 0
  ) => {
    velocityData.push({ time: t, value: vLin });
    angularVelocityData.push({ time: t, value: vAng });
    accelerationData.push({ time: t, value: accLin });
    centripetalData.push({ time: t, value: accCent });

    // Energy Calculation (Linear Kinetic Energy Change + Friction Work)
    // Actually, motor energy is expended to accelerate AND overcome friction.
    // Power = Force * Velocity.
    // F_net = m * a.
    // F_motor - F_friction = m * a.
    // F_motor = m * a + F_friction.
    // We only care about magnitude of motor force needed? Or positive work?
    // Regenerative braking isn't usually a thing in FTC, so braking also consumes energy (or dissipates it).
    // Let's approximate Energy Used as sum of absolute work done?
    // Or just simple kinetic energy?
    // Let's use: Work = Integral(|m*a| + |F_friction|) * v * dt
    // F_friction = mu * m * g.
    if (dt > 0) {
        const accFtS2 = Math.abs(accLin) / 12;
        const vFtS = Math.abs(vLin) / 12;

        // Force to accelerate
        const forceAccel = massSlugs * accFtS2;

        // Force to overcome friction (constant)
        // Normal force = m*g. Ff = mu * N.
        const forceFriction = kFriction * massSlugs * 32.174; // g in ft/s^2 cancels out slug conversion essentially? No.
        // massSlugs * 32.174 = lbs force.
        // So Ff (lbs) = kFriction * weight (lbs).
        const frictionLbs = kFriction * robotMassLbs;

        // Total instantaneous force magnitude required
        // If accelerating: F_motor = F_accel + F_friction
        // If decelerating: F_motor might be 0 (coasting) or negative (braking).
        // FTC robots usually brake actively.
        // Let's assume total effort is |ma| + Friction.
        const totalForce = (Math.abs(forceAccel * 32.174) + frictionLbs); // approx in lbs force?
        // Wait, F=ma gives lbs force directly if m in slugs and a in ft/s^2.

        const forceTotalLbs = Math.abs(forceAccel) + frictionLbs;

        // Work = Force * Distance = Force * (v * dt)
        const distFt = vFtS * dt;
        const workFtLbs = forceTotalLbs * distFt;

        totalEnergyFtLbs += workFtLbs;
    }

    // --- Insight Logic ---

    // 1. Max Velocity Warning (Info)
    if (vLin >= maxVel * 0.99) {
      if (!activeVelocityWarning) {
        activeVelocityWarning = {
          startTime: t,
          type: "info",
          message: "Max Velocity Reached",
          value: vLin,
        };
      } else {
        if (vLin > (activeVelocityWarning.value || 0)) {
          activeVelocityWarning.value = vLin;
        }
      }
    } else {
      if (activeVelocityWarning) {
        insights.push({ ...(activeVelocityWarning as Insight), endTime: t });
        activeVelocityWarning = null;
      }
    }

    // 2. Centripetal Friction Warning (Error)
    if (kFriction > 0 && accCent > frictionLimitAccel) {
      if (!activeFrictionWarning) {
        activeFrictionWarning = {
          startTime: t,
          type: "error",
          message: "Risk of Wheel Slip (Centripetal)",
          value: accCent,
        };
      } else {
        if (accCent > (activeFrictionWarning.value || 0)) {
          activeFrictionWarning.value = accCent;
        }
      }
    } else {
      if (activeFrictionWarning) {
        insights.push({ ...(activeFrictionWarning as Insight), endTime: t });
        activeFrictionWarning = null;
      }
    }
  };

  const processEventForGraph = (ev: any) => {
    if (ev.type === "wait") {
      if (ev.duration <= 0) return;

      const startTime = ev.startTime;
      const endTime = ev.endTime;

      const diff = Math.abs(
        getAngularDifference(ev.startHeading || 0, ev.targetHeading || 0),
      );

      if (diff > 0.1) {
        const maxAngVel = (diff * (Math.PI / 180)) / ev.duration;
        addDataPoint(startTime, 0, 0, 0, 0, 0);
        addDataPoint(startTime + ev.duration * 0.1, 0, maxAngVel, 0, 0, ev.duration * 0.1);
        addDataPoint(endTime - ev.duration * 0.1, 0, maxAngVel, 0, 0, ev.duration * 0.8);
        addDataPoint(endTime, 0, 0, 0, 0, ev.duration * 0.1);
      } else {
        addDataPoint(startTime, 0, 0, 0, 0, 0);
        addDataPoint(endTime, 0, 0, 0, 0, ev.duration);
      }
    }
  };

  addDataPoint(0, 0, 0, 0, 0);

  // Filter to travel and wait events
  const timeline = timePred.timeline || [];
  let timelineIndex = 0;

  sequence.forEach((item) => {
    let targetEventIndex = -1;

    for (let i = timelineIndex; i < timeline.length; i++) {
      const tEv = timeline[i];
      let isMatch = false;

      if (
        item.kind === "wait" &&
        tEv.type === "wait" &&
        (tEv as any).waitId === item.id
      ) {
        isMatch = true;
      } else if (
        item.kind === "rotate" &&
        tEv.type === "wait" &&
        (tEv as any).waitId === item.id
      ) {
        isMatch = true;
      } else if (item.kind === "path" && tEv.type === "travel") {
        const line = lineById.get(item.lineId);
        if (
          line &&
          tEv.lineIndex === lines.findIndex((l) => l.id === line.id)
        ) {
          isMatch = true;
        }
      }

      if (isMatch) {
        targetEventIndex = i;
        break;
      }
    }

    if (targetEventIndex !== -1) {
      for (let i = timelineIndex; i < targetEventIndex; i++) {
        processEventForGraph(timeline[i]);
      }
      timelineIndex = targetEventIndex;
    }

    if (item.kind === "wait") {
      let event: any = null;
      if (targetEventIndex !== -1) {
        event = timeline[targetEventIndex];
        timelineIndex++;
        processEventForGraph(event);
      }
      const duration = event ? event.duration : item.durationMs / 1000;
      segments.push({
        name: item.name || "Wait",
        length: 0,
        time: duration,
        maxVel: 0,
        maxAngVel: 0,
        degrees: 0,
        color: "#f59e0b",
      });
      return;
    }

    if (item.kind === "rotate") {
      let event: any = null;
      if (targetEventIndex !== -1) {
        event = timeline[targetEventIndex];
        timelineIndex++;
        processEventForGraph(event);
      }
      const duration = event ? event.duration : 0;
      let maxAngVel = 0;
      let degrees = 0;
      if (event && event.duration > 0) {
        const diff = Math.abs(
          getAngularDifference(
            (event as any).startHeading,
            (event as any).targetHeading,
          ),
        );
        maxAngVel = (diff * (Math.PI / 180)) / event.duration;
        degrees = diff;
      }
      segments.push({
        name: item.name || "Rotate",
        length: 0,
        time: duration,
        maxVel: 0,
        maxAngVel: maxAngVel,
        degrees: degrees,
        color: "#d946ef",
      });
      return;
    }

    if (item.kind !== "path") return;
    const line = lineById.get(item.lineId);
    if (!line) return;

    let event: any = null;
    if (targetEventIndex !== -1) {
      event = timeline[targetEventIndex];
      timelineIndex++;
    }

    if (!event) return;

    const startH =
      event.headingProfile && event.headingProfile.length > 0
        ? event.headingProfile[0]
        : simHeading;

    const resolution =
      event.motionProfile && event.motionProfile.length > 0
        ? event.motionProfile.length - 1
        : (settings as any).resolution || 100;

    const analysis = analyzePathSegment(
      simPoint,
      line.controlPoints as any,
      line.endPoint as any,
      resolution,
      startH,
    );

    let segMaxLin = 0;
    let segMaxAng = 0;
    let segDegrees = 0;

    if (event.motionProfile && analysis.steps.length > 0) {
      const profile = event.motionProfile;
      const headingProfile = event.headingProfile;
      const velocityProfile = event.velocityProfile;

      const len = Math.min(profile.length - 1, analysis.steps.length);

      for (let i = 0; i < len; i++) {
        const t = event.startTime + profile[i];
        let vLin = 0;
        if (velocityProfile && velocityProfile.length > i) {
          vLin = velocityProfile[i];
        } else {
          const dt = profile[i + 1] - profile[i];
          if (dt > 1e-6) {
            const step = analysis.steps[i];
            vLin = step.deltaLength / dt;
          }
        }
        if (vLin > segMaxLin) segMaxLin = vLin;

        let vAng = 0;
        const dt = profile[i + 1] - profile[i];

        if (dt > 1e-6) {
          if (headingProfile && headingProfile.length > i + 1) {
            const h1 = headingProfile[i];
            const h2 = headingProfile[i + 1];
            const diff = Math.abs(getAngularDifference(h1, h2));
            vAng = (diff * (Math.PI / 180)) / dt;
            segDegrees += diff;
          } else {
            const step = analysis.steps[i];
            vAng = (step.rotation * (Math.PI / 180)) / dt;
            segDegrees += step.rotation;
          }
        }

        if (vAng > segMaxAng) segMaxAng = vAng;

        let accLin = 0;
        let accCent = 0;
        if (dt > 1e-6) {
          let vNext = 0;
          if (velocityProfile && velocityProfile.length > i + 1) {
            vNext = velocityProfile[i + 1];
          } else if (analysis.steps[i + 1]) {
            vNext = analysis.steps[i + 1].deltaLength / dt;
          }
          accLin = (vNext - vLin) / dt;
        }

        if (analysis.steps[i] && analysis.steps[i].radius > 0.001) {
          accCent = (vLin * vLin) / analysis.steps[i].radius;
        }

        addDataPoint(t, vLin, vAng, accLin, accCent, dt);
      }
      addDataPoint(event.endTime, 0, 0, 0, 0, 0);
    } else {
      const dt = event.duration;
      if (dt > 0) {
        segMaxLin = analysis.length / dt;
        segMaxAng = (analysis.netRotation * (Math.PI / 180)) / dt;
        addDataPoint(event.startTime, segMaxLin, segMaxAng, 0, 0, 0);
        addDataPoint(event.endTime, segMaxLin, segMaxAng, 0, 0, dt);
      }

      if (line.endPoint.heading === "tangential") {
        segDegrees = analysis.tangentRotation;
      } else {
        segDegrees = Math.abs(analysis.netRotation);
      }
    }

    segments.push({
      name:
        line.name || `Path ${lines.findIndex((l) => l.id === line.id) + 1}`,
      length: analysis.length,
      time: event.duration,
      maxVel: segMaxLin,
      maxAngVel: segMaxAng,
      degrees: segDegrees,
      color: line.color,
    });

    if (segMaxLin > _maxLin) _maxLin = segMaxLin;
    if (segMaxAng > _maxAng) _maxAng = segMaxAng;

    simPoint = line.endPoint as any;
    simHeading = analysis.startHeading + analysis.netRotation;
  });

  const totalT = timePred.totalTime;
  if (activeVelocityWarning) {
    insights.push({ ...(activeVelocityWarning as Insight), endTime: totalT });
  }
  if (activeFrictionWarning) {
    insights.push({ ...(activeFrictionWarning as Insight), endTime: totalT });
  }

  // Health Score Calculation
  let score = 100;
  // -5 per warning
  const warnings = insights.filter(i => i.type === "warning" || i.type === "info").length;
  // -20 per error
  const errors = insights.filter(i => i.type === "error").length;

  score -= (warnings * 2); // Small penalty for warnings/info
  score -= (errors * 20); // Large penalty for errors

  // Penalty for excessive waits?
  // If wait time > 50% of total time?
  const waitTime = segments.filter(s => s.name.includes("Wait")).reduce((acc, s) => acc + s.time, 0);
  if (totalT > 0 && (waitTime / totalT) > 0.5) {
      score -= 10;
      insights.push({
          startTime: 0,
          endTime: totalT,
          type: "warning",
          message: "High Wait Time (>50%)",
          value: (waitTime / totalT) * 100
      });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Convert Energy to Joules
  const totalJoules = totalEnergyFtLbs * 1.35582;

  return {
    totalTime: timePred.totalTime,
    totalDistance: timePred.totalDistance,
    maxLinearVelocity: _maxLin,
    maxAngularVelocity: _maxAng,
    totalEnergy: totalJoules,
    segments: segments,
    velocityData,
    angularVelocityData,
    accelerationData,
    centripetalData,
    insights,
    healthScore: score
  };
}
