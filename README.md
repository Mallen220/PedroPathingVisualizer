<div align="center">
  <img src="public/icon.png" alt="Pedro Pathing Visualizer Logo" width="120" height="120">
  <h1 align="center">Pedro Pathing Visualizer</h1>
  <p align="center">
    <strong>The modern, intuitive path planner for FIRST Robotics Competition.</strong>
  </p>
  <p align="center">
    Visualize • Plan • Simulate • Export
  </p>

  <p align="center">
    <a href="https://github.com/Mallen220/PedroPathingVisualizer/releases">
      <img src="https://img.shields.io/github/v/release/Mallen220/PedroPathingVisualizer?style=flat-square&color=blue" alt="Latest Release">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/license-Apache%202.0-green.svg?style=flat-square" alt="License">
    </a>
    <img src="https://img.shields.io/badge/platform-macOS%20|%20Windows%20|%20Linux-lightgrey.svg?style=flat-square" alt="Platform">
  </p>
</div>

---

## 🚀 Overview

**Pedro Pathing Visualizer** is a powerful desktop application built with Electron and Svelte, designed to revolutionize how FIRST Robotics Competition teams plan their autonomous routines. Say goodbye to manual coordinate guessing and hello to precise, visual path editing with real-time physics simulation.

> **Note**: This project is primarily developed and tested on **macOS**. While Windows and Linux builds are fully supported, please report any platform-specific issues on the [Issues](https://github.com/Mallen220/PedroPathingVisualizer/issues) page.

## ✨ Key Features

|   |   |
| :--- | :--- |
| 🎨 **Visual Path Editing** | Intuitive drag-and-drop interface for Bezier curves and straight lines. |
| 🤖 **Physics Simulation** | Real-time robot simulation with accurate kinematics, velocity, and acceleration. |
| 📦 **Code Export** | Generate ready-to-use Java code for the Pedro Pathing library instantly. |
| 🔄 **Sequence Editor** | Build complex autonomous routines with paths, waits, and event markers. |
| 🛠️ **Custom Obstacles** | Define field obstacles with custom shapes to ensure collision-free paths. |
| 🌍 **Cross-Platform** | Native support for macOS, Windows, and Linux. |

## 📥 Installation

### **macOS**
**One-Line Installer (Recommended):**
Open Terminal and run:
```bash
curl -fsSL https://raw.githubusercontent.com/Mallen220/PedroPathingVisualizer/main/install.sh | bash
```

**Manual:**
1. Download the latest `.dmg` from [Releases](https://github.com/Mallen220/PedroPathingVisualizer/releases).
2. Drag to Applications.
3. Right-click → Open for the first run.

### **Windows**
1. Download the latest `.exe` from [Releases](https://github.com/Mallen220/PedroPathingVisualizer/releases).
2. Run the installer. (Click "More info" > "Run anyway" if SmartScreen appears).

### **Linux**
Download the `.deb` (Debian/Ubuntu) or `.AppImage` from [Releases](https://github.com/Mallen220/PedroPathingVisualizer/releases).

```bash
# For AppImage
chmod +x Pedro*.AppImage
./Pedro*.AppImage
```

## ⚡ Quick Start

1.  **Launch** the app.
2.  **Configure** your robot size in Settings.
3.  **Draw** your path using "Add Line" (`W` key).
4.  **Edit** curves by dragging Control Points.
5.  **Simulate** by pressing `Space`.
6.  **Export** your code to Java!

## ⌨️ Shortcuts

| Key | Action |
| :--- | :--- |
| `Space` | Play/Pause Simulation |
| `W` | Add New Path Line |
| `A` | Add Control Point |
| `S` | Delete Control Point |
| `Cmd/Ctrl + S` | Save Project |
| `Cmd/Ctrl + Z` | Undo |

## 🤝 Contributing

We welcome contributions! Please fork the repo, create a branch, and submit a PR.
See [LICENSE](LICENSE) for more details.

---

<div align="center">
  <sub>Built by <a href="https://github.com/Mallen220">Matthew Allen</a> & Contributors</sub>
  <br>
  <sub>Not officially affiliated with FIRST® or Pedro Pathing.</sub>
</div>
