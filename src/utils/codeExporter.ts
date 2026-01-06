// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import prettier from "prettier";
import prettierJavaPlugin from "prettier-plugin-java";
import type { Point, Line, BasePoint, SequenceItem } from "../types";
import { getCurvePoint } from "./math";
import pkg from "../../package.json";
import _ from "lodash";

/**
 * Generate Java code from path data
 */

const AUTO_GENERATED_FILE_WARNING_MESSAGE: string = `
/* ============================================================= *
 *           Pedro Pathing Visualizer — Auto-Generated           *
 *                                                               *
 *  Version: ${pkg.version}.                                              *
 *  Copyright (c) ${new Date().getFullYear()} Matthew Allen                             *
 *                                                               *
 *  THIS FILE IS AUTO-GENERATED — DO NOT EDIT MANUALLY.          *
 *  Changes will be overwritten when regenerated.                *
 * ============================================================= */
`;

function getPoseKey(point: Point): string {
  // Create a unique key for the Pose based on its properties
  // Round to 3 decimals to avoid floating point issues
  const x = point.x.toFixed(3);
  const y = point.y.toFixed(3);

  if (point.heading === "constant") {
    return `${x}_${y}_const_${point.degrees.toFixed(3)}`;
  } else if (point.heading === "linear") {
    // Linear heading depends on start/end, but the Pose itself just holds the coordinate.
    // Wait, Pose objects in Pedro Pathing hold x, y, and heading.
    // If heading is interpolated, the Pose heading usually refers to the *target* heading at that point?
    // For linear heading, the end point has a specific end degree.
    return `${x}_${y}_lin_${point.endDeg.toFixed(3)}`;
  } else {
    // Tangential. The heading is derived.
    // In generated code: `new Pose(x, y)` implies default heading (0).
    // But usually tangential paths don't rely on the Pose's heading.
    // However, if we reuse the Pose variable, we reuse its heading.
    // If one path uses `new Pose(x,y)` (default 0) and another needs `new Pose(x,y, 90)`, they differ.
    // Tangential paths usually just use x,y.
    return `${x}_${y}_tan`;
  }
}

// Helper to sanitize names
function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "");
}

// Helper to resolve variable names for Lines
function resolvePoseVariables(lines: Line[], startPoint: Point) {
  // Map of "name" -> Array of { lineIndex, poseKey, resolvedName }
  // We want to reuse resolvedName if poseKey matches.

  const variableMap = new Map<string, string>(); // Key: "LineIndex_Type" (e.g. "0_end", "0_control_1") -> Variable Name

  // Group by user-defined name
  const nameGroups = new Map<string, Array<{ id: string; key: string }>>();

  // Helper to add to group
  const addToGroup = (name: string, id: string, key: string) => {
    if (!nameGroups.has(name)) nameGroups.set(name, []);
    nameGroups.get(name)!.push({ id, key });
  };

  // 1. Process all points
  // Start Point is special, always "startPoint"
  // variableMap.set("start", "startPoint");

  lines.forEach((line, idx) => {
    // End Point
    const pKey = getPoseKey(line.endPoint);
    const baseName =
      line.name && line.name.trim() !== ""
        ? sanitize(line.name)
        : `point${idx + 1}`; // Use 1-based index for default names to match UI
    addToGroup(baseName, `${idx}_end`, pKey);

    // Control Points
    line.controlPoints.forEach((cp, cIdx) => {
      // Control points are just x,y.
      const cpKey = `${cp.x.toFixed(3)}_${cp.y.toFixed(3)}_tan`; // Treat as basic pose
      // Control points don't usually have user names.
      // We derive name from line name.
      const cpBaseName = `${baseName}Control${cIdx + 1}`; // e.g. ScoreControl1
      // If multiple lines share "Score", should they share "ScoreControl1"?
      // Only if the control points are identical.
      addToGroup(cpBaseName, `${idx}_control_${cIdx}`, cpKey);
    });
  });

  // 2. Resolve names
  nameGroups.forEach((items, baseName) => {
    // Group items by key (identical pose)
    const keyGroups = new Map<string, string[]>();
    items.forEach((item) => {
      if (!keyGroups.has(item.key)) keyGroups.set(item.key, []);
      keyGroups.get(item.key)!.push(item.id);
    });

    // If only one unique key exists for this name, all share the baseName
    if (keyGroups.size === 1) {
      items.forEach((item) => variableMap.set(item.id, baseName));
    } else {
      // Multiple different poses share the same name. Suffix them.
      // E.g. Score (heading 90) and Score (heading 180).
      let variant = 1;
      // We can iterate keys but map iteration order isn't guaranteed stable across environments, though usually insertion order.
      // Let's sort keys to be deterministic? No, keys are data strings.
      // Better: Iterate original items and assign.

      const assignedVariants = new Map<string, string>(); // Key -> Name

      // Sort items by ID (line index) to ensure stability
      // ID format: "0_end", "0_control_0"
      items.sort((a, b) => {
        const [aIdx, aType] = a.id.split("_");
        const [bIdx, bType] = b.id.split("_");
        if (parseInt(aIdx) !== parseInt(bIdx))
          return parseInt(aIdx) - parseInt(bIdx);
        return aType.localeCompare(bType);
      });

      items.forEach((item) => {
        if (!assignedVariants.has(item.key)) {
          // First time seeing this variant
          if (variant === 1) {
            assignedVariants.set(item.key, baseName);
          } else {
            assignedVariants.set(item.key, `${baseName}_${variant}`); // Use underscore to differentiate from default numbering "Score2" which might conflict
          }
          variant++;
        }
        variableMap.set(item.id, assignedVariants.get(item.key)!);
      });
    }
  });

  return variableMap;
}

