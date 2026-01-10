# Release Notes

## Version 1.5.1 (2026-01-08)

### Fixes & Stability
*   **Fixed Critical Error on Windows:** Addressed a severe issue that was causing crashes on Windows systems. This update restores stability and ensures the application runs reliably for Windows users.

### User Interface
*   **Waypoint Menu Context:** Added more context to the waypoint menu to provide users with relevant information at a glance, making navigation and editing more intuitive.

---

## Version 1.5.0 (2026-01-07)

### New Features
*   **Credits and Legal Section:** Added a dedicated section in settings for credits and legal information to properly acknowledge contributors and libraries.
*   **Animated PNG (APNG) Export:** Users can now export their path visualizations as Animated PNGs, offering a high-quality alternative to GIFs.
*   **Duplicate Keybind (Shift+D):** Introduced a new keybind to quickly duplicate elements, speeding up the workflow.
*   **Field View Controls:** Added zoom controls, panning capabilities, and keyboard shortcuts to the Field View for better navigation and inspection of paths.
*   **Waypoint Table Context Menu:** A right-click context menu has been added to the waypoint table, providing quick access to common actions.
*   **Reverse Path Tool:** New tool to easily reverse the direction of a path.
*   **Field Boundary Validation:** Added validation and drag restrictions to prevent points from being placed outside the field boundaries. This is configurable in settings.
*   **Sticky Header:** The waypoint table now has a sticky header, ensuring column names remain visible while scrolling through long lists.
*   **Name-Based Linking:** Implemented name-based linking for waypoints and wait events, which is supported by the Java exporter.
*   **Safety Validation:** Added validation to prevent the creation of zero-length paths, which could cause issues during execution.

### User Interface & Experience
*   **UI Overhaul:** A major overhaul of the Navbar and Keybinds UI to improve aesthetics and usability.
*   **Unified UI:** Unified the wait and path UI to provide a consistent experience across different modes.
*   **Auto-Open File Manager:** For untitled projects, the file manager now automatically opens on save to prompt for a file location.
*   **Save Icon:** Updated the save icon for better visual clarity.
*   **Tooltips:** Added numerous tooltips throughout the application to guide users and explain features.

### Improvements & Optimizations
*   **Optimization Mutation Strength:** Increased the strength of optimization mutations to potentially find better path solutions faster.
*   **Field Rendering Logic:** Optimized the logic for rendering the field to improve performance and reduce lag.
*   **Backend Testing:** Dramatically improved backend testing to catch bugs early and ensure a stable release.
*   **Export Dialog:** Improved the export dialog for a smoother user experience.
*   **TypeScript & Svelte Errors:** Resolved numerous internal code errors to improve code quality and maintainability.

---

## Version 1.4.3 (2026-01-03)

### Fixes
*   **Critical Settings Error:** Fixed a critical bug where stale or undefined settings caused the application to break across versions.
*   **Unexpected Behavior:** Addressed unexpected behaviors in motion profiling to ensure consistent results.

### Features
*   **Realistic Motion Profiling:** Implemented realistic motion profiling for path segments to better simulate robot behavior.
*   **Path Validation & Collision Visualization:** Added validation for paths and visualization for collisions to help users design safer paths.
*   **Drag-and-Drop Reordering:** Users can now reorder control points via drag-and-drop as well as buttons, offering more flexible editing.

### User Interface
*   **File Manager Overhaul:** Completely overhauled the File Manager UI to improve scalability and user experience.
*   **Credits Section:** Added a credits section to the settings dialog.

---

## Version 1.4.2 (2025-12-31)

### Fixes
*   **Critical Settings Load Failure:** specific "Fast Fix" for an issue where settings were not loading properly, leading to critical application failures.

---

## Version 1.4.1 (2025-12-30)

### Improvements
*   **Performance Optimization:** Optimized optimization and field logic to eliminate laggy behavior and improve responsiveness.
*   **Multiple Windows:** Allowed opening multiple application windows easily to work on multiple projects simultaneously.
*   **Testing:** Improved code testing for better reliability.

### Features
*   **Export .pp File:** Added functionality to export projects as `.pp` files.
*   **File Association:** Implemented `.pp` file association so double-clicking a project file opens it in the application.
*   **Settings Decoupling:** Decoupled settings from project files to allow global application preferences to persist independently of projects.

---

