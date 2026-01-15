# PedroPathingPlus

**PedroPathingPlus** is an advanced pathing library for the FIRST Tech Challenge (FTC), built on top of the powerful [Pedro Pathing](https://github.com/Pedro-Pathing/PedroPathing) library and integrating robust command-based structures.

> [!IMPORTANT]
> **STAY TUNED!**
> This repository is currently undergoing **rapid and constant updates**.
> Major improvements are planned for the coming weeks, including the ability to **run entire autonomous routines directly from `.pp` files**.
> Please watch this repository to stay up-to-date with the latest features and changes.

---

## 🎨 Pedro Pathing Visualizer

This library is designed to work hand-in-hand with the **Pedro Pathing Visualizer**, a powerful desktop application for planning, simulating, and exporting your autonomous routines.

**[Download Pedro Pathing Visualizer](https://github.com/Mallen220/PedroPathingVisualizer/releases)**

The Visualizer powers PedroPathingPlus by providing:
- **Visual Path Editing:** Intuitive drag-and-drop interface for Bezier curves and path chains.
- **Simulation:** Real-time physics simulation to verify your paths before they run on the robot.
- **Local File Management:** Save and organize `.pp` files directly on your machine.
- **Code & File Export:** Seamlessly export to Java code or `.pp` files for the upcoming execution engine.

---

## 📥 Installation

To use PedroPathingPlus in your FTC project, follow these steps:

### 1. Add Repositories

Add the following repositories to your `build.gradle` (Module: app) or `settings.gradle` file:

```groovy
maven { url "https://repo.dairy.foundation/releases" }

maven { url = 'https://mymaven.bylazar.com/releases' }

maven { url 'https://jitpack.io' }
```

### 2. Add Dependencies

Add the dependencies to your `build.gradle` (Module: app) dependencies block:

```groovy
dependencies {
    // PedroPathingPlus
    implementation 'com.github.Mallen220:PedroPathingPlus:master-SNAPSHOT' // or use a specific tag

    // Core Dependencies
    implementation 'com.pedropathing:ftc:2.0.0'
    implementation 'org.solverslib:core:0.3.3' // Will be replaced with PedproPathingPlus-specific version in future
    implementation 'org.solverslib:pedroPathing:0.3.3'
}
```

---

## 🚀 Upcoming Features

We are working hard to bring you:
- **Direct `.pp` Execution:** Run autonomous routines defined in `.pp` files without writing boilerplate Java code.
- **Enhanced Command Integration:** Tighter integration with the command-based paradigm.
- **Improved Documentation:** Comprehensive guides and examples.

---

**Built by [Mallen220](https://github.com/Mallen220) & Contributors**