export async function generateJavaCode(
  startPoint: Point,
  lines: Line[],
  exportFullCode: boolean,
  sequence?: SequenceItem[],
  packageName: string = "org.firstinspires.ftc.teamcode.Commands.AutoCommands",
): Promise<string> {
  const headingTypeToFunctionName = {
    constant: "setConstantHeadingInterpolation",
    linear: "setLinearHeadingInterpolation",
    tangential: "setTangentHeadingInterpolation",
  };

  // Resolve variable names
  const varMap = resolvePoseVariables(lines, startPoint);

  // Collect unique variable declarations
  // We need to know the Pose data for each variable.
  // We can re-derive it or store it.
  const declarations = new Map<string, string>(); // VarName -> Constructor Code

  // Start Point
  const startPointName = "startPoint";
  // We treat start point specially?
  // lines[0] starts at startPoint.
  declarations.set(
    startPointName,
    `new Pose(${startPoint.x.toFixed(3)}, ${startPoint.y.toFixed(3)}, Math.toRadians(${startPoint.heading === "constant" ? startPoint.degrees : 0}))`,
  ); // Heading 0 for tangential start?

  lines.forEach((line, idx) => {
    // End Point
    const varName = varMap.get(`${idx}_end`)!;
    const p = line.endPoint;
    let headingVal = 0;
    if (p.heading === "constant") headingVal = p.degrees;
    else if (p.heading === "linear") headingVal = p.endDeg;

    // Check if declaration exists. If so, skip (shared).
    if (!declarations.has(varName)) {
      declarations.set(
        varName,
        `new Pose(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, Math.toRadians(${headingVal}))`,
      );
    }

    // Control Points
    line.controlPoints.forEach((cp, cIdx) => {
      const cpName = varMap.get(`${idx}_control_${cIdx}`)!;
      if (!declarations.has(cpName)) {
        declarations.set(
          cpName,
          `new Pose(${cp.x.toFixed(3)}, ${cp.y.toFixed(3)})`,
        );
      }
    });
  });

  // Collect all unique event marker names
  const eventMarkerNames = new Set<string>();
  lines.forEach((line) => {
    line.eventMarkers?.forEach((event) => {
      eventMarkerNames.add(event.name);
    });
  });
  if (sequence) {
    sequence.forEach((item) => {
      if ((item as any).kind === "wait" && (item as any).eventMarkers) {
        (item as any).eventMarkers.forEach((event: any) => {
          eventMarkerNames.add(event.name);
        });
      }
    });
  }

  // Path Chains
  // Requirement 8: "Path chains must always have unique variable names".
  // Base name logic: "startPoseTOendPose".

  const pathChainDecls: string[] = [];
  const pathBuilders: string[] = [];
  const pathChainNames = new Set<string>();

  lines.forEach((line, idx) => {
    // Determine start variable
    let startVar = startPointName;
    if (idx > 0) {
      startVar = varMap.get(`${idx - 1}_end`)!;
    }

    const endVar = varMap.get(`${idx}_end`)!;

    // Construct base name
    let baseName = `${startVar}TO${endVar}`;
    // If user provided a name for the line, prefer that?
    // "PathChain variable names using the sanitized line name... simplifying the legacy startPointTO... pattern" (Memory).
    // Memory says: "The Java code exporter generates PathChain variable names using the sanitized line name (e.g., score or line1)..."
    // So if line has a name, use it.

    if (line.name && line.name.trim() !== "") {
      baseName = sanitize(line.name);
      // If "Score" is the point name, and path is "Score", we get conflict if point variable is also "score".
      // Typically variable names for Poses are lowerCamel, PathChains maybe same?
      // If `Pose score` exists, `PathChain score` is a conflict.
      // Let's suffix path chains with "Path" if collision or always?
      // Requirement 8: "If multiple paths share a base name... generate differentiated names... scorePath, scorePath_1".
      baseName += "Path";
    }

    // Ensure uniqueness
    let uniqueName = baseName;
    let counter = 1;
    while (pathChainNames.has(uniqueName)) {
      uniqueName = `${baseName}_${counter}`;
      counter++;
    }
    pathChainNames.add(uniqueName);

    // Declaration
    pathChainDecls.push(`public PathChain ${uniqueName};`);

    // Builder
    const controlPoints = line.controlPoints
      .map((_, cIdx) => varMap.get(`${idx}_control_${cIdx}`))
      .join(", ");
    const cpArg = controlPoints ? `${controlPoints}, ` : "";
    const curveType =
      line.controlPoints.length > 0 ? "BezierCurve" : "BezierLine";

    const headingConfig =
      line.endPoint.heading === "constant"
        ? `Math.toRadians(${line.endPoint.degrees})`
        : line.endPoint.heading === "linear"
          ? `Math.toRadians(${line.endPoint.startDeg}), Math.toRadians(${line.endPoint.endDeg})`
          : "";

    const reverseConfig = line.endPoint.reverse ? ".setReversed(true)" : "";

    let eventMarkerCode = "";
    if (line.eventMarkers && line.eventMarkers.length > 0) {
      eventMarkerCode = line.eventMarkers
        .map(
          (event) =>
            `\n        .addEventMarker(${event.position.toFixed(3)}, "${event.name}")`,
        )
        .join("");
    }

    const builder = `${uniqueName} = follower.pathBuilder()
        .addPath(new ${curveType}(${startVar}, ${cpArg}${endVar}))
        .${headingTypeToFunctionName[line.endPoint.heading]}(${headingConfig})
        ${reverseConfig}${eventMarkerCode}
        .build();`;

    pathBuilders.push(builder);
  });

  let pathsClass = `
  public static class Paths {
    ${pathChainDecls.join("\n    ")}

    public Paths(Follower follower) {
      ${pathBuilders.join("\n\n      ")}
    }
  }
  `;

  // Add NamedCommands registration instructions
  let namedCommandsSection = "";
  if (eventMarkerNames.size > 0) {
    namedCommandsSection = `
    
    // ===== NAMED COMMANDS REGISTRATION =====
    // In your RobotContainer class, register named commands like this:
    // 
    // NamedCommands.registerCommand("CommandName", yourCommand);
    // 
    // Example for the event markers in this path:
    ${Array.from(eventMarkerNames)
      .map(
        (name) =>
          `// NamedCommands.registerCommand("${name}", your${name.replace(/_/g, "")}Command);`,
      )
      .join("\n    ")}
    
    // Make sure to register all named commands BEFORE creating any paths or autos.
    `;
  }

  let file = "";
  if (!exportFullCode) {
    file =
      AUTO_GENERATED_FILE_WARNING_MESSAGE + pathsClass + namedCommandsSection;
  } else {
    file = `
    ${AUTO_GENERATED_FILE_WARNING_MESSAGE}

    package ${packageName};
    import com.qualcomm.robotcore.eventloop.opmode.OpMode;
    import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
    import com.bylazar.configurables.annotations.Configurable;
    import com.bylazar.telemetry.TelemetryManager;
    import com.bylazar.telemetry.PanelsTelemetry;
    import org.firstinspires.ftc.teamcode.pedroPathing.Constants;
    import com.pedropathing.geometry.BezierCurve;
    import com.pedropathing.geometry.BezierLine;
    import com.pedropathing.follower.Follower;
    import com.pedropathing.paths.PathChain;
    import com.pedropathing.geometry.Pose;
    ${eventMarkerNames.size > 0 ? "import com.pedropathing.NamedCommands;" : ""}
    
    @Autonomous(name = "Pedro Pathing Autonomous", group = "Autonomous")
    @Configurable // Panels
    public class PedroAutonomous extends OpMode {
      private TelemetryManager panelsTelemetry; // Panels Telemetry instance
      public Follower follower; // Pedro Pathing follower instance
      private int pathState; // Current autonomous path state (state machine)
      private Paths paths; // Paths defined in the Paths class
      
      @Override
      public void init() {
        panelsTelemetry = PanelsTelemetry.INSTANCE.getTelemetry();

        follower = Constants.createFollower(hardwareMap);
        follower.setStartingPose(new Pose(${startPoint.x.toFixed(3)}, ${startPoint.y.toFixed(3)}, Math.toRadians(${startPoint.heading === "constant" ? startPoint.degrees : 0})));

        paths = new Paths(follower); // Build paths

        panelsTelemetry.debug("Status", "Initialized");
        panelsTelemetry.update(telemetry);
      }
      
      @Override
      public void loop() {
        follower.update(); // Update Pedro Pathing
        pathState = autonomousPathUpdate(); // Update autonomous state machine

        // Log values to Panels and Driver Station
        panelsTelemetry.debug("Path State", pathState);
        panelsTelemetry.debug("X", follower.getPose().getX());
        panelsTelemetry.debug("Y", follower.getPose().getY());
        panelsTelemetry.debug("Heading", follower.getPose().getHeading());
        panelsTelemetry.update(telemetry);
      }

      ${pathsClass}

      public int autonomousPathUpdate() {
          // Event markers will automatically trigger at their positions
          // Make sure to register NamedCommands in your RobotContainer
          return pathState;
      }
      
      ${namedCommandsSection}
    }
    `;
  }

  try {
    const formattedCode = await prettier.format(file, {
      parser: "java",
      plugins: [prettierJavaPlugin],
    });
    return formattedCode;
  } catch (error) {
    console.error("Code formatting error:", error);
    return file;
  }
}

/**
 * Generate an array of waypoints (not sampled points) along the path
 */
export function generatePointsArray(startPoint: Point, lines: Line[]): string {
  const points: BasePoint[] = [];

  // Add start point
  points.push(startPoint);

  // Add all waypoints (end points and control points)
  lines.forEach((line) => {
    // Add control points for this line
    line.controlPoints.forEach((controlPoint) => {
      points.push(controlPoint);
    });

    // Add end point of this line
    points.push(line.endPoint);
  });

  // Format as string array, removing decimal places for whole numbers
  const pointsString = points
    .map((point) => {
      const x = Number.isInteger(point.x)
        ? point.x.toFixed(1)
        : point.x.toFixed(3);
      const y = Number.isInteger(point.y)
        ? point.y.toFixed(1)
        : point.y.toFixed(3);
      return `(${x}, ${y})`;
    })
    .join(", ");

  return `[${pointsString}]`;
}

/**
 * Generate Sequential Command code
 */
export async function generateSequentialCommandCode(
  startPoint: Point,
  lines: Line[],
  fileName: string | null = null,
  sequence?: SequenceItem[],
  targetLibrary: "SolversLib" | "NextFTC" = "SolversLib",
  packageName: string = "org.firstinspires.ftc.teamcode.Commands.AutoCommands",
): Promise<string> {
  // Determine class name from file name or use default
  let className = "AutoPath";
  if (fileName) {
    const baseName = fileName.split(/[\\/]/).pop() || "";
    className = baseName.replace(".pp", "").replace(/[^a-zA-Z0-9]/g, "_");
    if (!className) className = "AutoPath";
  }

  // Resolve variable names (same logic as main export)
  const varMap = resolvePoseVariables(lines, startPoint);

  // Build Pose Declarations and Inits
  const declarations = new Map<string, string>(); // VarName -> Constructor (not used here but for checking existence)
  const allPoseDeclarations: string[] = [];
  const allPoseInitializations: string[] = [];
  const processedVars = new Set<string>();

  // Helper to add declaration
  const addDecl = (varName: string, originalName: string) => {
    if (processedVars.has(varName)) return;
    processedVars.add(varName);
    allPoseDeclarations.push(`    private Pose ${varName};`);
    // For sequential, we use pp.get("name").
    // The "name" in pp.get should match what the user set in the UI if possible,
    // OR we need to map the variable name to the UI name.
    // Actually `pp.get` retrieves by the stored name in the .pp file.
    // If we saved the file with unique names "Score", "Score (1)", we need to know that.
    // But `lines` passed here are the *loaded* lines in memory.
    // `pp.get` works on the file loaded on the robot.
    // If the user saves the project, we rename duplicates to "Score (1)".
    // So `pp.get("Score (1)")` is valid.
    // Does `line.name` here reflect "Score (1)"?
    // `lines` in memory usually have the "shared" name if linked, OR "Score (1)" if they were just loaded and not re-linked?
    // `restoreLinks` sets `name` back to `_linkedName`.
    // So in memory, 5 lines might all be named "Score".
    // But on disk, they are "Score", "Score (1)", etc.
    // This creates a disconnect. The code generator runs on *memory* state.
    // The robot runs on *file* state.
    // We need to simulate the file naming logic here to generate the correct `pp.get` keys.

    // Let's replicate `prepareLinesForSave` logic locally to find the "File Name".
  };

  // Replicate saving logic to map Line -> File Name
  const lineToFileName = new Map<string, string>(); // Line ID -> File Name
  const counts = new Map<string, number>();
  lines.forEach((l) => {
    if (l.name && l.name.trim() !== "") {
      counts.set(l.name, (counts.get(l.name) || 0) + 1);
    }
  });
  const currentIndices = new Map<string, number>();

  lines.forEach((l) => {
    if (!l.name || l.name.trim() === "") {
      // Unnamed lines don't get named Poses in .pp usually?
      // Actually they are just objects in the list.
      // But `pp.get(name)` implies named poses.
      // If a line is unnamed, `pp.get` won't work unless we generated a name for it in the save?
      // The current save logic (JSON.stringify) saves the array.
      // The `PedroPathReader` on the robot likely iterates the list or keys?
      // Standard PedroPathing uses `pp.get("name")` for named poses.
      // Unnamed poses might not be accessible via get?
      // If so, we can't use `pp.get`.
      // But `generateSequentialCommandCode` relies on `pp.get`.
      // We must assume the user Namer their points if they want to use this exporter.
      // Or we use the index-based retrieval if supported.
      // Let's assume `pp.get` matches `line.name`.
      // If in memory `line.name` is "Score", and we have 2 of them.
      // File has "Score" and "Score (1)".
      // We need to match that.
      // Code below:
    }

    let fileName = l.name;
    if (fileName && counts.get(fileName)! > 1) {
      const idx = (currentIndices.get(fileName) || 0) + 1;
      currentIndices.set(fileName, idx);
      if (idx > 1) fileName = `${fileName} (${idx - 1})`;
    }
    if (l.id) lineToFileName.set(l.id, fileName || "");
  });

  // Start Point
  // Start point is always just "startPoint" in this generator context
  addDecl("startPoint", "startPoint");
  allPoseInitializations.push('        startPoint = pp.get("startPoint");');

  lines.forEach((line, idx) => {
    const varName = varMap.get(`${idx}_end`)!;
    if (!processedVars.has(varName)) {
      processedVars.add(varName);
      allPoseDeclarations.push(`    private Pose ${varName};`);

      // Determine key for pp.get
      const fileName = lineToFileName.get(line.id!) || `point${idx + 1}`; // Fallback
      // If multiple lines map to same varName (shared pose),
      // we only init it once. We can use ANY of the file names that correspond to this pose.
      // Ideally the first one.
      allPoseInitializations.push(
        `        ${varName} = pp.get("${fileName}");`,
      );
    }

    // Control points
    line.controlPoints.forEach((_, cIdx) => {
      const cpVar = varMap.get(`${idx}_control_${cIdx}`)!;
      if (!processedVars.has(cpVar)) {
        processedVars.add(cpVar);
        allPoseDeclarations.push(`    private Pose ${cpVar};`);

        // Control point names in file?
        // `prepareLinesForSave` doesn't rename control points explicitly because they are children.
        // But `PedroPathReader` might expose them?
        // If not exposed, we can't get them.
        // Assuming `PedroPathReader` flattens or we don't use them in Sequential?
        // The original code generated `pp.get("pointName_controlN")`.
        // So we need to match that convention.
        const parentFileName =
          lineToFileName.get(line.id!) || `point${idx + 1}`;
        const cpFileName = `${parentFileName}_control${cIdx + 1}`; // Implicit convention
        allPoseInitializations.push(
          `        ${cpVar} = pp.get("${cpFileName}");`,
        );
      }
    });
  });

  // Generate path chain declarations
  // Requirement: Unique variable names.
  const pathChainDeclarations = lines.map((line, idx) => {
    let startVar = "startPoint";
    if (idx > 0) startVar = varMap.get(`${idx - 1}_end`)!;
    const endVar = varMap.get(`${idx}_end`)!;

    // Base name
    let baseName = `${startVar}TO${endVar}`;
    if (line.name && line.name.trim() !== "") {
      baseName = sanitize(line.name) + "Path";
    }

    // We need unique names for the chains
    // We can't easily detect conflicts without global set.
    // But map is local to this map loop.
    // Let's use the same dedupe logic as above.
    return baseName;
  });

  // Dedupe path chain names
  const finalPathChainNames: string[] = [];
  const pcnSet = new Set<string>();
  pathChainDeclarations.forEach((base) => {
    let unique = base;
    let c = 1;
    while (pcnSet.has(unique)) {
      unique = `${base}_${c}`;
      c++;
    }
    pcnSet.add(unique);
    finalPathChainNames.push(unique);
  });

  const pathChainDeclCode = finalPathChainNames
    .map((n) => `    private PathChain ${n};`)
    .join("\n");

  // Generate ProgressTracker field
  const progressTrackerField = `    private final ProgressTracker progressTracker;`;

  // Define library-specific names
  const isNextFTC = targetLibrary === "NextFTC";
  const SequentialGroupClass = isNextFTC
    ? "SequentialGroup"
    : "SequentialCommandGroup";
  const ParallelRaceClass = isNextFTC
    ? "ParallelRaceGroup"
    : "ParallelRaceGroup";
  const WaitCmdClass = isNextFTC ? "Delay" : "WaitCommand";
  const InstantCmdClass = "InstantCommand";
  const WaitUntilCmdClass = isNextFTC ? "WaitUntil" : "WaitUntilCommand";
  const FollowPathCmdClass = isNextFTC ? "FollowPath" : "FollowPathCommand";

  // Generate addCommands calls with event handling; iterate sequence if provided
  const commands: string[] = [];

  const defaultSequence: SequenceItem[] = lines.map((ln, idx) => ({
    kind: "path",
    lineId: ln.id || `line-${idx + 1}`,
  }));

  const seq = sequence && sequence.length ? sequence : defaultSequence;

  seq.forEach((item, idx) => {
    if (item.kind === "wait") {
      const waitItem: any = item as any;
      const waitDuration = waitItem.durationMs || 0;

      const markers: any[] = Array.isArray(waitItem.eventMarkers)
        ? [...waitItem.eventMarkers]
        : [];

      // Determine wait value and formatting
      // NextFTC Delay uses seconds, SolversLib WaitCommand uses ms
      const getWaitValue = (ms: number) =>
        isNextFTC ? (ms / 1000.0).toFixed(3) : ms.toFixed(0);

      if (markers.length === 0) {
        commands.push(
          `                new ${WaitCmdClass}(${getWaitValue(waitDuration)})`,
        );
        return;
      }

      // Sort markers by position (0-1) to schedule in order
      markers.sort((a, b) => (a.position || 0) - (b.position || 0));

      let scheduled = 0;
      const markerCommandParts: string[] = [];

      markers.forEach((marker) => {
        const targetMs =
          Math.max(0, Math.min(1, marker.position || 0)) * waitDuration;
        const delta = Math.max(0, targetMs - scheduled);
        scheduled = targetMs;

        markerCommandParts.push(
          `new ${WaitCmdClass}(${getWaitValue(delta)}), new ${InstantCmdClass}(() -> progressTracker.executeEvent("${marker.name}"))`,
        );
      });

      const remaining = Math.max(0, waitDuration - scheduled);
      markerCommandParts.push(
        `new ${WaitCmdClass}(${getWaitValue(remaining)})`,
      );

      commands.push(
        `                new ${ParallelRaceClass}(
                    new ${WaitCmdClass}(${getWaitValue(waitDuration)}),
                    new ${SequentialGroupClass}(${markerCommandParts.join(",")})
                )`,
      );
      return;
    }

    const lineIdx = lines.findIndex((l) => l.id === (item as any).lineId);
    if (lineIdx < 0) {
      return; // skip if sequence references a missing line
    }
    const line = lines[lineIdx];
    if (!line) {
      return;
    }

    const pathName = finalPathChainNames[lineIdx];
    const pathDisplayName = pathName; // Use variable name as display name or `line.name`? Display name is for telemetry.

    // Construct FollowPath instantiation
    const followPathInstance = isNextFTC
      ? `new ${FollowPathCmdClass}(${pathName})`
      : `new ${FollowPathCmdClass}(follower, ${pathName})`;

    if (line.eventMarkers && line.eventMarkers.length > 0) {
      // Path has event markers

      // First: InstantCommand to set up tracker
      commands.push(
        `                new ${InstantCmdClass}(
                    () -> {
                        progressTracker.setCurrentChain(${pathName});
                        progressTracker.setCurrentPathName("${pathDisplayName}");`,
      );

      // Add event registrations
      line.eventMarkers.forEach((event) => {
        commands[commands.length - 1] += `
                        progressTracker.registerEvent("${event.name}", ${event.position.toFixed(3)});`;
      });

      commands[commands.length - 1] += `
                    })`;

      // Second: ParallelRaceGroup for following path with event handling
      commands.push(`                new ${ParallelRaceClass}(
                    ${followPathInstance},
                    new ${SequentialGroupClass}(`);

      // Add WaitUntilCommand for each event
      line.eventMarkers.forEach((event, eventIdx) => {
        if (eventIdx > 0) commands[commands.length - 1] += ",";
        commands[commands.length - 1] += `
                        new ${WaitUntilCmdClass}(() -> progressTracker.shouldTriggerEvent("${event.name}")),
                        new ${InstantCmdClass}(
                            () -> {
                                progressTracker.executeEvent("${event.name}");
                            })`;
      });

      commands[commands.length - 1] += `
                    ))`;
    } else {
      // No event markers - simple InstantCommand + FollowPathCommand
      commands.push(
        `                new ${InstantCmdClass}(
                    () -> {
                        progressTracker.setCurrentChain(${pathName});
                        progressTracker.setCurrentPathName("${pathDisplayName}");
                    }),
                ${followPathInstance}`,
      );
    }
  });

  // Generate path building
  const pathBuilders = lines
    .map((line, idx) => {
      const startVar = idx === 0 ? "startPoint" : varMap.get(`${idx - 1}_end`)!;
      const endVar = varMap.get(`${idx}_end`)!;
      const pathName = finalPathChainNames[idx];

      const isCurve = line.controlPoints.length > 0;
      const curveType = isCurve ? "BezierCurve" : "BezierLine";

      // Build control points string
      let controlPointsStr = "";
      if (isCurve) {
        const controlPoints = line.controlPoints
          .map((_, cIdx) => varMap.get(`${idx}_control_${cIdx}`))
          .join(", ");
        controlPointsStr = controlPoints + ", ";
      }

      // Determine heading interpolation
      let headingConfig = "";
      if (line.endPoint.heading === "constant") {
        headingConfig = `setConstantHeadingInterpolation(${endVar}.getHeading())`;
      } else if (line.endPoint.heading === "linear") {
        headingConfig = `setLinearHeadingInterpolation(${startVar}.getHeading(), ${endVar}.getHeading())`;
      } else {
        headingConfig = `setTangentHeadingInterpolation()`;
      }

      // Build reverse config
      const reverseConfig = line.endPoint.reverse
        ? "\n                .setReversed(true)"
        : "";

      return `        ${pathName} = follower.pathBuilder()
            .addPath(new ${curveType}(${startVar}, ${controlPointsStr}${endVar}))
            .${headingConfig}${reverseConfig}
            .build();`;
    })
    .join("\n\n        ");

  // Generate imports based on library
  let imports = "";
  if (isNextFTC) {
    imports = `
