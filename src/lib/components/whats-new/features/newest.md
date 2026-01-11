### What's New!

**Features:**

- **Path Validation Tool:**
  - A new "Validate" button in the robot position display checks your path for issues.
  - Detects **collisions** with obstacles and field boundaries.
  - Identifies **zero-length path segments** that could cause errors.
  - Provides clear success or error notifications.
- **Code Export Improvements:**
  - **State Machine Generation:** The Java exporter now generates robust `switch-case` state machines with `ElapsedTime` timers for better autonomous path reliability.
  - **Rotation Support:** Rotations are now fully supported in the generated code.
- **Path Optimization:**
  - Access the Path Optimizer directly from the field view with the new "Optimize" button.
- **Event Markers for Rotations:** You can now add event markers to rotation steps in the timeline, just like you can for paths and waits. These markers are visualized with a circular arrow in the timeline.
- **Enhanced "What's New" Dialog:**
  - **Search:** Quickly find specific features or documentation using the new search bar.
  - **Release Notes:** Browse the full history of changes in the new "Release Notes" view.
  - **Keyboard Shortcut:** Press `Shift + N` to quickly open the "What's New" dialog.
  - **New Documentation:** Added comprehensive guides for Event Markers, Exporting Code, File Management, Obstacles, Path Optimization, Path Editing, Settings, and Simulation.
- **Improved Keyboard Navigation:** Extensive new shortcuts for navigating focus and manipulating selections, making it easier to use the app without a mouse.
- **Simulation & Export:**
  - **Export Cancellation:** You can now cancel GIF and APNG exports while they are processing.
  - **Timeline Improvements:** The playback timeline now displays waits, rotates, and event markers, providing a more helpful and intuitive creation process.
- **User Interface:**
  - **Standardized Inputs:** Input fields for 'Wait' and 'Rotate' commands now use consistent labels and placeholders.

## **Bug Fixes:**
