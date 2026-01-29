// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.

import type { PIDFCoefficients, Settings } from "../types";

// ==========================================
// Mathematical Primitives
// ==========================================

export class Vector {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  static fromPolar(r: number, theta: number): Vector {
    return new Vector(r * Math.cos(theta), r * Math.sin(theta));
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector {
    const mag = this.magnitude();
    if (mag < 1e-9) return new Vector(0, 0);
    return new Vector(this.x / mag, this.y / mag);
  }

  plus(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  minus(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  times(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  dot(other: Vector): number {
    return this.x * other.x + this.y * other.y;
  }

  cross(other: Vector): number {
    return this.x * other.y - this.y * other.x;
  }

  rotate(angle: number): Vector {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /**
   * Projects this vector onto another vector.
   * v_proj = (v . other / |other|^2) * other
   */
  projectOnto(other: Vector): Vector {
    const denom = other.dot(other);
    if (denom < 1e-9) return new Vector(0, 0);
    const scalar = this.dot(other) / denom;
    return other.times(scalar);
  }

  clampMagnitude(max: number): Vector {
    const mag = this.magnitude();
    if (mag > max) {
      return this.normalize().times(max);
    }
    return this;
  }
}

export class Pose {
  x: number;
  y: number;
  heading: number; // Radians

  constructor(x: number, y: number, heading: number) {
    this.x = x;
    this.y = y;
    this.heading = heading;
  }

  toVector(): Vector {
    return new Vector(this.x, this.y);
  }

  /**
   * Returns a new Pose representing the error between this pose (target) and another pose (current).
   * Result is in the reference frame of the 'current' pose if needed, but typically standard subtraction.
   * For standard error: Target - Current
   */
  minus(other: Pose): Pose {
    return new Pose(
        this.x - other.x,
        this.y - other.y,
        getAngularDifferenceRad(other.heading, this.heading)
    );
  }
}

function getAngularDifferenceRad(start: number, end: number): number {
    let diff = end - start;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
}

// ==========================================
// Matrix & Curve Logic
// ==========================================

export class Matrix {
    data: number[][]; // Row-major

    constructor(rows: number, cols: number, initialData?: number[][]) {
        if (initialData) {
            this.data = initialData;
        } else {
            this.data = Array(rows).fill(0).map(() => Array(cols).fill(0));
        }
    }

    multiply(other: Matrix): Matrix {
        const r1 = this.data.length;
        const c1 = this.data[0].length;
        const r2 = other.data.length;
        const c2 = other.data[0].length;

        if (c1 !== r2) throw new Error("Matrix dimensions mismatch");

        const result = new Matrix(r1, c2);
        for (let i = 0; i < r1; i++) {
            for (let j = 0; j < c2; j++) {
                let sum = 0;
                for (let k = 0; k < c1; k++) {
                    sum += this.data[i][k] * other.data[k][j];
                }
                result.data[i][j] = sum;
            }
        }
        return result;
    }
}

/**
 * Characteristic Matrices for Bezier Curves
 */
const BEZIER_MATRICES = {
    1: new Matrix(2, 2, [[-1, 1], [1, 0]]), // Linear (technically not used often but defined)
    2: new Matrix(3, 3, [[1, -2, 1], [-2, 2, 0], [1, 0, 0]]), // Quadratic
    3: new Matrix(4, 4, [[-1, 3, -3, 1], [3, -6, 3, 0], [-3, 3, 0, 0], [1, 0, 0, 0]]) // Cubic
};

export class BezierCurve {
    controlPoints: Vector[];
    degree: number;
    characteristicMatrix: Matrix;
    controlMatrix: Matrix;
    length: number = 0;
    lut: { t: number, distance: number }[] = [];

    constructor(points: {x: number, y: number}[]) {
        this.controlPoints = points.map(p => new Vector(p.x, p.y));
        this.degree = points.length - 1;

        // Characteristic Matrix
        if (this.degree >= 1 && this.degree <= 3) {
            this.characteristicMatrix = BEZIER_MATRICES[this.degree as 1|2|3];
        } else {
            // Fallback or error - simplistic linear fallback for logic
             this.characteristicMatrix = new Matrix(1, 1);
        }

        // Control Point Matrix (n+1 x 2)
        this.controlMatrix = new Matrix(this.degree + 1, 2,
            this.controlPoints.map(p => [p.x, p.y])
        );

        this.generateLUT();
    }

    getPoint(t: number): Vector {
        if (t < 0) t = 0;
        if (t > 1) t = 1;

        // T-Vector: [t^n, t^(n-1), ..., 1] (Wait, spec says [1, t, t^2...])
        // Spec: T(t) = [1, t, t^2, ... t^n]
        // Let's verify standard bezier matrix formulation.
        // Standard: P(t) = T * M * C
        // For Cubic:
        // [1 t t^2 t^3] * M * C
        // M provided in spec or standard? Spec says "Characteristic Matrix".
        // Standard Cubic Matrix for [1 t t^2 t^3] is usually:
        // [[1 0 0 0], [-3 3 0 0], [3 -6 3 0], [-1 3 -3 1]]
        // But the one I defined above (BEZIER_MATRICES[3]) matches [t^3 t^2 t 1] usually.
        // Let's stick to the Spec's formula: B(t) = (1-t)^3 P0 + ...
        // This is the standard expansion.
        // I will implement getPoint using the algebraic expansion for certainty and speed,
        // mirroring the `timeCalculator.ts` implementation which is proven correct for geometry.

        // However, for strict compliance with "Matrix Operations" section:
        // "Point Calculation: P(t) = T(t) * M * C"
        // I will use the matrix if required, but algebraic is numerically identical.
        // I'll use the algebraic method from `src/utils/math.ts` logic as it's cleaner in JS than matrix classes.
        // The spec emphasizes replicating the *result* and the *logic* of Pedro Pathing.
        // Pedro Pathing (Java) uses Matrices.
        // I will stick to Algebraic for performance in JS, as long as math is identical.

        const n = this.degree;
        if (n === 1) {
            const p0 = this.controlPoints[0];
            const p1 = this.controlPoints[1];
            return p0.times(1 - t).plus(p1.times(t));
        } else if (n === 2) {
             const p0 = this.controlPoints[0];
             const p1 = this.controlPoints[1];
             const p2 = this.controlPoints[2];
             const mt = 1 - t;
             return p0.times(mt * mt).plus(p1.times(2 * mt * t)).plus(p2.times(t * t));
        } else if (n === 3) {
            const p0 = this.controlPoints[0];
            const p1 = this.controlPoints[1];
            const p2 = this.controlPoints[2];
            const p3 = this.controlPoints[3];
            const mt = 1 - t;
            const mt2 = mt * mt;
            const t2 = t * t;
            return p0.times(mt2 * mt)
                .plus(p1.times(3 * mt2 * t))
                .plus(p2.times(3 * mt * t2))
                .plus(p3.times(t2 * t));
        }
        return new Vector(0,0);
    }

    getDerivative(t: number): Vector {
        const n = this.degree;
        if (n === 1) {
            return this.controlPoints[1].minus(this.controlPoints[0]);
        } else if (n === 2) {
            const p0 = this.controlPoints[0];
            const p1 = this.controlPoints[1];
            const p2 = this.controlPoints[2];
            const mt = 1 - t;
            // 2(1-t)(P1-P0) + 2t(P2-P1)
            return (p1.minus(p0).times(2 * mt)).plus(p2.minus(p1).times(2 * t));
        } else if (n === 3) {
            const p0 = this.controlPoints[0];
            const p1 = this.controlPoints[1];
            const p2 = this.controlPoints[2];
            const p3 = this.controlPoints[3];
            const mt = 1 - t;
            // 3(1-t)^2(P1-P0) + 6(1-t)t(P2-P1) + 3t^2(P3-P2)
            const term1 = p1.minus(p0).times(3 * mt * mt);
            const term2 = p2.minus(p1).times(6 * mt * t);
            const term3 = p3.minus(p2).times(3 * t * t);
            return term1.plus(term2).plus(term3);
        }
        return new Vector(0,0);
    }

    getSecondDerivative(t: number): Vector {
        const n = this.degree;
        if (n < 2) return new Vector(0,0);

        if (n === 2) {
             const p0 = this.controlPoints[0];
             const p1 = this.controlPoints[1];
             const p2 = this.controlPoints[2];
             // 2(P2 - 2P1 + P0)
             return p2.minus(p1.times(2)).plus(p0).times(2);
        } else if (n === 3) {
            const p0 = this.controlPoints[0];
            const p1 = this.controlPoints[1];
            const p2 = this.controlPoints[2];
            const p3 = this.controlPoints[3];
            const mt = 1 - t;
            // 6(1-t)(P2-2P1+P0) + 6t(P3-2P2+P1)
            const term1 = p2.minus(p1.times(2)).plus(p0).times(6 * mt);
            const term2 = p3.minus(p2.times(2)).plus(p1).times(6 * t);
            return term1.plus(term2);
        }
         return new Vector(0,0);
    }

    getCurvature(t: number): number {
        const d1 = this.getDerivative(t);
        const d2 = this.getSecondDerivative(t);
        const numerator = Math.abs(d1.cross(d2));
        const denom = Math.pow(d1.magnitude(), 3);
        if (denom < 1e-9) return 0;
        return numerator / denom;
    }

    generateLUT(steps: number = 1000) {
        this.lut = [];
        this.length = 0;
        let prevPoint = this.getPoint(0);
        this.lut.push({ t: 0, distance: 0 });

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const point = this.getPoint(t);
            const dist = point.minus(prevPoint).magnitude();
            this.length += dist;
            this.lut.push({ t, distance: this.length });
            prevPoint = point;
        }
    }

    getDistanceFromT(t: number): number {
        if (t <= 0) return 0;
        if (t >= 1) return this.length;
        // Interpolate LUT
        const steps = this.lut.length - 1;
        const index = Math.floor(t * steps);
        const nextIndex = Math.min(index + 1, steps);
        const ratio = (t * steps) - index;
        const d1 = this.lut[index].distance;
        const d2 = this.lut[nextIndex].distance;
        return d1 + (d2 - d1) * ratio;
    }
}

// ==========================================
// Control Systems
// ==========================================

export class PIDFController {
    p: number;
    i: number;
    d: number;
    f: number;

    integral: number = 0;
    prevError: number = 0;
    resetOnUpdate: boolean = true;

    constructor(coeffs: PIDFCoefficients) {
        this.p = coeffs.p;
        this.i = coeffs.i;
        this.d = coeffs.d;
        this.f = coeffs.f;
    }

    updateCoefficients(coeffs: PIDFCoefficients) {
        this.p = coeffs.p;
        this.i = coeffs.i;
        this.d = coeffs.d;
        this.f = coeffs.f;
    }

    reset() {
        this.integral = 0;
        this.prevError = 0;
        this.resetOnUpdate = true;
    }

    calculate(error: number, dt: number): number {
        if (this.resetOnUpdate) {
            this.prevError = error;
            this.resetOnUpdate = false;
        }

        this.integral += error * dt;
        const derivative = (error - this.prevError) / dt;
        this.prevError = error;

        return (this.p * error) + (this.i * this.integral) + (this.d * derivative) + (this.f * 0); // F handled externally often, or via TargetVelocity
        // Note: The spec says "Feedforward Physics... Output_FF = V_target * K_f"
        // This is typically added outside the PID loop, or F is used with setpoint.
        // Here we just return P+I+D. Feedforward will be handled in the drive algorithm.
    }
}

export class KalmanFilter {
    modelCovariance: number;
    dataCovariance: number;
    x: number = 0; // Estimated value
    p: number = 0; // Estimation Error Covariance
    k: number = 0; // Kalman Gain

    constructor(modelCovariance: number, dataCovariance: number) {
        this.modelCovariance = modelCovariance;
        this.dataCovariance = dataCovariance;
        this.p = 1; // Initial guess
    }

    filter(measurement: number): number {
        // Prediction Update
        this.p = this.p + this.modelCovariance;

        // Measurement Update
        this.k = this.p / (this.p + this.dataCovariance);
        this.x = this.x + this.k * (measurement - this.x);
        this.p = (1 - this.k) * this.p;

        return this.x;
    }
}

// ==========================================
// Drive Physics & Vector Algorithm
// ==========================================

export interface DriveInputs {
    path: BezierCurve;
    currentPose: Pose;
    currentVelocity: Vector; // Field centric
    targetHeading: number;
    t: number; // Current parametric position guess
    distanceToEndOfPath: number; // For PathChain deceleration
    settings: Settings;
    dt: number;
}

export interface DriveOutputs {
    forceVector: Vector; // The resulting force vector to apply to the mass
    targetVelocity: number;
    errors: {
        translational: number;
        heading: number;
        drive: number;
    };
    vectors: {
        drive: Vector;
        heading: Vector; // Represented as (0,0) with magnitude = headingPower for viz
        translational: Vector;
        centripetal: Vector;
        correction: Vector;
    };
}

export class DriveVectorAlgorithm {
    drivePID: PIDFController;
    headingPID: PIDFController;
    translationalPID: PIDFController;
    driveErrorFilter: KalmanFilter;

    constructor(settings: Settings) {
        this.drivePID = new PIDFController(settings.drivePIDF);
        this.headingPID = new PIDFController(settings.headingPIDF);
        this.translationalPID = new PIDFController(settings.translationalPIDF);
        this.driveErrorFilter = new KalmanFilter(6, 1);
    }

    updatePIDCoefficients(settings: Settings, errorDrive: number, errorHeading: number, errorTranslational: number) {
        if (Math.abs(errorDrive) < settings.drivePIDFSwitch) {
            this.drivePID.updateCoefficients(settings.secondaryDrivePIDF);
        } else {
            this.drivePID.updateCoefficients(settings.drivePIDF);
        }

        if (Math.abs(errorHeading) < settings.headingPIDFSwitch) {
            this.headingPID.updateCoefficients(settings.secondaryHeadingPIDF);
        } else {
            this.headingPID.updateCoefficients(settings.headingPIDF);
        }

        if (Math.abs(errorTranslational) < settings.translationalPIDFSwitch) {
            this.translationalPID.updateCoefficients(settings.secondaryTranslationalPIDF);
        } else {
            this.translationalPID.updateCoefficients(settings.translationalPIDF);
        }
    }

    calculate(inputs: DriveInputs): DriveOutputs {
        const { path, currentPose, currentVelocity, targetHeading, t, distanceToEndOfPath, settings, dt } = inputs;

        // 1. Geometric Data
        const pathPoint = path.getPoint(t);

        // Derivatives for Curvature Direction
        const d1 = path.getDerivative(t);
        const d2 = path.getSecondDerivative(t);
        const crossZ = d1.cross(d2); // x'y'' - y'x''
        const tangent = d1.normalize();
        const curvature = path.getCurvature(t);

        // 2. Target Velocity
        // v_target = sqrt(-2 * a_braking * s)
        // a_braking = ForwardZeroPowerAcceleration * brakingStrength * 4
        const a_braking = settings.forwardZeroPowerAcceleration * settings.brakingStrength * 4;

        let targetVelocityMag = 0;
        if (distanceToEndOfPath > 0.001) {
            targetVelocityMag = Math.sqrt(Math.abs(-2 * a_braking * distanceToEndOfPath));
        }

        targetVelocityMag = Math.min(targetVelocityMag, settings.maxVelocity);

        // 3. Errors
        const errorVector = pathPoint.minus(currentPose.toVector());
        // Project onto tangent
        const errorProj = errorVector.projectOnto(tangent);
        // Orthogonal component is translational error
        const errorOrthogonal = errorVector.minus(errorProj);
        const translationalErrorMag = errorOrthogonal.magnitude();

        const currentVelProj = currentVelocity.projectOnto(tangent);
        const currentVelMag = currentVelProj.magnitude() * Math.sign(currentVelProj.dot(tangent));

        // Drive Velocity Error
        let driveError = targetVelocityMag - currentVelMag;
        driveError = this.driveErrorFilter.filter(driveError);

        // Heading Error
        const headingError = getAngularDifferenceRad(currentPose.heading, targetHeading);

        // 4. Update PID
        // We switch PID based on distance remaining in the *Chain*? Or Segment?
        // Typically PID is aggressive at the end of the movement.
        // So we use distanceToEndOfPath.
        this.updatePIDCoefficients(settings, distanceToEndOfPath, headingError, translationalErrorMag);

        // 5. Calculate Raw Vectors
        // Translational
        const transPower = this.translationalPID.calculate(translationalErrorMag, dt);
        // Direction is along errorOrthogonal
        const vecTranslational = errorOrthogonal.normalize().times(transPower);

        // Centripetal
        // Direction points towards center of curvature.
        // If crossZ > 0 (Left Turn), center is Left -> Rotate Tangent +90 deg (-y, x)
        // If crossZ < 0 (Right Turn), center is Right -> Rotate Tangent -90 deg (y, -x)
        let normal = new Vector(-tangent.y, tangent.x);
        if (crossZ < 0) {
            normal = new Vector(tangent.y, -tangent.x);
        }
        // If straight line (curvature ~ 0), direction doesn't matter (mag is 0).

        // Magnitude = centripetalScaling * curvature * v^2
        const vecCentripetal = normal.times(settings.centripetalScaling * curvature * currentVelMag * currentVelMag);

        // Correction Vector
        const vecCorrection = vecTranslational.plus(vecCentripetal);

        // Heading
        const headingPower = this.headingPID.calculate(headingError, dt);
        // Treat as scalar for budget
        let headingMag = Math.abs(headingPower);

        // Drive
        // Feedforward + PID
        const drivePowerPID = this.drivePID.calculate(driveError, dt);
        const driveFeedforward = targetVelocityMag * settings.drivePIDF.f;
        const drivePower = drivePowerPID + driveFeedforward;
        let vecDrive = tangent.times(drivePower);

        // 6. Prioritization & Normalization
        // Priority: Correction > Heading > Drive

        // A. Correction + Heading
        // "If |V_correction + V_heading| > 1.0"
        // Here we sum magnitudes because Heading is orthogonal in control space but additive in motor saturation.
        const correctionMag = vecCorrection.magnitude();

        let limitedCorrection = vecCorrection;
        let limitedHeading = headingPower;
        let limitedDrive = vecDrive;

        if (correctionMag + headingMag > 1.0) {
            // "Heading vector is scaled down to fit within the budget left by Correction"
            // If correction itself > 1?
            if (correctionMag > 1.0) {
                limitedCorrection = vecCorrection.normalize().times(1.0);
                limitedHeading = 0;
            } else {
                const available = 1.0 - correctionMag;
                if (headingMag > available) {
                     // Scale heading
                     const sign = Math.sign(headingPower);
                     limitedHeading = sign * available;
                     headingMag = available;
                }
            }
        }

        // B. Add Drive
        const used = limitedCorrection.magnitude() + Math.abs(limitedHeading);
        if (used + vecDrive.magnitude() > 1.0) {
             const available = Math.max(0, 1.0 - used);
             limitedDrive = vecDrive.clampMagnitude(available);
        }

        // 7. Force Application
        // The output of this system is "Motor Powers" (0-1).
        // We need to convert this to Force for the physics simulation.
        // F = MotorPower * MaxForce?
        // Max Force = Mass * MaxAcceleration?
        // Spec says: "Given the calculated motor power, it applies force to the virtual mass."
        // "Kf represents the inverse of the robot's max speed (roughly)."
        // We assume Motor Power 1.0 => Max Acceleration?
        // Or Motor Power 1.0 => Max Force.
        // Let's assume Max Motor Power provides a force capable of `maxAcceleration`.
        // F_max = mass * maxAcceleration.

        // Resulting Force Vector (Field Centric):
        // F_net = (limitedDrive + limitedCorrection) * F_max
        // Note: Heading torque is ignored for point-mass trajectory physics,
        // BUT the *limit* it imposed on Drive/Correction IS applied (by reducing them).

        const fMax = settings.mass * settings.maxAcceleration;
        const totalControlVector = limitedDrive.plus(limitedCorrection);
        const forceVector = totalControlVector.times(fMax);

        return {
             forceVector: forceVector,
             targetVelocity: targetVelocityMag,
             errors: {
                 translational: translationalErrorMag,
                 heading: headingError,
                 drive: driveError
             },
             vectors: {
                 drive: limitedDrive,
                 heading: new Vector(0,0), // Visualizer can deduce heading effort from headingError or similar
                 translational: vecTranslational,
                 centripetal: vecCentripetal,
                 correction: vecCorrection
             }
        };
    }
}