import dev.nextftc.core.command.groups.SequentialGroup;
import dev.nextftc.core.command.groups.ParallelRaceGroup;
import dev.nextftc.core.command.Delay;
import dev.nextftc.core.command.WaitUntil;
import dev.nextftc.core.command.InstantCommand;
import dev.nextftc.extensions.pedro.command.FollowPath;
`;
  } else {
    imports = `
import com.seattlesolvers.solverslib.command.SequentialCommandGroup;
import com.seattlesolvers.solverslib.command.ParallelRaceGroup;
import com.seattlesolvers.solverslib.command.WaitUntilCommand;
import com.seattlesolvers.solverslib.command.WaitCommand;
import com.seattlesolvers.solverslib.command.InstantCommand;
import com.seattlesolvers.solverslib.pedroCommand.FollowPathCommand;
`;
  }

  const sequentialCommandCode = `
${AUTO_GENERATED_FILE_WARNING_MESSAGE}

package ${packageName};
    
import com.pedropathing.follower.Follower;
import com.pedropathing.geometry.BezierCurve;
import com.pedropathing.geometry.BezierLine;
import com.pedropathing.geometry.Pose;
import com.pedropathing.paths.PathChain;
import com.qualcomm.robotcore.hardware.HardwareMap;
${imports}
import org.firstinspires.ftc.robotcore.external.Telemetry;
import com.pedropathingplus.PedroPathReader;
import com.pedropathingplus.pathing.ProgressTracker;
import com.pedropathingplus.pathing.NamedCommands;
import java.io.IOException;
import ${packageName.split(".").slice(0, 4).join(".")}.Subsystems.Drivetrain;

public class ${className} extends ${SequentialGroupClass} {

    private final Follower follower;
${progressTrackerField}

    // Poses
${allPoseDeclarations.join("\n")}

    // Path chains
${pathChainDeclCode}

    public ${className}(final Drivetrain drive, HardwareMap hw, Telemetry telemetry) throws IOException {
        this.follower = drive.getFollower();
        this.progressTracker = new ProgressTracker(follower, telemetry);

        PedroPathReader pp = new PedroPathReader("${fileName ? fileName.split(/[\\/]/).pop() || "AutoPath.pp" : "AutoPath.pp"}", hw.appContext);

        // Load poses
${allPoseInitializations.join("\n")}

        follower.setStartingPose(startPoint);

        buildPaths();

        addCommands(
${commands.join(",\n")}
        );
    }

    public void buildPaths() {
        ${pathBuilders}
    }
}
`;

  try {
    const formattedCode = await prettier.format(sequentialCommandCode, {
      parser: "java",
      plugins: [prettierJavaPlugin],
    });
    return formattedCode;
  } catch (error) {
    console.error("Code formatting error:", error);
    return sequentialCommandCode;
  }
}