## Version 1.3.5 (2025-12-30)

### Features & Enhancements
*   **Wait Lock Toggle:** Added a lock toggle for wait events in the table view to prevent accidental edits.
*   **Color Picker:** Added a color picker to the table for easier path customization.
*   **Drag and Drop Support:** Added drag and drop support to the paths tab for better organization.
*   **App Loading Animation:** Introduced a loading animation on boot for a more polished startup experience.
*   **Copy Markdown Table:** Added an option to copy the table data as a Markdown table.
*   **GIF Export Revamp:** Revamped GIF export with preview functionality and quality settings.
*   **Configurable Java Package:** Added a setting to configure the Java package name for exports.

### User Interface
*   **Visual Improvements:**
    *   Lined up trash cans in the table view.
    *   Updated settings icon for light mode support.
    *   Standardized delete buttons to use the trash can icon.
    *   Update protractor icon from ↻ to ➜ for clarity.
*   **Visualizer:** Fixed visualizer behavior on heading changes and added visual indication for the selected path in field view.

### Fixes
*   **Ordering:** Improved new line/wait ordering.
*   **Math & Logic:** Fixed safety margin in optimization code and angular momentum calculation for path time.
*   **Undo/Redo:** Preserved onion layer visibility during undo/redo operations.
*   **Dimensions:** Fixed robot dimensions naming discrepancy.
*   **Security:** Applied security fixes.
*   **Code Generation:** Added a generated-code warning header (Issue 50).

### Miscellaneous
*   **Initialization:** Initialize paths with empty names.
*   **Settings Reset:** Improved capabilities to reset settings.
*   **File Formatting:** Prettified JSON in `.pp` files.
*   **UI Tweaks:** Double-clicking resizer defaults to 50% scale; code exporter dropdown auto-closes.

---

## Version 1.3.4 (2025-12-28)

### Fixes
*   **Intel Mac Support:** Addressed issues specifically affecting Intel-based Mac systems to ensure compatibility.

---

## Version 1.3.3 (2025-12-28)

### Features
*   **Sidebar Toggle:** Added a toggle for the sidebar to maximize workspace when needed.
*   **Playback Speed Controller:** Introduced a controller to adjust the playback speed of the path visualization.
*   **Keybind Features:** Greatly enhanced keybind features for better accessibility and workflow speed.

### Improvements
*   **Backend Reformatting:** Conducted major backend reformatting to improve code structure.

---

## Version 1.3.2 (2025-12-28)

### Features
*   **ARIA Labels:** Added ARIA labels to improve accessibility.
*   **Downloads Counter:** Added a display for the number of downloads.
*   **Help Menu:** Added application help to the Mac header menu.
*   **Resize Control Tag:** Added an option to resize the Control tag.
*   **Path Optimization:** Enhanced path optimization to avoid obstacles.

### User Interface
*   **Export Dialog:** Overhauled the Export Dialog UI for better usability.
*   **Delete Option:** Added a delete option to the table.
*   **Formatting:** Many dynamic reformatting changes.

### Fixes & Security
*   **Mirroring:** Fixed mirroring of tangential points.
*   **Security:** Implemented security enhancements.

---

## Version 1.3.1 (2025-12-26)

### Features
*   **Field Rotate:** Added a feature to rotate the field view.
*   **Mouse Coordinates:** Added a display for field coordinates at the mouse position.
*   **Recent View:** Added a "Recent" view in the File Manager to quickly access recently opened projects.
*   **Waypoint Tab:** Added a dedicated waypoint tab for a different path-making experience.
*   **Keybind Shortcuts:** Added support for selected path actions via optimized keybind shortcuts.
*   **Collapse/Expand:** Added an option to collapse or expand all items in lists.

---

## Version 1.3.0 (2025-12-26)

### Features
*   **Keyboard Shortcuts Menu:** Added a menu to view and manage keyboard shortcuts.
*   **Updater:** Integrated an auto-updater mechanism.
*   **NextFTC Support:** Added experimental support for NextFTC.
*   **PedroPathingPlus:** Now uses the PedroPathingPlus Gradle library.

### User Interface
*   **Control Tab Layout:** Improved the layout of the control tab.

---

## Version 1.2.9 (2025-12-25)

### Features
*   **Event Markers:** Added event markers for wait steps, including support for SolversLib.
*   **Customizable Keybinds:** Users can now customize keyboard shortcuts in the Settings menu.

