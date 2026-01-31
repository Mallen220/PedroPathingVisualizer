# Feature: Camera Follow Robot

## Problem

When users zoom in to inspect details of their path, the robot can move out of the viewport during simulation playback. Users have to manually pan to keep the robot in view, which is tedious and imprecise.

## Solution

Implement a "Follow Robot" mode that automatically pans the field view to keep the robot centered during playback.

## Implementation Details

1.  **State Management**: Add `followRobotStore` to `src/lib/projectStore.ts`.
2.  **UI**: Add a toggle button in `PlaybackControls.svelte`.
3.  **Field Renderer**:
    - Expose `onUserInteraction` callback in `FieldRenderer.svelte` to detect manual pan/zoom.
    - Trigger this callback when the user manually interacts with the field.
4.  **Application Logic**:
    - In `App.svelte`, listen to `robotXYStore`.
    - If `followRobotStore` is true, call `fieldRenderer.panToField()` to center the robot.
    - If `onUserInteraction` fires, disable `followRobotStore` to prevent fighting the user.

## Verification

- Start playback.
- Zoom in.
- Enable "Follow Robot".
- Verify the camera tracks the robot.
- Manually pan the field.
- Verify "Follow Robot" disables automatically.
