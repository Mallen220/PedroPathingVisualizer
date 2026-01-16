# Plugins

Pedro Pathing Visualizer supports a plugin system that allows you to extend its functionality. You can create custom exporters for your robot code or add custom themes to the UI.

## Managing Plugins

To manage your plugins, go to **Settings > Plugins**.

- **Open Plugins Folder**: Click this button to open the directory where your plugins are stored.
- **Reload**: Click this to reload all plugins without restarting the application.
- **Toggle**: Use the checkboxes to enable or disable individual plugins.

## Creating a Plugin

Plugins are JavaScript files (`.js`) placed in the plugins folder. They run in a sandboxed environment and can interact with the visualizer through the `pedro` API.

### API Reference

The global `pedro` object provides the following methods:

#### `pedro.registerExporter(name, handler)`

Registers a custom code exporter.

- **`name`** (string): The name of the exporter (appears in the export menu).
- **`handler`** (function): A function that takes `data` and returns a string (the generated code).

**Example:**

```javascript
pedro.registerExporter("My Custom Format", (data) => {
  let code = "// My Custom Path\n";
  data.lines.forEach((line) => {
    code += `move(${line.end.x}, ${line.end.y});\n`;
  });
  return code;
});
```

#### `pedro.registerTheme(name, css)`

Registers a custom UI theme.

- **`name`** (string): The name of the theme.
- **`css`** (string): The CSS styles for the theme.

**Example:**

```javascript
pedro.registerTheme(
  "Midnight Blue",
  `
  :root {
    --bg-primary: #1e3a8a;
    --text-primary: #ffffff;
  }
`,
);
```

#### `pedro.getData()`

Returns the current project state. This is useful for exporters.

- **Returns**: An object containing:
  - `startPoint`: The robot's starting position.
  - `lines`: Array of path segments.
  - `shapes`: Array of obstacles/shapes.
  - `sequence`: The timeline sequence.

## Example Plugin

Here is a complete example of a simple plugin that adds a custom exporter:

```javascript
// simple-exporter.js
pedro.registerExporter("Simple CSV", (data) => {
  let csv = "x,y\n";
  // Add start point
  csv += `${data.startPoint.x},${data.startPoint.y}\n`;

  // Add all path points
  for (const line of data.lines) {
    csv += `${line.end.x},${line.end.y}\n`;
  }

  return csv;
});
```