---

## Version 1.2.8 (2025-12-23)

### Features
*   **Timeline Markers:** Added markers to the timeline for better visualization of events.
*   **Path Optimizer:** Integrated a path optimizer based on the PathPlanner algorithm.
*   **Optimization Settings:** Added specific settings for configuring the path optimization behavior.

---

## Version 1.2.7 (2025-12-21)

### Features
*   **Skip Version:** The "Skip version" feature in updates now functions correctly.
*   **Append Paths:** Added the ability to create paths after the starting point.
*   **Sequence Reordering:** Added functionality to reorder sequences.
*   **Double-Click Creation:** Users can now double-click to create paths.

### Fixes
*   **General Bug Fixes:** addressed various minor bugs.

---

## Version 1.2.6 (2025-12-21)

### Fixes
*   **File Importer:** Fixed issues with the file importer.
*   **Wait Header:** Corrected the display of the wait header.

---

## Version 1.2.5 (2025-12-21)

### Features
*   **Unlimited Instances:** Allowed unlimited instances of the app to run simultaneously.
*   **GIF Export:** Added support for exporting visualizations as GIFs.
*   **Architecture Support:** Testing support for x86_64 (amd64) architectures.

---

## Version 1.2.4 (2025-12-21)

### Features
*   **Onion Skinning:** Added onion skinning to see previous and next frames/paths.
*   **Undo/Redo:** Implemented Undo and Redo functionality to easily revert changes.

---

## Version 1.2.3 (2025-12-19)

### Features
*   **Snap to Grid:** Added a feature to snap points to a grid for precise placement.
*   **Wait Commands:** Added wait commands to the path sequencing.

### Improvements
*   **Drag Behavior:** Improved the behavior of dragging elements.
*   **File Manager:** Made the file manager more robust.
*   **Backend Refactoring:** Major backend refactoring to improve code readability and maintainability.

---

## Version 1.2.2 (2025-12-08)

### Improvements
*   **Theme Selection:** Moved theme selection to the settings menu.
*   **File Manager:** Enhanced file manager to fix directory issues for some users and added file renaming support.
*   **Heading Initialization:** Quick fix to improve how headings are initialized.
*   **Icon:** Updated the application icon.

---

## Version 1.2.1 (2025-12-06)

### Fixes
*   **Drag Blocking:** Quick fix to hard block all image/field dragging to ensure a stable interface.

---

## Version 1.2.0 (2025-12-05)

### Features
*   **Events:** Introduced Events! (Marked as Experimental).

---

## Version 1.1.9 (2025-12-05)

### User Interface
*   **Settings Menu:** Completely rehauled the settings menu for better navigation.
*   **Selectable Field:** Added an option to select the field.
*   **Version Display:** Added application version display in settings.
*   **Protractor:** Improved the placement of the navbar protractor.

---

## Version 1.1.8 (2025-12-04)

### Improvements
*   **Persistent Settings:** Added persistent memory for settings so they remain after restart.
*   **Settings Rename:** Renamed "FPA Settings" to simply "settings".
*   **Security:** Implemented security improvements.
*   **Cleanup:** Performed backend code cleanup.

---

## Version 1.1.7 (2025-12-03)

### Features
*   **Lock Function:** Added a lock function to paths and start points to prevent accidental movement.

### Improvements
*   **Labels:** Improved header labels.
*   **Settings:** Better FPA settings.
*   **Visual Stability:** Improved time calculations and fixed header jumping during autos.

---

## Version 1.1.6 (2025-12-03)

### Internal
*   **Executables:** Attempting to add new executables for distribution.

---

## Version 1.1.5 (2025-12-01)

### Improvements
*   **Installation:** Added an application icon and improved installation steps.
*   **Safety Warning:** Added a warning if attempting an unsafe manual install.

---

## Version 1.1.4 (2025-12-01)

### Fixes
*   **Release Logs:** Fixed issues with release logs.

---

## Version 1.1.3 (2025-12-01)

### Fixes
*   **Minor Fixes:** Addressed various minor issues.

---

## Version 1.1.2 (2025-12-01)

### Internal
*   **Tag Testing:** Internal testing of version tags.

---

## Version 1.1.1 (2025-12-01)

### Infrastructure
*   **Release System:** Added DMG support and an auto-release system to streamline updates.
